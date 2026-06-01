import { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { adminApi, isAdminApiEnabled } from '../../services/adminApi';
import {
  CARRERA_ADMIN_COLUMNS,
  buildCarreraHeaderMap,
  pickMapped,
  type CarreraAdminColumn,
} from './adminColumns';
import { isTruthyCell, parsePrecioBs } from './formatUtils';

/** YYYY-MM-DD → DD-MM-YYYY, deja pasar cualquier otro formato sin cambios */
function formatDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

const DATE_COLS: CarreraAdminColumn[] = ['Fecha', 'Fecha creación'];

function displayCell(col: CarreraAdminColumn, raw: string): string {
  return DATE_COLS.includes(col) ? formatDate(raw) : raw;
}

function exportXLSX(
  rows: Record<string, string>[],
  headerMap: Partial<Record<CarreraAdminColumn, string>>,
  driverName: string,
) {
  const data: string[][] = [
    [...CARRERA_ADMIN_COLUMNS],
    ...rows.map((row) =>
      CARRERA_ADMIN_COLUMNS.map((col) => displayCell(col, pickMapped(row, headerMap, col)))
    ),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Carreras');
  XLSX.writeFile(
    wb,
    `carreras_${driverName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

export function CarrerasDrivers() {
  const [tabs, setTabs] = useState<string[]>([]);
  const [tab, setTab] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [carreras, setCarreras] = useState<Record<string, string>[]>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadTabs() {
      if (!isAdminApiEnabled()) {
        setLoadingTabs(false);
        setError('Configura VITE_API_URL para usar el panel admin.');
        return;
      }
      try {
        const { tabs: t } = await adminApi.getDriverTabs();
        if (cancelled) return;
        setTabs(t);
        if (t.length && !tab) setTab(t[0]);
      } catch (e) {
        if (!cancelled) setError(adminApi.parseError(e));
      } finally {
        if (!cancelled) setLoadingTabs(false);
      }
    }
    void loadTabs();
    return () => {
      cancelled = true;
    };
  }, []);

  const headerMap = useMemo(() => buildCarreraHeaderMap(sheetHeaders), [sheetHeaders]);

  const loadData = useCallback(async () => {
    if (!tab.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getCarrerasByDriver(
        tab.trim(),
        from || undefined,
        to || undefined,
      );
      setSheetHeaders(res.headers.length ? res.headers : Object.keys(res.carreras[0] || {}));
      setCarreras(res.carreras);
    } catch (e) {
      setError(adminApi.parseError(e));
      setCarreras([]);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => {
    if (!tab || loadingTabs) return;
    void loadData();
  }, [tab, from, to, loadingTabs, loadData]);

  const filteredCarreras = useMemo(() => {
    if (!clienteFilter.trim()) return carreras;
    const q = clienteFilter.trim().toLowerCase();
    const clienteKey = headerMap['Cliente'];
    return carreras.filter((row) => {
      const val = clienteKey ? (row[clienteKey] ?? '') : '';
      return val.toLowerCase().includes(q);
    });
  }, [carreras, clienteFilter, headerMap]);

  const stats = useMemo(() => {
    let totalBs = 0;
    let porHora = 0;
    let aCuenta = 0;
    let qr = 0;
    for (const row of filteredCarreras) {
      totalBs += parsePrecioBs(pickMapped(row, headerMap, 'Precio (Bs)'));
      if (isTruthyCell(pickMapped(row, headerMap, 'Por hora'))) porHora += 1;
      if (isTruthyCell(pickMapped(row, headerMap, 'A cuenta'))) aCuenta += 1;
      if (isTruthyCell(pickMapped(row, headerMap, 'Pago por QR'))) qr += 1;
    }
    return { count: filteredCarreras.length, totalBs, porHora, aCuenta, qr };
  }, [filteredCarreras, headerMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to="/admin/dashboard"
          className="text-sm font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark"
        >
          ← Volver al panel
        </Link>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Carreras por driver</h1>

        {!isAdminApiEnabled() && (
          <p className="text-red-600 text-sm" role="alert">
            Backend no configurado.
          </p>
        )}

        {/* Fila 1: Driver + Fechas + Actualizar */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Driver (pestaña)</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              disabled={loadingTabs}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-beeadmin-purple focus:border-beeadmin-purple"
            >
              {tabs.length === 0 && <option value="">—</option>}
              {tabs.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-beeadmin-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-beeadmin-purple"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || !tab}
            className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white font-medium hover:bg-beeadmin-purple-dark disabled:opacity-50"
          >
            Actualizar
          </button>
        </div>

        {/* Fila 2: filtro Cliente + descargar */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[220px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <input
              type="text"
              value={clienteFilter}
              onChange={(e) => setClienteFilter(e.target.value)}
              placeholder="Filtrar por cliente…"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-beeadmin-purple"
            />
          </div>
          <button
            type="button"
            disabled={filteredCarreras.length === 0}
            onClick={() => exportXLSX(filteredCarreras, headerMap, tab)}
            className="px-4 py-2 rounded-lg border-2 border-beeadmin-purple text-beeadmin-purple font-medium hover:bg-violet-50 disabled:opacity-40 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Excel
          </button>
        </div>

        {/* Resumen */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-700 bg-violet-50 rounded-xl p-4 border border-violet-100">
          <span>
            <strong className="text-gray-900">Carreras:</strong> {stats.count}
          </span>
          <span>
            <strong className="text-gray-900">Total Bs:</strong> {stats.totalBs.toFixed(2)}
          </span>
          <span>
            <strong className="text-gray-900">Por hora:</strong> {stats.porHora}
          </span>
          <span>
            <strong className="text-gray-900">A cuenta:</strong> {stats.aCuenta}
          </span>
          <span>
            <strong className="text-gray-900">Pago QR:</strong> {stats.qr}
          </span>
        </div>

        {error && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="text-gray-500 text-sm">Cargando…</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-beeadmin-purple text-white">
                {CARRERA_ADMIN_COLUMNS.map((col) => (
                  <th key={col} className="px-2 py-2 font-semibold whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCarreras.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={CARRERA_ADMIN_COLUMNS.length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Sin datos para este filtro.
                  </td>
                </tr>
              ) : (
                filteredCarreras.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/40'}>
                    {CARRERA_ADMIN_COLUMNS.map((col) => {
                      const raw = pickMapped(row, headerMap, col);
                      const display = displayCell(col, raw);
                      return (
                        <td
                          key={col}
                          className="px-2 py-1.5 text-gray-800 max-w-[12rem] truncate"
                          title={raw}
                        >
                          {display}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
