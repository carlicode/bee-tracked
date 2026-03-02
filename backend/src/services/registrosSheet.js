/**
 * Servicio para operaciones sobre el spreadsheet de Registros y Kilometraje.
 * Spreadsheet: REGISTROS_SHEET_ID (hojas Registros y Kilometraje)
 */
const {
  getSheetsClient,
  getAllRowsWithHeadersFromSpreadsheet,
  appendRowToSpreadsheet,
  getOrCreateSheetInSpreadsheet,
} = require('./googleSheets');

const SHEET_REGISTROS = 'Registros';
const SHEET_KILOMETRAJE = 'Kilometraje';

/** Columnas a copiar de Registros a Kilometraje + Kilometraje (nuevo) */
const KILOMETRAJE_HEADERS = [
  'ID',
  'Fecha Registro',
  'Hora Registro',
  'Operador',
  'Cliente',
  'Recojo',
  'Entrega',
  'Direccion Recojo',
  'Direccion Entrega',
  'Detalles de la Carrera',
  'Dist. [Km]',
  'Medio Transporte',
  'Precio [Bs]',
  'Biker',
  'WhatsApp',
  'Fechas',
  'Hora Ini',
  'Hora Fin',
  'Estado',
  'Kilometraje',
];

/**
 * Obtiene la fecha actual en zona Bolivia (America/La_Paz) en formato YYYY-MM-DD
 */
function getHoyBolivia() {
  const now = new Date();
  const boliviaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  return boliviaDate.toISOString().slice(0, 10);
}

/**
 * Normaliza una fecha a YYYY-MM-DD para comparación.
 * Acepta: DD/MM/YYYY, YYYY-MM-DD
 */
function normalizarFecha(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  const trimmed = String(fechaStr).trim();
  if (!trimmed) return null;

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return trimmed.slice(0, 10);

  // DD/MM/YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return null;
}

/**
 * Convierte una fila de array a objeto usando headers
 */
function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? '';
  });
  return obj;
}

/**
 * Obtiene el spreadsheet ID de Registros desde env
 */
function getRegistrosSpreadsheetId() {
  const id = process.env.REGISTROS_SHEET_ID;
  if (!id) {
    throw new Error('REGISTROS_SHEET_ID no está configurado');
  }
  return id;
}

/**
 * Obtiene las carreras del día actual (Bolivia) filtradas por biker.
 * @param {string} bikerName - Nombre del biker
 * @returns {Promise<Array<{ id: string, [key: string]: any }>>}
 */
async function getCarrerasDelDia(bikerName) {
  const spreadsheetId = getRegistrosSpreadsheetId();
  const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
    spreadsheetId,
    SHEET_REGISTROS,
    'A:AF'
  );

  const hoy = getHoyBolivia();
  const bikerLower = String(bikerName || '').trim().toLowerCase();

  const carreras = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const obj = rowToObject(headers, row);

    // Filtrar por biker (columna Biker)
    const rowBiker = (obj['Biker'] || obj['biker'] || '').trim();
    if (rowBiker.toLowerCase() !== bikerLower) continue;

    // Filtrar por fecha: priorizar Fechas (fecha de la carrera) sobre Fecha Registro
    const fechas = normalizarFecha(obj['Fechas'] || obj['fechas'] || '');
    const fechaRegistro = normalizarFecha(obj['Fecha Registro'] || obj['Fecha registro'] || '');
    const fechaCarrera = fechas || fechaRegistro;
    if (fechaCarrera !== hoy) continue;

    const id = obj['ID'] ?? obj['id'] ?? row[0] ?? '';
    carreras.push({
      id: String(id),
      ...obj,
    });
  }

  return carreras;
}

/**
 * Obtiene una carrera por ID desde Registros
 * @param {string} carreraId - ID de la carrera
 * @returns {Promise<{ id: string, [key: string]: any } | null>}
 */
async function getCarreraById(carreraId) {
  const spreadsheetId = getRegistrosSpreadsheetId();
  const { headers, rows } = await getAllRowsWithHeadersFromSpreadsheet(
    spreadsheetId,
    SHEET_REGISTROS,
    'A:AF'
  );

  const idStr = String(carreraId);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowId = row[0];
    if (rowId == null) continue;
    if (String(rowId) === idStr) {
      const obj = rowToObject(headers, row);
      return {
        id: String(rowId),
        ...obj,
      };
    }
  }
  return null;
}

/**
 * Registra un kilometraje: copia datos de la carrera a la hoja Kilometraje y agrega el km.
 * @param {string} carreraId - ID de la carrera en Registros
 * @param {string} bikerName - Nombre del biker (para validación)
 * @param {string} kilometraje - Km registrados por el biker (string, puede incluir comas: "5.2, 3.1")
 */
async function registrarKilometraje(carreraId, bikerName, kilometraje) {
  const spreadsheetId = getRegistrosSpreadsheetId();
  const carrera = await getCarreraById(carreraId);
  if (!carrera) {
    throw new Error(`Carrera con ID ${carreraId} no encontrada`);
  }

  const rowBiker = (carrera['Biker'] || carrera['biker'] || '').trim();
  const bikerLower = String(bikerName || '').trim().toLowerCase();
  if (rowBiker.toLowerCase() !== bikerLower) {
    throw new Error('La carrera no pertenece a este biker');
  }

  const kmStr = String(kilometraje ?? '').trim();
  if (!kmStr) {
    throw new Error('Kilometraje es obligatorio');
  }

  // Crear hoja Kilometraje si no existe (con headers)
  await getOrCreateSheetInSpreadsheet(spreadsheetId, SHEET_KILOMETRAJE, KILOMETRAJE_HEADERS);

  const row = KILOMETRAJE_HEADERS.map((col) => {
    if (col === 'Kilometraje') return kmStr;
    return carrera[col] ?? '';
  });

  await appendRowToSpreadsheet(spreadsheetId, SHEET_KILOMETRAJE, row);
}

/**
 * Obtiene el historial de kilometraje de un biker desde la hoja Kilometraje
 * Si la hoja no existe aún, devuelve array vacío.
 * @param {string} bikerName - Nombre del biker
 * @returns {Promise<Array<{ id: string, kilometraje: number, [key: string]: any }>>}
 */
async function getKilometrajesByBiker(bikerName) {
  const spreadsheetId = getRegistrosSpreadsheetId();
  let headers;
  let rows;
  try {
    const result = await getAllRowsWithHeadersFromSpreadsheet(
      spreadsheetId,
      SHEET_KILOMETRAJE,
      'A:U'
    );
    headers = result.headers;
    rows = result.rows;
  } catch (err) {
    const msg = (err && err.message) || '';
    if (msg.includes('Unable to parse') || msg.includes('Could not find') || msg.includes('not found')) {
      return [];
    }
    throw err;
  }

  const bikerLower = String(bikerName || '').trim().toLowerCase();
  const registros = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const obj = rowToObject(headers, row);
    const rowBiker = (obj['Biker'] || obj['biker'] || '').trim();
    if (rowBiker.toLowerCase() !== bikerLower) continue;

    const id = obj['ID'] ?? obj['id'] ?? row[0] ?? '';
    const km = (obj['Kilometraje'] ?? obj['kilometraje'] ?? '').toString();
    registros.push({
      id: String(id),
      kilometraje: km,
      ...obj,
    });
  }

  return registros;
}

module.exports = {
  getCarrerasDelDia,
  getCarreraById,
  registrarKilometraje,
  getKilometrajesByBiker,
  getHoyBolivia,
};
