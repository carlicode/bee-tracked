import { useState } from 'react';
import type { Announcement } from '../services/andiApi';
import { announcementsApi } from '../services/andiApi';

interface AnnouncementModalProps {
  announcements: Announcement[];
  onComplete: () => void;
  previewMode?: boolean;
}

const priorityStyles: Record<string, string> = {
  normal: 'border-blue-400 bg-blue-50',
  important: 'border-yellow-400 bg-yellow-50',
  urgent: 'border-red-500 bg-red-50',
};

const priorityBadge: Record<string, string> = {
  urgent: 'URGENTE',
  important: 'IMPORTANTE',
};

export function AnnouncementModal({ announcements, onComplete, previewMode = false }: AnnouncementModalProps) {
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!announcements.length) return null;

  const current = announcements[index];
  const isLast = index === announcements.length - 1;
  const style = priorityStyles[current.priority] || priorityStyles.normal;

  const handleNext = async () => {
    if (previewMode) {
      if (isLast) onComplete();
      else setIndex((prev) => prev + 1);
      return;
    }

    setLoading(true);
    try {
      await announcementsApi.markRead(current.announcementId);

      if (isLast) {
        onComplete();
      } else {
        setIndex((prev) => prev + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full max-w-lg rounded-2xl border-2 p-6 shadow-2xl ${style}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-gray-600">
              Mensaje {index + 1} de {announcements.length}
            </p>
            <h2 className="mt-1 text-xl font-bold text-gray-900">{current.title}</h2>
          </div>
          {priorityBadge[current.priority] && (
            <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
              {priorityBadge[current.priority]}
            </span>
          )}
        </div>

        <p className="whitespace-pre-wrap text-gray-800 leading-relaxed">{current.message}</p>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleNext}
            disabled={loading}
            className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : previewMode ? (isLast ? 'Cerrar preview' : 'Siguiente') : isLast ? 'Entendido' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  );
}
