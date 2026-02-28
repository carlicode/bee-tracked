import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { storage } from '../../services/storage';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ecodeliveryApi, isEcodeliveryApiEnabled } from '../../services/ecodeliveryApi';
import { formatters } from '../../utils/formatters';
import { TimeSelect } from '../../components/TimeSelect';
import type { Delivery } from '../../types';

export const NuevoDelivery = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const user = getCurrentUser();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { image: photoDataUrl, handleFileChange: handlePhotoChange, clearImage: clearPhoto, error: photoError } = useImageUpload();

  const bikerName = user?.driverName || user?.name || 'Biker';

  const [formData, setFormData] = useState<Partial<Delivery>>({
    cliente: '',
    lugarOrigen: '',
    lugarDestino: '',
    distancia: 0,
    horaInicio: '',
    horaFin: '',
    porHora: false,
    notas: '',
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
      const fecha = formatters.dateToInput(ahora);
      const horaRegistro = formatters.timeToHHmm(ahora);

      let photoUrl: string | undefined;
      if (photoDataUrl && isEcodeliveryApiEnabled()) {
        try {
          const { url } = await ecodeliveryApi.uploadDeliveryPhoto({
            dataUrl: photoDataUrl,
            username: bikerName,
          });
          photoUrl = url;
        } catch (err) {
          console.error('Error subiendo foto:', err);
          alert('No se pudo subir la foto. El delivery se registrará sin foto.');
        }
      }

      if (isEcodeliveryApiEnabled()) {
        try {
          await ecodeliveryApi.registrarDelivery({
            bikerName,
            cliente: formData.cliente,
            lugarOrigen: formData.lugarOrigen,
            lugarDestino: formData.lugarDestino,
            distancia: formData.distancia,
            porHora: formData.porHora ?? false,
            notas: formData.notas?.trim() || undefined,
            fechaRegistro: fecha,
            horaRegistro,
            horaInicio: formData.horaInicio?.trim() || undefined,
            horaFin: formData.horaFin?.trim() || undefined,
            foto: photoUrl, // URL de S3
          });
        } catch (err) {
          console.error('Error registrando delivery en sheet:', err);
          alert('Delivery guardado localmente. No se pudo registrar en Carreras_bikers (¿backend y CARRERAS_BIKERS_SHEET_ID configurados?).');
        }
      }

      const deliveryData: Delivery = {
        bikerName,
        fecha,
        cliente: formData.cliente,
        lugarOrigen: formData.lugarOrigen,
        lugarDestino: formData.lugarDestino,
        distancia: formData.distancia,
        horaInicio: formData.horaInicio?.trim() || undefined,
        horaFin: formData.horaFin?.trim() || undefined,
        porHora: formData.porHora ?? false,
        notas: formData.notas?.trim() || undefined,
        foto: photoUrl || photoDataUrl || undefined, // URL de S3 o dataUrl local
        email: user?.email,
        createdAt: ahora.toISOString(),
      };

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
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/ecodelivery/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-black font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver atrás
        </button>
      </div>
      <h2 className="text-2xl font-bold text-black mb-6">Registrar Delivery</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <p className="text-sm text-gray-600">
          Registrando como: <span className="font-semibold text-black">{bikerName}</span>
        </p>

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

        <TimeSelect
          label="Hora Inicio (opcional)"
          value={formData.horaInicio ?? ''}
          onChange={(v) => setFormData((prev) => ({ ...prev, horaInicio: v }))}
          focusRingClass="focus:ring-ecodelivery-green focus:border-ecodelivery-green"
        />

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

        <TimeSelect
          label="Hora Fin (opcional)"
          value={formData.horaFin ?? ''}
          onChange={(v) => setFormData((prev) => ({ ...prev, horaFin: v }))}
          focusRingClass="focus:ring-ecodelivery-green focus:border-ecodelivery-green"
        />

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

        {/* Carrera por hora */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="porHora"
            checked={formData.porHora ?? false}
            onChange={(e) => setFormData((prev) => ({ ...prev, porHora: e.target.checked }))}
            className="w-5 h-5 rounded border-2 border-gray-300 text-ecodelivery-green focus:ring-ecodelivery-green"
          />
          <label htmlFor="porHora" className="text-sm font-medium text-black">
            Carrera por hora
          </label>
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="notas" className="block text-sm font-medium text-black mb-1">
            Notas (opcional)
          </label>
          <textarea
            id="notas"
            rows={3}
            value={formData.notas ?? ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, notas: e.target.value }))}
            placeholder="Observaciones, comentarios..."
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ecodelivery-green focus:border-ecodelivery-green resize-none"
          />
        </div>

        {/* Foto opcional */}
        <div>
          <p className="block text-sm font-medium text-black mb-2">Foto (opcional)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
          />
          {!photoDataUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-ecodelivery-green hover:text-ecodelivery-green transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
              Subir foto
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <img src={photoDataUrl} alt="Vista previa" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
              <div>
                <p className="text-sm text-gray-600">Foto lista para adjuntar</p>
                <button type="button" onClick={clearPhoto} className="text-sm text-red-600 hover:underline mt-1">
                  Quitar foto
                </button>
              </div>
            </div>
          )}
          {photoError && <p className="text-sm text-red-600 mt-1">{photoError}</p>}
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
