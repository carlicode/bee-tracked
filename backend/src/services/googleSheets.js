const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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
      range: `${sheetName}!A:AA`,
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
      range: `${sheetName}!A${rowIndex + 1}:AA${rowIndex + 1}`,
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
      range: `${sheetName}!A:AA`,
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

module.exports = {
  initializeSheetsClient,
  appendRow,
  updateRowById,
  getAllRows,
  getRowById,
  getSheetsClient,
  sanitizeSheetTitle,
  getOrCreateSheetInSpreadsheet,
  appendRowToSpreadsheet,
  getRowCountInSpreadsheet,
  getSheetsInSpreadsheet,
  getAllRowsFromSpreadsheet,
};
