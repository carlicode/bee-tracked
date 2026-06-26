# Entorno de staging (testing en AWS)

Permite desarrollar y mostrar features a RRHH **sin tocar producción**:

| | Producción | Staging |
|---|------------|---------|
| **URL frontend** | [https://d19ls0k7de9u6w.cloudfront.net/](https://d19ls0k7de9u6w.cloudfront.net/) | URL propia de CloudFront staging |
| **API** | `.../prod` | `.../staging` |
| **DynamoDB** | `bee-tracked-*-prod` | `bee-tracked-*-staging` |
| **Google Sheets** | Escritura activa | **Escritura desactivada** (`SHEETS_WRITE_ENABLED=false`) |
| **Cognito** | Mismo pool (mismos usuarios/contraseñas) | Mismo pool |
| **Deploy** | Push a `main` | Push a `staging` |

---

## Flujo de trabajo recomendado

```text
feature branch → merge a staging → probar / mostrar a RRHH → merge a main
```

- **`main`** → producción (conductores reales, sin cambios en este flujo).
- **`staging`** → entorno de pruebas aislado.

---

## Setup inicial (una sola vez en AWS)

### 1. Crear bucket S3 para frontend staging

```bash
aws s3 mb s3://bee-tracked-frontend-staging --region us-east-1
aws s3api put-public-access-block \
  --bucket bee-tracked-frontend-staging \
  --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 2. Crear distribución CloudFront

En **AWS Console → CloudFront → Create distribution**:

1. **Origin**: bucket `bee-tracked-frontend-staging.s3.us-east-1.amazonaws.com`
2. **Origin access**: Origin access control (OAC) — crear una nueva OAC
3. **Default root object**: `index.html`
4. **Viewer protocol policy**: Redirect HTTP to HTTPS
5. **Error pages** (SPA routing):
   - 403 → `/index.html` → 200
   - 404 → `/index.html` → 200

Después de crear la distribución, copiar la **policy del bucket** que AWS sugiere y aplicarla al bucket S3.

Anotar:

- **CloudFront domain**: ej. `d1234abcd.cloudfront.net`
- **Distribution ID**: ej. `E1ABC2DEF3GHI`

### 3. Desplegar backend staging (primera vez)

```bash
cd backend
npm ci
npx serverless deploy --stage staging --config serverless.deploy.yml \
  --param="frontendUrl=https://TU_DOMINIO.cloudfront.net"
```

Esto crea:

- Lambda `bee-tracked-backend-staging-api`
- Tablas DynamoDB `bee-tracked-*-staging`
- API Gateway stage `/staging`

Verificar:

```bash
curl -s "https://bxa273i618.execute-api.us-east-1.amazonaws.com/staging/api/health"
```

### 4. Configurar GitHub Actions

**Settings → Secrets and variables → Actions → Variables**

| Variable | Ejemplo |
|----------|---------|
| `STAGING_S3_BUCKET` | `bee-tracked-frontend-staging` |
| `STAGING_CLOUDFRONT_DISTRIBUTION_ID` | `E1ABC2DEF3GHI` |
| `STAGING_FRONTEND_URL` | `https://d1234abcd.cloudfront.net` |
| `VITE_COGNITO_USER_POOL_ID` | (igual que prod) |
| `VITE_COGNITO_CLIENT_ID` | (igual que prod) |

**Ampliar política IAM** del usuario de GitHub Actions para incluir el bucket y CloudFront de staging (misma estructura que prod, otros ARNs).

### 5. Crear rama `staging` y primer deploy

```bash
git checkout -b staging
git push -u origin staging
```

El workflow `.github/workflows/deploy-staging.yml` despliega automáticamente.

---

## Qué está aislado y qué no

**Aislado (seguro para pruebas):**

- Frontend (bucket + CloudFront distintos)
- Backend Lambda y API stage `/staging`
- Todas las tablas DynamoDB `-staging`
- Escrituras a Google Sheets (deshabilitadas en staging)

**Compartido (mismo que prod):**

- Cognito — mismos logins; RRHH puede entrar con su usuario habitual
- Bucket S3 de fotos (`bee-tracked-photos`) — las fotos de prueba van al mismo bucket
- Emails de permisos (si se prueba solicitar permiso, puede enviar email real)

Para demos de horarios/calendarios (nuevas tablas DynamoDB), staging es totalmente seguro.

---

## Banner en la app

En staging el frontend muestra una barra amarilla:

**"ENTORNO DE PRUEBAS — Los datos no afectan producción"**

Se activa con `VITE_APP_ENV=staging` en el build de staging.

---

## Deploy manual (si CI falla)

```bash
# Backend
cd backend && npm ci
npx serverless deploy --stage staging --config serverless.deploy.yml \
  --param="frontendUrl=https://TU_DOMINIO.cloudfront.net"

# Frontend
cd frontend
echo "VITE_API_URL=https://bxa273i618.execute-api.us-east-1.amazonaws.com/staging" > .env.production
echo "VITE_APP_ENV=staging" >> .env.production
echo "VITE_COGNITO_USER_POOL_ID=us-east-1_REsVOVqcY" >> .env.production
echo "VITE_COGNITO_CLIENT_ID=TU_CLIENT_ID" >> .env.production
npm ci && npm run build
aws s3 sync dist/ s3://bee-tracked-frontend-staging/ --delete
aws cloudfront create-invalidation --distribution-id TU_CF_ID --paths "/*"
```

---

## Costo estimado

Staging agrega costo bajo: Lambda ocasional, DynamoDB pay-per-request vacío, S3 + CloudFront mínimos. El warmup de Lambda está **desactivado** en staging para ahorrar.
