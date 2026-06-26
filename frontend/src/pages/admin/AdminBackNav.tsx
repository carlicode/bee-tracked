import { Link } from 'react-router-dom';
import { getGroupForPath } from './adminHubConfig';

type AdminBackNavProps = {
  /** Ruta actual, ej. /admin/calendarios */
  currentPath: string;
};

export function AdminBackNav({ currentPath }: AdminBackNavProps) {
  const group = getGroupForPath(currentPath);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Link to="/admin/dashboard" className="font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark">
        ← Panel
      </Link>
      {group && (
        <>
          <span className="text-gray-300">/</span>
          <Link
            to={`/admin/grupo/${group.id}`}
            className="font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark"
          >
            {group.title}
          </Link>
        </>
      )}
    </div>
  );
}
