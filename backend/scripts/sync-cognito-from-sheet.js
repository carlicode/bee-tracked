/**
 * Sincroniza usuarios desde la hoja Google "usuarios-bee-tracked" con AWS Cognito.
 * - Crea usuarios nuevos en Cognito
 * - Elimina de Cognito los usuarios que ya no están en la hoja
 * - Asigna usuarios a grupos (beezero, operador, ecodelivery) según el Rol
 *
 * Uso: cd backend && node scripts/sync-cognito-from-sheet.js
 *
 * Requiere:
 * - USUARIOS_SHEET_ID (spreadsheet de usuarios)
 * - GOOGLE_CREDENTIALS_PATH
 * - COGNITO_USER_POOL_ID
 * - AWS credentials configuradas (aws configure)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const USUARIOS_SHEET_ID = process.env.USUARIOS_SHEET_ID || '1O43y1u_iIrTNSA0C0uSyueeADDLEx2mdGNs5a3pnfzw';
const SHEET_NAME = 'usuarios-bee-tracked';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_REsVOVqcY';
const REGION = process.env.AWS_REGION || 'us-east-1';

const ROL_TO_GROUP = {
  'Bee Zero': 'beezero',
  'Operador': 'operador',
  'Ecodelivery': 'ecodelivery',
};

const STOP_WORDS = new Set(['prueba', 'biker', 'admin', 'bee', 'zero', 'operador', 'de', 'test']);

function generateUsername(nombre, used = new Set(), contraseña = '') {
  const words = nombre
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return nombre.replace(/\s/g, '') + String(Math.floor(Math.random() * 100)).padStart(2, '0');
  const firstName = words[0];
  const lastName = words.length >= 2 ? words[words.length - 1] : words[0];
  const base = firstName + lastName;
  const seed = contraseña ? contraseña.slice(-2) : String(Math.floor(Math.random() * 100)).padStart(2, '0');
  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? seed : String((parseInt(seed, 10) + i) % 100).padStart(2, '0');
    const user = base + suffix;
    if (!used.has(user)) {
      used.add(user);
      return user;
    }
  }
  return base + String(Date.now()).slice(-4);
}

function parseSheetRow(row, headers, usedUsernames) {
  const nombre = (row[0] || '').trim();
  if (!nombre) return null;

  const colB = (row[1] || '').trim();
  const colC = (row[2] || '').trim();
  const colD = (row[3] || '').trim();

  const looksLikePassword = (s) => /^\d{6,10}$/.test(String(s).trim());
  const looksLikeRol = (s) => ['Bee Zero', 'Operador', 'Ecodelivery'].includes(String(s).trim());

  let usuario, contraseña, rol;

  // Caso 1: Filas bien formadas A=Nombre, B=Usuario, C=Contraseña, D=Rol
  if (colB && !looksLikePassword(colB) && looksLikePassword(colC) && looksLikeRol(colD)) {
    usuario = colB;
    contraseña = colC;
    rol = colD;
  }
  // Caso 2: Usuario faltante - A=Nombre, B=Contraseña, C=Rol (3 columnas)
  else if (looksLikePassword(colB) && looksLikeRol(colC)) {
    usuario = generateUsername(nombre, usedUsernames, colB);
    contraseña = colB;
    rol = colC;
  }
  // Caso 3: Formato alternativo
  else if (colB && looksLikePassword(colC)) {
    usuario = colB;
    contraseña = colC;
    rol = colD || 'Ecodelivery';
  } else {
    return null;
  }

  if (!contraseña) return null;
  usedUsernames.add(usuario);

  const group = ROL_TO_GROUP[rol] || 'ecodelivery';
  return { nombre, usuario, contraseña, rol, group };
}

async function getSheetUsers() {
  const credentialsPath =
    process.env.GOOGLE_CREDENTIALS_PATH ||
    path.resolve(__dirname, '../../beezero-1710ecf4e5e0.json');
  const credPath = path.isAbsolute(credentialsPath)
    ? credentialsPath
    : path.resolve(process.cwd(), credentialsPath);
  if (!fs.existsSync(credPath)) {
    throw new Error(`Credenciales no encontradas: ${credPath}`);
  }
  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  let rows = [];
  for (const sheetName of [SHEET_NAME, 'usuarios-bee-tracked', 'Sheet1', 'Hoja 1']) {
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: USUARIOS_SHEET_ID,
        range: `${sheetName}!A1:D200`,
      });
      rows = res.data.values || [];
      if (rows.length >= 2) break;
    } catch (_) {}
  }
  if (rows.length < 2) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: USUARIOS_SHEET_ID });
    const firstSheet = (meta.data.sheets || [])[0]?.properties?.title;
    if (firstSheet) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: USUARIOS_SHEET_ID,
        range: `${firstSheet}!A1:D200`,
      });
      rows = res.data.values || [];
    }
  }
  if (rows.length < 2) return [];

  const headers = rows[0];
  const usedUsernames = new Set();
  const users = [];
  const seenLower = new Set();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const u = parseSheetRow(row, headers, usedUsernames);
    if (u) {
      const key = u.usuario.toLowerCase();
      if (seenLower.has(key)) continue; // saltar duplicados
      seenLower.add(key);
      users.push(u);
    }
  }
  return users;
}

function runAws(args, ignoreError = false) {
  const cmd = `aws cognito-idp ${args.join(' ')} --user-pool-id "${USER_POOL_ID}" --region ${REGION}`;
  try {
    return execSync(cmd, { encoding: 'utf8' });
  } catch (e) {
    if (ignoreError) return null;
    throw e;
  }
}

function listCognitoUsers() {
  const users = [];
  let nextToken;
  do {
    const args = ['list-users', '--limit', '60'];
    if (nextToken) args.push(`--next-token`, nextToken);
    const out = runAws(args);
    const data = JSON.parse(out);
    for (const u of data.Users || []) {
      users.push(u.Username);
    }
    nextToken = data.PaginationToken;
  } while (nextToken);
  return users;
}

/**
 * El frontend envía el username en minúsculas a Cognito (cognito.ts línea 71).
 * Crear usuarios en minúsculas para que el login funcione.
 */
function createCognitoUser(usuario, nombre, contraseña) {
  const cognitoUsername = usuario.toLowerCase();
  const nameEsc = nombre.replace(/"/g, '\\"');
  try {
    runAws([
      'admin-create-user',
      `--username "${cognitoUsername}"`,
      `--temporary-password "Temp${contraseña}!"`,
      `--user-attributes Name=name,Value="${nameEsc}"`,
      '--message-action SUPPRESS',
    ]);
  } catch (e) {
    if (!e.message || !e.message.includes('UsernameExistsException')) throw e;
    // Usuario ya existe (ej. cuenta expirada): actualizar contraseña
  }
  try {
    runAws([
      'admin-set-user-password',
      `--username "${cognitoUsername}"`,
      `--password "${contraseña}"`,
      '--permanent',
    ]);
    return true;
  } catch (e) {
    return false;
  }
}

function addUserToGroup(cognitoUsername, group) {
  runAws(['admin-add-user-to-group', `--username "${cognitoUsername}"`, `--group-name ${group}`], true);
}

function deleteCognitoUser(usuario) {
  runAws(['admin-delete-user', `--username "${usuario}"`]);
}

async function main() {
  console.log('📊 Sincronizando usuarios desde Google Sheet con Cognito\n');
  console.log('   Sheet:', USUARIOS_SHEET_ID);
  console.log('   User Pool:', USER_POOL_ID);
  console.log('');

  const sheetUsers = await getSheetUsers();
  const sheetUsernames = new Set(sheetUsers.map((u) => u.usuario));
  const sheetUsernamesLower = new Set(sheetUsers.map((u) => u.usuario.toLowerCase()));
  console.log(`✅ ${sheetUsers.length} usuarios en la hoja\n`);

  const cognitoUsers = listCognitoUsers();
  const cognitoUsersLower = new Set(cognitoUsers.map((u) => u.toLowerCase()));
  const lowerToActual = new Map();
  for (const u of cognitoUsers) {
    lowerToActual.set(u.toLowerCase(), u);
  }
  console.log(`📋 ${cognitoUsers.length} usuarios en Cognito\n`);

  // Crear usuarios nuevos en minúsculas (el frontend envía lowercase al login)
  let created = 0;
  for (const u of sheetUsers) {
    const userLower = u.usuario.toLowerCase();
    if (!cognitoUsersLower.has(userLower)) {
      process.stdout.write(`   Creando ${userLower} (${u.nombre})... `);
      try {
        if (createCognitoUser(u.usuario, u.nombre, u.contraseña)) {
          addUserToGroup(userLower, u.group);
          console.log('✅');
          created++;
        } else {
          console.log('⚠️ error');
        }
      } catch (e) {
        console.log('⚠️', e.message);
      }
    }
  }
  if (created > 0) console.log(`\n✅ ${created} usuarios creados\n`);

  // Asignar grupos a usuarios existentes (usar username exacto de Cognito)
  for (const u of sheetUsers) {
    const actualUsername = lowerToActual.get(u.usuario.toLowerCase());
    if (actualUsername) {
      try {
        addUserToGroup(actualUsername, u.group);
      } catch (_) {}
    }
  }

  // Eliminar usuarios que ya no están en la hoja (comparar case-insensitive)
  const toDelete = cognitoUsers.filter((username) => !sheetUsernamesLower.has(username.toLowerCase()));
  if (toDelete.length > 0) {
    console.log(`🗑️  Eliminando ${toDelete.length} usuarios que ya no están en la hoja:\n`);
    for (const username of toDelete) {
      process.stdout.write(`   Eliminando ${username}... `);
      try {
        deleteCognitoUser(username);
        console.log('✅');
      } catch (e) {
        console.log('⚠️', e.message);
      }
    }
    console.log('');
  }

  console.log('✅ Sincronización completada');
}

main().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
