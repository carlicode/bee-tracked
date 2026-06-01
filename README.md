# 🚗🚴 Bee Tracked - Plataforma Multi-Usuario para Drivers

Aplicación web móvil (PWA) para ~110 usuarios con interfaces diferenciadas por rol:
- **BeeZero**: Conductores de auto (tema amarillo) 🚗
- **EcoDelivery**: Bikers de delivery (tema verde) 🚴
- **Admin**: Panel de administración (tema púrpura) — anuncios, carreras, turnos, dashboard en tiempo real
- ~~**Andi (RRHH)**~~: Rol unificado con Admin (ver abajo)

**Producción:** https://d19ls0k7de9u6w.cloudfront.net  
**API:** https://bxa273i618.execute-api.us-east-1.amazonaws.com/prod

---

## ✨ Funcionalidades por Plataforma

### 🚗 BeeZero (Conductores de Auto)
- 🔐 **Autenticación AWS Cognito**
- 🚗 **Registro de Carreras** — cliente, precio, distancia, tiempo, foto
- ⏰ **Gestión de Turnos** — control de caja, fotos tablero/exterior, daños, gastos
- 📍 **Geolocalización** — GPS automático en inicio/cierre de turno
- 📊 **Historial** — turnos y carreras detalladas

### 🚴 EcoDelivery (Bikers de Delivery)
- 🔐 **Autenticación AWS Cognito**
- 📦 **Registro de Deliveries** — cliente, origen, destino, distancia, hora, foto
- ⚡ **Turnos Simplificados** — inicio/cierre con un botón y GPS automático
- 📊 **Historial de Deliveries** — sincronizado con Google Sheets (pestaña por biker)

### 🛡️ Admin (Panel de Administración)
- 📊 **Dashboard en tiempo real** — turnos activos BeeZero + EcoDelivery, polling 30s, toasts
- 🚗 **Carreras drivers** — por pestaña, filtros de fecha, export Excel (.xlsx)
- 🚴 **Carreras bikers** — por biker, filtros de fecha, totales km y por-hora
- ⏰ **Turnos** — historial BeeZero y EcoDelivery con filtros por nombre, fecha, keyword
- 📢 **Anuncios** — crear, listar, ver quién leyó, eliminar
- 📄 **Paginación** — 50 filas por página en todas las tablas grandes
- 🔔 **Push notifications** — se disparan al publicar un anuncio (Web Push)
- 🔐 Acceso restringido a usuarios `admin` (incluye ex-rol `rrhh`)

> **Nota roles:** El rol `rrhh` (ex-Andi) fue unificado con `admin`. Ambos ven el mismo panel en `/admin/dashboard`. Los usuarios `rrhh` en Cognito redirigen automáticamente a las rutas `/admin/*`.

### 📢 Anuncios (desde Admin)
- Crear avisos para todos, BeeZero o EcoDelivery con prioridad normal / importante / urgente
- Modal obligatorio al login mostrando anuncios no leídos
- Vista de estadísticas: quién leyó y cuándo
- **Push notification** a los dispositivos suscritos al publicar

---

## 🏗️ Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS con temas dinámicos por rol
- **Estado**: Context API + React Hooks
- **PWA**: Service Worker (fetch cache + push notifications) + Manifest
- **HTTP**: Axios con interceptores de auth y refresh
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js 18 + Express en local / AWS Lambda en prod
- **Auth**: AWS Cognito (JWT) + sesiones DynamoDB (`X-Session-Id`, `X-User-Id`)
- **Datos**: Google Sheets (escritura drivers + live dashboard) + DynamoDB (lectura admin, anuncios, sesiones, suscripciones push)
- **Fotos**: AWS S3 SDK v3
- **Push**: `web-push` (VAPID), claves en AWS Secrets Manager (`bee-tracked/vapid`)

### Infraestructura AWS
| Servicio | Uso |
|---|---|
| Cognito User Pool `us-east-1_REsVOVqcY` | Autenticación |
| Lambda + API Gateway | Backend serverless |
| S3 `bee-tracked-photos` | Fotos de turnos/deliveries |
| S3 + CloudFront | Frontend PWA |
| DynamoDB | Sesiones, anuncios, lecturas, turnos, carreras, suscripciones push |
| Secrets Manager `bee-tracked/*` | Credenciales Google, VAPID |

### DynamoDB — Tablas en producción

| Tabla | Uso |
|---|---|
| `bee-tracked-sessions-prod` | Sesiones activas |
| `bee-tracked-turnos-prod` | Turnos BeeZero y EcoDelivery (lectura admin) |
| `bee-tracked-carreras-prod` | Carreras drivers y bikers (lectura admin) |
| `bee-tracked-anuncios-prod` | Anuncios creados |
| `bee-tracked-lecturas-prod` | Registro de quién leyó cada anuncio |
| `bee-tracked-push-subs-prod` | Suscripciones Web Push (TTL 90 días) |

### Feature flags (serverless.deploy.yml)

| Variable | Valor actual | Efecto |
|---|---|---|
| `DYNAMO_WRITE_ENABLED` | `true` | Nuevos turnos/carreras también se guardan en DynamoDB |
| `DYNAMO_READ_ENABLED` | `true` | Admin lee turnos/carreras de DynamoDB (más rápido) |

> El **live dashboard** siempre lee de Sheets (tiempo real). Cambiar los flags a `false` revierte al comportamiento anterior sin tocar código.

---

## 🔔 Push Notifications

Las notificaciones push se envían a los drivers cuando el admin publica un anuncio.

**Cómo funciona:**
1. Al entrar al dashboard, el navegador pide permiso de notificaciones
2. La suscripción se guarda en `bee-tracked-push-subs-prod` asociada al `userId`
3. Al crear un anuncio, el backend llama a `pushService.notifyNewAnnouncement()` y envía a todos los suscriptores de la audiencia

**Requisitos del dispositivo:**
- Android: Chrome ≥ 80 (funciona desde el navegador directo)
- iOS: Safari ≥ 16.4 **solo con la app instalada como PWA** (Compartir → Agregar a pantalla de inicio)

**Claves VAPID:** guardadas en `AWS Secrets Manager` → `bee-tracked/vapid`. Para rotar:
```bash
node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys()))"
aws secretsmanager update-secret --secret-id bee-tracked/vapid --region us-east-1 \
  --secret-string '{"publicKey":"...","privateKey":"..."}'
# Luego redeploy backend para que Lambda cargue las nuevas claves
```

---

## 📦 Arquitectura de Datos Híbrida

Los drivers **siempre escriben a Google Sheets** (sin cambios para ellos).
El backend además hace **dual write a DynamoDB** (best-effort, no bloquea al driver).
El admin **lee de DynamoDB** para mayor velocidad; el live dashboard sigue leyendo Sheets.

```
Driver registra turno/carrera
  → escribe en Sheets (siempre)
  → también escribe en DynamoDB (best-effort, DYNAMO_WRITE_ENABLED)

Admin ve Turnos / Carreras
  → lee de DynamoDB  (DYNAMO_READ_ENABLED=true)

Live dashboard
  → sigue leyendo Sheets (tiempo real)
```

### Migración histórica

Para poblar DynamoDB con datos históricos de Sheets:
```bash
cd backend
STAGE=prod TURNOS_TABLE=bee-tracked-turnos-prod CARRERAS_TABLE=bee-tracked-carreras-prod \
  node scripts/migrate-sheets-to-dynamo.js
```

El script es **idempotente**: re-corridas sobrescriben con los mismos datos, no duplican.

---

## 🔐 Autenticación y Roles

### Cognito User Pool
- **ID**: `us-east-1_REsVOVqcY`
- **Client ID**: `29rgiplrp6t3aq2b58ee91i54v`

### Grupos y acceso
| Grupo Cognito | userType en app | Dashboard |
|---|---|---|
| `beezero` | `beezero` | `/beezero/dashboard` |
| `ecodelivery` | `ecodelivery` | `/ecodelivery/dashboard` |
| `operador` | `operador` | `/ecodelivery/dashboard` |
| `admin` | `admin` | `/admin/dashboard` |
| `rrhh` | `admin` (unificado) | `/admin/dashboard` |

> Los usuarios del grupo `rrhh` se tratan como `admin` en toda la app (frontend + backend).

### Sincronizar usuarios CSV → Cognito
```bash
cd backend
node scripts/sync-cognito-from-csv.js
```
Lee `data/usuarios-bee-tracked.csv`, crea/actualiza/elimina usuarios y asigna grupos en Cognito.

### Sesiones
- 1 sesión activa por usuario (la más reciente desplaza a la anterior)
- Timeout por inactividad: 10 minutos
- Token refresh automático con interceptores Axios
- Headers requeridos: `Authorization`, `X-Session-Id`, `X-User-Id`

---

## 📊 APIs y Endpoints

### Auth
- `POST /api/auth/login` — login CSV o Cognito
- `POST /api/auth/logout` — cierra sesión
- `POST /api/auth/refresh` — refresh token

### BeeZero
- `POST /api/turnos/iniciar` — iniciar turno
- `POST /api/turnos/:id/cerrar` — cerrar turno
- `POST /api/beezero/carreras/registrar` — registrar carrera

### EcoDelivery
- `POST /api/ecodelivery/turnos/iniciar`
- `POST /api/ecodelivery/turnos/cerrar`
- `POST /api/ecodelivery/deliveries/registrar`
- `GET  /api/ecodelivery/deliveries/:bikerName`

### Admin *(requiere `admin` o `rrhh`)*
- `GET /api/admin/dashboard/live` — turnos activos hoy (cache 25s)
- `GET /api/admin/carreras/drivers` — lista pestañas drivers
- `GET /api/admin/carreras/:tab?from&to` — carreras de un driver
- `GET /api/admin/carreras/bikers/tabs` — lista bikers
- `GET /api/admin/carreras/bikers/:tab?from&to` — entregas de un biker
- `GET /api/admin/turnos/beezero` — historial turnos BeeZero
- `GET /api/admin/turnos/ecodelivery` — historial turnos EcoDelivery
- `GET /api/admin/anuncios` — listar anuncios
- `POST /api/admin/anuncios` — crear anuncio (dispara push)
- `DELETE /api/admin/anuncios/:id` — eliminar (soft delete)
- `GET /api/admin/anuncios/:id/stats` — estadísticas de lectura

### Anuncios (drivers)
- `GET  /api/announcements/pending` — anuncios no leídos del usuario
- `POST /api/announcements/:id/read` — marcar como leído

### Push
- `GET    /api/push/vapid-public-key` — clave pública VAPID
- `POST   /api/push/subscribe` — guardar suscripción
- `DELETE /api/push/unsubscribe` — eliminar suscripción

---

## 🚀 Inicio Rápido Local

### Prerrequisitos
- Node.js 18+
- AWS CLI configurado
- Credenciales Google Sheets (archivo JSON de service account)

### 1. Instalar dependencias
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 2. Configurar variables

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:3001
VITE_COGNITO_USER_POOL_ID=us-east-1_REsVOVqcY
VITE_COGNITO_CLIENT_ID=29rgiplrp6t3aq2b58ee91i54v
```

**`backend/.env`** (ver `backend/.env.example` para lista completa)
```env
PORT=3001
NODE_ENV=development
GOOGLE_SHEET_ID=1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8
CARRERAS_BIKERS_SHEET_ID=1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs
CARRERAS_DRIVERS_SHEET_ID=1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs
GOOGLE_CREDENTIALS_PATH=../beezero-1710ecf4e5e0.json
AWS_REGION=us-east-1
# Para DynamoDB local (opcional):
# DYNAMO_WRITE_ENABLED=true
# DYNAMO_READ_ENABLED=false
# Para push local (opcional):
# VAPID_PUBLIC_KEY=...
# VAPID_PRIVATE_KEY=...
```

### 3. Ejecutar
```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Abre http://localhost:5173

---

## 🚀 Deploy a Producción

### Frontend
**Automático:** cada push a `main` con cambios en `frontend/` dispara GitHub Actions.  
**Manual:**
```bash
bash scripts/deploy-frontend.sh
```

### Backend (Lambda + API Gateway)
```bash
cd backend
npx serverless deploy --stage prod --config serverless.deploy.yml
```

---

## 🛠️ Scripts Útiles

```bash
# Sincronizar usuarios CSV → Cognito
cd backend && node scripts/sync-cognito-from-csv.js

# Migración histórica Sheets → DynamoDB
cd backend
STAGE=prod TURNOS_TABLE=bee-tracked-turnos-prod CARRERAS_TABLE=bee-tracked-carreras-prod \
  node scripts/migrate-sheets-to-dynamo.js

# Generar nuevas claves VAPID
node -e "const wp=require('web-push'); console.log(JSON.stringify(wp.generateVAPIDKeys(),null,2))"

# Deploy frontend manual
bash scripts/deploy-frontend.sh
```

---

## 🎯 Estado del Proyecto

### Implementado ✅
- [x] PWA instalable (Service Worker + Manifest)
- [x] Autenticación Cognito + CSV fallback
- [x] Turnos y carreras BeeZero
- [x] Turnos y deliveries EcoDelivery
- [x] Fotos a S3 (turnos y deliveries)
- [x] Geolocalización automática
- [x] Panel admin con dashboard en tiempo real (polling 30s)
- [x] Carreras drivers con export Excel
- [x] Carreras bikers
- [x] Turnos BeeZero y EcoDelivery con filtros (nombre, fecha, keyword)
- [x] Paginación client-side (50 filas/página) en todas las tablas
- [x] Anuncios (crear, listar, ver lecturas, eliminar) — admin y drivers
- [x] Modal obligatorio de anuncios al login
- [x] Push notifications Web Push al publicar anuncios
- [x] Roles `rrhh` y `admin` unificados
- [x] Arquitectura híbrida Sheets + DynamoDB (dual write + lectura admin desde DynamoDB)
- [x] Migración histórica Sheets → DynamoDB

### Pendiente 🔲
- [ ] URLs pre-firmadas para fotos S3 (seguridad)
- [ ] Modo offline con sincronización (IndexedDB)

---

**Desarrollado para BeeZero y EcoDelivery**
