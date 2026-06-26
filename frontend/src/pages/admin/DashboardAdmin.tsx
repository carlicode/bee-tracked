import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { permisosApi, isPermisosApiEnabled } from '../../services/permisosApi';

const cardBase =
  'block rounded-2xl border-2 border-violet-100 bg-white p-6 shadow-md hover:shadow-lg hover:border-beeadmin-purple transition relative';

export function DashboardAdmin() {
  const [pendientesCount, setPendientesCount] = useState(0);

  useEffect(() => {
    if (!isPermisosApiEnabled()) return;
    permisosApi
      .getPendientesCount()
      .then(setPendientesCount)
      .catch(() => setPendientesCount(0));
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-beeadmin-purple to-beeadmin-purple-dark px-6 py-8 text-white shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold">Panel administración</h1>
        <p className="mt-2 text-violet-100 text-sm sm:text-base max-w-xl">
          Consulta carreras de todas las abejitas y turnos BeeZero desde Google Sheets.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link to="/admin/dashboard/live" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Tiempo real</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Quién tiene turno activo ahora (BeeZero y EcoDelivery), con actualización automática.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/carreras-drivers" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Carreras abejitas</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Pestaña por abejita (BeeZero), filtros por rango de fechas y resumen de totales.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/carreras-bikers" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Carreras bikers</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Pestaña por biker (EcoDelivery), filtros por rango de fechas y km totales.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/turnos-beezero" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Turnos</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Historial de turnos: abejitas (BeeZero) y bikers (EcoDelivery).
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/permisos" className={cardBase}>
          {pendientesCount > 0 && (
            <span className="absolute top-4 right-4 min-w-[1.5rem] h-6 px-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
              {pendientesCount}
            </span>
          )}
          <h2 className="text-xl font-semibold text-gray-900">Permisos</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Aprueba o rechaza solicitudes de días libre de drivers y bikers.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/anuncios/crear" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Crear anuncio</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Publica un mensaje para abejitas, bikers o todos. Lo verán al iniciar sesión.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Crear →</span>
        </Link>

        <Link to="/admin/anuncios" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Anuncios</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Ver anuncios activos, quién los leyó y eliminarlos si hace falta.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/onboarding" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Primer inicio de app</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Ver quién completó el tutorial de bienvenida y resetear a primer inicio si hace falta.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/usuarios" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Usuarios</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Ver y dar de alta usuarios de la plataforma (drivers, bikers, admins).
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/rendimiento" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Rendimiento</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Resumen de carreras por conductor: totales, % con precio y ganancia en Bs.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>

        <Link to="/admin/kilometraje" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Kilometraje</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Seguimiento de km por biker: registros llenados, pendientes y exportación CSV por mes.
          </p>
          <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">Abrir →</span>
        </Link>
      </div>
    </div>
  );
}
