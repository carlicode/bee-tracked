#!/bin/bash
# Script para reactivar CloudFront el lunes
# Ejecutar: bash reactivar-cloudfront.sh

echo "🔄 Reactivando CloudFront..."

CLOUDFRONT_ID="E2K88PS24O07MP"
CLOUDFRONT_DOMAIN="d2wcwmsxwpk4y9.cloudfront.net"

# Obtener ETag actual
ETAG=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query 'ETag' --output text)

# Obtener configuración
aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --output json > /tmp/dist-config.json

# Actualizar Enabled a true
python3 << 'PYTHON'
import json

with open('/tmp/dist-config.json', 'r') as f:
    data = json.load(f)
    
config = data['DistributionConfig']
config['Enabled'] = True

with open('/tmp/dist-config-updated.json', 'w') as f:
    json.dump(config, f, indent=2)

print("✅ Config actualizada - Enabled: True")
PYTHON

# Aplicar cambios
ETAG=$(aws cloudfront get-distribution-config --id $CLOUDFRONT_ID --query 'ETag' --output text)
aws cloudfront update-distribution --id $CLOUDFRONT_ID --distribution-config file:///tmp/dist-config-updated.json --if-match $ETAG --query 'Distribution.{Status:Status,Enabled:DistributionConfig.Enabled}' --output json

echo ""
echo "✅ CloudFront reactivado!"
echo "🔗 URL HTTPS: https://$CLOUDFRONT_DOMAIN"
echo ""
echo "⚠️  Espera 5-10 minutos para que los cambios se propaguen"
