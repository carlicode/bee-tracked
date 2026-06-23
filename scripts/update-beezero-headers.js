#!/usr/bin/env node
/**
 * Actualiza los encabezados de la hoja BeeZero en el Google Sheet.
 * Uso: node scripts/update-beezero-headers.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8';
const SHEET_NAME = 'BeeZero';

const HEADERS = [
  'ID',
  'Timestamp Creación',
  'Hora Inicio',
  'Hora Cierre',
  'Fecha Inicio',
  'Fecha Cierre',
  'Abejita',
  'Auto (Placa)',
  'Kilometraje Inicio',
  'Kilometraje Cierre',
  'Bateria Inicio',
  'Bateria Cierre',
  'Apertura Caja (Bs)',
  'Pagos QR (Bs)',
  'Cierre Caja (Bs)',
  'ID Gastos',
  'Total Gastos',
  'Diferencia (Bs)',
  'Daños Auto Inicio',
  'Foto Tablero Inicio',
  'Foto Exterior Inicio',
  'Daños Auto Cierre',
  'Foto Tablero Cierre',
  'Foto Exterior Cierre',
  'Ubicación Inicio (Lat)',
  'Ubicación Inicio (Lng)',
  'Ubicación Cierre (Lat)',
  'Ubicación Cierre (Lng)',
  'Observaciones',
  'Timestamp Actualización',
  'Estado',
];

async function main() {
  const credPath = path.resolve(__dirname, '../../beezero-1d5503cf3b22.json');
  if (!fs.existsSync(credPath)) {
    console.error('❌ No se encontró el archivo de credenciales en:', credPath);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const lastCol = String.fromCharCode(64 + HEADERS.length); // 'AD' para 30 columnas
  const range = `${SHEET_NAME}!A1:${lastCol}1`;

  console.log(`📝 Actualizando headers en ${SHEET_NAME}!A1:${lastCol}1 ...`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  });

  console.log('✅ Headers actualizados correctamente:');
  HEADERS.forEach((h, i) => {
    const col = i < 26
      ? String.fromCharCode(65 + i)
      : 'A' + String.fromCharCode(65 + (i - 26));
    console.log(`   ${col}: ${h}`);
  });
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
