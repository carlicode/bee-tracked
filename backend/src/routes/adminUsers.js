const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '../..', 'data');
const USUARIOS_PATH = path.join(DATA_DIR, 'usuarios-bee-tracked.csv');

const VALID_ROLES = ['Ecodelivery', 'Bee Zero', 'Operador', 'Admin'];

function parseCsvUsers() {
  if (!fs.existsSync(USUARIOS_PATH)) return [];
  const content = fs.readFileSync(USUARIOS_PATH, 'utf8');
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  const users = [];
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
      users.push({
        nombre: parts[0],
        usuario: parts[1],
        rol: parts[3],
      });
    }
  }
  return users;
}

function escapeCsvField(value) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

router.get('/', (req, res) => {
  try {
    const users = parseCsvUsers();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error al leer usuarios',
    });
  }
});

router.post('/', (req, res) => {
  try {
    const { nombre, usuario, password, rol } = req.body || {};
    const nombreTrim = String(nombre || '').trim();
    const usuarioTrim = String(usuario || '').trim();
    const passwordTrim = String(password || '').trim();
    const rolTrim = String(rol || '').trim();

    if (!nombreTrim || !usuarioTrim || !passwordTrim || !rolTrim) {
      return res.status(400).json({
        success: false,
        error: 'Faltan nombre, usuario, contraseña o rol',
        code: 'VALIDATION_ERROR',
      });
    }

    if (!VALID_ROLES.includes(rolTrim)) {
      return res.status(400).json({
        success: false,
        error: `Rol inválido. Valores: ${VALID_ROLES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      });
    }

    const existing = parseCsvUsers();
    const dup = existing.find(
      (u) => u.usuario.toLowerCase() === usuarioTrim.toLowerCase()
    );
    if (dup) {
      return res.status(409).json({
        success: false,
        error: 'El usuario ya existe',
        code: 'DUPLICATE',
      });
    }

    const row = [
      escapeCsvField(nombreTrim),
      escapeCsvField(usuarioTrim),
      escapeCsvField(passwordTrim),
      escapeCsvField(rolTrim),
    ].join(',');

    if (!fs.existsSync(USUARIOS_PATH)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(
        USUARIOS_PATH,
        'Nombre,Usuario,Contraseña,Rol\n',
        'utf8'
      );
    }

    fs.appendFileSync(USUARIOS_PATH, `${row}\n`, 'utf8');

    res.json({
      success: true,
      user: { nombre: nombreTrim, usuario: usuarioTrim, rol: rolTrim },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error al crear usuario',
    });
  }
});

module.exports = router;
