/**
 * Script para agregar la columna "Foto" a todas las hojas de Carreras_bikers
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function main() {
  const CARRERAS_SHEET_ID = process.env.CARRERAS_BIKERS_SHEET_ID;
  const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;

  if (!CARRERAS_SHEET_ID || !GOOGLE_CREDENTIALS_PATH) {
    console.error('❌ Faltan CARRERAS_BIKERS_SHEET_ID o GOOGLE_CREDENTIALS_PATH en .env');
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

    // Obtener metadata del spreadsheet
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: CARRERAS_SHEET_ID,
    });

    console.log('✅ Conectado al spreadsheet:', metadata.data.properties.title);
    console.log('📋 Pestañas:', metadata.data.sheets.length);
    console.log('');

    for (const sheet of metadata.data.sheets) {
      const title = sheet.properties.title;
      console.log(`📄 Procesando hoja: "${title}"`);

      // Leer headers actuales
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: CARRERAS_SHEET_ID,
        range: `${title}!A1:Z1`,
      });

      const currentHeaders = response.data.values?.[0] || [];
      console.log('   Headers actuales:', currentHeaders.length, 'columnas');

      // Verificar si ya tiene la columna "Foto"
      if (currentHeaders.includes('Foto')) {
        console.log('   ✅ Ya tiene columna "Foto"');
        continue;
      }

      // Headers correctos
      const correctHeaders = [
        'DeliveryId', 'Biker', 'Fecha Registro', 'Hora Registro', 'Cliente', 'Lugar Origen',
        'Hora Inicio', 'Lugar Destino', 'Hora Fin', 'Distancia (km)', 'Por Hora', 'Notas', 'Foto',
      ];

      // Si tiene menos de 12 columnas, agregar "Foto" al final
      if (currentHeaders.length < 13) {
        const newHeaders = [...currentHeaders];
        while (newHeaders.length < 12) newHeaders.push('');
        newHeaders.push('Foto');

        await sheets.spreadsheets.values.update({
          spreadsheetId: CARRERAS_SHEET_ID,
          range: `${title}!A1:M1`,
          valueInputOption: 'RAW',
          resource: {
            values: [newHeaders],
          },
        });

        console.log('   ✅ Columna "Foto" agregada');
      } else {
        // Reemplazar todos los headers
        await sheets.spreadsheets.values.update({
          spreadsheetId: CARRERAS_SHEET_ID,
          range: `${title}!A1:M1`,
          valueInputOption: 'RAW',
          resource: {
            values: [correctHeaders],
          },
        });

        console.log('   ✅ Headers actualizados con "Foto"');
      }
    }

    console.log('');
    console.log('✅ Todos los sheets actualizados!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

main();
