import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { andiApi, type Announcement, type AnnouncementStats } from '../../services/andiApi';
import { useToast } from '../../contexts/ToastContext';

type Filter = 'all' | 'active' | 'expired';

const priorityColors: Record<string, string> = {
  normal: 'bg-blue-100 text-blue-800',
  important: 'bg-yellow-100 text-yellow-800',
  urgent: 'bg-red-100 text-red-800',
};

export function ListaAnuncios() {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, AnnouncementStats>>({});

  const load = async () => {
    setLoading(true);
    try {
      const items = await andiApi.getAnnouncements(filter);
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
      await andiApi.deleteAnnouncement(id);
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
      const data = await andiApi.getStats(id);
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
          <h1 className="text-2xl font-bold text-gray-900">Mis anuncios</h1>
          <Link to="/andi/dashboard" className="text-sm text-orange-600 hover:underline">
            ← Volver al panel
          </Link>
        </div>
        <Link
          to="/andi/anuncios/crear"
          className="rounded-lg bg-orange-600 px-4 py-2 text-white font-medium hover:bg-orange-700"
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
              filter === f ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
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
            <div key={a.announcementId} className="rounded-2xl border-2 border-orange-100 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{a.title}</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {a.startDate}
                    {a.endDate ? ` → ${a.endDate}` : ''} · {a.audience}
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
                  📊 Ver quién leyó
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(a.announcementId)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                >
                  🗑️ Eliminar
                </button>
              </div>

              {expandedId === a.announcementId && stats[a.announcementId] && (
                <div className="mt-4 rounded-xl bg-orange-50 p-4 text-sm">
                  <p className="font-semibold">
                    {stats[a.announcementId].read} de {stats[a.announcementId].total} lo leyeron (
                    {stats[a.announcementId].percentage}%)
                  </p>
                  <p className="text-gray-600 mt-1">
                    Pendientes: {stats[a.announcementId].pending}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
