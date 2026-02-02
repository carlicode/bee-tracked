import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { logout, getCurrentUser, getUserType } = useAuth();
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
              <div className="flex items-center gap-4">
                <span className={`text-sm font-medium ${textClass}`}>
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
