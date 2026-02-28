import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { GoogleOAuthProvider, GOOGLE_CLIENT_ID, useAuth } from './services/auth';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { setupAxiosInterceptors } from './services/axiosInterceptor';

// BeeZero pages
import { DashboardBeezero } from './pages/beezero/DashboardBeezero';
import { IniciarTurno } from './pages/beezero/IniciarTurno';
import { CerrarTurno } from './pages/beezero/CerrarTurno';
import { NuevaCarrera } from './pages/beezero/NuevaCarrera';
import { MisCarreras } from './pages/beezero/MisCarreras';
import { MisTurnos as MisTurnosBeezero } from './pages/beezero/MisTurnos';
import { DetalleTurno as DetalleTurnoBeezero } from './pages/beezero/DetalleTurno';

// EcoDelivery pages
import { DashboardBiker } from './pages/ecodelivery/DashboardBiker';
import { IniciarTurnoBiker } from './pages/ecodelivery/IniciarTurnoBiker';
import { CerrarTurnoBiker } from './pages/ecodelivery/CerrarTurnoBiker';
import { NuevoDelivery } from './pages/ecodelivery/NuevoDelivery';
import { MisDeliveries } from './pages/ecodelivery/MisDeliveries';
import { MisTurnos as MisTurnosBiker } from './pages/ecodelivery/MisTurnos';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const DashboardRouter = () => {
  const { getUserType } = useAuth();
  const userType = getUserType();

  if (userType === 'ecodelivery') {
    return <Navigate to="/ecodelivery/dashboard" replace />;
  }
  // BeeZero y Operador entran al dashboard BeeZero
  return <Navigate to="/beezero/dashboard" replace />;
};

function AppContent() {
  const { isAuthenticated, getUserType } = useAuth();
  const userType = getUserType() || 'beezero';
  
  // Activar control de inactividad para cerrar sesión automáticamente
  useInactivityTimeout();
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        {/* Dashboard Router - redirects based on user type */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <DashboardRouter />
            </PrivateRoute>
          }
        />
        
        {/* BeeZero Routes */}
        <Route
          path="/beezero/dashboard"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <DashboardBeezero />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/iniciar-turno"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <IniciarTurno />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/cerrar-turno"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <CerrarTurno />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/nueva-carrera"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <NuevaCarrera />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/mis-carreras"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <MisCarreras />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/mis-turnos"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <MisTurnosBeezero />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/turno/:id"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <DetalleTurnoBeezero />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        
        {/* EcoDelivery Routes */}
        <Route
          path="/ecodelivery/dashboard"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <DashboardBiker />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/iniciar-turno"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <IniciarTurnoBiker />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/cerrar-turno"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <CerrarTurnoBiker />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/nuevo-delivery"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <NuevoDelivery />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/mis-deliveries"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <MisDeliveries />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/mis-turnos"
          element={
            <PrivateRoute>
              {isAuthenticated() && (
                <ThemeProvider userType={userType}>
                  <Layout>
                    <MisTurnosBiker />
                  </Layout>
                </ThemeProvider>
              )}
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  const hasGoogleClientId =
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'demo-client-id';

  // Setup axios interceptors una vez al iniciar la app
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  // AuthProvider debe envolver AppContent para que useAuth() esté disponible en las rutas.
  const content = (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );

  // Modo demo: login con usuario/contraseña (eco, beezero). Sin Google OAuth.
  if (!hasGoogleClientId) {
    return content;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {content}
    </GoogleOAuthProvider>
  );
}

export default App;
