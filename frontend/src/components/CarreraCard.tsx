import { Carrera } from '../types';

interface CarreraCardProps {
  carrera: Carrera;
  onEdit?: () => void;
}

export const CarreraCard = ({ carrera, onEdit }: CarreraCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md border-l-4 border-beezero-yellow p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-black">{carrera.cliente}</h3>
          <p className="text-sm text-gray-600">{carrera.fecha}</p>
          {carrera.carreraId != null && (
            <p className="text-xs text-gray-400">ID #{carrera.carreraId}</p>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-black text-lg">Bs {carrera.precio}</p>
          <p className="text-xs text-gray-500">{carrera.tiempo}</p>
          {carrera.aCuenta && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
              A cuenta
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-medium text-black">Desde:</span> {carrera.lugarRecojo}
        </p>
        <p>
          <span className="font-medium text-black">Hasta:</span> {carrera.lugarDestino}
        </p>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>{carrera.horaInicio} - {carrera.horaFin}</span>
          <span>{carrera.distancia} km</span>
        </div>
        {carrera.observaciones && (
          <p className="text-xs text-gray-600 italic mt-2">{carrera.observaciones}</p>
        )}
      </div>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-beezero-yellow bg-beezero-yellow/10 text-black font-semibold text-sm active:bg-beezero-yellow transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar carrera
        </button>
      )}
    </div>
  );
};
