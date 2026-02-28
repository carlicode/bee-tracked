/**
 * Extrae pares únicos Biker,WhatsApp del CSV de pedidos y genera un nuevo CSV.
 * Uso: node scripts/extract-biker-whatsapp.js
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../data/Pedidos Ecodelivery - Beezero - Septiembre - Registros.csv');
const OUTPUT = path.join(__dirname, '../data/Biker-WhatsApp-unicos.csv');

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function escapeCsvField(value) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

const content = fs.readFileSync(INPUT, 'utf8');
const lines = content.split(/\r?\n/).filter((l) => l.length > 0);

const header = lines[0];
const fieldsHeader = parseCsvLine(header);
const idxBiker = fieldsHeader.indexOf('Biker');
const idxWhatsApp = fieldsHeader.indexOf('WhatsApp');

if (idxBiker === -1 || idxWhatsApp === -1) {
  console.error('Columnas Biker o WhatsApp no encontradas. Header:', fieldsHeader.slice(0, 20));
  process.exit(1);
}

const seen = new Set();
const pairs = [];

for (let i = 1; i < lines.length; i++) {
  const fields = parseCsvLine(lines[i]);
  const biker = (fields[idxBiker] || '').trim();
  const whatsapp = (fields[idxWhatsApp] || '').trim();
  if (!biker || !whatsapp) continue;
  const key = `${biker}\t${whatsapp}`;
  if (seen.has(key)) continue;
  seen.add(key);
  pairs.push({ biker, whatsapp });
}

const outLines = ['Biker,WhatsApp'];
for (const { biker, whatsapp } of pairs) {
  outLines.push(`${escapeCsvField(biker)},${escapeCsvField(whatsapp)}`);
}

fs.writeFileSync(OUTPUT, outLines.join('\n'), 'utf8');
console.log(`Escritos ${pairs.length} pares únicos (Biker, WhatsApp) en:\n${OUTPUT}`);
