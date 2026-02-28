#!/usr/bin/env bash
# Crea la estructura Registros_BeeTracked/Ecodelivery y Registros_BeeTracked/Beezero en S3.
# Requiere: AWS CLI configurado (aws configure) o variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.
# Opción 1: Usar script Node (lee backend/.env)
#   cd backend && npm run s3:create-registros
# Opción 2: Usar este script con variables de entorno
#   AWS_S3_BUCKET=tu-bucket AWS_REGION=us-east-1 ./scripts/create-s3-registros.sh

set -e
BUCKET="${AWS_S3_BUCKET:-bee-tracked-photos}"
REGION="${AWS_REGION:-us-east-1}"

echo "📁 Creando estructura en s3://${BUCKET}/"
echo ""

for key in "Registros_BeeTracked/" "Registros_BeeTracked/Ecodelivery/" "Registros_BeeTracked/Beezero/"; do
  echo -n "   $key ... "
  if aws s3api put-object --bucket "$BUCKET" --key "$key" --region "$REGION" --output text &>/dev/null; then
    echo "✅"
  else
    echo "❌ (revisa credenciales AWS)"
    exit 1
  fi
done

echo ""
echo "✅ Estructura creada:"
echo "   Registros_BeeTracked/"
echo "   ├── Ecodelivery/"
echo "   └── Beezero/"
