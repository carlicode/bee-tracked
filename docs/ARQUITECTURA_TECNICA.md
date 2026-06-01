# Arquitectura Técnica - Bee Tracked V2.0
**Sistema:** Gestión de Drivers y Bikers  
**Enfoque:** Escalable, Modular, Trazable

---

## 1. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (PWA)                          │
│  React + TypeScript + TailwindCSS + Service Worker             │
│  Hosted: S3 + CloudFront (CDN)                                 │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS / REST API
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                    API GATEWAY + Lambda                         │
│  Serverless Framework │ Node.js 18+ │ Express                  │
└───┬──────────┬─────────┬───────────┬─────────────┬─────────────┘
    │          │         │           │             │
    │          │         │           │             │
┌───▼──────┐ ┌▼────┐  ┌▼──────┐  ┌▼─────────┐  ┌▼────────────┐
│DynamoDB  │ │  S3 │  │Secrets│  │  Cognito │  │Google Sheets│
│(Primary) │ │Photos│  │Manager│  │  (Auth)  │  │  (Backup)   │
└──────────┘ └─────┘  └───────┘  └──────────┘  └─────────────┘
     │                                                   │
     └───────────────────┬───────────────────────────────┘
                         │ Sync cada 5min
                    ┌────▼─────┐
                    │EventBridge│ (Cron Lambda)
                    └──────────┘
```

---

## 2. STACK TECNOLÓGICO

### Frontend
- **Framework:** React 18.2
- **Lenguaje:** TypeScript 5.2
- **Estilos:** TailwindCSS 3.4
- **Routing:** React Router DOM 6.22
- **HTTP Client:** Axios 1.6.7
- **State:** React Context + localStorage
- **Build:** Vite 5.2
- **PWA:** Workbox (Service Worker)
- **Hosting:** AWS S3 + CloudFront

### Backend
- **Runtime:** Node.js 18.x
- **Framework:** Express 4.18
- **Lenguaje:** JavaScript (CommonJS)
- **Deploy:** Serverless Framework 3.38
- **Hosting:** AWS Lambda + API Gateway

### Bases de Datos
- **Principal:** DynamoDB (on-demand)
- **Cache:** DynamoDB (TTL nativo)
- **Backup/Export:** Google Sheets API v4
- **Auditoría:** DynamoDB (tabla separada)

### Storage
- **Fotos:** AWS S3 (public-read bucket)
- **Credentials:** AWS Secrets Manager
- **Logs:** CloudWatch Logs

### Auth
- **Método:** AWS Cognito User Pools
- **Fallback:** CSV validación (migrar a Cognito)
- **Sesiones:** DynamoDB con TTL 10min

---

## 3. MODELO DE DATOS DYNAMODB

### Tabla: `bee-tracked-turnos`
```
PK (Partition Key): userId (String)
SK (Sort Key):      turnoId (String) formato: TURNO#YYYYMMDD#UUID

Attributes:
- estado: 'activo' | 'cerrado'
- fechaInicio: YYYY-MM-DD
- horaInicio: HH:MM
- fechaCierre: YYYY-MM-DD (opcional)
- horaCierre: HH:MM (opcional)
- placa: String
- kmInicio: Number
- kmCierre: Number (opcional)
- bateriaInicio: Number (0-100)
- bateriaCierre: Number (opcional)
- aperturaCaja: Number
- cierreCaja: Number (opcional)
- totalGastos: Number
- diferencia: Number (opcional)
- danosInicio: String
- fotoTableroInicio: String (S3 URL)
- fotoExtInicio: String (S3 URL)
- danosCierre: String (opcional)
- fotoTableroCierre: String (opcional)
- fotoExtCierre: String (opcional)
- ubicacionInicio: { lat: Number, lng: Number }
- ubicacionCierre: { lat: Number, lng: Number } (opcional)
- observaciones: String
- createdAt: ISO8601 timestamp
- updatedAt: ISO8601 timestamp

GSI1 (Global Secondary Index):
- PK: estado
- SK: fechaInicio
- Purpose: Query turnos activos por fecha
- Projection: ALL

GSI2:
- PK: fechaInicio
- SK: userId
- Purpose: Query todos los turnos de una fecha
- Projection: ALL
```

### Tabla: `bee-tracked-carreras`
```
PK: userId (String)
SK: carreraId (String) formato: CARRERA#YYYYMMDD#UUID

Attributes:
- abejita: String (nombre driver)
- fecha: YYYY-MM-DD
- cliente: String
- horaInicio: HH:MM
- horaFin: HH:MM
- lugarRecojo: String
- lugarDestino: String
- tiempo: String (ej: "0:17")
- distancia: Number (km)
- precio: Number (Bs)
- observaciones: String
- foto: String (S3 URL)
- porHora: Boolean
- aCuenta: Boolean
- pagoPorQR: Boolean
- userType: 'beezero' | 'ecodelivery'
- createdAt: ISO8601 timestamp
- updatedAt: ISO8601 timestamp

GSI1:
- PK: fecha
- SK: userId
- Purpose: Query carreras por fecha (admin dashboard)
- Projection: ALL

GSI2:
- PK: userId
- SK: fecha
- Purpose: Query carreras de un usuario por rango de fechas
- Projection: ALL
```

### Tabla: `bee-tracked-anuncios`
```
PK: anuncioId (String) UUID
SK: metadata (String) fixed: "METADATA"

Attributes:
- titulo: String (max 100 chars)
- mensaje: String (max 500 chars)
- fechaInicio: YYYY-MM-DD
- fechaFin: YYYY-MM-DD (opcional)
- destinatarios: {
    tipo: 'todos' | 'drivers' | 'bikers' | 'especificos',
    lista: [String] (array de userIds, solo si tipo=especificos)
  }
- prioridad: 'normal' | 'importante' | 'urgente'
- estado: 'activo' | 'expirado' | 'eliminado'
- creadoPor: String (userId de Andi)
- createdAt: ISO8601 timestamp

GSI1:
- PK: estado
- SK: fechaInicio
- Purpose: Query anuncios activos por fecha
- Projection: ALL
```

### Tabla: `bee-tracked-anuncios-lecturas`
```
PK: anuncioId (String)
SK: userId (String)

Attributes:
- leido: Boolean
- fechaLectura: ISO8601 timestamp

Purpose: Track quién leyó cada anuncio
```

### Tabla: `bee-tracked-permisos`
```
PK: userId (String)
SK: permisoId (String) formato: PERMISO#YYYYMMDD#UUID

Attributes:
- fecha: YYYY-MM-DD (fecha del permiso)
- motivo: 'Personal' | 'Salud' | 'Vacaciones' | 'Otro'
- nota: String (opcional)
- estado: 'pendiente' | 'aprobado' | 'rechazado'
- fechaSolicitud: ISO8601 timestamp
- aprobadoPor: String (userId admin, opcional)
- fechaRespuesta: ISO8601 timestamp (opcional)
- razonRechazo: String (opcional)

GSI1:
- PK: estado
- SK: fechaSolicitud
- Purpose: Query permisos pendientes (admin)
- Projection: ALL

GSI2:
- PK: fecha
- SK: userId
- Purpose: Query permisos por fecha (dashboard)
- Projection: ALL
```

### Tabla: `bee-tracked-audit-log`
```
PK: entityType#entityId (String) ej: "carrera#CAR123"
SK: timestamp (Number) Unix timestamp en ms

Attributes:
- auditId: String (UUID)
- action: 'create' | 'update' | 'delete'
- userId: String
- userName: String
- changes: [{
    field: String,
    from: Any,
    to: Any
  }]
- metadata: Object (flexible)
- createdAt: ISO8601 timestamp

Purpose: Auditoría completa de cambios
Query: Por entity → ver historial cronológico
```

### Tabla: `bee-tracked-sessions`
```
PK: userId (String)
SK: sessionId (String) UUID

Attributes:
- userType: 'beezero' | 'ecodelivery' | 'admin'
- name: String
- createdAt: ISO8601 timestamp
- lastActivity: ISO8601 timestamp
- expiresAt: Number (Unix timestamp) → DynamoDB TTL

TTL: expiresAt (10 minutos desde lastActivity)

GSI1:
- PK: sessionId
- SK: userId
- Purpose: Lookup rápido por sessionId
- Projection: ALL
```

---

## 4. API ENDPOINTS

### Auth (`/api/auth`)
```
POST   /login
  Body: { user, password }
  Response: { success, user, sessionId, token }

POST   /logout
  Headers: Authorization, X-Session-Id
  Response: { success }

GET    /me
  Headers: Authorization, X-Session-Id
  Response: { success, user }
```

### Turnos (`/api/turnos`)
```
POST   /iniciar
  Body: { placa, kmInicio, bateriaInicio, aperturaCaja, danosInicio, fotoTableroInicio, fotoExtInicio, ubicacionInicio }
  Response: { success, turnoId }

POST   /cerrar
  Body: { turnoId, kmCierre, bateriaCierre, cierreCaja, gastos[], danosCierre, fotoTableroCierre, fotoExtCierre, ubicacionCierre }
  Response: { success }

GET    /activo
  Response: { success, turno }

GET    /historial?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
  Response: { success, turnos[] }
```

### Carreras (`/api/beezero` y `/api/ecodelivery`)
```
POST   /carreras/registrar
  Body: { abejita, fecha, cliente, horaInicio, horaFin, lugarRecojo, lugarDestino, tiempo, distancia, precio, porHora, aCuenta, pagoPorQR, observaciones, foto }
  Response: { success, carreraId }

GET    /carreras/:driverName?fecha=YYYY-MM-DD
  Response: { success, carreras[] }
```

### Anuncios (`/api/anuncios`)
```
POST   /crear (admin only)
  Body: { titulo, mensaje, fechaInicio, fechaFin, destinatarios, prioridad }
  Response: { success, anuncio }

GET    /lista?estado=activo|expirado|todos (admin only)
  Response: { success, anuncios[] }

GET    /:anuncioId/estadisticas (admin only)
  Response: { success, estadisticas: { totalDestinatarios, leyeron, pendientes, porcentaje, listaPendientes[] } }

GET    /pendientes
  Response: { success, anuncios[] }

POST   /:anuncioId/leer
  Response: { success }

PUT    /:anuncioId (admin only)
  Body: { titulo, mensaje, etc }
  Response: { success }

DELETE /:anuncioId (admin only)
  Response: { success }
```

### Permisos (`/api/permisos`)
```
POST   /solicitar
  Body: { fecha, motivo, nota }
  Response: { success, permiso }

GET    /mis-permisos
  Response: { success, permisos[] }

GET    /pendientes (admin only)
  Response: { success, permisos[] }

POST   /:permisoId/responder (admin only)
  Body: { accion: 'aprobar'|'rechazar', razon }
  Response: { success }
```

### Admin Dashboard (`/api/admin`)
```
GET    /dashboard/turnos-activos
  Response: { success, trabajando[], ausentes[], resumen }

GET    /carreras/drivers
  Response: { success, tabs[] }

GET    /carreras/all?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&page=1&limit=50
  Response: { success, carreras[], total, page, limit }

GET    /turnos/all?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&page=1&limit=50
  Response: { success, turnos[], total, page, limit }

PUT    /carreras/:carreraId
  Body: { campo1, campo2, etc }
  Response: { success, changes[] }

GET    /carreras/:carreraId/historial
  Response: { success, historial[] }

PUT    /turnos/:turnoId
  Body: { campo1, campo2, etc }
  Response: { success, changes[] }

POST   /turnos/:turnoId/forzar-cerrar
  Response: { success }
```

### Sync (`/api/sync`)
```
GET    /status
  Response: { success, lastSync, status: 'ok'|'syncing'|'error' }

POST   /manual-trigger (admin only, dev/staging)
  Response: { success }
```

---

## 5. ESTRUCTURA DE CÓDIGO BACKEND (Modular)

```
backend/
├── src/
│   ├── config/
│   │   └── index.js                 # Centralizado, validado
│   │
│   ├── utils/
│   │   ├── logger.js                # Pino structured logging
│   │   ├── errors.js                # Custom error classes
│   │   └── validators.js            # Joi schemas
│   │
│   ├── middleware/
│   │   ├── requestId.js             # Genera UUID por request
│   │   ├── requestLogger.js         # Logger con contexto
│   │   ├── auth.js                  # requireAuth, optionalAuth
│   │   ├── requireAdmin.js          # Solo admins
│   │   ├── errorHandler.js          # Global error handling
│   │   └── validateSession.js       # Valida sesión activa
│   │
│   ├── repositories/                # Data Access Layer
│   │   ├── BaseRepository.js        # CRUD genérico
│   │   ├── TurnoRepository.js
│   │   ├── CarreraRepository.js
│   │   ├── AnuncioRepository.js
│   │   ├── PermisoRepository.js
│   │   ├── AuditRepository.js
│   │   └── UserRepository.js
│   │
│   ├── services/                    # Business Logic Layer
│   │   ├── googleSheets/
│   │   │   ├── auth.js              # Credentials management
│   │   │   ├── client.js            # Wrapper googleapis
│   │   │   └── operations.js        # CRUD operations
│   │   ├── s3Upload.js              # Upload fotos a S3
│   │   ├── sessionManager.js        # Gestión de sesiones
│   │   ├── syncService.js           # Sync DynamoDB ↔ Sheets
│   │   ├── retryQueue.js            # Queue de operaciones fallidas
│   │   ├── auditService.js          # Logging de auditoría
│   │   ├── turnoService.js          # Lógica de negocio turnos
│   │   ├── carreraService.js        # Lógica de negocio carreras
│   │   └── notificationService.js   # (Futuro: push notifications)
│   │
│   ├── routes/                      # Controllers / API Endpoints
│   │   ├── auth.js
│   │   ├── turnos.js
│   │   ├── carreras.js              # (deprecated, redirigir a beezero)
│   │   ├── ecodelivery.js
│   │   ├── beezero.js
│   │   ├── anuncios.js
│   │   ├── permisos.js
│   │   ├── admin.js
│   │   └── sync.js
│   │
│   └── server.js                    # Express app (desarrollo local)
│
├── lambdas/                         # Lambda handlers específicos
│   ├── api.js                       # Wrapper para API Gateway
│   ├── syncFromSheets.js            # Cron: sync cada 5min
│   ├── processRetryQueue.js         # Cron: procesar retry queue
│   └── cleanExpiredSessions.js      # (si no usamos DynamoDB TTL)
│
├── scripts/                         # Maintenance scripts
│   ├── migrate-to-dynamodb.js
│   ├── backup-sheets-to-s3.js
│   └── seed-test-data.js
│
├── lambda.js                        # Entry point para Lambda
├── serverless.yml                   # Infrastructure as Code
├── package.json
└── .env.example
```

---

## 6. ESTRUCTURA DE CÓDIGO FRONTEND (Modular)

```
frontend/
├── src/
│   ├── components/                  # Shared components
│   │   ├── Layout.tsx
│   │   ├── Toast.tsx
│   │   ├── LoadingButton.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── TimeSelect.tsx
│   │   ├── ClienteSelect.tsx
│   │   ├── PorHoraCheckbox.tsx
│   │   ├── SyncStatus.tsx
│   │   └── AnunciosModal.tsx
│   │
│   ├── pages/                       # Page components
│   │   ├── Login.tsx
│   │   ├── SolicitarPermiso.tsx
│   │   ├── beezero/
│   │   │   ├── DashboardBeezero.tsx
│   │   │   ├── IniciarTurno.tsx
│   │   │   ├── CerrarTurno.tsx
│   │   │   ├── DetalleTurno.tsx
│   │   │   └── NuevaCarrera.tsx
│   │   ├── ecodelivery/
│   │   │   └── (similar)
│   │   └── admin/
│   │       ├── DashboardAdmin.tsx
│   │       ├── DashboardTiempoReal.tsx
│   │       ├── CarrerasDrivers.tsx
│   │       ├── TurnosBeezero.tsx
│   │       ├── GestionPermisos.tsx
│   │       ├── ListaAnuncios.tsx
│   │       ├── CrearAnuncio.tsx
│   │       └── EditarCarreraModal.tsx
│   │
│   ├── hooks/                       # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useCarreraForm.ts
│   │   ├── useFotoUpload.ts
│   │   ├── usePolling.ts            # Para dashboard tiempo real
│   │   └── usePagination.ts
│   │
│   ├── contexts/                    # React Context
│   │   ├── AuthContext.tsx
│   │   └── ToastContext.tsx
│   │
│   ├── services/                    # API clients
│   │   ├── api/
│   │   │   ├── baseClient.ts        # Axios wrapper con retry
│   │   │   ├── authApi.ts
│   │   │   ├── turnosApi.ts
│   │   │   ├── carrerasApi.ts
│   │   │   ├── beezeroApi.ts
│   │   │   ├── anunciosApi.ts
│   │   │   ├── permisosApi.ts
│   │   │   └── adminApi.ts
│   │   ├── storage.ts               # localStorage wrapper
│   │   └── cognito.ts               # Cognito client
│   │
│   ├── types/                       # TypeScript types
│   │   ├── index.ts
│   │   ├── turno.ts
│   │   ├── carrera.ts
│   │   ├── anuncio.ts
│   │   ├── permiso.ts
│   │   └── user.ts
│   │
│   ├── utils/                       # Utility functions
│   │   ├── formatters.ts            # Date, currency, etc
│   │   ├── validators.ts
│   │   └── imageCompression.ts      # Comprimir fotos antes de upload
│   │
│   ├── config/
│   │   ├── themes.ts
│   │   └── constants.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/
│   ├── manifest.json                # PWA manifest
│   └── sw.js                        # Service Worker
│
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 7. FLUJOS CRÍTICOS

### 7.1 Flujo: Iniciar Turno

```
1. Usuario abre app → Service Worker carga desde cache
2. Login → Cognito + SessionManager (DynamoDB)
3. Click "Iniciar Turno"
4. Formulario: placa, km, batería, apertura caja, fotos (2), ubicación GPS
5. Frontend: Comprimir fotos a <1MB cada una
6. POST /api/turnos/iniciar
   ├─ Lambda recibe request
   ├─ Middleware: requestId, logger, validateSession
   ├─ TurnoService.iniciar():
   │  ├─ Validar campos (Joi)
   │  ├─ Subir fotos a S3 (paralelo, 2 uploads)
   │  ├─ Escribir a DynamoDB (turnosTable)
   │  └─ Agregar a cola de sync → Google Sheets (async)
   └─ Response: { success: true, turnoId }
7. Frontend: Toast "✅ Turno iniciado" + redirigir a Dashboard
8. Background: SyncService procesa cola → escribe a Google Sheet
9. Lambda cron (cada 5min): Verifica sincronización bidireccional
```

**Latencia Objetivo:** <2s (p95)

---

### 7.2 Flujo: Registrar Carrera

```
1. Usuario en dashboard → "Registrar Carrera"
2. Formulario: fecha, cliente, horas, lugares, precio, foto (opcional)
3. Si foto: comprimir <800KB
4. POST /api/beezero/carreras/registrar
   ├─ Validar sesión activa
   ├─ CarreraService.registrar():
   │  ├─ Validar campos
   │  ├─ Subir foto a S3 (si existe)
   │  ├─ Escribir a DynamoDB
   │  ├─ Sync a Google Sheets (async queue)
   │  └─ AuditService.log('create', carrera)
   └─ Response: { success: true, carreraId }
5. Toast "✅ Carrera registrada" + modal éxito
6. Usuario puede: "Registrar otra" o "Ir al dashboard"
```

**Latencia Objetivo:** <3s (incluye foto)

---

### 7.3 Flujo: Dashboard Admin Tiempo Real

```
1. Admin abre dashboard
2. Componente DashboardTiempoReal monta
3. useEffect: polling cada 10s
4. GET /api/admin/dashboard/turnos-activos
   ├─ TurnoRepo.query(estado='activo', fecha=hoy) [DynamoDB GSI]
   ├─ UserRepo.findAll() → detectar ausentes
   ├─ PermisoRepo.query(fecha=hoy, estado='aprobado')
   └─ Response: { trabajando[], ausentes[], resumen }
5. Frontend: Comparar con estado anterior
6. Si nuevo turno iniciado → Toast + sonido
7. Si turno cerrado → Toast (sin sonido)
8. Si ausencia sin permiso después de 9am → Toast warning
9. Cada 10s: repeat desde paso 3
```

**Latencia Objetivo:** <500ms por polling request

---

### 7.4 Flujo: Anuncio de Andi

```
# Crear Anuncio (Andi)
1. Andi (admin) → Panel Anuncios → "Crear"
2. Formulario:
   - Título: "Mañana todos con polera amarilla"
   - Mensaje: "Es importante para el evento del cliente X"
   - Fecha inicio: 2026-06-02
   - Fecha fin: (vacío = solo ese día)
   - Destinatarios: Todos
   - Prioridad: Normal
3. POST /api/anuncios/crear
   ├─ Validar admin
   ├─ AnuncioRepo.create()
   └─ Response: { success, anuncio }
4. Toast "✅ Anuncio programado"

# Ver Anuncio (Driver)
1. Driver hace login el 2026-06-02
2. AuthService.login() → success
3. Frontend: GET /api/anuncios/pendientes
   └─ AnuncioRepo.findPendientesByUser(userId)
      ├─ Query anuncios activos para hoy
      ├─ Filtrar por destinatarios
      └─ Excluir ya leídos (lecturasTable)
4. Response: [{ anuncioId, titulo, mensaje, prioridad }]
5. Si length > 0 → Mostrar AnunciosModal
6. Driver lee mensaje → "Entendido"
7. POST /api/anuncios/:anuncioId/leer
   └─ LecturaRepo.create({ anuncioId, userId, leido: true })
8. Modal se cierra → navegar a dashboard

# Ver Estadísticas (Andi)
1. Andi → Lista Anuncios → "Ver Stats"
2. GET /api/anuncios/:anuncioId/estadisticas
   ├─ LecturaRepo.findByAnuncioId()
   ├─ UserRepo.countByDestinatarios(anuncio)
   └─ Calculate: leyeron, pendientes, porcentaje
3. Response: { totalDestinatarios: 50, leyeron: 43, pendientes: 7, listaPendientes: [...] }
4. Frontend muestra cards + lista de pendientes
```

---

## 8. SINCRONIZACIÓN BIDIRECCIONAL

### DynamoDB → Google Sheets (Escrituras desde App)
```
1. Usuario registra carrera
2. CarreraService escribe a DynamoDB (inmediato)
3. Agrega tarea a SyncQueue en memoria
4. setImmediate() → SyncService.processSyncQueue()
5. Batch de 10 tareas por vez
6. Para cada tarea:
   ├─ getOrCreateSheet(driverName)
   ├─ convertir objeto → fila (row array)
   ├─ appendRow(spreadsheetId, sheetTitle, row)
   └─ Si falla → agregar a RetryQueue (DynamoDB)
7. RetryQueue procesada por Lambda cada 1min
```

### Google Sheets → DynamoDB (Ediciones desde Sheets)
```
1. Lambda trigger: EventBridge cada 5min
2. SyncService.syncFromSheet()
3. Para cada pestaña (driver):
   ├─ getAllRows(spreadsheetId, tabName)
   ├─ Para cada fila:
   │  ├─ Convertir fila → objeto carrera
   │  ├─ CarreraRepo.findById(carreraId)
   │  ├─ Si NO existe → create (nueva carrera en Sheet)
   │  ├─ Si existe → detectChanges(oldData, newData)
   │  │  └─ Si hay cambios:
   │  │     ├─ CarreraRepo.update(carreraId, newData)
   │  │     └─ AuditService.log({ source: 'google-sheets', changes })
   │  └─ Continue
   └─ Next tab
4. Logger.info('Sync completed', { tabsProcessed, rowsUpdated })
```

**Garantías:**
- Eventual consistency: <5 minutos
- Sin pérdida de datos: RetryQueue captura fallos
- Auditoría completa: Todos los cambios logged
- Idempotencia: Mismo write 2 veces = mismo resultado

---

## 9. ESTRATEGIA DE CACHING

### Frontend (Service Worker + localStorage)
```javascript
// sw.js - Service Worker
const CACHE_NAME = 'bee-tracked-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index-[hash].js',
  '/assets/index-[hash].css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: Network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET requests
          if (request.method === 'GET' && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request)) // Offline: usar cache
    );
  }
  // Static assets: Cache first, network fallback
  else {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
```

```typescript
// frontend/src/services/storage.ts
class Storage {
  private static CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutos

  setCache(key: string, data: any) {
    localStorage.setItem(`cache:${key}`, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  }

  getCache<T>(key: string): T | null {
    const raw = localStorage.getItem(`cache:${key}`);
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > Storage.CACHE_EXPIRY) {
      localStorage.removeItem(`cache:${key}`);
      return null;
    }

    return data as T;
  }
}
```

### Backend (DynamoDB Cache + In-Memory)
```javascript
// backend/src/services/cacheService.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5min default

class CacheService {
  // In-memory cache (Lambda warm instances)
  get(key) {
    return cache.get(key);
  }

  set(key, value, ttl = 300) {
    cache.set(key, value, ttl);
  }

  // DynamoDB cache (persistente, TTL nativo)
  async getFromDynamoDB(key) {
    const result = await dynamo.get({
      TableName: 'bee-tracked-cache',
      Key: { cacheKey: key },
    });

    if (!result.Item) return null;

    // DynamoDB TTL lo elimina automáticamente cuando expira
    return result.Item.value;
  }

  async setInDynamoDB(key, value, ttlSeconds = 300) {
    await dynamo.put({
      TableName: 'bee-tracked-cache',
      Item: {
        cacheKey: key,
        value,
        expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds,
      },
    });
  }
}
```

**Estrategia por Endpoint:**
- `/api/auth/login`: No cache (siempre fresh)
- `/api/turnos/activo`: Cache 30s (in-memory)
- `/api/carreras/:driver`: Cache 2min (DynamoDB)
- `/api/admin/dashboard/turnos-activos`: Cache 10s (in-memory)
- `/api/anuncios/pendientes`: Cache hasta que se marque leído
- Google Sheets calls: Cache 5min agresivo (DynamoDB)

---

## 10. MONITOREO Y OBSERVABILIDAD

### CloudWatch Metrics (Custom)
```javascript
// backend/src/utils/metrics.js
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

class MetricsService {
  async publish(metricName, value, unit = 'Count', dimensions = {}) {
    const command = new PutMetricDataCommand({
      Namespace: 'BeeTracked',
      MetricData: [{
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Timestamp: new Date(),
        Dimensions: Object.entries(dimensions).map(([Name, Value]) => ({ Name, Value })),
      }],
    });

    await cloudwatch.send(command);
  }

  async publishLatency(endpoint, latency) {
    await this.publish('APILatency', latency, 'Milliseconds', { Endpoint: endpoint });
  }

  async publishError(endpoint, errorCode) {
    await this.publish('APIError', 1, 'Count', { Endpoint: endpoint, ErrorCode: errorCode });
  }
}

// Middleware para trackear latency
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const latency = Date.now() - start;
    metrics.publishLatency(req.path, latency);
    
    if (res.statusCode >= 500) {
      metrics.publishError(req.path, `HTTP_${res.statusCode}`);
    }
  });

  next();
});
```

### CloudWatch Dashboard
```yaml
# Crear dashboard con métricas clave
Widgets:
  - APILatency (p50, p95, p99) por endpoint
  - APIError count por endpoint
  - TurnosActivos gauge (actualizado cada 1min)
  - CarrerasRegistradas count (por día)
  - DynamoDBConsumedCapacity (reads/writes)
  - LambdaInvocations + Errors + Duration
  - GoogleSheetsAPIQuota (custom counter)
  - SyncQueueDepth (items pendientes de sync)
```

### CloudWatch Alarms
```yaml
Alarms:
  - APIErrorRate > 5% en 5min → SNS → Email Carli+Miguel
  - APILatencyP95 > 3000ms en 5min → SNS
  - TurnosSinCerrar > 10 (después de 10pm) → SNS
  - GoogleSheetsQuotaExceeded → SNS (crítico)
  - DynamoDBThrottling > 0 → SNS
  - LambdaErrors > 10 en 1min → SNS
```

### Structured Logging (Pino)
```javascript
// Formato de logs
{
  "level": "info",
  "time": 1717257600000,
  "requestId": "req_abc123",
  "userId": "user_xyz",
  "path": "/api/turnos/iniciar",
  "method": "POST",
  "statusCode": 200,
  "latency": 1234,
  "msg": "Turno iniciado exitosamente",
  "turnoId": "TURNO#20260601#uuid"
}

// Query en CloudWatch Logs Insights
fields @timestamp, requestId, userId, msg, latency
| filter level = "error"
| sort @timestamp desc
| limit 100
```

---

## 11. SEGURIDAD

### Autenticación
- **Método primario:** AWS Cognito User Pools
- **JWT:** Firmado con RS256, expira en 1 hora
- **Sesiones:** DynamoDB con TTL 10min inactividad
- **Refresh:** Cognito refresh tokens (30 días)

### Autorización
```javascript
// middleware/auth.js
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido', code: 'AUTH_REQUIRED' });
  }

  try {
    const decoded = await verifyJWT(token); // Verifica con Cognito public keys
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido', code: 'AUTH_INVALID' });
  }
}

async function requireAdmin(req, res, next) {
  if (!['Carli', 'Miguel', 'Andi', 'Ale'].includes(req.user.name)) {
    return res.status(403).json({ error: 'Acceso denegado', code: 'FORBIDDEN' });
  }
  next();
}
```

### CORS
```javascript
// backend/src/server.js
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL] // Solo el dominio de producción
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

### Secrets Management
```javascript
// backend/src/config/secrets.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function getSecret(secretName) {
  const client = new SecretsManagerClient({ region: config.awsRegion });
  const command = new GetSecretValueCommand({ SecretId: secretName });
  const response = await client.send(command);
  return JSON.parse(response.SecretString);
}

// Uso
const googleCreds = await getSecret('bee-tracked/google-credentials');
const cognitoSecret = await getSecret('bee-tracked/cognito-client-secret');
```

### Rate Limiting (API Gateway)
```yaml
# serverless.yml
provider:
  apiGateway:
    throttle:
      burstLimit: 500  # Max requests en burst
      rateLimit: 100   # Requests por segundo sostenidos
```

### Input Validation
```javascript
// backend/src/utils/validators.js
const Joi = require('joi');

const carreraSchema = Joi.object({
  abejita: Joi.string().min(2).max(100).required(),
  fecha: Joi.date().iso().required(),
  cliente: Joi.string().min(2).max(200).required(),
  precio: Joi.number().min(0).max(10000),
  distancia: Joi.number().min(0).max(1000),
  foto: Joi.string().base64().max(6 * 1024 * 1024), // 6MB max
  observaciones: Joi.string().max(1000).allow(''),
});

// Uso en route
router.post('/carreras/registrar', async (req, res) => {
  const { error, value } = carreraSchema.validate(req.body);
  if (error) {
    throw new ValidationError(error.details[0].message);
  }
  // Usar `value` (sanitizado)
});
```

---

## 12. DEPLOYMENT

### CI/CD Pipeline (GitHub Actions)
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && serverless deploy --stage prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
      - run: aws s3 sync frontend/dist s3://bee-tracked-frontend --delete
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DISTRIBUTION_ID }} --paths "/*"
```

### Environments
- **dev:** Deploy manual, DynamoDB local, Google Sheets sandbox
- **staging:** Deploy automático en push a `develop`, DynamoDB real, URL temporal
- **production:** Deploy automático en push a `main`, DynamoDB prod, dominio custom

### Rollback Strategy
```bash
# Backend (Lambda): Usar versiones y aliases
aws lambda update-alias \
  --function-name bee-tracked-api \
  --name prod \
  --function-version $PREVIOUS_VERSION

# Frontend (S3): Mantener backup de versión anterior
aws s3 sync s3://bee-tracked-frontend-backup/v1.2.3 s3://bee-tracked-frontend --delete
aws cloudfront create-invalidation --distribution-id $CF_ID --paths "/*"
```

---

## 13. COSTOS ESTIMADOS (AWS)

### Configuración Actual (110 usuarios)
```
DynamoDB:
  - 6 tablas × $0.25/GB/mes × 2GB = $3/mes
  - On-demand: ~500k reads/día × $0.25/1M = $3.75/mes
  - On-demand: ~100k writes/día × $1.25/1M = $3.75/mes
  Total DynamoDB: ~$10.50/mes

Lambda:
  - 1M invocations/mes × $0.20/1M = $0.20/mes
  - Compute: 1M × 512MB × 2s avg × $0.0000166667/GB-s = $17/mes
  Total Lambda: ~$17.20/mes

S3:
  - 100 GB fotos × $0.023/GB = $2.30/mes
  - PUT requests: 10k/mes × $0.005/1k = $0.05/mes
  - GET requests: 100k/mes × $0.0004/1k = $0.04/mes
  Total S3: ~$2.40/mes

CloudWatch:
  - Logs: 5GB/mes × $0.50/GB = $2.50/mes
  - Metrics: 50 custom × $0.30 = $15/mes
  Total CloudWatch: ~$17.50/mes

API Gateway:
  - 1M requests × $3.50/1M = $3.50/mes

CloudFront (frontend):
  - 10GB transfer × $0.085/GB = $0.85/mes
  - 1M requests × $0.0075/10k = $0.75/mes
  Total CloudFront: ~$1.60/mes

Secrets Manager:
  - 3 secrets × $0.40/mes = $1.20/mes

──────────────────────────────────────
TOTAL MENSUAL: ~$54/mes
```

### Proyección 250 Usuarios (6 meses)
```
DynamoDB: $25/mes (más datos + reads/writes)
Lambda: $40/mes (2.5× invocations)
S3: $6/mes (250 GB fotos)
CloudWatch: $25/mes (más logs)
API Gateway: $8/mes
CloudFront: $3/mes
Secrets Manager: $1.20/mes
──────────────────────────────────────
TOTAL MENSUAL: ~$108/mes
```

### Optimizaciones de Costo
- **Reserved Capacity DynamoDB:** Ahorro 50% si tráfico es predecible
- **S3 Lifecycle:** Mover fotos >6 meses a S3 Glacier ($0.004/GB)
- **Lambda Provisioned Concurrency:** Solo si latencia crítica (caro)
- **CloudWatch Logs:** Retención 7 días, archive a S3

---

**Documento completo de Arquitectura Técnica.**  
**Próximos pasos:** Implementar Fase 0 (Foundation) según ROADMAP_FASES.md
