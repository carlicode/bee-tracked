import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../services/auth';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { isCognitoConfigured, signIn as cognitoSignIn, getUserTypeFromToken } from '../services/cognito';
import { storage } from '../services/storage';
import { announcementsApi, type Announcement } from '../services/andiApi';
import { AnnouncementModal } from '../components/AnnouncementModal';
import { TutorialModal } from '../components/TutorialModal';
import type { User } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

function dashboardPath(userType: User['userType']): string {
  if (userType === 'ecodelivery' || userType === 'operador') return '/ecodelivery/dashboard';
  if (userType === 'admin' || userType === 'rrhh') return '/admin/dashboard';
  return '/beezero/dashboard';
}

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { largeTextEnabled, toggleLargeText } = useAccessibility();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pendingAnnouncements, setPendingAnnouncements] = useState<Announcement[]>([]);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialUserId, setTutorialUserId] = useState<string | null>(null);

  const proceedToDashboard = (path: string) => {
    navigate(path, { replace: true });
    setPendingPath(null);
    setShowTutorial(false);
    setTutorialUserId(null);
    setLoading(false);
  };

  const maybeShowTutorial = (path: string, userId: string) => {
    if (!storage.getTutorialCompleted(userId)) {
      setPendingPath(path);
      setTutorialUserId(userId);
      setShowTutorial(true);
      setLoading(false);
      return;
    }
    proceedToDashboard(path);
  };

  const finishLogin = async (
    user: User,
    path: string,
    token?: string,
    sessionId?: string,
    loginUsername?: string
  ) => {
    login(user, token, sessionId);
    if (loginUsername) storage.setUsername(loginUsername);

    const userId = loginUsername || user.driverName || user.email;

    if (API_BASE && user.userType !== 'rrhh' && user.userType !== 'admin') {
      try {
        const { announcements } = await announcementsApi.getPending();
        if (announcements.length > 0) {
          setPendingAnnouncements(announcements);
          setPendingPath(path);
          setTutorialUserId(userId);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('No se pudieron cargar anuncios:', err);
      }
    }

    maybeShowTutorial(path, userId);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const userTrim = username.trim();
    const passTrim = password;

    if (isCognitoConfigured()) {
      try {
        const COGNITO_TIMEOUT_MS = 15000;
        const cognitoPromise = cognitoSignIn(userTrim, passTrim);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Tiempo de espera agotado. Verifica tu conexión.')), COGNITO_TIMEOUT_MS)
        );
        const { idToken, refreshToken, name, username: cognitoUsername } = await Promise.race([
          cognitoPromise,
          timeoutPromise,
        ]);

        storage.setRefreshToken(refreshToken);
        storage.setUsername(cognitoUsername);

        const userType = getUserTypeFromToken(idToken);

        let sessionId: string | undefined;
        if (API_BASE) {
          try {
            const { data: sessionData } = await axios.post<{ success: boolean; sessionId?: string }>(
              `${API_BASE}/api/auth/cognito-login`,
              { idToken, username: cognitoUsername, name, userType },
              { timeout: 5000 }
            );
            if (sessionData.success && sessionData.sessionId) {
              sessionId = sessionData.sessionId;
            }
          } catch (err) {
            console.warn('No se pudo registrar sesión en backend:', err);
          }
        }

        const user: User = {
          email: `${userTrim}@ecodelivery.com`,
          name,
          driverName: name,
          userType,
        };

        await finishLogin(user, dashboardPath(userType), idToken, sessionId, cognitoUsername);
        return;
      } catch (cognitoErr) {
        if (!API_BASE) {
          const msg = cognitoErr instanceof Error ? cognitoErr.message : 'Usuario o contraseña incorrectos';
          setError(msg);
          setLoading(false);
          return;
        }
      }
    }

    if (API_BASE) {
      try {
        const { data } = await axios.post<{
          success: boolean;
          user?: User;
          sessionId?: string;
          error?: string;
        }>(
          `${API_BASE}/api/auth/login`,
          { user: userTrim, password: passTrim },
          { timeout: 10000 }
        );
        if (data.success && data.user) {
          await finishLogin(data.user, dashboardPath(data.user.userType), undefined, data.sessionId, userTrim);
          return;
        }
        setError(data.error || 'Usuario o contraseña incorrectos');
      } catch (err: unknown) {
        const status = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status: number; data?: { error?: string; code?: string } } }).response?.status
          : 0;
        const msg = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { error?: string; code?: string } } }).response?.data?.error
          : null;
        const code = err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { code?: string } } }).response?.data?.code
          : null;

        if (code === 'SESSION_EXPIRED') {
          setError('Tu sesión anterior ha expirado. Intenta iniciar sesión nuevamente.');
        } else {
          setError(status === 401 ? 'Usuario o contraseña incorrectos' : msg || 'Error de conexión. ¿Está el backend en marcha?');
        }
        setLoading(false);
      }
      return;
    }

    const usernameLower = userTrim.toLowerCase();
    let userType: User['userType'];
    let userName: string;
    let email: string;

    if (usernameLower === 'eco' || usernameLower === 'ecodelivery') {
      userType = 'ecodelivery';
      userName = 'Biker EcoDelivery';
      email = 'biker@ecodelivery.com';
    } else if (usernameLower === 'patricia') {
      userType = 'beezero';
      userName = 'Patricia';
      email = 'patricia@beezero.com';
    } else if (usernameLower === 'beezero' || usernameLower === 'bee') {
      userType = 'beezero';
      userName = 'Driver BeeZero';
      email = 'driver@beezero.com';
    } else {
      userType = 'beezero';
      userName = userTrim || 'Driver';
      email = `${usernameLower}@beezero.com`;
    }

    login({ email, name: userName, driverName: userName, userType });
    setLoading(false);
    maybeShowTutorial(dashboardPath(userType), usernameLower || userName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4 relative">
      {pendingAnnouncements.length > 0 && pendingPath && (
        <AnnouncementModal
          announcements={pendingAnnouncements}
          onComplete={() => {
            setPendingAnnouncements([]);
            const path = pendingPath;
            const uid = tutorialUserId || storage.getUsername() || '';
            if (path && uid) maybeShowTutorial(path, uid);
            else if (path) proceedToDashboard(path);
          }}
        />
      )}

      {showTutorial && pendingPath && (
        <TutorialModal
          userType={
            (storage.getUser()?.userType as User['userType']) || 'beezero'
          }
          onComplete={() => {
            const uid = tutorialUserId || storage.getUsername() || '';
            if (uid) storage.setTutorialCompleted(uid);
            proceedToDashboard(pendingPath);
          }}
        />
      )}

      <label className="absolute top-4 right-4 flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition text-gray-700" title={largeTextEnabled ? 'Desactivar letras grandes' : 'Activar letras grandes'}>
        <span className="text-sm font-medium">Agrandar letras</span>
        <button
          type="button"
          role="switch"
          aria-checked={largeTextEnabled}
          aria-label={largeTextEnabled ? 'Desactivar letras grandes' : 'Activar letras grandes'}
          onClick={toggleLargeText}
          className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors bg-gray-400"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full transition-transform ${largeTextEnabled ? 'bg-beezero-yellow translate-x-6' : 'bg-white translate-x-0.5'} shadow`}
          />
        </button>
      </label>

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-5xl font-bold text-black">bee-tracked</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-200">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={API_BASE ? 'Usuario' : 'eco o patricia'}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={API_BASE ? 'Contraseña' : '(opcional para demo)'}
                  required={!!API_BASE}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 font-semibold text-lg shadow-lg hover:shadow-xl"
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
