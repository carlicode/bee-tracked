import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { andiApi, type AnnouncementAudience, type AnnouncementPriority } from '../../services/andiApi';
import { adminApi } from '../../services/adminApi';
import { useToast } from '../../contexts/ToastContext';
import { AnnouncementModal } from '../../components/AnnouncementModal';
import { LoadingSpinner } from '../../components/LoadingSpinner';

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

type CrearAnuncioProps = {
  variant?: 'rrhh' | 'admin';
};

export function CrearAnuncio({ variant = 'rrhh' }: CrearAnuncioProps) {
  const isAdmin = variant === 'admin';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = isAdmin ? searchParams.get('id') : null;
  const isEditing = Boolean(editId);
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startDate, setStartDate] = useState(todayDate());
  const [endDate, setEndDate] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('all');
  const [priority, setPriority] = useState<AnnouncementPriority>('normal');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [showPreview, setShowPreview] = useState(false);

  const listPath = isAdmin ? '/admin/anuncios' : '/andi/anuncios';
  const cancelPath = isAdmin ? '/admin/anuncios' : '/andi/dashboard';
  const borderClass = isAdmin ? 'border-violet-100' : 'border-orange-100';
  const submitClass = isAdmin
    ? 'bg-beeadmin-purple hover:bg-beeadmin-purple-dark'
    : 'bg-orange-600 hover:bg-orange-700';

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      setLoadingData(true);
      try {
        const a = await adminApi.getAnnouncement(editId);
        if (cancelled) return;
        setTitle(a.title);
        setMessage(a.message);
        setStartDate(a.startDate);
        setEndDate(a.endDate || '');
        setAudience(a.audience);
        setPriority(a.priority);
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err && typeof err === 'object' && 'message' in err
            ? String((err as Error).message)
            : 'Error al cargar anuncio';
          toast.show(msg, 'error');
          navigate(listPath);
        }
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId, listPath, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const input = {
        title,
        message,
        startDate,
        endDate: endDate || undefined,
        audience,
        priority,
      };
      if (isAdmin && isEditing && editId) {
        await adminApi.updateAnnouncement(editId, input);
        toast.show('Anuncio actualizado correctamente', 'success');
      } else if (isAdmin) {
        await adminApi.createAnnouncement(input);
        toast.show('Anuncio publicado correctamente', 'success');
      } else {
        await andiApi.createAnnouncement(input);
        toast.show('Anuncio publicado correctamente', 'success');
      }
      navigate(listPath);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      toast.show(msg || (isEditing ? 'Error al actualizar anuncio' : 'Error al publicar anuncio'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-2xl mx-auto flex justify-center py-16">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Editar anuncio' : 'Crear anuncio'}
        </h1>
        <p className="text-gray-600 text-sm mt-1">Los usuarios lo verán al iniciar sesión.</p>
      </div>

      <form onSubmit={handleSubmit} className={`bg-white rounded-2xl border-2 ${borderClass} p-6 space-y-5 shadow-sm`}>
        <div>
          <label className="block text-sm font-medium mb-1">Título</label>
          <input
            type="text"
            maxLength={100}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">{title.length}/100</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Mensaje</label>
          <textarea
            maxLength={500}
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            required
          />
          <p className="text-xs text-gray-500 mt-1">{message.length}/500</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Fecha inicio</label>
            <input
              type="date"
              min={isEditing ? undefined : todayDate()}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fecha fin (opcional)</label>
            <input
              type="date"
              min={startDate}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Audiencia</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}
            className="w-full border-2 border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="all">Todos (BeeZero + EcoDelivery)</option>
            <option value="beezero">Solo BeeZero (drivers)</option>
            <option value="ecodelivery">Solo EcoDelivery (bikers)</option>
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium mb-2">Prioridad</span>
          <div className="flex flex-wrap gap-4">
            {(['normal', 'important', 'urgent'] as AnnouncementPriority[]).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="priority"
                  value={p}
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                />
                <span className="capitalize">{p === 'normal' ? 'Normal' : p === 'important' ? 'Importante' : 'Urgente'}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            disabled={!title || !message}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-50"
          >
            Vista previa
          </button>
          <button
            type="button"
            onClick={() => navigate(cancelPath)}
            className="px-4 py-2 rounded-lg border-2 border-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded-lg text-white font-semibold disabled:opacity-50 ${submitClass}`}
          >
            {loading
              ? (isEditing ? 'Guardando...' : 'Publicando...')
              : (isEditing ? 'Guardar cambios' : 'Publicar anuncio')}
          </button>
        </div>
      </form>

      {showPreview && (
        <AnnouncementModal
          announcements={[{
            announcementId: 'preview',
            title,
            message,
            priority,
            startDate,
            endDate,
            audience,
          }]}
          onComplete={() => setShowPreview(false)}
          previewMode
        />
      )}
    </div>
  );
}
