#!/usr/bin/env bash
# Importa usuarios desde data/ecodelivery-credentials.csv al User Pool de Cognito.
# Requiere: AWS CLI configurado, User Pool ID y que el CSV exista.

set -e
USER_POOL_ID="${COGNITO_USER_POOL_ID:-us-east-1_REsVOVqcY}"
REGION="${AWS_REGION:-us-east-1}"
CSV="${1:-$(dirname "$0")/../data/ecodelivery-credentials.csv}"

if [[ ! -f "$CSV" ]]; then
  echo "No se encuentra el CSV: $CSV"
  exit 1
fi

count=0
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^Biker,User,Password ]] && continue
  [[ -z "$line" ]] && continue

  biker=$(echo "$line" | cut -d',' -f1 | sed 's/^"//;s/"$//')
  user=$(echo "$line" | cut -d',' -f2 | sed 's/^"//;s/"$//')
  pass=$(echo "$line" | cut -d',' -f3 | sed 's/^"//;s/"$//')

  [[ -z "$user" || -z "$pass" ]] && continue

  echo -n "Creando $user ... "
  if aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$user" \
    --temporary-password "Temp${pass}!" \
    --user-attributes "Name=name,Value=$(echo "$biker" | sed 's/"/\\"/g')" \
    --message-action SUPPRESS \
    --region "$REGION" \
    --output text 2>/dev/null; then
    aws cognito-idp admin-set-user-password \
      --user-pool-id "$USER_POOL_ID" \
      --username "$user" \
      --password "$pass" \
      --permanent \
      --region "$REGION" \
      --output text 2>/dev/null
    echo "OK (password fijada)"
    ((count++)) || true
  else
    echo "ya existe o error"
  fi
done < "$CSV"

echo "Listo. Usuarios procesados: $count"
