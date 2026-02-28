#!/bin/bash
# Script para desplegar frontend a AWS con headers de caché correctos

set -e

S3_BUCKET="bee-tracked-frontend-1770454156"
CLOUDFRONT_ID="E7WOJ080IV37F"
AWS_REGION="us-east-1"

echo "🏗️  Construyendo frontend..."
cd "$(dirname "$0")/../frontend"
npm run build

echo ""
echo "📦 Subiendo archivos estáticos (JS, CSS, imágenes) con caché largo..."
aws s3 sync dist/ "s3://${S3_BUCKET}/" \
  --delete \
  --exclude "index.html" \
  --exclude "manifest.json" \
  --cache-control "public, max-age=31536000, immutable" \
  --region "${AWS_REGION}"

echo ""
echo "📄 Subiendo index.html SIN caché..."
aws s3 cp dist/index.html "s3://${S3_BUCKET}/index.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "text/html" \
  --region "${AWS_REGION}"

echo ""
echo "📋 Subiendo manifest.json SIN caché..."
aws s3 cp dist/manifest.json "s3://${S3_BUCKET}/manifest.json" \
  --cache-control "public, max-age=0, must-revalidate" \
  --content-type "application/json" \
  --region "${AWS_REGION}"

echo ""
echo "🔄 Invalidando caché de CloudFront..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id "${CLOUDFRONT_ID}" \
  --paths "/*" \
  --region "${AWS_REGION}" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ Deploy completado!"
echo ""
echo "🌐 URL: https://d19ls0k7de9u6w.cloudfront.net"
echo "🔄 Invalidación ID: ${INVALIDATION_ID}"
echo ""
echo "⏱️  Los cambios estarán disponibles en 1-3 minutos."
echo "💡 Tip: Haz hard refresh en el navegador (Ctrl/Cmd + Shift + R)"
