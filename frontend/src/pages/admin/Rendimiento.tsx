import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type RendimientoDriver, type RendimientoTotales } from '../../services/adminApi';
import { useToast } from '../../contexts/ToastContext';
import { LoadingSpinner } from '../../components/LoadingSpinner';

type TipoFilter = 'all' | 'beezero' | 'ecodelivery';

function formatBs(n: number): string {
  return n.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function Rendimiento() {
  const toast = useToast();
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState<TipoFilter>('all');
  const [drivers, setDrivers] = useState<RendimientoDriver[]>([]);
  const [totales, setTotales] = useState<RendimientoTotales | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getRendimiento({ desde, hasta, tipo });
      setDrivers(data.drivers);
      setTotales(data.totales);
    } catch (err) {
      toast.show(adminApi.parseError(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, tipo, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/dashboard" className="text-sm font-medium text-beeadmin-purple">
          ← Panel administración
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Rendimiento</h1>
        <p className="text-gray-600 text-sm mt-1">
          Carreras por conductor: totales, precio registrado y ganancia.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-end bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="border-2 border-gray-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="border-2 border-gray-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoFilter)}
            className="border-2 border-gray-200 rounded-lg px-3 py-2"
          >
            <option value="all">Todos</option>
            <option value="beezero">BeeZero</option>
            <option value="ecodelivery">EcoDelivery</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {totales && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border-2 border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-600">Total Bs</p>
            <p className="text-2xl font-bold text-gray-900">{formatBs(totales.totalGanancia)}</p>
          </div>
          <div className="rounded-2xl border-2 border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-600">Total carreras</p>
            <p className="text-2xl font-bold text-gray-900">{totales.totalCarreras}</p>
          </div>
          <div className="rounded-2xl border-2 border-violet-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-600">% con precio</p>
            <p className="text-2xl font-bold text-gray-900">{totales.porcentaje}%</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-700">Nombre</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Total carreras</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Con precio</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Sin precio</th>
                  <th className="px-4 py-3 font-medium text-gray-700">% con precio</th>
                  <th className="px-4 py-3 font-medium text-gray-700">Total Bs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((d) => (
                  <tr key={d.nombre}>
                    <td className="px-4 py-3 font-medium text-gray-900">{d.nombre}</td>
                    <td className="px-4 py-3">{d.totalCarreras}</td>
                    <td className="px-4 py-3">{d.conPrecio}</td>
                    <td className="px-4 py-3">{d.sinPrecio}</td>
                    <td className="px-4 py-3">{d.porcentajeConPrecio}%</td>
                    <td className="px-4 py-3">{formatBs(d.totalGanancia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {drivers.length === 0 && !loading && (
              <p className="px-6 py-8 text-gray-500 text-sm">Sin datos para el rango seleccionado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
