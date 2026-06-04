# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Commands

```bash
# Frontend
cd frontend
npm run dev          # dev server on :5173
npm run build        # tsc + vite build → dist/
npm run lint         # ESLint (0 warnings allowed)

# Backend
cd backend
npm run dev          # nodemon src/server.js on :3001
npm run start        # node src/server.js

# Deploy — ALWAYS use GitHub push (not manual Lambda zips)
git push origin main  # triggers GitHub Actions → builds frontend + serverless deploy backend

# Manual backend deploy (only if CI/CD is broken)
cd backend
npm ci                                          # must include prod deps
npm ci --omit=dev                              # smaller zip (~60MB)
zip -r /tmp/bee.zip . --exclude "*.git*"
BUCKET=bee-tracked-backend-prod-serverlessdeploymentbucke-xgt0qpj0hvlk
aws s3 cp /tmp/bee.zip s3://$BUCKET/backend-deploy.zip
aws lambda update-function-code \
  --function-name bee-tracked-backend-prod-api \
  --s3-bucket $BUCKET --s3-key backend-deploy.zip --region us-east-1
# WARNING: always include node_modules — Lambda needs serverless-http and all deps

# Useful one-offs
node backend/scripts/sync-cognito-from-csv.js     # sync users CSV → Cognito
node backend/scripts/test-permiso-email.js        # test permission email
```

---

## Architecture

### Dual-write: DynamoDB (truth) + Google Sheets (mirror)

**DynamoDB is the source of truth.** Google Sheets is a read-only mirror for the operations team. The `hybridWrite.js` service encapsulates this:

```js
// DynamoDB obligatorio; Sheets best-effort (error logged, never thrown to user)
await hybridWrite.write({ dynamo: () => ..., sheets: () => ..., context: 'turno:iniciar' });

// Legacy pattern (ecodelivery.js): Sheets first, DynamoDB via dualWrite.js best-effort
await appendRow(sheet, row);
await saveTurnoToDynamo({...});  // non-blocking, won't fail request
```

New code should use `hybridWrite.write()`. Old routes (`ecodelivery.js`, `turnos.js`) still use the legacy `dualWrite.js` pattern.

### Backend: CommonJS, Express + Lambda

- **`backend/src/server.js`** — local dev Express server
- **`backend/lambda.js`** — production Lambda entry point (strips API Gateway stage from path)
- **All backend code is CommonJS** (`require`/`module.exports`). Never use `import`/`export`.
- Routes are registered identically in both `server.js` and `lambda.js`. When adding a route, update **both files**.

### Frontend: React + TypeScript + Vite

- **Routing by `userType`** comes from `cognito:groups` claim in the Cognito `idToken`.
- Priority: `admin > rrhh → admin panel | operador → /operador/* | beezero → /beezero/* | ecodelivery → /ecodelivery/*`
- Role guards: `AdminGuard`, `OperadorGuard`, `EcoDeliveryAccessGuard`, `BeeZeroAccessGuard` in `App.tsx`
- **`Login.tsx → dashboardPath()`** determines where to navigate after login — must match guards.
- Active turno state: BeeZero reads from the backend API; Ecodelivery/Operador reads only from `localStorage('turno_actual_biker')`.

### User Roles

| Role | Cognito group | Dashboard | Turno type |
|------|---------------|-----------|------------|
| `beezero` | `beezero` | `/beezero/dashboard` | Full form (caja, placa, fotos, gastos) |
| `ecodelivery` | `ecodelivery` | `/ecodelivery/dashboard` | Simple (GPS + optional photo) |
| `operador` | `operador` | `/operador/dashboard` | Simple (same as ecodelivery) + real-time view |
| `admin` / `rrhh` | `admin` or `rrhh` | `/admin/dashboard` | — |

Operadores reuse `IniciarTurnoBiker`/`CerrarTurnoBiker` (ecodelivery pages) with `tipo: 'operador'` passed to the API. The backend routes to `SHEET_OPERADORES = 'operadores'` tab.

### DynamoDB Tables (prod)

| Table | Key pattern | Purpose |
|-------|-------------|---------|
| `bee-tracked-turnos-prod` | `PK=USER#<slug> SK=TURNO#<id>` | All turnos (beezero/ecodelivery/operador) |
| `bee-tracked-carreras-prod` | `PK=USER#<slug> SK=CARRERA#<id>` | BeeZero carreras |
| `bee-tracked-sessions-prod` | `PK=<username>` | Sessions with TTL |
| `bee-tracked-anuncios-prod` | `PK=ANUNCIO#<uuid>` | Announcements |
| `bee-tracked-permisos-prod` | `PK=PERMISO#<uuid>` | Leave requests |
| `bee-tracked-push-subs-prod` | `PK=<userId>` | Web Push subscriptions |

`slugUserId(name)` in `dynamoUtils.js` converts display names to DynamoDB-safe keys (lowercase, no accents, hyphens).

### Google Sheets

| Sheet ID | Tabs | Used for |
|----------|------|---------|
| `1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8` | `BeeZero`, `Ecodelivery`, `operadores` | Turnos mirror |
| `1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs` | one tab per driver/biker | Carreras |
| `1a8M19WHhfM2SWKSiWbTIpVU76gdAFCJ9uv7y0fnPA4g` | — | Kilometrajes / Registros |

Service account: `bee-tracked-service@beezero.iam.gserviceaccount.com` (credentials in `beezero-1710ecf4e5e0.json`).

### Live Dashboard

`GET /api/admin/dashboard/live` — 25s server-side cache. Currently reads BeeZero/Ecodelivery from Google Sheets and Operadores from DynamoDB. Frontend polls every 30s.

### Auth Flow

1. Frontend calls Cognito (`amazon-cognito-identity-js`) → gets `idToken` (JWT)
2. `getUserTypeFromToken()` extracts role from `cognito:groups` claim
3. Frontend calls `POST /api/auth/cognito-login` with `{ idToken, username, name, userType }`
4. Backend creates session in `bee-tracked-sessions-prod` with TTL (30 min drivers, 4h admins)
5. All subsequent requests need `Authorization: Bearer <idToken>` + `X-Session-Id` header
6. Axios interceptor in `axiosInterceptor.ts` auto-refreshes Cognito tokens on 401

### Known Active Bugs (as of 2026-06-04)

1. **`getNextTurnoId()` in `ecodelivery.js`** reads `SHEET_ECODELIVERY` row count regardless of `tipo` → operadores get IDs that collide with ecodelivery IDs. Fix: read `SHEET_OPERADORES` when `tipo=operador`.

2. **Operador/Ecodelivery dashboard doesn't sync active turno from backend** — reads only from `localStorage('turno_actual_biker')`. BeeZero calls `turnosApi.getTurnoActivo()` on load; operador/eco should do the same.

3. **`CerrarTurnoBiker` skips sheet update when `turnoActual.id` is undefined** — turno stays INICIADO in sheet forever if the API failed during initiation.

### Deploy Pipeline

Push to `main` → GitHub Actions (`.github/workflows/deploy-aws.yml`):
- **Frontend**: `npm ci` → `npm run build` → `aws s3 sync` → CloudFront invalidation
- **Backend**: `npm ci` → `serverless deploy --config serverless.deploy.yml`

Secrets live in GitHub Actions secrets (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) and AWS SSM (`/bee-tracked/GMAIL_USER`, `/bee-tracked/GMAIL_APP_PASSWORD`, `/bee-tracked/PERMISO_NOTIFY_EMAILS`). VAPID keys are in Secrets Manager `bee-tracked/vapid`.

### AWS Resources

- **CloudFront**: `E7WOJ080IV37F` → `https://d19ls0k7de9u6w.cloudfront.net`
- **Lambda**: `bee-tracked-backend-prod-api`
- **API Gateway**: `https://bxa273i618.execute-api.us-east-1.amazonaws.com/prod`
- **Cognito User Pool**: `us-east-1_REsVOVqcY`
- **S3 frontend**: `bee-tracked-frontend-1770454156`
- **S3 photos**: `bee-tracked-photos`
- **Region**: `us-east-1`
