/**
 * Prueba envío de email de permiso (Gmail SMTP).
 * Uso: cd backend && node scripts/test-permiso-email.js
 * Usa variables de entorno o parámetros SSM /bee-tracked/GMAIL_*
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const emailService = require('../src/services/emailService');

async function main() {
  const cfg = await emailService.loadMailConfig();
  console.log('GMAIL_USER:', cfg.gmailUser || '(vacío)');
  console.log('GMAIL_APP_PASSWORD:', cfg.gmailPass ? '***' + cfg.gmailPass.slice(-4) : '(vacío)');
  console.log('PERMISO_NOTIFY_EMAILS:', cfg.recipients.join(', ') || '(vacío)');
  console.log('');

  await emailService.sendPermisoNotification({
    userName: 'Prueba BeeTracked',
    fecha: new Date().toISOString().slice(0, 10),
    motivo: 'Correo de prueba desde script',
  });
  console.log('OK — revisa la bandeja de los destinatarios.');
}

main().catch((err) => {
  console.error('FALLO:', err.message);
  if (err.message.includes('BadCredentials') || err.code === 'EAUTH') {
    console.error('\nLa contraseña de aplicación de Google no es válida.');
    console.error('Genera una nueva en: Cuenta Google → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones');
    console.error('Luego actualiza SSM:');
    console.error('  aws ssm put-parameter --name /bee-tracked/GMAIL_APP_PASSWORD --value "TU_PASSWORD_16_CHARS" --type SecureString --overwrite');
  }
  process.exit(1);
});
