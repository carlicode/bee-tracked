#!/bin/bash
# Script para REACTIVAR todo en AWS
# Ejecutar: bash reactivar-aws.sh

set -e

echo "🔄 Reactivando servicios de AWS..."
echo ""

# Información guardada
BUCKET_NAME="bee-tracked-1768719972"
CLOUDFRONT_ID="E2K88PS24O07MP"
CLOUDFRONT_DOMAIN="d2wcwmsxwpk4y9.cloudfront.net"

# 1. Reconstruir y subir archivos a S3
echo "1️⃣  Construyendo proyecto..."
cd "$(dirname "$0")/frontend"
npm run build

echo ""
echo "2️⃣  Subiendo archivos a S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME" --delete --cache-control "public, max-age=31536000" --exclude "index.html"
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" --cache-control "no-cache, no-store, must-revalidate" --content-type "text/html"
echo "   ✅ Archivos subidos"

# 2. Asegurar que bucket es público
echo ""
echo "3️⃣  Configurando bucket como público..."
aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" 2>/dev/null || true

cat > /tmp/bucket-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF
aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file:///tmp/bucket-policy.json 2>/dev/null || true
echo "   ✅ Bucket configurado como público"

# 3. Configurar website hosting
echo ""
echo "4️⃣  Configurando website hosting..."
aws s3 website "s3://$BUCKET_NAME" --index-document index.html --error-document index.html
echo "   ✅ Website hosting configurado"

# 4. Reactivar CloudFront
echo ""
echo "5️⃣  Reactivando CloudFront..."
ETAG=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query 'ETag' --output text)
aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --output json > /tmp/dist-config.json

python3 << 'PYTHON'
import json

with open('/tmp/dist-config.json', 'r') as f:
    data = json.load(f)
    
config = data['DistributionConfig']
config['Enabled'] = True

with open('/tmp/dist-config-updated.json', 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Config actualizada")
PYTHON

ETAG=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query 'ETag' --output text)
aws cloudfront update-distribution --id $CLOUDFRONT_ID --distribution-config file:///tmp/dist-config-updated.json --if-match $ETAG --query 'Distribution.{Status:Status,Enabled:DistributionConfig.Enabled}' --output json

echo ""
echo "6️⃣  Invalidando caché de CloudFront..."
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*" --query 'Invalidation.Status' --output text > /dev/null
echo "   ✅ Caché invalidada"

echo ""
echo "✅ TODO REACTIVADO"
echo ""
echo "🔗 URLs:"
echo "   HTTP: http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
echo "   HTTPS: https://$CLOUDFRONT_DOMAIN"
echo ""
echo "⏱️  CloudFront tardará 5-10 minutos en estar completamente activo"
