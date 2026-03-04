import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { useToast } from '../../contexts/ToastContext';
import { apiService } from '../../services/api';
import { beezeroApi, isBeezeroApiEnabled } from '../../services/beezeroApi';
import { storage } from '../../services/storage';
import { DEFAULT_CLIENTES } from '../../config/constants';
import { formatters } from '../../utils/formatters';
import { TimeSelect } from '../../components/TimeSelect';
import { PorHoraCheckbox } from '../../components/PorHoraCheckbox';
import { ClienteSelect } from '../../components/ClienteSelect';
import type { Carrera } from '../../types';

export const NuevaCarrera = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { getCurrentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientesApi, setClientesApi] = useState<string[]>([]);
  const clientesOpciones = [...new Set([...DEFAULT_CLIENTES, ...clientesApi])];
  
  const initialFormData = (): Partial<Carrera> => ({
    fecha: formatters.dateToInput(new Date()),
    cliente: '',
    horaInicio: '',
    lugarRecojo: '',
    lugarDestino: '',
    horaFin: '',
    tiempo: '',
    distancia: 0,
    precio: 0,
    porHora: false,
    aCuenta: false,
    pagoPorQR: false,
    observaciones: '',
  });

  const [formData, setFormData] = useState<Partial<Carrera>>(initialFormData);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [distanciaStr, setDistanciaStr] = useState('');
  const [precioStr, setPrecioStr] = useState('');

  useEffect(() => {
    setDistanciaStr(formData.distancia === 0 || formData.distancia === undefined ? '' : String(formData.distancia));
    setPrecioStr(formData.precio === 0 || formData.precio === undefined ? '' : String(formData.precio));
  }, [formData.distancia, formData.precio]);

  const porHora = formData.porHora ?? false;

  const sanitizeDecimalInput = (raw: string): string => {
    const v = raw.replace(',', '.');
    const parts = v.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : v;
    return sanitized.replace(/[^0-9.]/g, '');
  };

  const handleClienteChange = async (value: string) => {
    setFormData((prev) => ({ ...prev, cliente: value }));
    
    if (value.length >= 2) {
      try {
        const response = await apiService.autocompleteClientes(value);
        if (response.success && response.data) {
          setClientesApi(response.data);
        }
      } catch (error) {
        console.error('Error autocompletando clientes:', error);
      }
    } else {
      setClientesApi([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente) {
      toast.show('Por favor completa todos los campos requeridos', 'info');
      return;
    }
    if (!porHora && (!formData.lugarRecojo || !formData.lugarDestino)) {
      toast.show('Por favor completa Lugar de Recojo y Lugar de Destino', 'info');
      return;
    }

    try {
      setLoading(true);
      const token = storage.getToken();
      if (!token) {
        toast.show('Sesión expirada. Por favor inicia sesión nuevamente.', 'error');
        navigate('/');
        return;
      }

      const useBeezeroApi = isBeezeroApiEnabled();
      const apiUrl = import.meta.env.VITE_API_URL || '(no configurado)';
      console.debug('[NuevaCarrera] API:', useBeezeroApi ? `beezeroApi (${apiUrl})` : 'apiService (Apps Script)', {
        porHora,
        formData: { ...formData, lugarRecojo: porHora ? '(por hora)' : formData.lugarRecojo, lugarDestino: porHora ? '(por hora)' : formData.lugarDestino },
      });

      if (useBeezeroApi) {
        const user = getCurrentUser();
        const abejita = user?.name || user?.driverName || '';
        if (!abejita) {
          toast.show('No se pudo obtener el nombre del conductor. Inicia sesión nuevamente.', 'error');
          return;
        }
        await beezeroApi.registrarCarrera(abejita, {
          ...formData,
          lugarRecojo: porHora ? '' : formData.lugarRecojo,
          lugarDestino: porHora ? '' : formData.lugarDestino,
          distancia: porHora ? 0 : (formData.distancia ?? 0),
        } as Carrera);
        setShowSuccessModal(true);
      } else {
        const payload: Carrera = {
          ...(formData as Carrera),
          lugarRecojo: porHora ? '' : (formData.lugarRecojo ?? ''),
          lugarDestino: porHora ? '' : (formData.lugarDestino ?? ''),
          distancia: porHora ? 0 : (formData.distancia ?? 0),
        };
        const response = await apiService.createCarrera(payload, token);
        if (response.success) {
          setShowSuccessModal(true);
        } else {
          toast.show(response.error || 'Error al registrar la carrera', 'error');
        }
      }
    } catch (error) {
      console.error('Error guardando carrera:', error);
      toast.show(error instanceof Error ? error.message : 'Error al registrar la carrera. Intenta nuevamente.', 'error');
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
          <ClienteSelect
            id="cliente"
            value={formData.cliente || ''}
            onChange={(v) => handleClienteChange(v)}
            options={clientesOpciones}
            required
            focusRingClass="focus:ring-beezero-yellow focus:border-beezero-yellow"
            selectedClass="bg-beezero-yellow/20"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TimeSelect
            label="Hora Inicio"
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

        <PorHoraCheckbox
          checked={porHora}
          onChange={(v) => setFormData((prev) => ({ ...prev, porHora: v }))}
          checkboxClass="text-beezero-yellow focus:ring-beezero-yellow"
        />

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="aCuenta"
              checked={formData.aCuenta ?? false}
              onChange={(e) => setFormData((prev) => ({ ...prev, aCuenta: e.target.checked }))}
              className="w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-offset-0 text-beezero-yellow focus:ring-beezero-yellow"
              aria-describedby="aCuenta-desc"
            />
            <label htmlFor="aCuenta" id="aCuenta-desc" className="text-sm font-medium text-black">
              A cuenta
            </label>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pagoPorQR"
              checked={formData.pagoPorQR ?? false}
              onChange={(e) => setFormData((prev) => ({ ...prev, pagoPorQR: e.target.checked }))}
              className="w-5 h-5 rounded border-2 border-gray-300 focus:ring-2 focus:ring-offset-0 text-beezero-yellow focus:ring-beezero-yellow"
              aria-describedby="pagoPorQR-desc"
            />
            <label htmlFor="pagoPorQR" id="pagoPorQR-desc" className="text-sm font-medium text-black">
              Pago por QR
            </label>
          </div>
        </div>

        {!porHora && (
          <>
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
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          {!porHora && (
            <div>
              <label htmlFor="distancia" className="block text-sm font-medium text-gray-700 mb-1">
                Distancia (km)
              </label>
              <input
                type="text"
                inputMode="decimal"
                id="distancia"
                value={distanciaStr}
                onChange={(e) => setDistanciaStr(sanitizeDecimalInput(e.target.value))}
                onBlur={() => {
                  const n = parseFloat(distanciaStr);
                  setFormData((prev) => ({
                    ...prev,
                    distancia: distanciaStr === '' ? 0 : isNaN(n) ? prev.distancia ?? 0 : n,
                  }));
                }}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
                placeholder="0"
              />
            </div>
          )}
          <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
              Precio (Bs)
            </label>
            <input
              type="text"
              inputMode="decimal"
              id="precio"
              value={precioStr}
              onChange={(e) => setPrecioStr(sanitizeDecimalInput(e.target.value))}
              onBlur={() => {
                const n = parseFloat(precioStr);
                setFormData((prev) => ({
                  ...prev,
                  precio: precioStr === '' ? 0 : isNaN(n) ? prev.precio ?? 0 : n,
                }));
              }}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-beezero-yellow focus:border-beezero-yellow"
              placeholder="0"
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

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-beezero-yellow rounded-xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-black flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black mb-2">Listo</h3>
            <p className="text-black mb-6">Carrera registrada exitosamente</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => {
                  setFormData(initialFormData());
                  setDistanciaStr('');
                  setPrecioStr('');
                  setShowSuccessModal(false);
                }}
                className="w-full bg-black text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition"
              >
                Registrar otra carrera
              </button>
              <button
                type="button"
                onClick={() => navigate('/beezero/dashboard')}
                className="w-full border-2 border-black text-black px-4 py-3 rounded-lg font-semibold hover:bg-black/5 transition"
              >
                Ir al dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

