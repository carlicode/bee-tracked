import { Link, Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAdminGroup } from './adminHubConfig';
import { isPermisosApiEnabled, permisosApi } from '../../services/permisosApi';

const cardBase =
  'block rounded-2xl border-2 border-violet-100 bg-white p-5 shadow-md hover:shadow-lg hover:border-beeadmin-purple transition relative';

type AdminGroupHubProps = {
  pendientesPermisos?: number;
};

export function AdminGroupHub({ pendientesPermisos: pendientesProp }: AdminGroupHubProps) {
  const { groupId } = useParams<{ groupId: string }>();
  const group = groupId ? getAdminGroup(groupId) : undefined;
  const [pendientesPermisos, setPendientesPermisos] = useState(pendientesProp ?? 0);

  useEffect(() => {
    if (pendientesProp != null) return;
    if (!isPermisosApiEnabled()) return;
    permisosApi.getPendientesCount().then(setPendientesPermisos).catch(() => setPendientesPermisos(0));
  }, [pendientesProp]);

  if (!group) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/dashboard"
        className="text-sm font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark"
      >
        ← Volver al panel
      </Link>

      <div className="rounded-2xl bg-gradient-to-br from-beeadmin-purple/10 to-violet-50 border border-violet-100 px-6 py-6">
        <p className="text-2xl mb-1">{group.emoji}</p>
        <h1 className="text-2xl font-bold text-gray-900">{group.title}</h1>
        <p className="mt-1 text-gray-600 text-sm max-w-xl">{group.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {group.sections.map((section) => {
          const badge =
            section.badgeKey === 'permisos' && pendientesPermisos > 0 ? pendientesPermisos : 0;
          return (
            <Link key={section.to} to={section.to} className={cardBase}>
              {badge > 0 && (
                <span className="absolute top-4 right-4 min-w-[1.5rem] h-6 px-2 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                  {badge}
                </span>
              )}
              <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
              <p className="mt-2 text-gray-600 text-sm">{section.description}</p>
              <span className="mt-4 inline-flex text-beeadmin-purple font-medium text-sm">
                {section.action || 'Abrir →'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
