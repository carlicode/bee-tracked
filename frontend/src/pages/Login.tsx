import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { storage } from '../services/storage';

export const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Lógica simple: eco → EcoDelivery, beezero → BeeZero
    const usernameLower = username.toLowerCase().trim();
    
    let userType: 'beezero' | 'ecodelivery';
    let userName: string;
    let email: string;

    if (usernameLower === 'eco' || usernameLower === 'ecodelivery') {
      userType = 'ecodelivery';
      userName = 'Biker EcoDelivery';
      email = 'biker@ecodelivery.com';
    } else if (usernameLower === 'beezero' || usernameLower === 'bee') {
      userType = 'beezero';
      userName = 'Driver BeeZero';
      email = 'driver@beezero.com';
    } else {
      // Por defecto, si escriben cualquier otra cosa, va a BeeZero
      userType = 'beezero';
      userName = username || 'Driver';
      email = `${username}@beezero.com`;
    }

    // Guardar datos
    storage.setToken('demo-token');
    storage.setUser({
      email,
      name: userName,
      driverName: userName,
      userType,
    });

    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
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
                placeholder="eco o beezero"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="(opcional para demo)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username}
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
