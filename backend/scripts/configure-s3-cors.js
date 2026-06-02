/**
 * Configura CORS en bee-tracked-photos para subida directa (presigned PUT) desde el frontend.
 * Ejecutar una vez: node scripts/configure-s3-cors.js
 */
const { S3Client, PutBucketCorsCommand } = require('@aws-sdk/client-s3');

const BUCKET = process.env.AWS_S3_BUCKET || 'bee-tracked-photos';
const REGION = process.env.AWS_REGION || process.env.AWS_REGION_CUSTOM || 'us-east-1';

const corsRules = [
  {
    AllowedHeaders: ['Content-Type', 'Content-Length', 'x-amz-*'],
    AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedOrigins: [
      'https://d19ls0k7de9u6w.cloudfront.net',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
    ],
    ExposeHeaders: ['ETag'],
    MaxAgeSeconds: 3600,
  },
];

async function main() {
  const s3 = new S3Client({ region: REGION });
  await s3.send(
    new PutBucketCorsCommand({
      Bucket: BUCKET,
      CORSConfiguration: { CORSRules: corsRules },
    })
  );
  console.log(`CORS configurado en bucket: ${BUCKET}`);
}

main().catch((err) => {
  console.error('Error configurando CORS:', err.message);
  process.exit(1);
});
