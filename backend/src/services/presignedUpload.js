const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { S3Client } = require('@aws-sdk/client-s3');

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || process.env.AWS_REGION_CUSTOM || 'us-east-1';

const PREFIX_TABLERO = 'beezero/tablero/';
const PREFIX_DANOS = 'beezero/danos/';
const PREFIX_ECODELIVERY_TURNOS = 'Registros_BeeTracked/Ecodelivery/Turnos/';
const PREFIX_ECODELIVERY_DELIVERIES = 'Registros_BeeTracked/Ecodelivery/Deliveries/';
const PREFIX_BEEZERO_CARRERAS = 'beezero/carreras/';
const PREFIX_BEEZERO_GASTOS = 'beezero/gastos drivers/';
const PREFIX_PERMISOS = 'beezero/permisos/';

const VALID_TIPOS = [
  'beezero-tablero',
  'beezero-exterior',
  'beezero-carrera',
  'beezero-gasto',
  'permiso-comprobante',
  'eco-turno',
  'eco-delivery',
];

const PRESIGN_EXPIRES_SEC = 600;

let s3Client = null;

function getS3() {
  if (!BUCKET) {
    throw new Error('AWS_S3_BUCKET no está configurado');
  }

  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isLambda && s3Client) {
    s3Client = null;
  }

  if (!s3Client) {
    const config = { region: REGION };
    if (!isLambda && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      config.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }
    s3Client = new S3Client(config);
  }
  return s3Client;
}

function sanitizeUsername(username) {
  if (!username || typeof username !== 'string') return 'user';
  return username.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 64) || 'user';
}

function normalizeExt(ext) {
  const e = String(ext || 'jpg').toLowerCase().replace(/^\./, '');
  if (e === 'jpeg') return 'jpg';
  if (['jpg', 'png', 'webp'].includes(e)) return e;
  return 'jpg';
}

function contentTypeForExt(ext) {
  const e = normalizeExt(ext);
  if (e === 'png') return 'image/png';
  if (e === 'webp') return 'image/webp';
  return 'image/jpeg';
}

/**
 * Construye la clave S3 con el mismo esquema que s3Upload.js
 */
function buildObjectKey(tipo, contexto, ext) {
  const ctx = contexto || {};
  const timestamp = Date.now();
  const safeExt = normalizeExt(ext);

  switch (tipo) {
    case 'beezero-tablero': {
      const turnoId = ctx.turnoId != null ? String(ctx.turnoId) : 'new';
      const momento = ctx.momento === 'cierre' ? 'cierre' : 'inicio';
      return `${PREFIX_TABLERO}${turnoId}_${momento}_${timestamp}.${safeExt}`;
    }
    case 'beezero-exterior': {
      const turnoId = ctx.turnoId != null ? String(ctx.turnoId) : 'new';
      const momento = ctx.momento === 'cierre' ? 'cierre' : 'inicio';
      return `${PREFIX_DANOS}${turnoId}_${momento}_${timestamp}.${safeExt}`;
    }
    case 'beezero-carrera': {
      const abejita = sanitizeUsername(ctx.abejita || ctx.userId);
      const fecha = ctx.fecha
        ? String(ctx.fecha).slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      return `${PREFIX_BEEZERO_CARRERAS}${abejita}_${fecha}_${timestamp}.${safeExt}`;
    }
    case 'beezero-gasto': {
      const abejita = sanitizeUsername(ctx.abejita || ctx.userId);
      const turnoId = ctx.turnoId != null ? String(ctx.turnoId) : 'new';
      const num = ctx.num != null ? Number(ctx.num) : 1;
      return `${PREFIX_BEEZERO_GASTOS}${abejita}_${turnoId}_gasto-${num}_${timestamp}.${safeExt}`;
    }
    case 'permiso-comprobante': {
      const user = sanitizeUsername(ctx.userId || ctx.username);
      return `${PREFIX_PERMISOS}${user}_${timestamp}.${safeExt}`;
    }
    case 'eco-turno': {
      const safeName = sanitizeUsername(ctx.username || ctx.userId);
      const now = new Date();
      const dateStr = ctx.fecha
        ? String(ctx.fecha).slice(0, 10)
        : now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      const momento = ctx.momento === 'cierre' ? 'cierre' : 'inicio';
      return `${PREFIX_ECODELIVERY_TURNOS}${safeName}_${dateStr}_${timeStr}_${momento}.${safeExt}`;
    }
    case 'eco-delivery': {
      const safeName = sanitizeUsername(ctx.username || ctx.userId);
      const now = new Date();
      const dateStr = ctx.fecha
        ? String(ctx.fecha).slice(0, 10)
        : now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
      return `${PREFIX_ECODELIVERY_DELIVERIES}${safeName}_${dateStr}_${timeStr}.${safeExt}`;
    }
    default:
      throw new Error(`Tipo de foto no soportado: ${tipo}`);
  }
}

function publicUrl(key) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

function isPresignedUploadConfigured() {
  const hasBasicConfig = Boolean(BUCKET);
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const hasLocalCredentials = Boolean(
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
  );
  if (isLambda) return hasBasicConfig;
  return hasBasicConfig && hasLocalCredentials;
}

async function generatePresignedPutUrl({ tipo, ext, contexto }) {
  if (!VALID_TIPOS.includes(tipo)) {
    const err = new Error('Tipo de foto inválido');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const safeExt = normalizeExt(ext);
  const contentType = contentTypeForExt(safeExt);
  const key = buildObjectKey(tipo, contexto, safeExt);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: PRESIGN_EXPIRES_SEC });

  return {
    uploadUrl,
    fileKey: key,
    fileUrl: publicUrl(key),
    contentType,
    expiresIn: PRESIGN_EXPIRES_SEC,
  };
}

module.exports = {
  VALID_TIPOS,
  generatePresignedPutUrl,
  isPresignedUploadConfigured,
  buildObjectKey,
};
