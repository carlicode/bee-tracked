#!/bin/bash

# 🔐 Script para subir credenciales a AWS Secrets Manager de manera segura

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🔐 Subiendo Credenciales a AWS Secrets Manager"
echo "═══════════════════════════════════════════════════════════"
echo ""

REGION="us-east-1"

# Verificar que los archivos existan
if [ ! -f "../beezero-1710ecf4e5e0.json" ]; then
    echo "❌ No se encontró beezero-1710ecf4e5e0.json"
    exit 1
fi

echo "1️⃣ Subiendo Google Sheets credentials..."
aws secretsmanager create-secret \
  --name bee-tracked/google-credentials \
  --description "Google Sheets Service Account" \
  --secret-string file://../beezero-1710ecf4e5e0.json \
  --region $REGION 2>/dev/null || \
aws secretsmanager update-secret \
  --secret-id bee-tracked/google-credentials \
  --secret-string file://../beezero-1710ecf4e5e0.json \
  --region $REGION

echo "✅ Google credentials subidas"

echo ""
echo "2️⃣ Subiendo AWS S3 credentials..."

# Leer del .env actual
if [ -f "../backend/.env" ]; then
    AWS_ACCESS_KEY=$(grep AWS_ACCESS_KEY_ID ../backend/.env | cut -d '=' -f2)
    AWS_SECRET_KEY=$(grep AWS_SECRET_ACCESS_KEY ../backend/.env | cut -d '=' -f2)
    
    SECRET_JSON="{\"AWS_ACCESS_KEY_ID\":\"${AWS_ACCESS_KEY}\",\"AWS_SECRET_ACCESS_KEY\":\"${AWS_SECRET_KEY}\"}"
    
    aws secretsmanager create-secret \
      --name bee-tracked/aws-s3-credentials \
      --description "AWS S3 Access Keys for Photos" \
      --secret-string "$SECRET_JSON" \
      --region $REGION 2>/dev/null || \
    aws secretsmanager update-secret \
      --secret-id bee-tracked/aws-s3-credentials \
      --secret-string "$SECRET_JSON" \
      --region $REGION
    
    echo "✅ S3 credentials subidas"
else
    echo "⚠️ No se encontró backend/.env, saltando S3 credentials"
fi

echo ""
echo "3️⃣ Guardando Sheet IDs en Parameter Store..."

aws ssm put-parameter \
  --name /bee-tracked/google-sheet-id \
  --value "1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8" \
  --type String \
  --overwrite \
  --region $REGION

aws ssm put-parameter \
  --name /bee-tracked/carreras-sheet-id \
  --value "1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs" \
  --type String \
  --overwrite \
  --region $REGION

echo "✅ Sheet IDs guardados"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Credenciales subidas a AWS Secrets Manager"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Para ver los secrets:"
echo "   aws secretsmanager list-secrets --region $REGION"
echo ""
echo "🔒 IMPORTANTE: Ahora puedes eliminar los archivos locales con credenciales"
echo "   rm -f ../backend/.env"
echo "   rm -f ../beezero-1710ecf4e5e0.json"
echo "   rm -f ../BeeTracked_credentials.csv"
