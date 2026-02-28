/**
 * Crea la estructura de "carpetas" en S3:
 *   Registros_BeeTracked/
 *   Registros_BeeTracked/Ecodelivery/
 *   Registros_BeeTracked/Beezero/
 *
 * Ejecutar desde la raíz del backend (con .env configurado):
 *   node scripts/create-s3-registros.js
 *
 * O desde la raíz del repo:
 *   cd backend && node scripts/create-s3-registros.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { S3Client, CreateBucketCommand, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || 'us-east-1';

const PREFIX = 'Registros_BeeTracked/';
const FOLDERS = [
  PREFIX,                                    // Registros_BeeTracked/
  PREFIX + 'Ecodelivery/',                   // Registros_BeeTracked/Ecodelivery/
  PREFIX + 'Ecodelivery/Turnos/',            // Registros_BeeTracked/Ecodelivery/Turnos/
  PREFIX + 'Ecodelivery/Deliveries/',        // Registros_BeeTracked/Ecodelivery/Deliveries/
  PREFIX + 'Beezero/',                       // Registros_BeeTracked/Beezero/
];

async function main() {
  if (!BUCKET) {
    console.error('❌ AWS_S3_BUCKET no está configurado en .env');
    process.exit(1);
  }

  const config = { region: REGION };
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  const s3 = new S3Client(config);

  // Crear el bucket si no existe
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`📦 Bucket s3://${BUCKET}/ ya existe.`);
  } catch (err) {
    const bucketMissing = err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound' || err.message?.includes('does not exist');
    if (bucketMissing) {
      console.log(`📦 Creando bucket s3://${BUCKET}/ ...`);
      try {
        await s3.send(new CreateBucketCommand({
          Bucket: BUCKET,
          ...(REGION !== 'us-east-1' ? { CreateBucketConfiguration: { LocationConstraint: REGION } } : {}),
        }));
        console.log(`   ✅ Bucket creado.`);
      } catch (createErr) {
        if (createErr.name === 'BucketAlreadyExists' || createErr.message?.includes('BucketAlreadyExists')) {
          console.error('   ❌ Ese nombre de bucket ya está en uso. Pon en .env un nombre único, ej: AWS_S3_BUCKET=bee-tracked-photos-tu-cuenta');
        }
        throw createErr;
      }
    } else {
      throw err;
    }
  }

  console.log(`📁 Creando estructura en s3://${BUCKET}/`);
  console.log('');

  for (const key of FOLDERS) {
    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: Buffer.alloc(0),
          ContentType: 'application/x-directory',
        })
      );
      console.log(`   ✅ ${key}`);
    } catch (err) {
      console.error(`   ❌ ${key}: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('');
  console.log('✅ Estructura creada:');
  console.log('   Registros_BeeTracked/');
  console.log('   ├── Ecodelivery/');
  console.log('   │   ├── Turnos/');
  console.log('   │   └── Deliveries/');
  console.log('   └── Beezero/');
}

main();
