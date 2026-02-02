#!/bin/bash
# Script para DETENER completamente todo en AWS
# Ejecutar: bash detener-aws.sh

set -e

echo "🛑 Deteniendo todos los servicios de AWS..."
echo ""

# Información guardada
BUCKET_NAME="bee-tracked-1768719972"
CLOUDFRONT_ID="E2K88PS24O07MP"
CLOUDFRONT_DOMAIN="d2wcwmsxwpk4y9.cloudfront.net"

echo "📋 Recursos a detener:"
echo "   - Bucket S3: $BUCKET_NAME"
echo "   - CloudFront: $CLOUDFRONT_ID"
echo ""

# 1. Deshabilitar CloudFront
echo "1️⃣  Deshabilitando CloudFront..."
ETAG=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query 'ETag' --output text 2>/dev/null || echo "")

if [ ! -z "$ETAG" ]; then
    aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --output json > /tmp/dist-config.json
    
    python3 << 'PYTHON'
import json

with open('/tmp/dist-config.json', 'r') as f:
    data = json.load(f)
    
config = data['DistributionConfig']
config['Enabled'] = False

with open('/tmp/dist-config-updated.json', 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Config actualizada")
PYTHON

    ETAG=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query 'ETag' --output text)
    aws cloudfront update-distribution --id $CLOUDFRONT_ID --distribution-config file:///tmp/dist-config-updated.json --if-match $ETAG --query 'Distribution.Status' --output text > /dev/null
    echo "   ✅ CloudFront deshabilitado"
else
    echo "   ⚠️  CloudFront ya estaba deshabilitado o no existe"
fi

echo ""

# 2. Vaciar bucket S3
echo "2️⃣  Vaciando bucket S3..."
if aws s3 ls "s3://$BUCKET_NAME" &>/dev/null; then
    aws s3 rm "s3://$BUCKET_NAME" --recursive
    echo "   ✅ Bucket S3 vaciado"
else
    echo "   ⚠️  Bucket S3 ya está vacío o no existe"
fi

echo ""

# 3. Hacer bucket privado (opcional - comentado por si quieres mantenerlo público)
# echo "3️⃣  Haciendo bucket privado..."
# aws s3api put-public-access-block --bucket $BUCKET_NAME --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true" 2>/dev/null || true
# echo "   ✅ Bucket ahora es privado"

echo ""
echo "✅ TODO DETENIDO"
echo ""
echo "📋 Información guardada para reactivar:"
echo "   Bucket: $BUCKET_NAME"
echo "   CloudFront ID: $CLOUDFRONT_ID"
echo "   CloudFront Domain: $CLOUDFRONT_DOMAIN"
echo ""
echo "💡 Para reactivar, ejecuta:"
echo "   bash reactivar-aws.sh"
echo ""
echo "💰 Costos ahora: ~\$0 (solo almacenamiento mínimo de S3)"
