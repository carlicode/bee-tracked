import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import { useAccessibility } from '../contexts/AccessibilityContext';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { logout, getCurrentUser, getUserType } = useAuth();
  const { largeTextEnabled, toggleLargeText } = useAccessibility();
  const user = getCurrentUser();
  const userType = getUserType() || 'beezero';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const headerClass = userType === 'beezero' 
    ? 'bg-beezero-yellow' 
    : 'bg-ecodelivery-green';

  const textClass = userType === 'beezero'
    ? 'text-black'
    : 'text-white';

  const subText = userType === 'beezero' ? 'Drivers' : 'Bikers';

  return (
    <div className="min-h-screen bg-white">
      <header className={`${headerClass} shadow-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${textClass}`}>
                  bee-tracked
                </span>
                <span className={`text-xs ${textClass} opacity-60 ml-2`}>
                  {subText}
                </span>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-2 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer" title={largeTextEnabled ? 'Desactivar letras grandes' : 'Activar letras grandes'}>
                  <span className={`text-sm font-medium ${textClass}`}>
                    Agrandar letras
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={largeTextEnabled}
                    aria-label={largeTextEnabled ? 'Desactivar letras grandes' : 'Activar letras grandes'}
                    onClick={toggleLargeText}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${largeTextEnabled ? (userType === 'beezero' ? 'bg-black' : 'bg-white') : 'bg-gray-300'}`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full transition-transform shadow ${largeTextEnabled ? (userType === 'beezero' ? 'bg-beezero-yellow translate-x-6' : 'bg-ecodelivery-green translate-x-6') : 'bg-white translate-x-0.5'}`}
                    />
                  </button>
                </label>
                <span className={`text-sm font-medium ${textClass} hidden sm:inline`}>
                  {user.driverName}
                </span>
                <button
                  onClick={handleLogout}
                  className={`text-sm font-medium ${textClass} hover:opacity-70 transition`}
                >
                  Salir
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-white">
        {children}
      </main>
    </div>
  );
};
