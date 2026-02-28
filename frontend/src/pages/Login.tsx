import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../services/auth';
import { useAccessibility } from '../contexts/AccessibilityContext';
import { isCognitoConfigured, signIn as cognitoSignIn, getUserTypeFromToken } from '../services/cognito';
import { storage } from '../services/storage';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { largeTextEnabled, toggleLargeText } = useAccessibility();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const userTrim = username.trim();
    const passTrim = password;

    // 1) Si Cognito está configurado, intentar login Ecodelivery con Cognito primero
    if (isCognitoConfigured()) {
      try {
        const { idToken, refreshToken, name, username } = await cognitoSignIn(userTrim, passTrim);
        
        // Guardar refresh token y username para renovación automática
        storage.setRefreshToken(refreshToken);
        storage.setUsername(username);
        
        const userType = getUserTypeFromToken(idToken);

        // Registrar sesión en backend (control de concurrencia)
        let sessionId: string | undefined;
        if (API_BASE) {
          try {
            const { data: sessionData } = await axios.post<{ success: boolean; sessionId?: string; error?: string }>(
              `${API_BASE}/api/auth/cognito-login`,
              { idToken, username, name, userType },
              { timeout: 5000 }
            );
            if (sessionData.success && sessionData.sessionId) {
              sessionId = sessionData.sessionId;
            }
          } catch (err) {
            console.warn('No se pudo registrar sesión en backend:', err);
          }
        }

        const user = {
          email: `${userTrim}@ecodelivery.com`,
          name,
          driverName: name,
          userType,
        };
        login(user, idToken, sessionId);
        // Operadores y BeeZero entran al dashboard BeeZero; Ecodelivery al suyo
        if (userType === 'ecodelivery') {
          navigate('/ecodelivery/dashboard', { replace: true });
        } else {
          navigate('/beezero/dashboard', { replace: true });
        }
        return;
      } catch {
        // Cognito falló (usuario no existe o contraseña incorrecta): intentar backend si está configurado (BeeZero)
      }
    }

    // 2) Backend (BeeZero; o Ecodelivery si no hay Cognito)
    if (API_BASE) {
      try {
        const { data } = await axios.post<{ success: boolean; user?: { email: string; name: string; driverName: string; userType: 'beezero' | 'ecodelivery' }; sessionId?: string; error?: string }>(
          `${API_BASE}/api/auth/login`,
          { user: userTrim, password: passTrim },
          { timeout: 10000 }
        );
        if (data.success && data.user) {
          login(data.user, undefined, data.sessionId);
          const path = data.user.userType === 'ecodelivery' ? '/ecodelivery/dashboard' : '/beezero/dashboard';
          navigate(path, { replace: true });
          return;
        }
        setError(data.error || 'Usuario o contraseña incorrectos');
      } catch (err: unknown) {
        const status = err && typeof err === 'object' && 'response' in err ? (err as { response?: { status: number; data?: { error?: string; code?: string } } }).response?.status : 0;
        const msg = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { error?: string; code?: string } } }).response?.data?.error : null;
        const code = err && typeof err === 'object' && 'response' in err ? (err as { response?: { data?: { code?: string } } }).response?.data?.code : null;
        
        if (code === 'SESSION_EXPIRED') {
          setError('Tu sesión anterior ha expirado. Intenta iniciar sesión nuevamente.');
        } else {
          setError(status === 401 ? 'Usuario o contraseña incorrectos' : msg || 'Error de conexión. ¿Está el backend en marcha?');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // 3) Modo demo sin backend: eco / patricia (contraseña opcional)
    const usernameLower = userTrim.toLowerCase();
    let userType: 'beezero' | 'ecodelivery';
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
    navigate(userType === 'ecodelivery' ? '/ecodelivery/dashboard' : '/beezero/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4 relative">
      <label className="absolute top-4 right-4 flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition text-gray-700" title={largeTextEnabled ? 'Desactivar letras grandes' : 'Activar letras grandes'}>
        <span className="text-sm font-medium">
          Agrandar letras
        </span>
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
                  {showPassword ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
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
