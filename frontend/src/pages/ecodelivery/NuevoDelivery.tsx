import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { storage } from '../../services/storage';
import type { Delivery } from '../../types';

export const NuevoDelivery = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<Partial<Delivery>>({
    bikerName: user?.driverName || '',
    cliente: '',
    lugarOrigen: '',
    lugarDestino: '',
    distancia: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente || !formData.lugarOrigen || !formData.lugarDestino || !formData.distancia) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      
      const ahora = new Date();
      const deliveryData: Delivery = {
        bikerName: formData.bikerName!,
        fecha: ahora.toISOString().split('T')[0],
        cliente: formData.cliente,
        lugarOrigen: formData.lugarOrigen,
        lugarDestino: formData.lugarDestino,
        distancia: formData.distancia,
        email: user?.email,
        createdAt: ahora.toISOString(),
      };

      // Guardar en historial
      const historial = storage.getItem<Delivery[]>('historial_deliveries') || [];
      historial.unshift(deliveryData);
      storage.setItem('historial_deliveries', historial);
      
      alert('Delivery registrado exitosamente');
      navigate('/ecodelivery/dashboard');
    } catch (error) {
      console.error('Error registrando delivery:', error);
      alert('Error al registrar el delivery. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-black mb-6">Registrar Delivery</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Biker Name */}
        <div>
          <label htmlFor="bikerName" className="block text-sm font-medium text-black mb-1">
            Biker *
          </label>
          <input
            type="text"
            id="bikerName"
            required
            value={formData.bikerName}
            onChange={(e) => setFormData((prev) => ({ ...prev, bikerName: e.target.value }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green"
          />
        </div>

        {/* Cliente */}
        <div>
          <label htmlFor="cliente" className="block text-sm font-medium text-black mb-1">
            Cliente *
          </label>
          <input
            type="text"
            id="cliente"
            required
            value={formData.cliente}
            onChange={(e) => setFormData((prev) => ({ ...prev, cliente: e.target.value }))}
            placeholder="Nombre del cliente"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green"
          />
        </div>

        {/* Lugar de Origen */}
        <div>
          <label htmlFor="lugarOrigen" className="block text-sm font-medium text-black mb-1">
            Lugar de Origen *
          </label>
          <input
            type="text"
            id="lugarOrigen"
            required
            value={formData.lugarOrigen}
            onChange={(e) => setFormData((prev) => ({ ...prev, lugarOrigen: e.target.value }))}
            placeholder="Ej: Av. 6 de Agosto"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green"
          />
        </div>

        {/* Lugar de Destino */}
        <div>
          <label htmlFor="lugarDestino" className="block text-sm font-medium text-black mb-1">
            Lugar de Destino *
          </label>
          <input
            type="text"
            id="lugarDestino"
            required
            value={formData.lugarDestino}
            onChange={(e) => setFormData((prev) => ({ ...prev, lugarDestino: e.target.value }))}
            placeholder="Ej: Plaza Murillo"
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green"
          />
        </div>

        {/* Distancia */}
        <div>
          <label htmlFor="distancia" className="block text-sm font-medium text-black mb-1">
            Distancia (km) *
          </label>
          <input
            type="number"
            id="distancia"
            required
            min="0"
            step="0.1"
            value={formData.distancia}
            onChange={(e) => setFormData((prev) => ({ ...prev, distancia: parseFloat(e.target.value) || 0 }))}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/ecodelivery/dashboard')}
            className="flex-1 border-2 border-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-ecodelivery-green text-white px-4 py-2 rounded-lg hover:bg-ecodelivery-green-dark transition disabled:opacity-50 font-semibold shadow-md"
          >
            {loading ? 'Registrando...' : 'Registrar Delivery'}
          </button>
        </div>
      </form>
    </div>
  );
};
