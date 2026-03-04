/**
 * Sincroniza usuarios desde data/usuarios-bee-tracked.csv con AWS Cognito.
 * - Crea usuarios nuevos en Cognito
 * - Actualiza contraseñas y grupos de usuarios existentes
 * - Elimina de Cognito los usuarios que ya no están en el CSV
 *
 * Uso: cd backend && node scripts/sync-cognito-from-csv.js
 *
 * Requiere: AWS credentials configuradas (aws configure)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CSV_PATH =
  process.env.USUARIOS_CSV_PATH ||
  path.join(__dirname, '../../data/usuarios-bee-tracked.csv');
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'us-east-1_REsVOVqcY';
const REGION = process.env.AWS_REGION || 'us-east-1';

const ROL_TO_GROUP = {
  'Bee Zero': 'beezero',
  Operador: 'operador',
  Ecodelivery: 'ecodelivery',
};

function parseCsv(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const users = [];
  const seenLower = new Set();
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = [];
    let inQuotes = false;
    let current = '';
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (inQuotes) {
        if (c === '"') inQuotes = false;
        else current += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ',') {
          parts.push(current.trim());
          current = '';
        } else current += c;
      }
    }
    parts.push(current.trim());
    if (parts.length >= 4) {
      const nombre = parts[0];
      const usuario = parts[1];
      const contraseña = parts[2];
      const rol = parts[3].trim();
      if (!nombre || !usuario || !contraseña) continue;
      const key = usuario.toLowerCase();
      if (seenLower.has(key)) continue;
      seenLower.add(key);
      const group = ROL_TO_GROUP[rol] || 'ecodelivery';
      users.push({ nombre, usuario, contraseña, rol, group });
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
    if (nextToken) args.push('--next-token', nextToken);
    const out = runAws(args);
    const data = JSON.parse(out);
    for (const u of data.Users || []) {
      users.push(u.Username);
    }
    nextToken = data.PaginationToken;
  } while (nextToken);
  return users;
}

function createCognitoUser(usuario, nombre, contraseña) {
  const cognitoUsername = usuario.toLowerCase();
  const nameEsc = nombre.replace(/"/g, '\\"');
  const passEsc = contraseña.replace(/"/g, '\\"');
  try {
    runAws([
      'admin-create-user',
      `--username "${cognitoUsername}"`,
      `--temporary-password "Temp${passEsc}!"`,
      `--user-attributes Name=name,Value="${nameEsc}"`,
      '--message-action SUPPRESS',
    ]);
  } catch (e) {
    if (!e.message || !e.message.includes('UsernameExistsException')) throw e;
  }
  try {
    runAws([
      'admin-set-user-password',
      `--username "${cognitoUsername}"`,
      `--password "${passEsc}"`,
      '--permanent',
    ]);
    return true;
  } catch (e) {
    return false;
  }
}

function addUserToGroup(cognitoUsername, group) {
  runAws(
    ['admin-add-user-to-group', `--username "${cognitoUsername}"`, `--group-name ${group}`],
    true
  );
}

function deleteCognitoUser(usuario) {
  runAws(['admin-delete-user', `--username "${usuario}"`]);
}

async function main() {
  console.log('📊 Sincronizando usuarios desde CSV con Cognito\n');
  console.log('   CSV:', CSV_PATH);
  console.log('   User Pool:', USER_POOL_ID);
  console.log('');

  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`Archivo no encontrado: ${CSV_PATH}`);
  }

  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const csvUsers = parseCsv(content);
  const csvUsernamesLower = new Set(csvUsers.map((u) => u.usuario.toLowerCase()));
  console.log(`✅ ${csvUsers.length} usuarios en el CSV\n`);

  const cognitoUsers = listCognitoUsers();
  const cognitoUsersLower = new Set(cognitoUsers.map((u) => u.toLowerCase()));
  const lowerToActual = new Map();
  for (const u of cognitoUsers) {
    lowerToActual.set(u.toLowerCase(), u);
  }
  console.log(`📋 ${cognitoUsers.length} usuarios en Cognito\n`);

  let created = 0;
  for (const u of csvUsers) {
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

  for (const u of csvUsers) {
    const actualUsername = lowerToActual.get(u.usuario.toLowerCase());
    if (actualUsername) {
      try {
        createCognitoUser(u.usuario, u.nombre, u.contraseña);
        addUserToGroup(actualUsername, u.group);
      } catch (_) {}
    }
  }

  const toDelete = cognitoUsers.filter(
    (username) => !csvUsernamesLower.has(username.toLowerCase())
  );
  if (toDelete.length > 0) {
    console.log(`🗑️  Eliminando ${toDelete.length} usuarios que ya no están en el CSV:\n`);
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
