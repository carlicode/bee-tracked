import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { CarreraCard } from '../../components/CarreraCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { apiService } from '../../services/api';
import { beezeroApi, isBeezeroApiEnabled } from '../../services/beezeroApi';
import type { Carrera } from '../../types';

export const MisCarreras = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    loadCarreras();
  }, [fecha]);

  const loadCarreras = async () => {
    try {
      setLoading(true);
      if (isBeezeroApiEnabled()) {
        const user = getCurrentUser();
        const driverName = user?.name || user?.driverName || '';
        if (driverName) {
          const { carreras: data } = await beezeroApi.getCarreras(driverName, fecha);
          setCarreras(data);
        } else {
          setCarreras([]);
        }
      } else {
        const response = await apiService.getCarreras(fecha);
        if (response.success && response.data) {
          setCarreras(response.data);
        }
      }
    } catch (error) {
      console.error('Error cargando carreras:', error);
      setCarreras([]);
    } finally {
      setLoading(false);
    }
  };

  const totalPrecio = carreras.reduce((sum, c) => sum + c.precio, 0);
  const totalCarreras = carreras.length;

  return (
    <div>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/beezero/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver atrás
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-black">Mis Carreras</h2>
        <Link
          to="/beezero/nueva-carrera"
          className="bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold shadow-md"
        >
          + Registrar carrera
        </Link>
      </div>

      <div className="mb-4">
        <label htmlFor="fecha" className="block text-sm font-medium text-black mb-2">
          Fecha
        </label>
        <input
          type="date"
          id="fecha"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
        />
      </div>

      <div className="bg-beezero-yellow rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between">
          <div>
            <p className="text-sm font-medium text-black/70">Total Carreras</p>
            <p className="text-3xl font-bold text-black">{totalCarreras}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-black/70">Total Ganado</p>
            <p className="text-3xl font-bold text-black">Bs {totalPrecio}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : carreras.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center border-2 border-gray-200">
          <p className="text-gray-700 mb-4">No hay carreras registradas para esta fecha</p>
          <Link
            to="/beezero/nueva-carrera"
            className="inline-block bg-beezero-yellow text-black px-6 py-2 rounded-lg hover:bg-beezero-yellow-dark transition font-semibold"
          >
            Crear primera carrera
          </Link>
        </div>
      ) : (
        <div>
          {carreras.map((carrera, index) => (
            <CarreraCard key={index} carrera={carrera} />
          ))}
        </div>
      )}
    </div>
  );
};

