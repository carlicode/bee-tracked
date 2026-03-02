/**
 * Migra "Timestamp Creación" a "Fecha creación" y "Hora creación"
 * Ejecutar: CARRERAS_DRIVERS_SHEET_ID=xxx node backend/scripts/migrate-timestamp-to-fecha-hora.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const NEW_HEADERS = [
  'CarreraId', 'Abejita', 'Fecha', 'Cliente', 'Hora Inicio', 'Hora Fin',
  'Lugar Recojo', 'Lugar Destino', 'Tiempo', 'Distancia (km)', 'Precio (Bs)',
  'Observaciones', 'Foto', 'Fecha creación', 'Hora creación', 'Por hora', 'A cuenta',
];

async function main() {
  const SHEET_ID = process.env.CARRERAS_DRIVERS_SHEET_ID || process.env.CARRERAS_BIKERS_SHEET_ID;
  const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;

  if (!SHEET_ID || !GOOGLE_CREDENTIALS_PATH) {
    console.error('❌ Faltan CARRERAS_DRIVERS_SHEET_ID y GOOGLE_CREDENTIALS_PATH');
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), GOOGLE_CREDENTIALS_PATH), 'utf8'));
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });

  const { data } = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  console.log('✅ Spreadsheet:', data.properties.title);

  for (const sheet of data.sheets) {
    const title = sheet.properties.title;
    const sheetId = sheet.properties.sheetId;
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${title}!A1:Q1` });
    const headers = res.data.values?.[0] || [];

    if (headers.includes('Fecha creación') && headers.includes('Hora creación')) {
      console.log(`📄 "${title}": ya migrado`);
      continue;
    }
    if (!headers.includes('Timestamp Creación')) {
      console.log(`📄 "${title}": sin Timestamp Creación, omitiendo`);
      continue;
    }

    const tsIdx = headers.indexOf('Timestamp Creación');
    const rowsRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${title}!A2:Q` });
    const rows = rowsRes.data.values || [];
    console.log(`📄 "${title}": insertando columna después de índice ${tsIdx} (${rows.length} filas)`);

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      resource: {
        requests: [{
          insertDimension: {
            range: { sheetId, dimension: 'COLUMNS', startIndex: tsIdx + 1, endIndex: tsIdx + 2 },
            inheritFromBefore: false,
          },
        }],
      },
    });

    const colN = String.fromCharCode(65 + tsIdx);
    const colO = String.fromCharCode(65 + tsIdx + 1);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const ts = row[tsIdx];
      if (ts && typeof ts === 'string') {
        const fecha = ts.slice(0, 10);
        const hora = ts.length >= 16 ? ts.slice(11, 16) : '';
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${title}!${colN}${i + 2}:${colO}${i + 2}`,
          valueInputOption: 'RAW',
          resource: { values: [[fecha, hora]] },
        });
      }
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${title}!A1:Q1`,
      valueInputOption: 'RAW',
      resource: { values: [NEW_HEADERS] },
    });

    console.log(`   ✅ Migrado (${rows.length} filas)`);
  }
  console.log('\n✅ Migración completada');
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
