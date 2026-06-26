import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { GoogleOAuthProvider, GOOGLE_CLIENT_ID, useAuth } from './services/auth';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AccessibilityProvider } from './contexts/AccessibilityContext';
import { ThemeProvider } from './components/ThemeProvider';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { setupAxiosInterceptors } from './services/axiosInterceptor';
import { StagingBanner } from './components/StagingBanner';

// BeeZero pages
import { DashboardBeezero } from './pages/beezero/DashboardBeezero';
import { IniciarTurno } from './pages/beezero/IniciarTurno';
import { CerrarTurno } from './pages/beezero/CerrarTurno';
import { NuevaCarrera } from './pages/beezero/NuevaCarrera';
import { MisCarreras } from './pages/beezero/MisCarreras';
import { MisTurnos as MisTurnosBeezero } from './pages/beezero/MisTurnos';
import { DetalleTurno as DetalleTurnoBeezero } from './pages/beezero/DetalleTurno';

// Operador pages
import { DashboardOperador } from './pages/operador/DashboardOperador';

// EcoDelivery pages
import { DashboardBiker } from './pages/ecodelivery/DashboardBiker';
import { IniciarTurnoBiker } from './pages/ecodelivery/IniciarTurnoBiker';
import { CerrarTurnoBiker } from './pages/ecodelivery/CerrarTurnoBiker';
import { Kilometraje } from './pages/ecodelivery/Kilometraje';
import { MisKilometrajes } from './pages/ecodelivery/MisKilometrajes';
import { MisTurnos as MisTurnosBiker } from './pages/ecodelivery/MisTurnos';

// Admin
import { DashboardAdmin } from './pages/admin/DashboardAdmin';
import { CarrerasDrivers } from './pages/admin/CarrerasDrivers';
import { TurnosBeezero } from './pages/admin/TurnosBeezero';
import { DashboardLive } from './pages/admin/DashboardLive';
import { AnunciosAdmin } from './pages/admin/AnunciosAdmin';
import { CarrerasBikers } from './pages/admin/CarrerasBikers';
import { CrearAnuncio } from './pages/andi/CrearAnuncio';
import { SolicitarPermiso } from './pages/permisos/SolicitarPermiso';
import { GestionPermisos } from './pages/admin/GestionPermisos';
import { GestionUsuarios } from './pages/admin/GestionUsuarios';
import { OnboardingAdmin } from './pages/admin/OnboardingAdmin';
import { Rendimiento } from './pages/admin/Rendimiento';
import { KilometrajeAdmin } from './pages/admin/KilometrajeAdmin';
import { NotFound } from './pages/NotFound';

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

  if (userType === 'admin' || userType === 'rrhh') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (userType === 'ecodelivery') {
    return <Navigate to="/ecodelivery/dashboard" replace />;
  }
  if (userType === 'operador') {
    return <Navigate to="/operador/dashboard" replace />;
  }
  return <Navigate to="/beezero/dashboard" replace />;
};

/** Operadores y admins no usan BeeZero: redirige */
const BeeZeroAccessGuard = ({ children }: { children: React.ReactNode }) => {
  const { getUserType } = useAuth();
  const t = getUserType();
  if (t === 'operador') {
    return <Navigate to="/operador/dashboard" replace />;
  }
  if (t === 'admin' || t === 'rrhh') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <>{children}</>;
};

const EcoDeliveryAccessGuard = ({ children }: { children: React.ReactNode }) => {
  const { getUserType } = useAuth();
  const t = getUserType();
  if (t === 'admin' || t === 'rrhh') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (t === 'operador') {
    return <Navigate to="/operador/dashboard" replace />;
  }
  return <>{children}</>;
};

const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const t = useAuth().getUserType();
  if (t !== 'admin' && t !== 'rrhh') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const OperadorGuard = ({ children }: { children: React.ReactNode }) => {
  const t = useAuth().getUserType();
  if (t !== 'operador' && t !== 'admin' && t !== 'rrhh') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function AppContent() {
  const { isAuthenticated, getUserType } = useAuth();
  const userType = getUserType() || 'beezero';
  
  // Activar control de inactividad para cerrar sesión automáticamente
  useInactivityTimeout();
  
  return (
    <BrowserRouter>
      <StagingBanner />
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
        
        {/* BeeZero — sin operadores ni admin */}
        <Route
          path="/beezero/dashboard"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <DashboardBeezero />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/iniciar-turno"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <IniciarTurno />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/cerrar-turno"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <CerrarTurno />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/nueva-carrera"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <NuevaCarrera />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/mis-carreras"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <MisCarreras />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/mis-turnos"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <MisTurnosBeezero />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/beezero/turno/:id"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <DetalleTurnoBeezero />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />
        
        <Route
          path="/beezero/solicitar-permiso"
          element={
            <PrivateRoute>
              <BeeZeroAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <SolicitarPermiso variant="beezero" />
                    </Layout>
                  </ThemeProvider>
                )}
              </BeeZeroAccessGuard>
            </PrivateRoute>
          }
        />

        {/* EcoDelivery Routes */}
        <Route
          path="/ecodelivery/dashboard"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <DashboardBiker />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/iniciar-turno"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <IniciarTurnoBiker />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/cerrar-turno"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <CerrarTurnoBiker />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/kilometraje"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <Kilometraje />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/mis-kilometrajes"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <MisKilometrajes />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/ecodelivery/mis-turnos"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <MisTurnosBiker />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />

        <Route
          path="/ecodelivery/solicitar-permiso"
          element={
            <PrivateRoute>
              <EcoDeliveryAccessGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType={userType}>
                    <Layout>
                      <SolicitarPermiso variant="ecodelivery" />
                    </Layout>
                  </ThemeProvider>
                )}
              </EcoDeliveryAccessGuard>
            </PrivateRoute>
          }
        />

        {/* Operador */}
        <Route
          path="/operador/dashboard"
          element={
            <PrivateRoute>
              <OperadorGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="operador">
                    <Layout>
                      <DashboardOperador />
                    </Layout>
                  </ThemeProvider>
                )}
              </OperadorGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/operador/iniciar-turno"
          element={
            <PrivateRoute>
              <OperadorGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="operador">
                    <Layout>
                      <IniciarTurnoBiker />
                    </Layout>
                  </ThemeProvider>
                )}
              </OperadorGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/operador/cerrar-turno"
          element={
            <PrivateRoute>
              <OperadorGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="operador">
                    <Layout>
                      <CerrarTurnoBiker />
                    </Layout>
                  </ThemeProvider>
                )}
              </OperadorGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/operador/dashboard/live"
          element={
            <PrivateRoute>
              <OperadorGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <DashboardLive />
                    </Layout>
                  </ThemeProvider>
                )}
              </OperadorGuard>
            </PrivateRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <DashboardAdmin />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/dashboard/live"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <DashboardLive />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/carreras-drivers"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <CarrerasDrivers />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/turnos-beezero"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <TurnosBeezero />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/carreras-bikers"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <CarrerasBikers />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/permisos"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <GestionPermisos />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/anuncios"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <AnunciosAdmin />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/anuncios/crear"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <CrearAnuncio variant="admin" />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/anuncios/editar"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <CrearAnuncio variant="admin" />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/onboarding"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <OnboardingAdmin />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/usuarios"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <GestionUsuarios />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/rendimiento"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <Rendimiento />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />

        <Route
          path="/admin/kilometraje"
          element={
            <PrivateRoute>
              <AdminGuard>
                {isAuthenticated() && (
                  <ThemeProvider userType="admin">
                    <Layout>
                      <KilometrajeAdmin />
                    </Layout>
                  </ThemeProvider>
                )}
              </AdminGuard>
            </PrivateRoute>
          }
        />

        {/* Rutas RRHH legacy → admin */}
        <Route path="/andi/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/andi/anuncios" element={<Navigate to="/admin/anuncios" replace />} />
        <Route path="/andi/anuncios/crear" element={<Navigate to="/admin/anuncios/crear" replace />} />

        <Route path="*" element={<NotFound />} />
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
      <ToastProvider>
        <AccessibilityProvider>
          <AppContent />
        </AccessibilityProvider>
      </ToastProvider>
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
