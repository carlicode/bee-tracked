const express = require('express');
const {
  listAllCognitoUsers,
  createCognitoUser,
  ROL_TO_GROUP,
} = require('../services/cognitoUsersService');

const router = express.Router();

const VALID_ROLES = Object.keys(ROL_TO_GROUP);

router.get('/', async (req, res) => {
  try {
    const users = await listAllCognitoUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error('adminUsers GET:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al listar usuarios de Cognito',
    });
  }
});

router.post('/', async (req, res) => {
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

    const existing = await listAllCognitoUsers();
    const dup = existing.find(
      (u) => u.usuario.toLowerCase() === usuarioTrim.toLowerCase()
    );
    if (dup) {
      return res.status(409).json({
        success: false,
        error: 'El usuario ya existe en Cognito',
        code: 'DUPLICATE',
      });
    }

    const user = await createCognitoUser({
      nombre: nombreTrim,
      usuario: usuarioTrim,
      password: passwordTrim,
      rol: rolTrim,
    });

    res.json({ success: true, user });
  } catch (err) {
    console.error('adminUsers POST:', err);
    const code = err.name === 'InvalidPasswordException' ? 400 : 500;
    res.status(code).json({
      success: false,
      error: err.message || 'Error al crear usuario en Cognito',
    });
  }
});

module.exports = router;
