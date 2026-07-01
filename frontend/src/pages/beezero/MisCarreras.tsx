import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { CarreraCard } from '../../components/CarreraCard';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { Pagination } from '../../components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { apiService } from '../../services/api';
import { beezeroApi, isBeezeroApiEnabled } from '../../services/beezeroApi';
import { formatters } from '../../utils/formatters';
import { TimeSelect } from '../../components/TimeSelect';
import { useToast } from '../../contexts/ToastContext';
import type { Carrera } from '../../types';

// ─── Edit modal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  carrera: Carrera;
  driverName: string;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ carrera, driverName, onClose, onSaved }: EditModalProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Carrera>>({ ...carrera });
  const [precioStr, setPrecioStr] = useState(carrera.precio != null && carrera.precio !== 0 ? String(carrera.precio) : '');
  const [distanciaStr, setDistanciaStr] = useState(carrera.distancia != null && carrera.distancia !== 0 ? String(carrera.distancia) : '');

  const porHora = form.porHora ?? false;

  const set = (key: keyof Carrera, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }));

  const sanitizeDecimal = (raw: string) => {
    const v = raw.replace(',', '.');
    const parts = v.split('.');
    return (parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : v).replace(/[^0-9.]/g, '');
  };

  const handleSave = async () => {
    if (!carrera.carreraId) return;
    if (!form.cliente) { toast.show('Ingresá el cliente', 'error'); return; }
    setSaving(true);
    try {
      await beezeroApi.editarCarrera(driverName, carrera.carreraId, {
        ...form,
        precio: parseFloat(precioStr) || 0,
        distancia: parseFloat(distanciaStr) || 0,
      });
      toast.show('Carrera actualizada correctamente', 'success');
      onSaved();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow text-sm';
  const labelClass = 'block text-sm font-medium text-black mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-lg">Editar carrera</h2>
            {carrera.carreraId && (
              <p className="text-xs text-gray-500">ID #{carrera.carreraId} · {carrera.fecha}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Fecha */}
          <div>
            <label className={labelClass}>Fecha</label>
            <input
              type="date"
              value={form.fecha || ''}
              onChange={(e) => set('fecha', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Cliente */}
          <div>
            <label className={labelClass}>Cliente *</label>
            <input
              type="text"
              value={form.cliente || ''}
              onChange={(e) => set('cliente', e.target.value)}
              className={inputClass}
              placeholder="Nombre del cliente"
            />
          </div>

          {/* Horas */}
          <div className="grid grid-cols-2 gap-3">
            <TimeSelect
              label="Hora inicio"
              value={form.horaInicio || ''}
              onChange={(v) => set('horaInicio', v)}
              focusRingClass="focus:ring-beezero-yellow focus:border-beezero-yellow"
            />
            <TimeSelect
              label="Hora fin"
              value={form.horaFin || ''}
              onChange={(v) => set('horaFin', v)}
              focusRingClass="focus:ring-beezero-yellow focus:border-beezero-yellow"
            />
          </div>

          {/* Por hora checkbox */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={porHora}
              onChange={(e) => set('porHora', e.target.checked)}
              className="w-4 h-4 accent-beezero-yellow"
            />
            <span className="text-sm font-medium">Carrera por hora</span>
          </label>

          {/* Lugares y distancia (ocultos si por hora) */}
          {!porHora && (
            <>
              <div>
                <label className={labelClass}>Lugar de recojo</label>
                <input
                  type="text"
                  value={form.lugarRecojo || ''}
                  onChange={(e) => set('lugarRecojo', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Lugar de destino</label>
                <input
                  type="text"
                  value={form.lugarDestino || ''}
                  onChange={(e) => set('lugarDestino', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Distancia (km)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={distanciaStr}
                  onChange={(e) => setDistanciaStr(sanitizeDecimal(e.target.value))}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </>
          )}

          {/* Tiempo */}
          <div>
            <label className={labelClass}>Tiempo</label>
            <input
              type="text"
              value={form.tiempo || ''}
              onChange={(e) => set('tiempo', e.target.value)}
              className={inputClass}
              placeholder="ej: 1h 30m"
            />
          </div>

          {/* Precio */}
          <div>
            <label className={labelClass}>Precio (Bs) *</label>
            <input
              type="text"
              inputMode="decimal"
              value={precioStr}
              onChange={(e) => setPrecioStr(sanitizeDecimal(e.target.value))}
              className={`${inputClass} text-lg font-semibold`}
              placeholder="0"
            />
          </div>

          {/* A cuenta / QR */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.aCuenta ?? false}
                onChange={(e) => set('aCuenta', e.target.checked)}
                className="w-4 h-4 accent-beezero-yellow"
              />
              <span className="text-sm">A cuenta</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pagoPorQR ?? false}
                onChange={(e) => set('pagoPorQR', e.target.checked)}
                className="w-4 h-4 accent-beezero-yellow"
              />
              <span className="text-sm">Pago por QR</span>
            </label>
          </div>

          {/* Observaciones */}
          <div>
            <label className={labelClass}>Observaciones</label>
            <textarea
              value={form.observaciones || ''}
              onChange={(e) => set('observaciones', e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="flex-1 bg-beezero-yellow text-black font-semibold py-3 rounded-xl hover:bg-beezero-yellow-dark transition disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const MisCarreras = () => {
  const navigate = useNavigate();
  const { getCurrentUser } = useAuth();
  const [carreras, setCarreras] = useState<Carrera[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(() => formatters.dateToInput(new Date()));
  const [editingCarrera, setEditingCarrera] = useState<Carrera | null>(null);

  const driverName = getCurrentUser()?.name || getCurrentUser()?.driverName || '';

  useEffect(() => {
    loadCarreras();
  }, [fecha]);

  const loadCarreras = async () => {
    try {
      setLoading(true);
      if (isBeezeroApiEnabled()) {
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
  const pagination = usePagination(carreras, 20);

  return (
    <div>
      {editingCarrera && (
        <EditModal
          carrera={editingCarrera}
          driverName={driverName}
          onClose={() => setEditingCarrera(null)}
          onSaved={() => { setEditingCarrera(null); void loadCarreras(); }}
        />
      )}

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
          {pagination.pageItems.map((carrera, index) => (
            <CarreraCard
              key={index}
              carrera={carrera}
              onEdit={isBeezeroApiEnabled() ? () => setEditingCarrera(carrera) : undefined}
            />
          ))}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onGoTo={pagination.goTo}
            onPrev={pagination.prev}
            onNext={pagination.next}
          />
        </div>
      )}
    </div>
  );
};
