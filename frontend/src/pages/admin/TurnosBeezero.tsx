import { useMemo, useEffect, useState, useCallback } from 'react';
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
  { label: 'Pagos QR (Bs)', aliases: ['pagos qr (bs)', 'pagos qr', 'pagos qr bs'] },
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

function normStr(s: string): string {
  return normHeader(String(s || ''));
}

/** Normaliza fechas de sheet a YYYY-MM-DD para comparar con inputs date */
function normalizeFecha(val: string): string {
  const s = String(val || '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) {
    const dd = dmy[1].padStart(2, '0');
    const mm = dmy[2].padStart(2, '0');
    return `${dmy[3]}-${mm}-${dd}`;
  }
  return s;
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
  const [filterNombre, setFilterNombre] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');
  const [filterKeyword, setFilterKeyword] = useState('');

  const colDefs = tipo === 'beezero' ? DRIVER_COLS : BIKER_COLS;
  const keyMap = useMemo(() => resolveKeys(sheetHeaders, colDefs), [sheetHeaders, colDefs]);
  const nombreLabel = tipo === 'beezero' ? 'Abejita' : 'Biker';

  const clearFilters = () => {
    setFilterNombre('');
    setFilterDesde('');
    setFilterHasta('');
    setFilterKeyword('');
  };

  const handleTipoChange = (next: TipoTurnos) => {
    clearFilters();
    setTipo(next);
  };

  const filteredTurnos = useMemo(() => {
    let rows = turnos;

    if (filterNombre.trim()) {
      const q = normStr(filterNombre);
      rows = rows.filter((r) => normStr(pick(r, keyMap, nombreLabel)).includes(q));
    }

    if (filterDesde || filterHasta) {
      rows = rows.filter((r) => {
        const f = normalizeFecha(pick(r, keyMap, 'Fecha Inicio'));
        if (filterDesde && f < filterDesde) return false;
        if (filterHasta && f > filterHasta) return false;
        return true;
      });
    }

    if (filterKeyword.trim()) {
      const q = normStr(filterKeyword);
      rows = rows.filter((r) =>
        colDefs.some(({ label }) => normStr(pick(r, keyMap, label)).includes(q)),
      );
    }

    return rows;
  }, [turnos, filterNombre, filterDesde, filterHasta, filterKeyword, keyMap, colDefs, nombreLabel]);

  const hasActiveFilters =
    Boolean(filterNombre.trim()) ||
    Boolean(filterDesde) ||
    Boolean(filterHasta) ||
    Boolean(filterKeyword.trim());

  const pagination = usePagination(filteredTurnos, 50);

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
            onClick={() => handleTipoChange('beezero')}
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
            onClick={() => handleTipoChange('ecodelivery')}
            className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${
              tipo === 'ecodelivery'
                ? 'bg-beeadmin-purple text-white border-beeadmin-purple'
                : 'bg-white text-beeadmin-purple border-beeadmin-purple/40 hover:border-beeadmin-purple'
            }`}
          >
            Bikers (EcoDelivery)
          </button>
        </div>

        <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-violet-100">
          <div className="min-w-[180px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {nombreLabel}
            </label>
            <input
              type="text"
              value={filterNombre}
              onChange={(e) => setFilterNombre(e.target.value)}
              placeholder={`Filtrar por ${nombreLabel.toLowerCase()}…`}
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-beeadmin-purple focus:border-beeadmin-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={filterDesde}
              onChange={(e) => setFilterDesde(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-beeadmin-purple"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filterHasta}
              onChange={(e) => setFilterHasta(e.target.value)}
              className="border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-beeadmin-purple"
            />
          </div>
          <div className="min-w-[220px] flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Palabra clave</label>
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="Buscar en cualquier columna…"
              className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-beeadmin-purple focus:border-beeadmin-purple"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
            >
              Limpiar
            </button>
          )}
        </div>

        <p className="text-gray-500 text-sm">
          {tipo === 'beezero' ? (
            <>Hoja <code className="bg-violet-50 px-1 rounded">beezero</code></>
          ) : (
            <>Hoja <code className="bg-violet-50 px-1 rounded">Ecodelivery</code></>
          )}
          {' — '}
          {hasActiveFilters ? (
            <>
              Mostrando <strong className="text-gray-700">{filteredTurnos.length}</strong> de{' '}
              {turnos.length} turnos
            </>
          ) : (
            <>{turnos.length} registros</>
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
              {filteredTurnos.length === 0 && !loading ? (
                <tr>
                  <td
                    colSpan={colDefs.length}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {turnos.length === 0
                      ? 'Sin turnos o no se pudieron leer las columnas.'
                      : 'Ningún turno coincide con los filtros.'}
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((row, i) => {
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
