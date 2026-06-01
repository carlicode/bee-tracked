import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, isAdminApiEnabled } from '../../services/adminApi';
import { usePagination } from '../../hooks/usePagination';
import { Pagination } from '../../components/Pagination';

/** YYYY-MM-DD → DD-MM-YYYY */
function formatDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function normHeader(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

const COLS: { label: string; aliases: string[]; isDate?: boolean }[] = [
  { label: 'ID', aliases: ['deliveryid', 'id', 'carreraid'] },
  { label: 'Biker', aliases: ['biker', 'usuario', 'nombre'] },
  { label: 'Fecha', aliases: ['fecha registro', 'fecha'] , isDate: true },
  { label: 'Cliente', aliases: ['cliente'] },
  { label: 'Hora Inicio', aliases: ['hora inicio'] },
  { label: 'Hora Fin', aliases: ['hora fin'] },
  { label: 'Lugar Origen', aliases: ['lugar origen', 'lugar recojo'] },
  { label: 'Lugar Destino', aliases: ['lugar destino'] },
  { label: 'Distancia (km)', aliases: ['distancia (km)', 'distancia km', 'distancia'] },
  { label: 'Por Hora', aliases: ['por hora'] },
  { label: 'Notas', aliases: ['notas', 'observaciones'] },
];

function resolveKeys(
  headers: string[],
  colDefs: { label: string; aliases: string[] }[],
): Map<string, string> {
  const normToReal = new Map<string, string>();
  for (const h of headers) {
    const t = String(h || '').trim();
    if (t) normToReal.set(normHeader(t), t);
  }
  const map = new Map<string, string>();
  for (const { label, aliases } of colDefs) {
    const hit =
      normToReal.get(normHeader(label)) ||
      aliases.map((a) => normToReal.get(normHeader(a))).find(Boolean);
    if (hit) map.set(label, hit);
  }
  return map;
}

function pick(row: Record<string, string>, keyMap: Map<string, string>, label: string): string {
  const k = keyMap.get(label);
  return k && row[k] != null ? String(row[k]) : '';
}

export function CarrerasBikers() {
  const [tabs, setTabs] = useState<string[]>([]);
  const [tab, setTab] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entregas, setEntregas] = useState<Record<string, string>[]>([]);
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
        const { tabs: t } = await adminApi.getBikerTabs();
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
    return () => { cancelled = true; };
  }, []);

  const keyMap = useMemo(() => resolveKeys(sheetHeaders, COLS), [sheetHeaders]);

  const loadData = useCallback(async () => {
    if (!tab.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getEntregasByBiker(tab.trim(), from || undefined, to || undefined);
      setSheetHeaders(res.headers.length ? res.headers : []);
      setEntregas(res.entregas);
    } catch (e) {
      setError(adminApi.parseError(e));
      setEntregas([]);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => {
    if (!tab || loadingTabs) return;
    void loadData();
  }, [tab, from, to, loadingTabs, loadData]);

  const pagination = usePagination(entregas, 50);

  const stats = useMemo(() => {
    let totalKm = 0;
    let porHora = 0;
    for (const row of entregas) {
      const km = parseFloat(pick(row, keyMap, 'Distancia (km)').replace(',', '.')) || 0;
      totalKm += km;
      const ph = pick(row, keyMap, 'Por Hora').trim().toLowerCase();
      if (ph === 'si' || ph === 'sí' || ph === 'true' || ph === '1') porHora += 1;
    }
    return { count: entregas.length, totalKm: Math.round(totalKm * 10) / 10, porHora };
  }, [entregas, keyMap]);

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
        <h1 className="text-xl font-bold text-gray-900">Carreras bikers (EcoDelivery)</h1>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Biker (pestaña)</label>
            <select
              value={tab}
              onChange={(e) => setTab(e.target.value)}
              disabled={loadingTabs}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-beeadmin-purple focus:border-beeadmin-purple"
            >
              {tabs.length === 0 && <option value="">—</option>}
              {tabs.map((t) => (
                <option key={t} value={t}>{t}</option>
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

        <div className="flex flex-wrap gap-4 text-sm text-gray-700 bg-violet-50 rounded-xl p-4 border border-violet-100">
          <span><strong className="text-gray-900">Entregas:</strong> {stats.count}</span>
          <span><strong className="text-gray-900">Km totales:</strong> {stats.totalKm}</span>
          <span><strong className="text-gray-900">Por hora:</strong> {stats.porHora}</span>
        </div>

        {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
        {loading && <p className="text-gray-500 text-sm">Cargando…</p>}
      </div>

      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-beeadmin-purple text-white">
                {COLS.map(({ label }) => (
                  <th key={label} className="px-2 py-2 font-semibold whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entregas.length === 0 && !loading ? (
                <tr>
                  <td colSpan={COLS.length} className="px-4 py-8 text-center text-gray-500">
                    Sin entregas para este filtro.
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/40'}>
                    {COLS.map(({ label, isDate }) => {
                      const raw = pick(row, keyMap, label);
                      return (
                        <td
                          key={label}
                          className="px-2 py-1.5 text-gray-800 max-w-[10rem] truncate"
                          title={raw}
                        >
                          {isDate ? formatDate(raw) : raw}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
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
      </div>
    </div>
  );
}
