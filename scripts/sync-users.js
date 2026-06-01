#!/usr/bin/env node
/**
 * Sincroniza la base de datos de usuarios con el CSV maestro.
 *
 * Acciones:
 *  1. Elimina de los archivos de base de datos a los usuarios marcados como "Inactivo"
 *  2. Genera Usuario y Contraseña para los que no tienen, siguiendo el patrón:
 *       NombreApellido + 2 dígitos aleatorios (sin tildes ni espacios)
 *  3. Actualiza el CSV maestro con los nuevos usuarios generados
 *
 * Uso: node scripts/sync-users.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MASTER_CSV = path.join(ROOT, 'Usuarios - usuarios-y-contraseñas-ecodelivery.csv');
const ECO_CSV = path.join(ROOT, 'backend', 'data', 'ecodelivery-credentials.csv');
const BEE_CSV = path.join(ROOT, 'backend', 'data', 'usuarios-bee-tracked.csv');

// ── Helpers ──────────────────────────────────────────────────────────────────

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Capitaliza la primera letra */
function cap(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Genera un nombre de usuario a partir del nombre completo.
 * Patrón: PrimerNombre + PrimerApellido + 2 dígitos (sin tildes)
 */
function buildUsernameBase(fullName) {
  // Limpia tabs y espacios múltiples
  const cleaned = fullName.replace(/[\t\r]/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ').filter(Boolean);

  if (parts.length === 0) return 'Usuario';
  if (parts.length === 1) return cap(removeAccents(parts[0]));

  const firstName = cap(removeAccents(parts[0]));

  // 2 palabras: NombreApellido
  if (parts.length === 2) return firstName + cap(removeAccents(parts[1]));

  // 3 palabras: Nombre + última palabra (apellido)
  if (parts.length === 3) return firstName + cap(removeAccents(parts[2]));

  // 4+ palabras: Nombre + tercera palabra (primer apellido)
  return firstName + cap(removeAccents(parts[2]));
}

function generateUsername(fullName, existingLower) {
  const base = buildUsernameBase(fullName);
  let username;
  let tries = 0;
  do {
    const digits = String(Math.floor(Math.random() * 90) + 10); // 10–99
    username = base + digits;
    tries++;
    if (tries > 200) throw new Error(`No se pudo generar usuario único para: ${fullName}`);
  } while (existingLower.has(username.toLowerCase()));
  return username;
}

// ── Parser de CSV maestro ─────────────────────────────────────────────────────

/**
 * Parsea una línea CSV respetando comillas y convierte tabs internos en espacio.
 * Retorna array de strings con trim aplicado.
 */
function parseCsvLine(line) {
  const parts = [];
  let inQuotes = false;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') inQuotes = false;
      else current += c === '\t' ? ' ' : c;
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ',') { parts.push(current.trim()); current = ''; }
      else current += c === '\t' ? ' ' : c;
    }
  }
  parts.push(current.trim());
  return parts;
}

function readMasterCsv() {
  const content = fs.readFileSync(MASTER_CSV, 'utf8');
  const lines = content.split(/\r?\n/);
  const header = lines[0];
  const rows = lines.slice(1).map((line, idx) => {
    if (!line.trim()) return null;
    const p = parseCsvLine(line);
    return {
      _raw: line,
      _idx: idx + 1,
      biker: p[0] || '',
      usuario: p[1] || '',
      contrasena: p[2] || '',
      rol: p[3] || '',
      estado: p[4] || '',
    };
  }).filter(Boolean);
  return { header, rows };
}

// ── Leer/escribir archivos de BD ──────────────────────────────────────────────

function readSimpleCsv(filePath) {
  if (!fs.existsSync(filePath)) return { header: '', rows: [] };
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  const header = lines[0];
  const rows = lines.slice(1).map(l => parseCsvLine(l));
  return { header, rows };
}

function rowToEcoCsv(biker, user, password) {
  return `${biker},${user},${password}`;
}

function rowToBeeCsv(nombre, usuario, contrasena, rol) {
  return `${nombre},${usuario},${contrasena},${rol}`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const { header: masterHeader, rows: masterRows } = readMasterCsv();
  const { header: ecoHeader, rows: ecoRows } = readSimpleCsv(ECO_CSV);
  const { header: beeHeader, rows: beeRows } = readSimpleCsv(BEE_CSV);

  // Determina usuarios inactivos (por username o por nombre+contraseña)
  const inactiveNames = new Set();
  const inactiveUsers = new Set(); // usernames en minúsculas

  masterRows.forEach(r => {
    const estadoClean = r.estado.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (estadoClean === 'inactivo') {
      inactiveNames.add(r.biker.toLowerCase());
      if (r.usuario) inactiveUsers.add(r.usuario.toLowerCase());
    }
  });

  console.log('\n── Usuarios INACTIVOS (se eliminarán) ──────────────────');
  masterRows
    .filter(r => r.estado.replace(/[^a-zA-Z]/g, '').toLowerCase() === 'inactivo')
    .forEach(r => console.log(`  ✗  ${r.biker}  (${r.usuario || 'sin usuario'})`));

  // Filtra filas inactivas de ecodelivery-credentials.csv
  const filteredEco = ecoRows.filter(r => {
    const userLower = (r[1] || '').toLowerCase();
    const bikerLower = (r[0] || '').toLowerCase();
    if (userLower && inactiveUsers.has(userLower)) return false;
    if (inactiveNames.has(bikerLower)) return false;
    return true;
  });

  // Filtra filas inactivas de usuarios-bee-tracked.csv
  const filteredBee = beeRows.filter(r => {
    const userLower = (r[1] || '').toLowerCase();
    const bikerLower = (r[0] || '').toLowerCase();
    if (userLower && inactiveUsers.has(userLower)) return false;
    if (inactiveNames.has(bikerLower)) return false;
    return true;
  });

  // Conjunto de usuarios ya existentes (para evitar colisiones)
  const existingLower = new Set([
    ...filteredEco.map(r => (r[1] || '').toLowerCase()).filter(Boolean),
    ...filteredBee.map(r => (r[1] || '').toLowerCase()).filter(Boolean),
  ]);

  // Genera usuarios para los que no tienen (no inactivos)
  console.log('\n── Usuarios NUEVOS (se crearán) ────────────────────────');
  const newEcoRows = [];
  const newBeeRows = [];

  // Actualiza masterRows con nuevos usuarios generados
  const updatedMasterRows = masterRows.map(r => {
    const estadoClean = r.estado.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (estadoClean === 'inactivo') return r; // se eliminarán, no modificar

    if (!r.usuario && r.biker && r.contrasena) {
      const username = generateUsername(r.biker, existingLower);
      existingLower.add(username.toLowerCase());

      console.log(`  +  ${r.biker.padEnd(40)} →  ${username}`);

      const newRow = { ...r, usuario: username };

      // Agrega a la BD correspondiente
      const userType = r.rol === 'Bee Zero' ? 'Bee Zero' : r.rol === 'Operador' ? 'Operador' : 'Ecodelivery';
      newEcoRows.push(rowToEcoCsv(r.biker, username, r.contrasena));
      newBeeRows.push(rowToBeeCsv(r.biker, username, r.contrasena, userType));

      return newRow;
    }
    return r;
  });

  // Construye contenidos finales
  const ecoContent = [
    ecoHeader,
    ...filteredEco.map(r => r.join(',')),
    ...newEcoRows,
  ].join('\n') + '\n';

  // usuarios-bee-tracked.csv se reconstruye SIEMPRE desde el maestro activo
  // para garantizar que roles y usuarios estén 100% sincronizados
  const activeMasterRows = updatedMasterRows.filter(
    r => r.estado.replace(/[^a-zA-Z]/g, '').toLowerCase() !== 'inactivo' && r.usuario && r.contrasena
  );
  const beeContent = [
    'Nombre,Usuario,Contraseña,Rol',
    ...activeMasterRows.map(r => {
      const nombre = r.biker.includes(',') || r.biker.includes('"') ? `"${r.biker}"` : r.biker;
      return `${nombre},${r.usuario},${r.contrasena},${r.rol}`;
    }),
  ].join('\n') + '\n';

  // Reconstruye CSV maestro (mantiene solo usuarios activos + los nuevos con usuario)
  const masterContent = [
    masterHeader,
    ...updatedMasterRows
      .filter(r => r.estado.replace(/[^a-zA-Z]/g, '').toLowerCase() !== 'inactivo')
      .map(r => {
        // Escapa campos con comas o comillas
        const fields = [r.biker, r.usuario, r.contrasena, r.rol, r.estado];
        return fields.map(f => (f.includes(',') || f.includes('"') ? `"${f}"` : f)).join(',');
      }),
  ].join('\n') + '\n';

  // Escribe archivos
  fs.writeFileSync(ECO_CSV, ecoContent, 'utf8');
  fs.writeFileSync(BEE_CSV, beeContent, 'utf8');
  fs.writeFileSync(MASTER_CSV, masterContent, 'utf8');

  console.log('\n── Resumen ─────────────────────────────────────────────');
  console.log(`  ecodelivery-credentials.csv : ${filteredEco.length + newEcoRows.length} usuarios activos`);
  console.log(`  usuarios-bee-tracked.csv    : ${filteredBee.length + newBeeRows.length} usuarios activos`);
  console.log(`  CSV maestro                 : ${updatedMasterRows.filter(r => r.estado.replace(/[^a-zA-Z]/g, '').toLowerCase() !== 'inactivo').length} usuarios activos`);
  console.log('\n✅ Sincronización completada.\n');
}

main();
