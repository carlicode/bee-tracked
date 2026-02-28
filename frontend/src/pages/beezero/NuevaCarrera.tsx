import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { apiService } from '../../services/api';
import { beezeroApi, isBeezeroApiEnabled } from '../../services/beezeroApi';
import { storage } from '../../services/storage';
import { formatters } from '../../utils/formatters';
import { TimeSelect } from '../../components/TimeSelect';
import type { Carrera } from '../../types';

export const NuevaCarrera = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<Carrera>>({
    fecha: new Date().toISOString().split('T')[0],
    cliente: '',
    horaInicio: formatters.timeToHHmm(new Date()),
    lugarRecojo: '',
    lugarDestino: '',
    horaFin: '',
    tiempo: '',
    distancia: 0,
    precio: 0,
    observaciones: '',
  });

  const handleClienteChange = async (value: string) => {
    setFormData((prev) => ({ ...prev, cliente: value }));
    
    if (value.length >= 2) {
      try {
        const response = await apiService.autocompleteClientes(value);
        if (response.success && response.data) {
          setClientes(response.data);
        }
      } catch (error) {
        console.error('Error autocompletando clientes:', error);
      }
    } else {
      setClientes([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.lugarRecojo || !formData.lugarDestino || formData.precio == null) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      const token = storage.getToken();
      if (!token) {
        alert('Sesión expirada. Por favor inicia sesión nuevamente.');
        navigate('/');
        return;
      }

      if (isBeezeroApiEnabled()) {
        const user = getCurrentUser();
        const abejita = user?.name || user?.driverName || '';
        if (!abejita) {
          alert('No se pudo obtener el nombre del conductor. Inicia sesión nuevamente.');
          return;
        }
        await beezeroApi.registrarCarrera(abejita, formData as Carrera);
        alert('Carrera registrada exitosamente');
        navigate('/beezero/dashboard');
      } else {
        const response = await apiService.createCarrera(formData as Carrera, token);
        if (response.success) {
          alert('Carrera registrada exitosamente');
          navigate('/beezero/dashboard');
        } else {
          alert(response.error || 'Error al registrar la carrera');
        }
      }
    } catch (error) {
      console.error('Error guardando carrera:', error);
      alert(error instanceof Error ? error.message : 'Error al registrar la carrera. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Registrar carrera</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label htmlFor="fecha" className="block text-sm font-medium text-black mb-1">
            Fecha *
          </label>
          <input
            type="date"
            id="fecha"
            required
            value={formData.fecha}
            onChange={(e) => setFormData((prev) => ({ ...prev, fecha: e.target.value }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 mb-1">
            Cliente *
          </label>
          <input
            type="text"
            id="cliente"
            required
            value={formData.cliente}
            onChange={(e) => handleClienteChange(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            list="clientes-list"
          />
          <datalist id="clientes-list">
            {clientes.map((cliente, index) => (
              <option key={index} value={cliente} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TimeSelect
            label="Hora Inicio"
            required
            value={formData.horaInicio || ''}
            onChange={(v) => setFormData((prev) => ({ ...prev, horaInicio: v }))}
            focusRingClass="focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
          <TimeSelect
            label="Hora Fin"
            value={formData.horaFin || ''}
            onChange={(v) => setFormData((prev) => ({ ...prev, horaFin: v }))}
            focusRingClass="focus:ring-beezero-yellow focus:border-beezero-yellow"
          />
        </div>

        <div>
          <label htmlFor="lugarRecojo" className="block text-sm font-medium text-gray-700 mb-1">
            Lugar de Recojo *
          </label>
          <input
            type="text"
            id="lugarRecojo"
            required
            value={formData.lugarRecojo}
            onChange={(e) => setFormData((prev) => ({ ...prev, lugarRecojo: e.target.value }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            placeholder="Ej: Tarija, Bolivia"
          />
        </div>

        <div>
          <label htmlFor="lugarDestino" className="block text-sm font-medium text-gray-700 mb-1">
            Lugar de Destino *
          </label>
          <input
            type="text"
            id="lugarDestino"
            required
            value={formData.lugarDestino}
            onChange={(e) => setFormData((prev) => ({ ...prev, lugarDestino: e.target.value }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            placeholder="Ej: Capitán ñuflo, Bolivia"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="tiempo" className="block text-sm font-medium text-gray-700 mb-1">
              Tiempo
            </label>
            <input
              type="text"
              id="tiempo"
              value={formData.tiempo}
              onChange={(e) => setFormData((prev) => ({ ...prev, tiempo: e.target.value }))}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              placeholder="0:17"
            />
          </div>
          <div>
            <label htmlFor="distancia" className="block text-sm font-medium text-gray-700 mb-1">
              Distancia (km)
            </label>
            <input
              type="number"
              id="distancia"
              min="0"
              step="0.1"
              value={formData.distancia}
              onChange={(e) => setFormData((prev) => ({ ...prev, distancia: parseFloat(e.target.value) || 0 }))}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            />
          </div>
          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
              Precio (Bs) *
            </label>
            <input
              type="number"
              id="precio"
              required
              min="0"
              step="0.01"
              value={formData.precio}
              onChange={(e) => setFormData((prev) => ({ ...prev, precio: parseFloat(e.target.value) || 0 }))}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            />
          </div>
        </div>

        <div>
          <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            value={formData.observaciones}
            onChange={(e) => setFormData((prev) => ({ ...prev, observaciones: e.target.value }))}
            rows={3}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
            placeholder="Notas adicionales..."
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/beezero/dashboard')}
            className="flex-1 border-2 border-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-beezero-yellow text-black px-4 py-2 rounded-lg hover:bg-beezero-yellow-dark transition disabled:opacity-50 font-semibold shadow-md"
          >
            {loading ? 'Guardando...' : 'Guardar Carrera'}
          </button>
        </div>
      </form>
    </div>
  );
};

