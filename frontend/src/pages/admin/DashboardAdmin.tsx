import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { permisosApi, isPermisosApiEnabled } from '../../services/permisosApi';
import { ADMIN_GROUPS } from './adminHubConfig';

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
          Elige un objetivo para acceder a las herramientas que necesitas.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ADMIN_GROUPS.map((group) => {
          const showBadge = group.id === 'rrhh' && pendientesCount > 0;
          return (
            <Link key={group.id} to={`/admin/grupo/${group.id}`} className={cardBase}>
              {showBadge && (
                <span className="absolute top-4 right-4 min-w-[1.5rem] h-6 px-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                  {pendientesCount}
                </span>
              )}
              <span className="text-3xl">{group.emoji}</span>
              <h2 className="text-xl font-semibold text-gray-900 mt-3">{group.title}</h2>
              <p className="mt-2 text-gray-600 text-sm">{group.description}</p>
              <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">
                {group.sections.length} secciones →
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
