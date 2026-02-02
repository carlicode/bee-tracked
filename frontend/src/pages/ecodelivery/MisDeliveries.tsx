import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { storage } from '../../services/storage';
import type { Delivery } from '../../types';

export const MisDeliveries = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDeliveries = () => {
      try {
        const historial = storage.getItem<Delivery[]>('historial_deliveries') || [];
        setDeliveries(historial);
      } catch (error) {
        console.error('Error cargando deliveries:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeliveries();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ecodelivery-green"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-black mb-2">Mis Deliveries</h2>
        <p className="text-gray-600">Historial de todos tus deliveries registrados</p>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No hay deliveries registrados</h3>
          <p className="text-gray-600 mb-6">Comienza registrando tu primer delivery</p>
          <Link
            to="/ecodelivery/nuevo-delivery"
            className="inline-block bg-ecodelivery-green text-white px-6 py-3 rounded-lg hover:bg-ecodelivery-green-dark transition font-semibold shadow-md"
          >
            Registrar Delivery
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map((delivery, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition border-l-4 border-ecodelivery-green"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-black">{delivery.cliente}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(delivery.fecha).toLocaleDateString('es-BO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="bg-ecodelivery-green/10 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-ecodelivery-green">
                    {delivery.distancia} km
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ecodelivery-green mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth={2} />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Origen</p>
                    <p className="text-sm font-medium text-black">{delivery.lugarOrigen}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-ecodelivery-green mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Destino</p>
                    <p className="text-sm font-medium text-black">{delivery.lugarDestino}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
