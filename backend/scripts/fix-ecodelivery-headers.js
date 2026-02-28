/**
 * Script para actualizar el header de "turnoId" a "TurnoId" en el sheet Ecodelivery
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function main() {
  const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;
  const SHEET_NAME = 'Ecodelivery';

  if (!GOOGLE_SHEET_ID || !GOOGLE_CREDENTIALS_PATH) {
    console.error('❌ Faltan GOOGLE_SHEET_ID o GOOGLE_CREDENTIALS_PATH en .env');
    process.exit(1);
  }

  try {
    const resolvedPath = path.isAbsolute(GOOGLE_CREDENTIALS_PATH)
      ? GOOGLE_CREDENTIALS_PATH
      : path.resolve(process.cwd(), GOOGLE_CREDENTIALS_PATH);
    
    const credentials = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('📊 Actualizando headers en:', SHEET_NAME);

    // Leer headers actuales
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1:Z1`,
    });

    const currentHeaders = response.data.values[0] || [];
    console.log('📝 Headers actuales:', currentHeaders.join(' | '));

    // Headers correctos según COLS en ecodelivery.js
    const correctHeaders = [
      'TurnoId', 'Usuario', 'Fecha Inicio', 'Hora Inicio', 'Lat Inicio', 'Lng Inicio',
      'Timestamp Inicio', 'Foto Inicio', 'Fecha Cierre', 'Hora Cierre', 'Lat Cierre', 'Lng Cierre',
      'Timestamp Cierre', 'Foto Cierre', 'Estado', 'Timestamp Creación', 'Timestamp Actualización',
    ];

    // Verificar si necesitamos actualizar
    const needsUpdate = JSON.stringify(currentHeaders) !== JSON.stringify(correctHeaders);

    if (!needsUpdate) {
      console.log('✅ Headers ya están correctos. No se requiere actualización.');
      return;
    }

    console.log('🔄 Actualizando headers...');

    // Actualizar headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: `${SHEET_NAME}!A1:Q1`,
      valueInputOption: 'RAW',
      resource: {
        values: [correctHeaders],
      },
    });

    console.log('✅ Headers actualizados correctamente!');
    console.log('📝 Nuevos headers:', correctHeaders.join(' | '));

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
