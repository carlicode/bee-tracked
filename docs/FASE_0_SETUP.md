# FASE 0: Setup AWS - Recursos Existentes vs Necesarios

**Proyecto:** bee-tracked (eco-app-drivers)  
**Región:** us-east-1  
**Objetivo:** Preparar infraestructura para 110 usuarios sin tocar otros proyectos

---

## ✅ RECURSOS AWS QUE YA TIENES

### 1. **S3 Bucket: `bee-tracked-photos`**
- ✅ Ya existe y funciona
- ✅ Permisos configurados (PutObject, GetObject)
- ✅ Usado para fotos de turnos y carreras
- **Costo actual:** ~$0.06-0.20/mes
- **Acción:** NINGUNA - Mantener como está

### 2. **Lambda Function: API**
- ✅ Ya desplegada
- ✅ Handler: `lambda.handler`
- ✅ Runtime: Node.js 18.x
- ✅ Memoria: 512MB
- ✅ Timeout: 30s
- **Endpoint:** `https://1d9blio38d.execute-api.us-east-1.amazonaws.com`
- **Acción:** ACTUALIZAR código cuando hagamos cambios

### 3. **API Gateway**
- ✅ Ya configurado
- ✅ CORS habilitado (origin: '*')
- ✅ Headers permitidos incluyen X-Session-Id
- **Acción:** NINGUNA - Ya funciona

### 4. **DynamoDB: `bee-tracked-sessions-prod`**
- ✅ Ya existe (definida en serverless.deploy.yml)
- ✅ Billing: PAY_PER_REQUEST (on-demand)
- ✅ TTL habilitado en atributo `ttl`
- ✅ Key: userId (HASH)
- **Costo actual:** ~$0.20/mes
- **Acción:** VERIFICAR que existe, si no → crearla

### 5. **CloudFront Distribution**
- ✅ Ya existe para frontend
- ✅ URL: `https://d19ls0k7de9u6w.cloudfront.net`
- ✅ Apunta a bucket S3 del frontend
- **Costo actual:** $0 (free tier)
- **Acción:** NINGUNA - Ya funciona

### 6. **Cognito User Pool**
- ✅ Ya existe
- ✅ Pool ID: `us-east-1_REsVOVqcY`
- ✅ Usado para autenticación
- **Acción:** NINGUNA - Ya funciona

### 7. **IAM Roles y Permisos**
- ✅ Lambda tiene acceso a:
  - S3: PutObject, GetObject en `bee-tracked-photos/*`
  - Secrets Manager: GetSecretValue en `bee-tracked/*`
  - SSM Parameter Store: GetParameter en `bee-tracked/*`
  - DynamoDB: PutItem, GetItem, UpdateItem, DeleteItem en SessionsTable
- **Acción:** AGREGAR permisos para nueva tabla audit

---

## 🆕 RECURSOS QUE NECESITAS CREAR (FASE 0)

### 1. **DynamoDB: `bee-tracked-audit`** (NUEVA)
**Para qué:** Registrar cambios de admins (quién editó qué)

**Especificación:**
```yaml
TableName: bee-tracked-audit
BillingMode: PAY_PER_REQUEST
AttributeDefinitions:
  - AttributeName: entityId      # Ej: "carrera#CAR123" o "turno#T456"
    AttributeType: S
  - AttributeName: timestamp      # Unix timestamp en milisegundos
    AttributeType: N
KeySchema:
  - AttributeName: entityId
    KeyType: HASH
  - AttributeName: timestamp
    KeyType: RANGE
TTL: NO (queremos historial permanente)
```

**Costo estimado:** ~$0.30/mes (110 usuarios, pocas ediciones)

**Comando para crear:**
```bash
# Opción 1: Agregar a serverless.deploy.yml (RECOMENDADO)
# Ver sección "Cómo Agregar" más abajo

# Opción 2: Crear manualmente con AWS CLI
aws dynamodb create-table \
  --table-name bee-tracked-audit \
  --attribute-definitions \
    AttributeName=entityId,AttributeType=S \
    AttributeName=timestamp,AttributeType=N \
  --key-schema \
    AttributeName=entityId,KeyType=HASH \
    AttributeName=timestamp,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## 📋 CHECKLIST FASE 0 (3 días)

### Día 1: Verificar Recursos Existentes

- [ ] **Verificar S3 bucket existe:**
  ```bash
  aws s3 ls | grep bee-tracked-photos
  ```
  ✅ Si aparece → OK  
  ❌ Si no aparece → ERROR (debería existir)

- [ ] **Verificar Lambda desplegada:**
  ```bash
  aws lambda get-function --function-name bee-tracked-backend-prod-api --region us-east-1
  ```
  ✅ Si responde → OK  
  ❌ Si error → Hacer `serverless deploy`

- [ ] **Verificar DynamoDB sessions existe:**
  ```bash
  aws dynamodb describe-table --table-name bee-tracked-sessions-prod --region us-east-1
  ```
  ✅ Si responde → OK  
  ❌ Si error → Crear con serverless (ver abajo)

- [ ] **Test endpoint actual funciona:**
  ```bash
  curl https://1d9blio38d.execute-api.us-east-1.amazonaws.com/api/health
  ```
  ✅ Esperas: `{"status":"ok",...}`  
  ❌ Si error → Revisar Lambda

---

### Día 2: Crear Tabla Audit

**Opción A: Agregar a serverless.deploy.yml (RECOMENDADO)**

Editar `backend/serverless.deploy.yml`, agregar en sección `resources`:

```yaml
resources:
  Resources:
    SessionsTable:
      # ... (ya existe, no tocar)
    
    # ⬇️ AGREGAR ESTO ⬇️
    AuditTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: bee-tracked-audit-${sls:stage}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: entityId
            AttributeType: S
          - AttributeName: timestamp
            AttributeType: N
        KeySchema:
          - AttributeName: entityId
            KeyType: HASH
          - AttributeName: timestamp
            KeyType: RANGE
```

Y agregar permisos en `provider.iam.role.statements`:

```yaml
provider:
  iam:
    role:
      statements:
        # ... (permisos existentes no tocar)
        
        # ⬇️ AGREGAR ESTO ⬇️
        - Effect: Allow
          Action:
            - dynamodb:PutItem
            - dynamodb:GetItem
            - dynamodb:Query
          Resource:
            - !GetAtt AuditTable.Arn
```

Y en `custom`:

```yaml
custom:
  sessionsTableName: bee-tracked-sessions-${sls:stage}
  auditTableName: bee-tracked-audit-${sls:stage}  # ⬅️ AGREGAR
```

Y en `provider.environment`:

```yaml
provider:
  environment:
    # ... (existentes no tocar)
    AUDIT_TABLE_NAME: ${self:custom.auditTableName}  # ⬅️ AGREGAR
```

**Deploy:**
```bash
cd backend
serverless deploy --stage prod --config serverless.deploy.yml
```

- [ ] Deploy serverless con nueva tabla
- [ ] Verificar tabla creada:
  ```bash
  aws dynamodb describe-table --table-name bee-tracked-audit-prod --region us-east-1
  ```

---

### Día 3: Configurar Variables y Test

- [ ] **Actualizar `.env` local:**
  ```bash
  # Agregar al final de backend/.env
  AUDIT_TABLE_NAME=bee-tracked-audit-prod
  SESSION_STORE=dynamodb
  SESSIONS_TABLE_NAME=bee-tracked-sessions-prod
  ```

- [ ] **Test local que conecta a DynamoDB:**
  ```bash
  cd backend
  npm start
  # En otra terminal:
  curl http://localhost:3001/health
  ```
  ✅ Debe responder OK

- [ ] **Verificar permisos Lambda:**
  ```bash
  aws lambda get-policy \
    --function-name bee-tracked-backend-prod-api \
    --region us-east-1
  ```
  ✅ Debe incluir permisos a ambas tablas DynamoDB

---

## ⚠️ COSAS QUE **NO** TOCAR

### ❌ NO Tocar Estos Recursos (Podrían ser de otros proyectos):

1. **Buckets S3 que NO sean `bee-tracked-photos`**
   - Si ves otros buckets al hacer `aws s3 ls`, ignóralos
   - Solo trabajar con `bee-tracked-photos`

2. **Lambdas que NO sean `bee-tracked-backend-*`**
   - Al listar funciones, ignorar las que no tengan "bee-tracked" en el nombre

3. **Tablas DynamoDB que NO sean `bee-tracked-*`**
   - Solo crear/modificar tablas que empiecen con `bee-tracked-`

4. **User Pools de Cognito que NO sean `us-east-1_REsVOVqcY`**
   - No tocar otros user pools

5. **CloudFront distributions que NO sean `d19ls0k7de9u6w.cloudfront.net`**
   - No modificar otras distribuciones

---

## 🔒 SEGURIDAD: Verificar Antes de Ejecutar Comandos

**ANTES de ejecutar cualquier comando AWS CLI:**

### ✅ Verificar región:
```bash
aws configure get region
# Debe ser: us-east-1
```

### ✅ Verificar que el recurso es de bee-tracked:
```bash
# ✅ BIEN - Nombre incluye "bee-tracked"
aws dynamodb describe-table --table-name bee-tracked-audit-prod

# ❌ MAL - Nombre desconocido
aws dynamodb describe-table --table-name otra-tabla-random
```

### ✅ Usar `--dry-run` cuando esté disponible:
```bash
# Simular sin ejecutar (si el comando lo soporta)
aws s3 sync ./dist s3://bee-tracked-frontend --dryrun
```

### ✅ Comandos SOLO de lectura primero:
```bash
# Primero LISTAR (safe)
aws s3 ls

# Luego identificar el bucket correcto
aws s3 ls s3://bee-tracked-photos/

# Recién entonces MODIFICAR
aws s3 cp foto.jpg s3://bee-tracked-photos/test/
```

---

## 💰 Costo de Fase 0

```
Recursos Existentes (sin cambios):
- S3 bucket                → $0.20/mes
- Lambda (actual)          → $0.28/mes
- DynamoDB sessions        → $0.20/mes
- API Gateway              → $0.12/mes
- CloudFront              → $0 (free tier)
─────────────────────────────────────
Subtotal Actual: $0.80/mes

Recursos Nuevos (Fase 0):
- DynamoDB audit          → $0.30/mes
─────────────────────────────────────
TOTAL después de Fase 0: $1.10/mes
```

---

## 📝 Resumen Fase 0

**QUÉ hacer:**
1. ✅ Verificar que recursos existentes funcionan
2. ✅ Crear 1 tabla nueva: `bee-tracked-audit`
3. ✅ Agregar permisos Lambda para nueva tabla
4. ✅ Actualizar variables de entorno
5. ✅ Test que todo conecta

**QUÉ NO hacer:**
- ❌ NO tocar otros proyectos/recursos AWS
- ❌ NO crear buckets nuevos (ya tienes `bee-tracked-photos`)
- ❌ NO modificar CloudFront (ya funciona)
- ❌ NO tocar Cognito (ya funciona)

**Tiempo estimado:** 3 días trabajando con cuidado

**Riesgo:** BAJO (solo agregamos 1 tabla, no modificamos existentes)

---

## 🆘 Si Algo Sale Mal

### Problema: "Table already exists"
**Causa:** La tabla ya fue creada antes  
**Solución:** 
```bash
# Verificar si existe
aws dynamodb describe-table --table-name bee-tracked-audit-prod --region us-east-1
# Si responde → ya existe, no crear de nuevo
```

### Problema: "Access Denied"
**Causa:** Credenciales AWS no configuradas o sin permisos  
**Solución:**
```bash
# Verificar credenciales
aws sts get-caller-identity
# Debe mostrar tu Account ID y User ARN
```

### Problema: "Resource not found" al desplegar
**Causa:** Sintaxis incorrecta en serverless.yml  
**Solución:**
```bash
# Validar sintaxis YAML antes de deploy
serverless print --config serverless.deploy.yml
# Debe mostrar configuración parseada sin errores
```

### Problema: Deploy tarda mucho / se congela
**Causa:** CloudFormation creando recursos  
**Solución:**
- Es normal que tarde 2-5 minutos
- Monitorear en AWS Console → CloudFormation → Stacks
- Si tarda >10min, cancelar y revisar logs

---

## ✅ Criterios de Éxito Fase 0

Al terminar Fase 0, debes poder hacer:

1. ✅ `curl` al endpoint y obtener respuesta:
   ```bash
   curl https://1d9blio38d.execute-api.us-east-1.amazonaws.com/api/health
   # → {"status":"ok"}
   ```

2. ✅ Ver ambas tablas DynamoDB:
   ```bash
   aws dynamodb list-tables --region us-east-1 | grep bee-tracked
   # → bee-tracked-sessions-prod
   # → bee-tracked-audit-prod
   ```

3. ✅ Subir foto de test a S3:
   ```bash
   echo "test" > test.txt
   aws s3 cp test.txt s3://bee-tracked-photos/test/
   # → upload: ./test.txt to s3://bee-tracked-photos/test/test.txt
   ```

4. ✅ Ver logs de Lambda en CloudWatch:
   ```bash
   aws logs tail /aws/lambda/bee-tracked-backend-prod-api --follow
   # → Debe mostrar logs en tiempo real
   ```

Si los 4 puntos funcionan → **Fase 0 COMPLETA** ✅

---

**Siguiente paso:** Fase 1 - Arreglar bugs críticos (turno cerrado + login lento)
