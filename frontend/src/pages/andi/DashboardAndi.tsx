import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { andiApi } from '../../services/andiApi';

const cardBase =
  'block rounded-2xl border-2 border-orange-100 bg-white p-6 shadow-md hover:shadow-lg hover:border-orange-400 transition';

export function DashboardAndi() {
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    andiApi.getAnnouncements('active').then((items) => setActiveCount(items.length)).catch(() => {});
  }, []);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 px-6 py-8 text-white shadow-lg">
        <h1 className="text-2xl sm:text-3xl font-bold">Panel RRHH</h1>
        <p className="mt-2 text-orange-100 text-sm sm:text-base max-w-xl">
          Crea y gestiona anuncios para drivers y bikers. Ellos los verán al iniciar sesión.
        </p>
        <p className="mt-4 inline-flex rounded-full bg-white/20 px-4 py-1 text-sm font-medium">
          {activeCount} anuncio{activeCount === 1 ? '' : 's'} activo{activeCount === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link to="/andi/anuncios/crear" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Crear anuncio</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Publica un mensaje para todos, solo BeeZero o solo EcoDelivery.
          </p>
          <span className="mt-4 inline-flex text-orange-600 font-medium text-sm">Crear →</span>
        </Link>

        <Link to="/andi/anuncios" className={cardBase}>
          <h2 className="text-xl font-semibold text-gray-900">Ver mis anuncios</h2>
          <p className="mt-2 text-gray-600 text-sm">
            Revisa anuncios activos, expirados y quién los leyó.
          </p>
          <span className="mt-4 inline-flex text-orange-600 font-medium text-sm">Abrir →</span>
        </Link>
      </div>
    </div>
  );
}
