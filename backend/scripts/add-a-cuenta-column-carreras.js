/**
 * Script para agregar la columna "A cuenta" a todas las hojas de Carreras_drivers
 * Ejecutar: CARRERAS_DRIVERS_SHEET_ID=xxx node backend/scripts/add-a-cuenta-column-carreras.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CARRERAS_DRIVERS_HEADERS = [
  'CarreraId', 'Abejita', 'Fecha', 'Cliente', 'Hora Inicio', 'Hora Fin',
  'Lugar Recojo', 'Lugar Destino', 'Tiempo', 'Distancia (km)', 'Precio (Bs)',
  'Observaciones', 'Foto', 'Fecha creación', 'Hora creación', 'Por hora', 'A cuenta',
];

async function main() {
  const SHEET_ID = process.env.CARRERAS_DRIVERS_SHEET_ID || process.env.CARRERAS_BIKERS_SHEET_ID;
  const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;

  if (!SHEET_ID || !GOOGLE_CREDENTIALS_PATH) {
    console.error('❌ Faltan CARRERAS_DRIVERS_SHEET_ID (o CARRERAS_BIKERS_SHEET_ID) y GOOGLE_CREDENTIALS_PATH en .env');
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

    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });

    console.log('✅ Conectado al spreadsheet:', metadata.data.properties.title);
    console.log('📋 Pestañas:', metadata.data.sheets.length);
    console.log('');

    for (const sheet of metadata.data.sheets) {
      const title = sheet.properties.title;
      console.log(`📄 Procesando hoja: "${title}"`);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${title}!A1:Q1`,
      });

      const currentHeaders = response.data.values?.[0] || [];
      console.log('   Headers actuales:', currentHeaders.length, 'columnas');

      if (currentHeaders.includes('A cuenta')) {
        console.log('   ✅ Ya tiene columna "A cuenta"');
        continue;
      }

      const newHeaders = [...CARRERAS_DRIVERS_HEADERS];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${title}!A1:Q1`,
        valueInputOption: 'RAW',
        resource: {
          values: [newHeaders],
        },
      });

      console.log('   ✅ Columna "A cuenta" agregada');
    }

    console.log('');
    console.log('✅ Todas las hojas de Carreras_drivers actualizadas!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
