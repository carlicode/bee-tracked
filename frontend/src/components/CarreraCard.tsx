import { Carrera } from '../types';

interface CarreraCardProps {
  carrera: Carrera;
}

export const CarreraCard = ({ carrera }: CarreraCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md border-l-4 border-beezero-yellow p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-black">{carrera.cliente}</h3>
          <p className="text-sm text-gray-600">{carrera.fecha}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-black text-lg">Bs {carrera.precio}</p>
          <p className="text-xs text-gray-500">{carrera.tiempo}</p>
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
    </div>
  );
};

