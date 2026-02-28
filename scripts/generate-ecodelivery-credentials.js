/**
 * Genera usuarios y contraseñas para Ecodelivery a partir de Biker-WhatsApp-unicos.csv
 * - User = primer nombre + primer apellido + 2 dígitos (ej: AngeloPorco31, LauraQuito76)
 * - Si el nombre contiene "prueba": user = solo primer nombre + 3 dígitos (ej: Angelo731)
 * - Password = WhatsApp sin "591 " ni espacios
 *
 * Uso: node scripts/generate-ecodelivery-credentials.js
 * Salida: data/ecodelivery-credentials.csv (Biker,User,Password)
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../data/Biker-WhatsApp-unicos.csv');
const OUTPUT = path.join(__dirname, '../data/ecodelivery-credentials.csv');

const STOP_WORDS = new Set(['prueba', 'biker', 'admin', 'bee', 'zero', 'operador', 'de']);

function twoRandomDigits() {
  return String(Math.floor(Math.random() * 100)).padStart(2, '0');
}

function threeRandomDigits() {
  return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

function passwordFromWhatsApp(whatsapp) {
  return (whatsapp || '')
    .replace(/^\s*591\s*/i, '')
    .replace(/\s/g, '')
    .trim();
}

/**
 * Genera user: primer nombre + primer apellido + 2 dígitos, o si contiene "prueba" solo primer nombre + 3 dígitos.
 * Sin espacios: "Laura Quito" -> "LauraQuito76"
 */
function userFromBiker(biker) {
  const raw = biker.trim();
  const hasPrueba = raw.toLowerCase().includes('prueba');
  const words = raw.split(/\s+/).filter((w) => w.length > 0 && !STOP_WORDS.has(w.toLowerCase()));

  if (words.length === 0) return raw.replace(/\s/g, '') + twoRandomDigits();

  const firstName = words[0];
  if (hasPrueba) {
    return firstName + threeRandomDigits();
  }
  const firstApellido = words.length >= 4 ? words[2] : (words.length >= 2 ? words[words.length - 1] : '');
  const base = firstApellido ? firstName + firstApellido : firstName;
  return base + twoRandomDigits();
}

const content = fs.readFileSync(INPUT, 'utf8');
const lines = content.split(/\r?\n/).filter((l) => l.length > 0);

const rows = [];
const header = lines[0];
if (header !== 'Biker,WhatsApp') {
  console.warn('Header esperado: Biker,WhatsApp. Encontrado:', header);
}

const usedUsers = new Set();
function uniqueUserFromBiker(biker) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const user = userFromBiker(biker);
    if (!usedUsers.has(user)) {
      usedUsers.add(user);
      return user;
    }
  }
  return userFromBiker(biker) + String(Math.floor(Math.random() * 10)); // fallback: añadir un dígito extra
}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const commaIdx = line.indexOf(',');
  const biker = (commaIdx >= 0 ? line.slice(0, commaIdx) : line).trim();
  const whatsapp = (commaIdx >= 0 ? line.slice(commaIdx + 1) : '').trim();

  if (!biker || biker.toUpperCase() === 'ASIGNAR BIKER') continue;

  const user = uniqueUserFromBiker(biker);
  const password = passwordFromWhatsApp(whatsapp);
  if (!password) continue;

  rows.push({ biker, user, password });
}

const outLines = ['Biker,User,Password'];
rows.forEach(({ biker, user, password }) => {
  const escape = (s) => (s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s);
  outLines.push(`${escape(biker)},${escape(user)},${password}`);
});

fs.writeFileSync(OUTPUT, outLines.join('\n'), 'utf8');
console.log(`Generadas ${rows.length} credenciales en:\n${OUTPUT}`);
console.log('User = primer nombre + primer apellido + 2 dígitos (o solo nombre + 3 dígitos si contiene "prueba")');
