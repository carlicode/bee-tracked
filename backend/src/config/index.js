/**
 * Config centralizado — única fuente de env vars del backend.
 */
const dotenv = require('dotenv');

dotenv.config();

const stage =
  process.env.STAGE || (process.env.NODE_ENV === 'production' ? 'prod' : 'dev');

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Variable de entorno requerida: ${name}`);
  }
  return value;
}

function optionalEnv(name, fallback = '') {
  const value = process.env[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    return fallback;
  }
  return value;
}

const config = {
  google: {
    sheetId: requireEnv('GOOGLE_SHEET_ID'),
    carrerasDriversSheetId: optionalEnv(
      'CARRERAS_DRIVERS_SHEET_ID',
      optionalEnv('CARRERAS_BIKERS_SHEET_ID')
    ),
    carreassBikersSheetId: optionalEnv('CARRERAS_BIKERS_SHEET_ID'),
    registrosSheetId: optionalEnv('REGISTROS_SHEET_ID'),
  },
  dynamo: {
    region: optionalEnv('AWS_REGION', 'us-east-1'),
    sessionsTable: optionalEnv('SESSIONS_TABLE_NAME', `bee-tracked-sessions-${stage}`),
    turnosTable: optionalEnv('TURNOS_TABLE', `bee-tracked-turnos-${stage}`),
    carrerasTable: optionalEnv('CARRERAS_TABLE', `bee-tracked-carreras-${stage}`),
    kilometrajesTable: optionalEnv('KILOMETRAJES_TABLE', `bee-tracked-kilometrajes-${stage}`),
    anunciosTable: optionalEnv('ANUNCIOS_TABLE', `bee-tracked-anuncios-${stage}`),
    lecturasTable: optionalEnv('LECTURAS_TABLE', `bee-tracked-lecturas-${stage}`),
    permisosTable: optionalEnv('PERMISOS_TABLE', `bee-tracked-permisos-${stage}`),
    usersTable: optionalEnv('USERS_TABLE', `bee-tracked-users-${stage}`),
    auditTable: optionalEnv('AUDIT_TABLE', `bee-tracked-audit-${stage}`),
    pushSubsTable: optionalEnv('PUSH_SUBS_TABLE', `bee-tracked-push-subs-${stage}`),
    onboardingTable: optionalEnv('ONBOARDING_TABLE', `bee-tracked-onboarding-${stage}`),
    calendariosTable: optionalEnv('CALENDARIOS_TABLE', `bee-tracked-calendarios-${stage}`),
    extraordinariosTable: optionalEnv('EXTRAORDINARIOS_TABLE', `bee-tracked-extraordinarios-${stage}`),
    multasTable: optionalEnv('MULTAS_TABLE', `bee-tracked-multas-${stage}`),
  },
  s3: {
    bucket: optionalEnv('AWS_S3_BUCKET', 'bee-tracked-photos'),
  },
  app: {
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
    frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
    stage,
  },
  features: {
    dynamoWriteEnabled: ['1', 'true', 'yes', 'on'].includes(
      String(process.env.DYNAMO_WRITE_ENABLED || '').trim().toLowerCase()
    ),
    dynamoReadEnabled: ['1', 'true', 'yes', 'on'].includes(
      String(process.env.DYNAMO_READ_ENABLED || '').trim().toLowerCase()
    ),
  },
};

if (!config.google.carrerasDriversSheetId && !config.google.carreassBikersSheetId) {
  throw new Error(
    'Configura CARRERAS_DRIVERS_SHEET_ID o CARRERAS_BIKERS_SHEET_ID'
  );
}

module.exports = config;
