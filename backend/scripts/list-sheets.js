/**
 * Script para listar todas las pestañas de un Google Spreadsheet
 * y verificar si existe la pestaña "Ecodelivery"
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function main() {
  const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
  const GOOGLE_CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH;

  if (!GOOGLE_SHEET_ID || !GOOGLE_CREDENTIALS_PATH) {
    console.error('❌ Faltan GOOGLE_SHEET_ID o GOOGLE_CREDENTIALS_PATH en .env');
    process.exit(1);
  }

  console.log('📊 Spreadsheet ID:', GOOGLE_SHEET_ID);
  console.log('🔑 Credentials:', GOOGLE_CREDENTIALS_PATH);
  console.log('');

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
      spreadsheetId: GOOGLE_SHEET_ID,
    });

    console.log('✅ Conectado al spreadsheet:', metadata.data.properties.title);
    console.log('📋 Pestañas encontradas:', metadata.data.sheets.length);
    console.log('');

    let foundEcodelivery = false;
    
    for (let i = 0; i < metadata.data.sheets.length; i++) {
      const sheet = metadata.data.sheets[i];
      const title = sheet.properties.title;
      const rowCount = sheet.properties.gridProperties.rowCount;
      const columnCount = sheet.properties.gridProperties.columnCount;
      
      console.log(`${i + 1}. "${title}" (${rowCount} filas, ${columnCount} columnas)`);
      
      if (title === 'Ecodelivery') {
        foundEcodelivery = true;
        console.log('   ✅ Esta es la pestaña que busca el backend!');
        
        // Leer los headers
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: GOOGLE_SHEET_ID,
          range: `${title}!A1:Z1`,
        });
        
        if (response.data.values && response.data.values[0]) {
          console.log('   📝 Headers:', response.data.values[0].join(' | '));
        } else {
          console.log('   ⚠️  No se encontraron headers en la fila 1');
        }
      }
    }

    console.log('');
    if (!foundEcodelivery) {
      console.log('❌ NO se encontró una pestaña llamada "Ecodelivery"');
      console.log('💡 Solución: Crea o renombra una pestaña a "Ecodelivery" (exactamente así, con mayúscula)');
    } else {
      console.log('✅ La pestaña "Ecodelivery" existe');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('permission')) {
      console.log('');
      console.log('💡 Asegúrate de haber compartido el sheet con:');
      console.log('   bee-tracked-service@beezero.iam.gserviceaccount.com');
      console.log('   con permisos de "Editor"');
    }
  }
}

main();
