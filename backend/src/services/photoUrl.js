const { isS3Configured } = require('./s3Upload');

/**
 * Si la foto ya es URL de S3, la devuelve. Si es base64, la sube con uploadFn.
 */
async function resolvePhotoField(foto, uploadFn) {
  if (!foto || typeof foto !== 'string') return '';
  const trimmed = foto.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  if (trimmed.startsWith('data:image/') && isS3Configured()) {
    try {
      return await uploadFn(trimmed);
    } catch (err) {
      console.error('[photoUrl] Error subiendo foto base64:', err.message);
      return '';
    }
  }

  return '';
}

module.exports = { resolvePhotoField };
