import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type Announcement, type AnnouncementStats } from '../../services/adminApi';
import { useToast } from '../../contexts/ToastContext';

type Filter = 'all' | 'active' | 'expired';

const priorityColors: Record<string, string> = {
  normal: 'bg-blue-100 text-blue-800',
  important: 'bg-yellow-100 text-yellow-800',
  urgent: 'bg-red-100 text-red-800',
};

export function AnunciosAdmin() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, AnnouncementStats>>({});

  const load = async () => {
    setLoading(true);
    try {
      const items = await adminApi.getAnnouncements(filter);
      setAnnouncements(items);
    } catch {
      toast.show('Error cargando anuncios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar este anuncio?')) return;
    try {
      await adminApi.deleteAnnouncement(id);
      toast.show('Anuncio eliminado', 'success');
      load();
    } catch {
      toast.show('Error al eliminar', 'error');
    }
  };

  const handleStats = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    try {
      const data = await adminApi.getAnnouncementStats(id);
      setStats((prev) => ({ ...prev, [id]: data }));
      setExpandedId(id);
    } catch {
      toast.show('Error cargando estadísticas', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Anuncios</h1>
          <Link to="/admin/dashboard" className="text-sm text-beeadmin-purple hover:underline">
            ← Volver al panel
          </Link>
        </div>
        <Link
          to="/admin/anuncios/crear"
          className="rounded-lg bg-beeadmin-purple px-4 py-2 text-white font-medium hover:bg-beeadmin-purple-dark"
        >
          + Nuevo anuncio
        </Link>
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'expired'] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f ? 'bg-beeadmin-purple text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {f === 'all' ? 'Todos' : f === 'active' ? 'Activos' : 'Expirados'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Cargando...</p>
      ) : announcements.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center text-gray-500">
          No hay anuncios en esta categoría
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.announcementId} className="rounded-2xl border-2 border-violet-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {a.startDate}
                    {a.endDate ? ` → ${a.endDate}` : ''} · {a.audience}
                    {a.createdByName ? ` · por ${a.createdByName}` : ''}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColors[a.priority]}`}>
                  {a.priority}
                </span>
              </div>

              <p className="mt-3 text-gray-700 line-clamp-2">{a.message}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleStats(a.announcementId)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                >
                  Ver quién leyó
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.announcementId)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  Eliminar
                </button>
              </div>

              {expandedId === a.announcementId && stats[a.announcementId] && (
                <div className="mt-4 rounded-xl bg-violet-50 p-4 text-sm space-y-3">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-2xl font-bold text-beeadmin-purple">
                        {stats[a.announcementId].read}
                        <span className="text-base font-normal text-gray-500"> / {stats[a.announcementId].total}</span>
                      </p>
                      <p className="text-xs text-gray-500">leyeron ({stats[a.announcementId].percentage}%)</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-400">
                        {stats[a.announcementId].pending}
                      </p>
                      <p className="text-xs text-gray-500">pendientes</p>
                    </div>
                  </div>

                  {stats[a.announcementId].readUsers.length > 0 && (
                    <div>
                      <p className="font-semibold text-gray-700 mb-2">Quién lo leyó:</p>
                      <div className="flex flex-wrap gap-2">
                        {stats[a.announcementId].readUsers.map((r) => (
                          <span
                            key={r.userId}
                            className="inline-flex items-center gap-1 rounded-full bg-white border border-violet-200 px-3 py-1 text-xs font-medium text-gray-800"
                            title={r.readAt ? new Date(r.readAt).toLocaleString('es-BO') : ''}
                          >
                            {r.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
