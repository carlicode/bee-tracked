const nodemailer = require('nodemailer');

function getRecipients() {
  const raw = process.env.PERMISO_NOTIFY_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
}

function buildHtml({ userName, fecha, motivo }) {
  const fechaDisplay = fecha.split('-').reverse().join('/');
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:24px 32px;">
              <p style="margin:0;color:#f5c842;font-size:20px;font-weight:bold;letter-spacing:1px;">🐝 BeeTracked</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;color:#1a1a2e;">Nueva solicitud de permiso</h1>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Se recibió una solicitud que requiere tu respuesta.</p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Conductor</span>
                    <p style="margin:4px 0 0;color:#111827;font-size:16px;font-weight:600;">${userName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;border-bottom:1px solid #e5e7eb;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Fecha solicitada</span>
                    <p style="margin:4px 0 0;color:#111827;font-size:16px;font-weight:600;">${fechaDisplay}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 20px;">
                    <span style="color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.5px;">Motivo</span>
                    <p style="margin:4px 0 0;color:#111827;font-size:16px;font-weight:600;">${motivo}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#374151;font-size:14px;line-height:1.6;">
                Entra a la plataforma para <strong>aprobar o rechazar</strong> el permiso antes de que el conductor inicie su turno en esa fecha.
              </p>

              <a href="https://d19ls0k7de9u6w.cloudfront.net" style="display:inline-block;background:#f5c842;color:#1a1a2e;font-weight:bold;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
                Ir a la plataforma →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">Este correo fue enviado automáticamente por BeeTracked. No responder a este mensaje.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendPermisoNotification({ userName, fecha, motivo }) {
  const gmailUser = process.env.GMAIL_USER;
  if (!gmailUser) return;

  const recipients = getRecipients();
  if (recipients.length === 0) return;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const fechaDisplay = fecha.split('-').reverse().join('/');

  await transporter.sendMail({
    from: `"BeeTracked" <${gmailUser}>`,
    to: recipients.join(', '),
    subject: `Nueva solicitud de permiso — ${userName} (${fechaDisplay})`,
    html: buildHtml({ userName, fecha, motivo }),
  });
}

module.exports = {
  sendPermisoNotification,
};
