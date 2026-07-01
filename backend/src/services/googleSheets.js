const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { isSheetsWriteEnabled } = require('./dynamoUtils');

let sheetsClient = null;
let auth = null;

/**
 * Obtener credenciales desde AWS Secrets Manager, variable de entorno o archivo
 */
async function getCredentials() {
  // Opción 1: JSON en variable de entorno
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    return JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
  }
  
  // Opción 2: Desde AWS Secrets Manager (Lambda)
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const command = new GetSecretValueCommand({ SecretId: 'bee-tracked/google-credentials' });
      const response = await client.send(command);
      return JSON.parse(response.SecretString);
    } catch (err) {
      console.error('Error obteniendo credentials desde Secrets Manager:', err.message);
      throw err;
    }
  }
  
  // Opción 3: Ruta al archivo JSON (desarrollo local)
  const credentialsPath =
    process.env.GOOGLE_CREDENTIALS_PATH ||
    path.join(process.cwd(), '..', 'beezero-1710ecf4e5e0.json');
  const resolvedPath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);
  if (fs.existsSync(resolvedPath)) {
    const content = fs.readFileSync(resolvedPath, 'utf8');
    return JSON.parse(content);
  }
  throw new Error(
    'Credenciales no encontradas. Configura GOOGLE_CREDENTIALS_JSON o GOOGLE_CREDENTIALS_PATH (ej: ../beezero-1710ecf4e5e0.json)'
  );
}

/**
 * Inicializar cliente de Google Sheets
 */
async function initializeSheetsClient() {
  if (sheetsClient) return sheetsClient;

  try {
    if (!process.env.GOOGLE_SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID no está configurado');
    }

    const credentials = await getCredentials();

    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    sheetsClient = google.sheets({ version: 'v4', auth });

    console.log('✅ Google Sheets client initialized (service account:', credentials.client_email, ')');
    return sheetsClient;
  } catch (error) {
    console.error('❌ Error initializing Google Sheets client:', error.message);
    throw error;
  }
}

/**
 * Agregar una fila a la hoja
 * @param {string} sheetName - Nombre de la hoja (ej: 'BeeZero')
 * @param {Array} values - Array de valores para la fila
 */
async function appendRow(sheetName, values) {
  const sheets = await initializeSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:AE`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error appending row to sheet:', error.message);
    throw new Error(`Failed to append row: ${error.message}`);
  }
}

/**
 * Actualizar una fila en la hoja (busca por ID en columna A)
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} id - ID del registro a actualizar
 * @param {Array} values - Nuevos valores para la fila
 */
async function updateRowById(sheetName, id, values) {
  const sheets = await initializeSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    // Buscar la fila que contiene el ID
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
    });

    const rows = response.data.values || [];
    const rowIndex = rows.findIndex((row) => row[0] == id);

    if (rowIndex === -1) {
      throw new Error(`Turno con ID ${id} no encontrado`);
    }

    // Actualizar la fila (rowIndex + 1 porque las filas empiezan en 1)
    const updateResponse = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${rowIndex + 1}:AE${rowIndex + 1}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [values],
      },
    });

    return updateResponse.data;
  } catch (error) {
    console.error('Error updating row:', error.message);
    throw new Error(`Failed to update row: ${error.message}`);
  }
}

/**
 * Obtener todas las filas de una hoja
 * @param {string} sheetName - Nombre de la hoja
 */
async function getAllRows(sheetName) {
  const sheets = await initializeSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:AE`,
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error getting rows:', error.message);
    throw new Error(`Failed to get rows: ${error.message}`);
  }
}

/**
 * Obtener una fila por ID
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} id - ID del registro
 */
async function getRowById(sheetName, id) {
  const rows = await getAllRows(sheetName);
  
  // La primera fila son los headers
  const headers = rows[0];
  const dataRows = rows.slice(1);

  const row = dataRows.find((r) => r[0] == id);
  
  if (!row) {
    return null;
  }

  // Convertir array a objeto usando los headers
  const obj = {};
  headers.forEach((header, index) => {
    obj[header] = row[index] || '';
  });

  return obj;
}

/**
 * Sanitiza un nombre para usarlo como título de hoja (no puede contener : \ / ? * [ ])
 */
function sanitizeSheetTitle(title) {
  if (!title || typeof title !== 'string') return 'SinNombre';
  return String(title)
    .replace(/[:\\/?*[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'SinNombre';
}

/**
 * Obtiene el cliente de Sheets (sin requerir GOOGLE_SHEET_ID)
 */
async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const credentials = await getCredentials();
  auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

/**
 * Obtiene o crea una hoja por nombre en un spreadsheet (para Carreras_bikers).
 * Si la hoja no existe, la crea y escribe la fila de encabezados.
 * @param {string} spreadsheetId - ID del spreadsheet
 * @param {string} sheetTitle - Nombre deseado de la hoja (ej: nombre del biker)
 * @param {string[]} headers - Fila de encabezados para la nueva hoja
 * @returns {Promise<string>} - Título de la hoja (sanitizado)
 */
async function getOrCreateSheetInSpreadsheet(spreadsheetId, sheetTitle, headers) {
  const sheets = await getSheetsClient();
  const safeTitle = sanitizeSheetTitle(sheetTitle);

  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = (metadata.data.sheets || []).find(
    (s) => s.properties.title === safeTitle
  );

  if (existing) return safeTitle;

  const addSheetRes = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: { title: safeTitle },
          },
        },
      ],
    },
  });

  const newSheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;
  const newTitle = addSheetRes.data.replies[0].addSheet.properties.title;

  if (headers && headers.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${newTitle}!A1:${String.fromCharCode(64 + headers.length)}1`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers] },
    });
  }

  return newTitle;
}

/**
 * Agrega una fila a una hoja de un spreadsheet por ID (para Carreras_bikers).
 */
/**
 * Actualiza una fila completa en un spreadsheet usando el carreraId para calcular la fila.
 * carreraId es 0-indexed y la fila 1 es el header, por lo que rowNumber = carreraId + 2.
 * @param {string} spreadsheetId
 * @param {string} sheetName - Nombre de la pestaña (tab del driver)
 * @param {string|number} carreraId - ID 0-indexed de la carrera
 * @param {any[]} values - Arreglo de valores para reemplazar toda la fila
 */
async function updateRowInSpreadsheet(spreadsheetId, sheetName, carreraId, values) {
  if (!isSheetsWriteEnabled()) {
    console.log('[sheets] skip updateRowInSpreadsheet (SHEETS_WRITE_ENABLED=false)', sheetName, carreraId);
    return { skipped: true };
  }
  const sheets = await getSheetsClient();
  // carreraId es 0-based; fila 1 = header → la carrera N está en la fila N+2
  const rowNumber = parseInt(carreraId, 10) + 2;
  if (isNaN(rowNumber) || rowNumber < 2) {
    throw new Error(`carreraId inválido: ${carreraId}`);
  }
  const lastCol = String.fromCharCode(64 + values.length); // A=65; 18 cols→R, 19→S
  const quotedSheet = `'${String(sheetName).replace(/'/g, "''")}'`;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quotedSheet}!A${rowNumber}:${lastCol}${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    resource: { values: [values] },
  });
  return { rowNumber };
}

async function appendRowToSpreadsheet(spreadsheetId, sheetName, values) {
  const sheets = await getSheetsClient();
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [values] },
    });
  } catch (error) {
    console.error('Error appending row to spreadsheet:', error.message);
    throw new Error(`Failed to append row: ${error.message}`);
  }
}

/**
 * Cuenta filas de datos en una hoja (fila 1 = headers, datos desde fila 2).
 * Usado para el siguiente DeliveryId por biker.
 */
async function getRowCountInSpreadsheet(spreadsheetId, sheetName) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  const rows = res.data.values || [];
  return rows.length;
}

/**
 * Obtiene los nombres de todas las pestañas/hojas en un spreadsheet.
 * @param {string} spreadsheetId - ID del spreadsheet
 * @returns {Promise<string[]>} Array con los nombres de las hojas
 */
async function getSheetsInSpreadsheet(spreadsheetId) {
  const sheets = await getSheetsClient();
  const metadata = await sheets.spreadsheets.get({ spreadsheetId });
  return (metadata.data.sheets || []).map((s) => s.properties.title);
}

/**
 * Obtiene todas las filas de una hoja específica (sin incluir el header).
 * @param {string} spreadsheetId - ID del spreadsheet
 * @param {string} sheetName - Nombre de la hoja
 * @returns {Promise<any[][]>} Array de filas (cada fila es un array de valores)
 */
async function getAllRowsFromSpreadsheet(spreadsheetId, sheetName) {
  const sheets = await getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:Z`,
    });
    return res.data.values || [];
  } catch (error) {
    console.error('Error getting rows from spreadsheet:', error.message);
    throw new Error(`Failed to get rows: ${error.message}`);
  }
}

/**
 * Obtiene todas las filas de una hoja incluyendo el header (para mapear por nombre de columna).
 * @param {string} spreadsheetId - ID del spreadsheet
 * @param {string} sheetName - Nombre de la hoja
 * @param {string} rangeSuffix - Sufijo de rango (ej: 'A:AF' para más columnas). Default: 'A:Z'
 * @returns {Promise<{ headers: string[], rows: any[][] }>}
 */
async function getAllRowsWithHeadersFromSpreadsheet(spreadsheetId, sheetName, rangeSuffix = 'A:AF') {
  const sheets = await getSheetsClient();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${rangeSuffix}`,
    });
    const allRows = res.data.values || [];
    if (allRows.length === 0) {
      return { headers: [], rows: [] };
    }
    const headers = allRows[0];
    const rows = allRows.slice(1);
    return { headers, rows };
  } catch (error) {
    console.error('Error getting rows with headers from spreadsheet:', error.message);
    throw new Error(`Failed to get rows: ${error.message}`);
  }
}

/**
 * Obtiene o crea una hoja y devuelve su título y cantidad de filas (incluye header) en una sola
 * llamada cuando la hoja ya existe, reduciendo el total de roundtrips a la API de Sheets.
 *
 * Flujo para hoja existente: 1 llamada (values.get → rowCount + existencia)
 * Flujo para hoja nueva:     3 llamadas (values.get falla → batchUpdate + values.update headers)
 *                            rowCount devuelto = 1 (solo el header recién escrito)
 *
 * @param {string} spreadsheetId
 * @param {string} sheetTitle - Nombre de la hoja (se sanitiza internamente)
 * @param {string[]} headers  - Encabezados a escribir si la hoja se crea
 * @returns {Promise<{ sheetTitle: string; rowCount: number }>}
 */
async function getOrCreateSheetAndRowCount(spreadsheetId, sheetTitle, headers) {
  const sheets = await getSheetsClient();
  const safeTitle = sanitizeSheetTitle(sheetTitle);

  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${safeTitle}!A:A`,
    });
    const rowCount = (res.data.values || []).length;
    return { sheetTitle: safeTitle, rowCount };
  } catch (err) {
    // Google Sheets devuelve 400 con "Unable to parse range" cuando la hoja no existe
    const isNotFound =
      err.code === 400 ||
      (err.message && err.message.includes('Unable to parse range'));
    if (!isNotFound) throw err;

    const addSheetRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [{ addSheet: { properties: { title: safeTitle } } }],
      },
    });
    const newTitle = addSheetRes.data.replies[0].addSheet.properties.title;

    if (headers && headers.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${newTitle}!A1:${String.fromCharCode(64 + headers.length)}1`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [headers] },
      });
    }

    return { sheetTitle: newTitle, rowCount: 1 };
  }
}

/**
 * Escapa un nombre de hoja para notación A1 de Google Sheets.
 */
function quoteSheetName(sheetName) {
  return `'${String(sheetName).replace(/'/g, "''")}'`;
}

/**
 * Obtiene filas con headers de múltiples hojas en lotes (batchGet).
 * @param {string} spreadsheetId
 * @param {string[]} sheetNames
 * @param {string} rangeSuffix - ej. 'A:AD'
 * @param {number} chunkSize - hojas por request
 * @returns {Promise<Array<{ headers: string[], rows: any[][] }>>}
 */
async function batchGetRowsWithHeadersFromSpreadsheet(
  spreadsheetId,
  sheetNames,
  rangeSuffix = 'A:AD',
  chunkSize = 15
) {
  if (!sheetNames.length) return [];

  const sheets = await getSheetsClient();
  const results = [];

  for (let i = 0; i < sheetNames.length; i += chunkSize) {
    const chunk = sheetNames.slice(i, i + chunkSize);
    const ranges = chunk.map((name) => `${quoteSheetName(name)}!${rangeSuffix}`);
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });

    for (const valueRange of res.data.valueRanges || []) {
      const allRows = valueRange.values || [];
      results.push({
        headers: allRows[0] || [],
        rows: allRows.slice(1),
      });
    }
  }

  return results;
}

function normHeaderForTab(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/** Clasifica pestaña por fila 1: carreras driver (BeeZero) vs entregas biker (EcoDelivery). */
function classifyCarreraTabHeaders(headers) {
  const norms = (headers || []).map((h) => normHeaderForTab(h));
  if (norms.some((h) => h === 'biker' || h === 'deliveryid')) return 'biker';
  if (norms.some((h) => h === 'abejita' || h === 'carreraid')) return 'driver';
  return 'unknown';
}

function filterNonPersonTabs(names) {
  return (names || []).filter((n) => {
    if (!n || typeof n !== 'string') return false;
    const lower = n.toLowerCase();
    if (lower === 'registros') return false;
    if (lower.includes('backup')) return false;
    return true;
  });
}

/**
 * Lista pestañas de un spreadsheet según encabezados de fila 1 (evita mezclar drivers y bikers).
 * @param {'driver'|'biker'} kind
 */
async function listCarreraTabsByKind(spreadsheetId, kind) {
  const all = await getSheetsInSpreadsheet(spreadsheetId);
  const candidates = filterNonPersonTabs(all);
  if (!candidates.length) return [];

  const sheets = await getSheetsClient();
  const matched = [];

  for (let i = 0; i < candidates.length; i += 15) {
    const chunk = candidates.slice(i, i + 15);
    const ranges = chunk.map((name) => `${quoteSheetName(name)}!1:1`);
    const res = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
    const valueRanges = res.data.valueRanges || [];
    for (let j = 0; j < chunk.length; j++) {
      const headers = valueRanges[j]?.values?.[0] || [];
      if (classifyCarreraTabHeaders(headers) === kind) {
        matched.push(chunk[j]);
      }
    }
  }

  return matched.sort((a, b) => a.localeCompare(b, 'es'));
}

module.exports = {
  initializeSheetsClient,
  appendRow,
  updateRowById,
  getAllRows,
  getRowById,
  getSheetsClient,
  sanitizeSheetTitle,
  getOrCreateSheetInSpreadsheet,
  getOrCreateSheetAndRowCount,
  appendRowToSpreadsheet,
  updateRowInSpreadsheet,
  getRowCountInSpreadsheet,
  getSheetsInSpreadsheet,
  getAllRowsFromSpreadsheet,
  getAllRowsWithHeadersFromSpreadsheet,
  batchGetRowsWithHeadersFromSpreadsheet,
  classifyCarreraTabHeaders,
  listCarreraTabsByKind,
};
