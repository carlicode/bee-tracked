#!/usr/bin/env bash
# Asigna usuarios a grupos de Cognito basándose en el nombre del Biker
# Grupos:
# - "beezero": Usuarios con "Bee Zero" o "bee zero" en el nombre
# - "operador": Usuarios con "operador" u "operadora" en el nombre (case insensitive)
# - "ecodelivery": Todos los demás bikers

set -e
USER_POOL_ID="${COGNITO_USER_POOL_ID:-us-east-1_REsVOVqcY}"
REGION="${AWS_REGION:-us-east-1}"
CSV="${1:-$(dirname "$0")/../data/ecodelivery-credentials.csv}"

if [[ ! -f "$CSV" ]]; then
  echo "❌ No se encuentra el CSV: $CSV"
  exit 1
fi

# Función para determinar el rol basándose en el nombre del biker
get_role() {
  local biker="$1"
  local biker_lower=$(echo "$biker" | tr '[:upper:]' '[:lower:]')
  
  if [[ "$biker_lower" =~ "bee zero" ]] || [[ "$biker_lower" =~ "bee-zero" ]]; then
    echo "beezero"
  elif [[ "$biker_lower" =~ "operador" ]] || [[ "$biker_lower" =~ "operadora" ]]; then
    echo "operador"
  else
    echo "ecodelivery"
  fi
}

echo "🔄 Asignando usuarios a grupos en Cognito User Pool: $USER_POOL_ID"
echo ""

count_beezero=0
count_operador=0
count_ecodelivery=0
count_errors=0

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^Biker,User,Password ]] && continue
  [[ -z "$line" ]] && continue

  biker=$(echo "$line" | cut -d',' -f1 | sed 's/^"//;s/"$//')
  user=$(echo "$line" | cut -d',' -f2 | sed 's/^"//;s/"$//')

  [[ -z "$user" || -z "$biker" ]] && continue

  # Determinar rol/grupo
  group=$(get_role "$biker")
  
  echo -n "📝 $user ($biker) → grupo: $group ... "
  
  if aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$user" \
    --group-name "$group" \
    --region "$REGION" \
    --output text &>/dev/null; then
    echo "✅"
    case "$group" in
      beezero) ((count_beezero++)) ;;
      operador) ((count_operador++)) ;;
      ecodelivery) ((count_ecodelivery++)) ;;
    esac
  else
    echo "⚠️  (ya asignado o error)"
    # No contar como error si ya está asignado
  fi
done < "$CSV"

echo ""
echo "✅ Asignación completada:"
echo "   - Grupo beezero: $count_beezero usuarios"
echo "   - Grupo operador: $count_operador usuarios"
echo "   - Grupo ecodelivery: $count_ecodelivery usuarios"
echo ""
echo "Total procesado: $((count_beezero + count_operador + count_ecodelivery)) usuarios"
echo ""
echo "📌 Los grupos ahora aparecerán en el claim 'cognito:groups' del JWT"

