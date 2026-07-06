import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminKilometrajeApi, calcStats, type KmRegistro, type KmStats } from '../../services/adminKilometrajeApi';
import { useToast } from '../../contexts/ToastContext';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';

type Tab = 'registros' | 'pendientes';

const CURRENT_MONTH = new Date().toISOString().slice(0, 7); // YYYY-MM

function getFirstDayOfMonth(ym: string) {
  return `${ym}-01`;
}
function getLastDayOfMonth(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${ym}-${String(last).padStart(2, '0')}`;
}

function parseBiker(r: KmRegistro) {
  return r['Biker'] || r['biker'] || '—';
}
function parseCliente(r: KmRegistro) {
  return r['Cliente'] || r['cliente'] || '—';
}
function parseFecha(r: KmRegistro) {
  return r['Fechas'] || r['Fecha Registro'] || r['fecha'] || '—';
}
function parseMedio(r: KmRegistro) {
  return r['Medio Transporte'] || r['Medio de transporte'] || r['medioTransporte'] || '—';
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border-2 ${color} bg-white p-4 shadow-sm`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

export function KilometrajeAdmin() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('registros');
  const [mes, setMes] = useState(CURRENT_MONTH);
  const [bikerFilter, setBikerFilter] = useState('');
  const [registros, setRegistros] = useState<KmRegistro[]>([]);
  const [pendientes, setPendientes] = useState<KmRegistro[]>([]);
  const [stats, setStats] = useState<KmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const items = tab === 'registros' ? registros : pendientes;
  const pagination = usePagination(items, 25);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = getFirstDayOfMonth(mes);
      const to = getLastDayOfMonth(mes);
      const params = { from, to, ...(bikerFilter ? { bikerName: bikerFilter } : {}) };
      const [regs, pends] = await Promise.all([
        adminKilometrajeApi.getRegistros(params),
        adminKilometrajeApi.getPendientes(params),
      ]);
      setRegistros(regs);
      setPendientes(pends);
      setStats(calcStats(regs, pends));
    } catch (err) {
      toast.show('Error cargando datos de kilometraje', 'error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [mes, bikerFilter, toast]);

  useEffect(() => { void load(); }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const from = getFirstDayOfMonth(mes);
      const to = getLastDayOfMonth(mes);
      await adminKilometrajeApi.exportCsv(tab, { from, to, ...(bikerFilter ? { bikerName: bikerFilter } : {}) });
    } catch {
      toast.show('Error exportando CSV', 'error');
    } finally {
      setExporting(false);
    }
  };

  const bikerOptions = stats?.bikers ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/admin/dashboard" className="text-sm font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark">
          ← Volver al panel
        </Link>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kilometraje</h1>
          <p className="text-gray-600 text-sm mt-1">Seguimiento de km por biker — gestión y exportación</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className="flex items-center gap-2 rounded-lg bg-beeadmin-purple px-4 py-2 text-sm font-semibold text-white hover:bg-beeadmin-purple-dark disabled:opacity-50 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label="Con km llenado" value={stats.totalRegistros} color="border-green-200" />
          <StatCard label="Pendientes" value={stats.totalPendientes} color="border-yellow-200" />
          <StatCard label="Km totales" value={`${stats.kmTotal} km`} color="border-blue-200" />
          <StatCard
            label="% completado"
            value={`${stats.pctCompletado}%`}
            sub={`${stats.bikers.length} bikers`}
            color="border-violet-200"
          />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-end bg-white rounded-xl border border-gray-200 p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mes</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-beeadmin-purple"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">Biker</label>
          <select
            value={bikerFilter}
            onChange={(e) => setBikerFilter(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-beeadmin-purple"
          >
            <option value="">Todos los bikers</option>
            {bikerOptions.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
        >
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['registros', 'pendientes'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t
                ? 'bg-beeadmin-purple text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-violet-50'
            }`}
          >
            {t === 'registros' ? (
              <span>Con km <span className="ml-1 rounded-full bg-green-100 text-green-700 px-2 text-xs">{registros.length}</span></span>
            ) : (
              <span>Pendientes <span className="ml-1 rounded-full bg-yellow-100 text-yellow-700 px-2 text-xs">{pendientes.length}</span></span>
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl bg-white border border-gray-200 p-10 text-center text-gray-500">
          {tab === 'registros' ? 'No hay km registrados para este período.' : 'No hay carreras pendientes de km. ✅'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Biker</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Medio</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                  {tab === 'registros' && (
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Km</th>
                  )}
                  {tab === 'pendientes' && (
                    <th className="px-4 py-3 text-center font-semibold text-gray-600">Estado</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagination.pageItems.map((r, i) => (
                  <tr key={r.id + i} className="hover:bg-violet-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-900">{parseBiker(r)}</td>
                    <td className="px-4 py-3 text-gray-700">{parseCliente(r)}</td>
                    <td className="px-4 py-3 text-gray-600">{parseMedio(r)}</td>
                    <td className="px-4 py-3 text-gray-600">{parseFecha(r)}</td>
                    {tab === 'registros' && (
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-semibold text-xs">
                          {r['Kilometraje'] || r['kilometraje'] || '—'} km
                        </span>
                      </td>
                    )}
                    {tab === 'pendientes' && (
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-xs font-medium">
                          Sin km
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onGoTo={pagination.goTo}
            onPrev={pagination.prev}
            onNext={pagination.next}
          />
        </>
      )}
    </div>
  );
}
