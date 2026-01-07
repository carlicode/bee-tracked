import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider, GOOGLE_CLIENT_ID } from './services/auth';
import { useAuth } from './services/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NuevaCarrera } from './pages/NuevaCarrera';
import { IniciarTurno } from './pages/IniciarTurno';
import { CerrarTurno } from './pages/CerrarTurno';
import { MisCarreras } from './pages/MisCarreras';
import { MisTurnos } from './pages/MisTurnos';
import { DetalleTurno } from './pages/DetalleTurno';

const DEMO_MODE = !import.meta.env.VITE_APPS_SCRIPT_URL;

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function AppContent() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/nueva-carrera"
          element={
            <PrivateRoute>
              <Layout>
                <NuevaCarrera />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/iniciar-turno"
          element={
            <PrivateRoute>
              <Layout>
                <IniciarTurno />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/cerrar-turno"
          element={
            <PrivateRoute>
              <Layout>
                <CerrarTurno />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-carreras"
          element={
            <PrivateRoute>
              <Layout>
                <MisCarreras />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/mis-turnos"
          element={
            <PrivateRoute>
              <Layout>
                <MisTurnos />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/turno/:id"
          element={
            <PrivateRoute>
              <Layout>
                <DetalleTurno />
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  // Siempre usar GoogleOAuthProvider, incluso en modo demo
  // En modo demo, usamos un client ID placeholder si no está configurado
  const clientId = DEMO_MODE && !GOOGLE_CLIENT_ID 
    ? 'demo-client-id.apps.googleusercontent.com' // Placeholder para modo demo
    : GOOGLE_CLIENT_ID;
  
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AppContent />
    </GoogleOAuthProvider>
  );
}

export default App;

