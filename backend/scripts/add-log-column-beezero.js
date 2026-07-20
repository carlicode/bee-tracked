/**
 * One-off: agrega el header 'Log' en la columna AF de la hoja BeeZero (y opcionalmente
 * en la de staging si se pasa otro GOOGLE_SHEET_ID). Idempotente: si AF1 ya dice 'Log',
 * no hace nada; si AF1 tiene otro valor, aborta sin tocar.
 *
 * Uso: GOOGLE_SHEET_ID=<id> node scripts/add-log-column-beezero.js
 */
const { getSheetsClient } = require('../src/services/googleSheets');

const SHEET_NAME = process.env.SHEET_NAME || 'BeeZero';

async function main() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) {
    console.error('Falta GOOGLE_SHEET_ID');
    process.exit(1);
  }

  const sheets = await getSheetsClient();

  let af1 = '';
  let gridTooSmall = false;
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${SHEET_NAME}!AF1`,
    });
    af1 = res.data.values?.[0]?.[0] || '';
  } catch (err) {
    if (err.message && err.message.includes('exceeds grid limits')) {
      gridTooSmall = true;
    } else {
      throw err;
    }
  }

  if (af1 === 'Log') {
    console.log(`✓ ${SHEET_NAME}!AF1 ya dice 'Log', nada que hacer`);
    return;
  }
  if (af1 !== '') {
    console.error(`✗ ${SHEET_NAME}!AF1 ya tiene valor '${af1}' — abortando sin tocar nada`);
    process.exit(1);
  }

  if (gridTooSmall) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = (meta.data.sheets || []).find((s) => s.properties.title === SHEET_NAME);
    if (!sheet) {
      console.error(`✗ No existe la hoja '${SHEET_NAME}'`);
      process.exit(1);
    }
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            appendDimension: {
              sheetId: sheet.properties.sheetId,
              dimension: 'COLUMNS',
              length: 32 - sheet.properties.gridProperties.columnCount,
            },
          },
        ],
      },
    });
    console.log('· Columnas ampliadas hasta AF');
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!AF1`,
    valueInputOption: 'RAW',
    resource: { values: [['Log']] },
  });
  console.log(`✓ Header 'Log' escrito en ${SHEET_NAME}!AF1`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
