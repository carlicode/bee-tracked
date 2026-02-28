#!/usr/bin/env bash
# Agrega el atributo personalizado custom:role al User Pool de Cognito
# Este atributo se usa para diferenciar entre usuarios beezero, operador y ecodelivery

set -e
USER_POOL_ID="${COGNITO_USER_POOL_ID:-us-east-1_REsVOVqcY}"
REGION="${AWS_REGION:-us-east-1}"

echo "📝 Agregando atributo custom:role al User Pool: $USER_POOL_ID"
echo ""

# Nota: Los atributos personalizados en Cognito NO se pueden agregar después de crear el User Pool
# a través de update-user-pool. La única forma es:
# 1. Crear un nuevo User Pool con el atributo
# 2. Migrar usuarios al nuevo pool

echo "⚠️  IMPORTANTE:"
echo "   Los User Pools de Cognito no permiten agregar atributos personalizados después de su creación."
echo "   Opciones disponibles:"
echo ""
echo "   OPCIÓN 1 (Recomendada): Usar grupos de Cognito"
echo "   - Crear grupos: beezero, operador, ecodelivery"
echo "   - Asignar usuarios a grupos"
echo "   - El grupo viene en el token JWT automáticamente"
echo ""
echo "   OPCIÓN 2: Crear nuevo User Pool"
echo "   - Crear nuevo pool con atributo custom:role"
echo "   - Migrar usuarios existentes"
echo "   - Actualizar IDs en .env"
echo ""
read -p "¿Usar grupos de Cognito (opción 1)? [s/n]: " choice

if [[ "$choice" =~ ^[Ss]$ ]]; then
  echo ""
  echo "✅ Creando grupos en Cognito..."
  
  # Crear grupo beezero
  echo -n "   - Grupo 'beezero' ... "
  if aws cognito-idp create-group \
    --user-pool-id "$USER_POOL_ID" \
    --group-name beezero \
    --description "Usuarios BeeZero - Acceso a carreras y turnos con caja" \
    --region "$REGION" \
    --output text &>/dev/null; then
    echo "✅"
  else
    echo "⚠️  (ya existe o error)"
  fi
  
  # Crear grupo operador
  echo -n "   - Grupo 'operador' ... "
  if aws cognito-idp create-group \
    --user-pool-id "$USER_POOL_ID" \
    --group-name operador \
    --description "Operadores administrativos - Permisos especiales" \
    --region "$REGION" \
    --output text &>/dev/null; then
    echo "✅"
  else
    echo "⚠️  (ya existe o error)"
  fi
  
  # Crear grupo ecodelivery
  echo -n "   - Grupo 'ecodelivery' ... "
  if aws cognito-idp create-group \
    --user-pool-id "$USER_POOL_ID" \
    --group-name ecodelivery \
    --description "Bikers EcoDelivery - Acceso a deliveries" \
    --region "$REGION" \
    --output text &>/dev/null; then
    echo "✅"
  else
    echo "⚠️  (ya existe o error)"
  fi
  
  echo ""
  echo "✅ Grupos creados exitosamente"
  echo ""
  echo "📌 Siguiente paso: Ejecutar update-cognito-roles.sh para asignar usuarios a grupos"
else
  echo ""
  echo "ℹ️  Para crear un nuevo User Pool con custom:role:"
  echo "   1. Ir a AWS Console → Cognito"
  echo "   2. Create User Pool"
  echo "   3. En 'Configure attributes', agregar custom attribute 'role' (String, mutable)"
  echo "   4. Completar configuración"
  echo "   5. Ejecutar import-users-cognito.sh con el nuevo pool ID"
  echo ""
fi
