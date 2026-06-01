import { useMemo, useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, isAdminApiEnabled } from '../../services/adminApi';

/** YYYY-MM-DD → DD-MM-YYYY */
function formatDate(s: string): string {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/* ── Columnas drivers (hoja beezero) ─────────────────────────────────────── */
const DRIVER_COLS: { label: string; aliases: string[]; isDate?: boolean }[] = [
  { label: 'ID', aliases: ['id', 'turnoid'] },
  { label: 'Abejita', aliases: ['abejita'] },
  { label: 'Fecha Inicio', aliases: ['fecha inicio'], isDate: true },
  { label: 'Hora Inicio', aliases: ['hora inicio'] },
  { label: 'Fecha Cierre', aliases: ['fecha cierre'], isDate: true },
  { label: 'Hora Cierre', aliases: ['hora cierre'] },
  { label: 'Auto (Placa)', aliases: ['auto (placa)', 'auto(placa)', 'auto placa'] },
  { label: 'Apertura Caja (Bs)', aliases: ['apertura caja (bs)', 'apertura caja', 'apertura caja bs'] },
  { label: 'Cierre Caja (Bs)', aliases: ['cierre caja (bs)', 'cierre caja', 'cierre caja bs'] },
  { label: 'Total Gastos', aliases: ['total gastos'] },
  { label: 'Diferencia (Bs)', aliases: ['diferencia (bs)', 'diferencia bs'] },
  { label: 'Estado', aliases: ['estado'] },
];

/* ── Columnas bikers (hoja Ecodelivery) ──────────────────────────────────── */
const BIKER_COLS: { label: string; aliases: string[]; isDate?: boolean }[] = [
  { label: 'ID', aliases: ['turnoid', 'id'] },
  { label: 'Biker', aliases: ['- turnos', '-turnos', 'abejita', 'nombre', 'biker'] },
  { label: 'Fecha Inicio', aliases: ['fecha inicio'], isDate: true },
  { label: 'Hora Inicio', aliases: ['hora inicio'] },
  { label: 'Fecha Cierre', aliases: ['fecha cierre'], isDate: true },
  { label: 'Hora Cierre', aliases: ['hora cierre'] },
  { label: 'Estado', aliases: ['estado'] },
];

function normHeader(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function resolveKeys(
  headers: string[],
  colDefs: { label: string; aliases: string[] }[],
): Map<string, string> {
  const map = new Map<string, string>();
  const normToReal = new Map<string, string>();
  for (const h of headers) {
    const t = String(h || '').trim();
    if (!t) continue;
    normToReal.set(normHeader(t), t);
  }
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
  if (!k) return '';
  return row[k] != null ? String(row[k]) : '';
}

function statusStyle(estado: string): string {
  const e = estado.trim().toUpperCase();
  if (e === 'CERRADO') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (e === 'INICIADO') return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

type TipoTurnos = 'beezero' | 'ecodelivery';

export function TurnosBeezero() {
  const [tipo, setTipo] = useState<TipoTurnos>('beezero');
  const [turnos, setTurnos] = useState<Record<string, string>[]>([]);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colDefs = tipo === 'beezero' ? DRIVER_COLS : BIKER_COLS;
  const keyMap = useMemo(() => resolveKeys(sheetHeaders, colDefs), [sheetHeaders, colDefs]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setTurnos([]);
    setSheetHeaders([]);
    try {
      const res =
        tipo === 'beezero'
          ? await adminApi.getTurnosBeezero()
          : await adminApi.getTurnosEcodelivery();
      setSheetHeaders(res.headers?.length ? res.headers : []);
      setTurnos(res.turnos || []);
    } catch (e) {
      setError(adminApi.parseError(e));
    } finally {
      setLoading(false);
    }
  }, [tipo]);

  useEffect(() => {
    if (!isAdminApiEnabled()) {
      setError('Configura VITE_API_URL para usar el panel admin.');
      return;
    }
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/admin/dashboard"
          className="text-sm font-medium text-beeadmin-purple hover:text-beeadmin-purple-dark"
        >
          ← Volver al panel
        </Link>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-beeadmin-purple text-white text-sm font-medium hover:bg-beeadmin-purple-dark disabled:opacity-50"
        >
          Actualizar
        </button>
      </div>

      {/* Cabecera + tabs */}
      <div className="rounded-2xl border border-violet-100 bg-white p-4 sm:p-6 shadow-sm space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Turnos</h1>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTipo('beezero')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
              tipo === 'beezero'
                ? 'bg-beeadmin-purple text-white border-beeadmin-purple'
                : 'bg-white text-beeadmin-purple border-beeadmin-purple/40 hover:border-beeadmin-purple'
            }`}
          >
            Drivers (BeeZero)
          </button>
          <button
            type="button"
            onClick={() => setTipo('ecodelivery')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
              tipo === 'ecodelivery'
                ? 'bg-beeadmin-purple text-white border-beeadmin-purple'
                : 'bg-white text-beeadmin-purple border-beeadmin-purple/40 hover:border-beeadmin-purple'
            }`}
          >
            Bikers (EcoDelivery)
          </button>
        </div>

        <p className="text-gray-500 text-sm">
          {tipo === 'beezero' ? (
            <>Hoja <code className="bg-violet-50 px-1 rounded">beezero</code> — {turnos.length} registros</>
          ) : (
            <>Hoja <code className="bg-violet-50 px-1 rounded">Ecodelivery</code> — {turnos.length} registros</>
          )}
        </p>

        {error && (
          <p className="text-red-600 text-sm" role="alert">
            {error}
          </p>
        )}
        {loading && <p className="text-gray-500 text-sm">Cargando…</p>}
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-beeadmin-purple text-white">
                {colDefs.map(({ label }) => (
                  <th key={label} className="px-2 py-2 font-semibold whitespace-nowrap">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {turnos.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={colDefs.length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    Sin turnos o no se pudieron leer las columnas.
                  </td>
                </tr>
              ) : (
                turnos.map((row, i) => {
                  const estado = pick(row, keyMap, 'Estado');
                  return (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-violet-50/40'}>
                      {colDefs.map(({ label, isDate }) => {
                        const raw = pick(row, keyMap, label);
                        const display = isDate ? formatDate(raw) : raw;
                        return label === 'Estado' ? (
                          <td key={label} className="px-2 py-2">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle(estado)}`}
                            >
                              {estado || '—'}
                            </span>
                          </td>
                        ) : (
                          <td
                            key={label}
                            className="px-2 py-1.5 text-gray-800 max-w-[10rem] truncate"
                            title={raw}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
