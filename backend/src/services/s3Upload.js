const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || process.env.AWS_REGION_CUSTOM || 'us-east-1';

/** Prefijos en el bucket: beezero/tablero/ y beezero/danos/ */
const PREFIX_TABLERO = 'beezero/tablero/';
const PREFIX_DANOS = 'beezero/danos/';

/** Carpeta Ecodelivery Turnos: Registros_BeeTracked/Ecodelivery/Turnos/ */
const PREFIX_ECODELIVERY_TURNOS = 'Registros_BeeTracked/Ecodelivery/Turnos/';

/** Carpeta Ecodelivery Deliveries: Registros_BeeTracked/Ecodelivery/Deliveries/ */
const PREFIX_ECODELIVERY_DELIVERIES = 'Registros_BeeTracked/Ecodelivery/Deliveries/';

let s3Client = null;

function getS3() {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET no está configurado');
  }
  
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  
  // En Lambda, resetear el cliente en cada invocación para evitar caching de credenciales
  if (isLambda && s3Client) {
    s3Client = null;
  }
  
  if (!s3Client) {
    const config = {
      region: REGION,
    };
    
    // En Lambda, NO configurar credenciales explícitas (usar IAM role)
    if (!isLambda) {
      // Solo en local: usar credenciales explícitas si están disponibles
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        };
      }
    }
    
    s3Client = new S3Client(config);
  }
  return s3Client;
}

/**
 * Convierte base64 (data URL) a Buffer y detecta Content-Type
 * @param {string} dataUrl - Ej: "data:image/jpeg;base64,/9j/4AAQ..."
 * @returns {{ body: Buffer, contentType: string, ext: string }}
 */
function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Imagen inválida');
  }
  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de imagen no soportado. Use data URL base64 (image/jpeg o image/png).');
  }
  const [, format, base64] = match;
  const body = Buffer.from(base64, 'base64');
  const contentType = `image/${format}`;
  const ext = format === 'jpeg' || format === 'jpg' ? 'jpg' : format;
  return { body, contentType, ext };
}

/**
 * Sube una imagen a S3 en la carpeta correspondiente
 * @param {object} opts
 * @param {string} opts.dataUrl - Imagen en base64 (data:image/...;base64,...)
 * @param {string|number} opts.turnoId - ID del turno (1, 2, 3...)
 * @param {'tablero'|'danos'} opts.tipo - Carpeta: tablero o danos
 * @param {'inicio'|'cierre'} opts.momento - inicio o cierre del turno
 * @returns {Promise<string>} URL pública de la imagen
 */
async function uploadBeezeroPhoto({ dataUrl, turnoId, tipo, momento }) {
  const s3 = getS3();
  const { body, contentType, ext } = parseDataUrl(dataUrl);

  const prefix = tipo === 'tablero' ? PREFIX_TABLERO : PREFIX_DANOS;
  const timestamp = Date.now();
  const key = `${prefix}${turnoId}_${momento}_${timestamp}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // URL pública (si el bucket tiene policy de lectura pública)
  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return url;
}

/**
 * Sanitiza nombre de usuario para usar en clave S3 (solo alfanuméricos y guión bajo)
 */
function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') return 'biker';
  return username.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 64) || 'biker';
}

/**
 * Sube foto de turno Ecodelivery a S3 (iniciar/cerrar turno)
 * Ruta: Registros_BeeTracked/Ecodelivery/Turnos/{usuario}_{YYYY-MM-DD}_{HH-mm-ss}_{momento}.ext
 * @param {object} opts
 * @param {string} opts.dataUrl - Imagen en base64 (data:image/...;base64,...)
 * @param {string} opts.username - Nombre del biker (se sanitiza para el archivo)
 * @param {'inicio'|'cierre'} opts.momento - inicio o cierre del turno
 * @returns {Promise<string>} URL pública de la imagen
 */
async function uploadEcodeliveryPhoto({ dataUrl, username, momento }) {
  const s3 = getS3();
  const { body, contentType, ext } = parseDataUrl(dataUrl);

  const safeName = sanitizeUsername(username);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-mm-ss
  const key = `${PREFIX_ECODELIVERY_TURNOS}${safeName}_${dateStr}_${timeStr}_${momento}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return url;
}

/**
 * Sube foto de delivery Ecodelivery a S3 (registrar delivery)
 * Ruta: Registros_BeeTracked/Ecodelivery/Deliveries/{usuario}_{YYYY-MM-DD}_{HH-mm-ss}.ext
 * @param {object} opts
 * @param {string} opts.dataUrl - Imagen en base64 (data:image/...;base64,...)
 * @param {string} opts.username - Nombre del biker (se sanitiza para el archivo)
 * @returns {Promise<string>} URL pública de la imagen
 */
async function uploadEcodeliveryDeliveryPhoto({ dataUrl, username }) {
  const s3 = getS3();
  const { body, contentType, ext } = parseDataUrl(dataUrl);

  const safeName = sanitizeUsername(username);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-'); // HH-mm-ss
  const key = `${PREFIX_ECODELIVERY_DELIVERIES}${safeName}_${dateStr}_${timeStr}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
  return url;
}

/**
 * Comprueba si S3 está configurado
 * En Lambda: solo necesita BUCKET (usa rol IAM automáticamente)
 * En local: necesita BUCKET y credenciales explícitas
 */
function isS3Configured() {
  const hasBasicConfig = Boolean(BUCKET);
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const hasLocalCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
  
  // En Lambda, solo necesitamos bucket (usa IAM role)
  if (isLambda) {
    return hasBasicConfig;
  }
  
  // En local, necesitamos bucket y credenciales
  return hasBasicConfig && hasLocalCredentials;
}

module.exports = {
  uploadBeezeroPhoto,
  uploadEcodeliveryPhoto,
  uploadEcodeliveryDeliveryPhoto,
  isS3Configured,
  PREFIX_TABLERO,
  PREFIX_DANOS,
  PREFIX_ECODELIVERY_TURNOS,
  PREFIX_ECODELIVERY_DELIVERIES,
};
