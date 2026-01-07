import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { storage } from '../services/storage';

const DEMO_MODE = !(import.meta.env.VITE_APPS_SCRIPT_URL as string | undefined);

export const Login = () => {
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      // El credentialResponse contiene el idToken
      const idToken = credentialResponse.credential;
      
      // Verificar con nuestro backend
      const response = await apiService.verifyAuth(idToken);
      
      if (response.success && response.data) {
        storage.setToken(idToken);
        storage.setUser(response.data);
        navigate('/dashboard');
      } else {
        alert('Usuario no autorizado. Contacta al administrador.');
      }
    } catch (error) {
      console.error('Error en login:', error);
      alert('Error al iniciar sesión. Intenta nuevamente.');
    }
  };

  const handleGoogleError = () => {
    console.error('Login Failed');
    alert('Error al iniciar sesión con Google.');
  };

  const handleDemoLogin = async () => {
    try {
      const response = await apiService.verifyAuth('demo-token');
      if (response.success && response.data) {
        storage.setToken('demo-token');
        storage.setUser(response.data);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error en demo login:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-beezero-yellow/20 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-5xl font-bold text-black">bee</span>
            <span className="text-5xl font-bold text-black">zero</span>
          </div>
          <h2 className="text-3xl font-bold text-black mb-3">Drivers</h2>
          <p className="text-gray-700 text-lg">
            {DEMO_MODE ? 'Modo Demo - Prueba la aplicación' : 'Inicia sesión para comenzar tu turno'}
          </p>
          {DEMO_MODE && (
            <p className="text-xs text-gray-500 mt-2">
              ⚠️ Funcionando sin backend - Datos de demostración
            </p>
          )}
        </div>
        
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-beezero-yellow">
          {DEMO_MODE ? (
            <div className="space-y-4">
              <button
                onClick={handleDemoLogin}
                className="w-full bg-beezero-yellow text-black px-6 py-4 rounded-xl hover:bg-beezero-yellow-dark transition font-bold text-lg shadow-md hover:shadow-lg"
              >
                Entrar como Demo Driver
              </button>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">o</span>
                </div>
              </div>
              {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={handleGoogleError}
                      useOneTap={false}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center mt-4">
                    En producción, usarás Google OAuth para iniciar sesión
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Accede con tu cuenta de Google autorizada
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

