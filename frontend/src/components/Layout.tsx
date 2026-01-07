import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const { logout, getCurrentUser } = useAuth();
  const user = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-beezero-yellow shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                <span className="text-2xl font-bold text-black">bee</span>
                <span className="text-2xl font-bold text-black">zero</span>
              </div>
              <span className="text-xs text-black/60">Drivers</span>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-black">{user.driverName}</span>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-black hover:text-black/70 transition"
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

