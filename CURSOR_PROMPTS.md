# Prompts para Cursor - Bee Tracked V2.0
**Actualizado:** Junio 2026

**Proyecto:** eco-app-drivers (Bee Tracked)
**Objetivo:** 110 usuarios ahora, diseñado para escalar a 300+ sin cambios de arquitectura
**Stack:** Node.js + Express + React + TypeScript + DynamoDB + Google Sheets (espejo) + S3

---

## 📋 CONTEXTO GENERAL (Incluir SIEMPRE)

```
# CONTEXTO DEL PROYECTO

Bee Tracked — sistema de gestión para dos empresas:
- BeeZero: ~50 drivers (motos/autos)
- EcoDelivery: ~60 bikers

Total actual: 110 usuarios + admins + Andi (RRHH)
Escalado proyectado: 300 usuarios en 2-3 meses (misma arquitectura, sin migraciones)

## Decisión Arquitectónica Central:
DynamoDB ES la fuente de verdad. Google Sheets es un ESPEJO de solo lectura.

Flujo de escritura:
1. Escribir en DynamoDB (rápido, confiable, fuente de verdad)
2. Escribir en Google Sheets EN PARALELO (best-effort, para visibilidad del equipo)
   - Si Sheets falla → se loguea el error pero la operación NO falla para el usuario
   - Sheets siempre termina teniendo los datos (puede demorar segundos)

Por qué:
- El equipo confía en Google Sheets, lo necesita para ver datos
- DynamoDB escala a 300, 1000, 10000 usuarios sin cambios
- Si hubiera que migrar de Sheets a DynamoDB en el futuro, ya está hecho
- Costo: DynamoDB on-demand = pago exactamente lo que uso

## Stack:
- Backend: Node.js 18 + Express + AWS Lambda (CommonJS: require/module.exports)
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- BD Principal: DynamoDB (fuente de verdad para TODO)
- BD Espejo: Google Sheets (mirror de lectura para el equipo)
- Storage: S3 para fotos
- Deploy: Serverless Framework
- Auth: sesiones propias en DynamoDB (sessionManager.js ya existe)

## Tipos de usuario:
- beezero     → drivers (módulo /beezero/*)
- ecodelivery / operador → bikers (módulo /ecodelivery/*)
- admin       → Carli, Miguel, Ale (panel /admin/*)
- rrhh        → Andi, solo anuncios (panel /andi/*)

## Recursos AWS (NO TOCAR otros proyectos):
- S3: bee-tracked-photos
- Lambda: bee-tracked-backend-prod-api
- DynamoDB: bee-tracked-sessions-prod (sesiones — ya existe)
- CloudFront: d19ls0k7de9u6w.cloudfront.net
- Región: us-east-1

## Tablas DynamoDB (a crear):
- bee-tracked-turnos-prod       (turnos de todos)
- bee-tracked-carreras-prod     (carreras de drivers)
- bee-tracked-kilometrajes-prod (registros de bikers)
- bee-tracked-anuncios-prod     (anuncios de Andi)
- bee-tracked-lecturas-prod     (confirmaciones de lectura)
- bee-tracked-permisos-prod     (solicitudes de permiso)
- bee-tracked-users-prod        (perfiles de usuario)
- bee-tracked-audit-prod        (audit log de cambios)

## Estado actual del código:
backend/src/
├── middleware/auth.js          ← ya existe
├── routes/
│   ├── admin.js               ← ya existe (BUG: NO está registrado en server.js)
│   ├── auth.js                ← ya existe
│   ├── beezero.js             ← ya existe (lee/escribe Google Sheets)
│   ├── ecodelivery.js         ← ya existe (lee/escribe Google Sheets)
│   ├── turnos.js              ← ya existe (lee/escribe Google Sheets)
│   └── carreras.js            ← ya existe
├── services/
│   ├── googleSheets.js        ← ya existe
│   ├── sessionManager.js      ← ya existe
│   ├── sessionStore/          ← ya existe (DynamoDB + Memory)
│   └── s3Upload.js            ← ya existe
└── server.js

frontend/src/
├── pages/
│   ├── beezero/               ← completo
│   ├── ecodelivery/           ← completo
│   └── admin/                 ← básico
├── services/ (adminApi, beezeroApi, turnosApi, ecodeliveryApi, storage, auth)
├── contexts/ (ToastContext, AuthContext)
└── components/ (Layout, DashboardCard, LoadingSpinner, etc.)

## Principios de Código:
- CommonJS: require() / module.exports (NO import/export en backend)
- Routes = controllers (validan request, llaman services)
- Services = lógica de negocio (DynamoDB + Sheets en paralelo)
- NO process.env disperso (usar config centralizado)
- Errores claros con códigos específicos
```

---

## 🗺️ ESQUEMAS DYNAMODB (Referencia para todos los sprints)

```
# ESQUEMAS DYNAMODB — Leer antes de cualquier sprint

## TURNOS: bee-tracked-turnos-prod
PK: USER#${userId}
SK: TURNO#${turnoId}  (turnoId = UUID)

Atributos:
- turnoId, userId, nombre, tipo (beezero|ecodelivery)
- fecha (YYYY-MM-DD), horaInicio, horaCierre
- kmInicio, kmFin, bateriaInicio, bateriaCierre
- placa (solo beezero), fotoInicio, fotoCierre
- estado (activo|cerrado)
- createdAt (timestamp número)

GSI 1: estado-fecha-index  → PK: estado, SK: fecha
  → Permite: "todos los turnos activos hoy"

GSI 2: tipo-fecha-index → PK: tipo, SK: fecha
  → Permite: "todos los turnos beezero de esta semana"

## CARRERAS: bee-tracked-carreras-prod
PK: USER#${userId}
SK: CARRERA#${fecha}#${carreraId}

Atributos:
- carreraId, userId, nombre, fecha
- cliente, precio, distancia
- tipoServicio, metodoPago
- observaciones, foto
- turnoId (referencia al turno activo)
- createdAt (timestamp número)

GSI: fecha-index → PK: fecha, SK: carreraId
  → Permite: "todas las carreras del día para admin"

## KILOMETRAJES: bee-tracked-kilometrajes-prod
PK: USER#${userId}
SK: KM#${fecha}#${kmId}

Atributos:
- kmId, userId, nombre, fecha
- kmInicio, kmFin, kmRecorridos
- turnoId, observaciones
- createdAt (timestamp número)

## ANUNCIOS: bee-tracked-anuncios-prod
PK: ANUNCIO#${anuncioId}
SK: ${createdAt}  (timestamp número)

Atributos:
- anuncioId, titulo, mensaje
- startDate (YYYY-MM-DD), endDate (YYYY-MM-DD o null)
- audience (all|beezero|ecodelivery)
- priority (normal|important|urgent)
- status (active|expired|deleted)
- createdBy (userId de Andi)
- createdAt (timestamp número)

GSI: status-startDate-index → PK: status, SK: startDate
  → Permite: "todos los anuncios activos"

## LECTURAS: bee-tracked-lecturas-prod
PK: ANUNCIO#${anuncioId}
SK: USER#${userId}
- readAt (timestamp número)

## PERMISOS: bee-tracked-permisos-prod
PK: PERMISO#${permisoId}
SK: ${fecha}  (YYYY-MM-DD del permiso)

Atributos:
- permisoId, userId, userName, userType
- fecha, motivo (Personal|Salud|Vacaciones|Otro), nota
- estado (pendiente|aprobado|rechazado)
- creadoEn (timestamp número)
- respondidoPor, respondidoEn, razonRechazo

GSI: estado-fecha-index → PK: estado, SK: fecha
  → Permite: "todos los permisos pendientes"

GSI 2: userId-fecha-index → PK: userId, SK: fecha
  → Permite: "permisos de un usuario"

## USUARIOS: bee-tracked-users-prod
PK: USER#${userId}
SK: PROFILE

Atributos:
- userId, nombre, userType (beezero|ecodelivery|admin|rrhh)
- email, placa (opcional), activo (boolean)
- createdAt, updatedAt

## AUDIT: bee-tracked-audit-prod
PK: ${entityType}#${entityId}  (ej: "turno#abc123")
SK: ${timestamp}  (número)

Atributos:
- entityType, entityId, action
- userId, userName, requestId
- changes: [{ field, from, to }]
- source (app|google-sheets|system)
```

---

## 🐛 BUG URGENTE — Admin Router No Registrado

```
# BUG: admin router no está registrado en server.js

backend/src/routes/admin.js existe pero NO está en backend/src/server.js.
Las rutas /api/admin/* retornan 404.

Fix en backend/src/server.js — agregar después de los otros routers:

const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

Rutas que quedan disponibles:
- GET /api/admin/carreras/drivers
- GET /api/admin/carreras/:tab
- GET /api/admin/turnos/beezero
- GET /api/admin/turnos/ecodelivery

NO toques ningún otro archivo.
```

---

## 🏗️ SPRINT 0: Migración + Infraestructura (4-5 días)

### Parte A: Tablas DynamoDB

```
# SPRINT 0A: Crear todas las tablas DynamoDB

Lee el contexto general y los ESQUEMAS DYNAMODB arriba.

## Objetivo:
Crear en serverless.deploy.yml todas las tablas DynamoDB del proyecto.
Estas son las tablas definitivas — diseñadas para escalar a 300+ usuarios sin cambios.

## Tablas a agregar en serverless.deploy.yml:

Agrega en resources.Resources cada tabla con:
- BillingMode: PAY_PER_REQUEST (pago por uso, sin capacidad fija)
- Sin provisionedThroughput
- Con los GSI que indica el esquema

Tablas:
1. bee-tracked-turnos-prod (con 2 GSI)
2. bee-tracked-carreras-prod (con 1 GSI)
3. bee-tracked-kilometrajes-prod
4. bee-tracked-anuncios-prod (con 1 GSI)
5. bee-tracked-lecturas-prod
6. bee-tracked-permisos-prod (con 2 GSI)
7. bee-tracked-users-prod
8. bee-tracked-audit-prod

Agrega en provider.environment:
- TURNOS_TABLE: bee-tracked-turnos-prod
- CARRERAS_TABLE: bee-tracked-carreras-prod
- KILOMETRAJES_TABLE: bee-tracked-kilometrajes-prod
- ANUNCIOS_TABLE: bee-tracked-anuncios-prod
- LECTURAS_TABLE: bee-tracked-lecturas-prod
- PERMISOS_TABLE: bee-tracked-permisos-prod
- USERS_TABLE: bee-tracked-users-prod
- AUDIT_TABLE: bee-tracked-audit-prod

Agrega permisos IAM para todas las tablas:
- dynamodb:GetItem, PutItem, UpdateItem, DeleteItem, Query, Scan
- Incluir los ARNs de los GSI también (arn:aws:dynamodb:...:table/*/index/*)

NO hagas deploy todavía. Muéstrame el diff completo para revisarlo.
```

### Parte B: Config y Logger

```
# SPRINT 0B: Config centralizado + Logger

Lee el contexto general.

## 1. Config centralizado
Crea: backend/src/config/index.js

Debe:
- Leer TODAS las env vars en un lugar
- Validar que las requeridas existan (si falta → lanzar error al arrancar)
- Exportar objeto config con getters

Variables:
const config = {
  google: {
    sheetId: process.env.GOOGLE_SHEET_ID,
    carrerasDriversSheetId: process.env.CARRERAS_DRIVERS_SHEET_ID,
    carreassBikersSheetId: process.env.CARRERAS_BIKERS_SHEET_ID,
  },
  dynamo: {
    region: process.env.AWS_REGION || 'us-east-1',
    sessionsTable: process.env.DYNAMODB_SESSIONS_TABLE || 'bee-tracked-sessions-prod',
    turnosTable: process.env.TURNOS_TABLE || 'bee-tracked-turnos-prod',
    carrerasTable: process.env.CARRERAS_TABLE || 'bee-tracked-carreras-prod',
    kilometrajesTable: process.env.KILOMETRAJES_TABLE || 'bee-tracked-kilometrajes-prod',
    anunciosTable: process.env.ANUNCIOS_TABLE || 'bee-tracked-anuncios-prod',
    lecturasTable: process.env.LECTURAS_TABLE || 'bee-tracked-lecturas-prod',
    permisosTable: process.env.PERMISOS_TABLE || 'bee-tracked-permisos-prod',
    usersTable: process.env.USERS_TABLE || 'bee-tracked-users-prod',
    auditTable: process.env.AUDIT_TABLE || 'bee-tracked-audit-prod',
  },
  s3: { bucket: process.env.S3_BUCKET || 'bee-tracked-photos' },
  app: { nodeEnv: process.env.NODE_ENV || 'development', frontendUrl: process.env.FRONTEND_URL },
};

## 2. Logger estructurado
Crea: backend/src/utils/logger.js

SIN instalar pino (no agregar deps). Logger JSON con console.log.
Exponer: logger.info(msg, meta), logger.warn(msg, meta), logger.error(msg, meta)
Función: logger.createRequestLogger(req) → retorna logger con requestId inyectado

Formato: { level, msg, requestId, userId, path, timestamp, ...meta }

## 3. Middleware requestId
Crea: backend/src/middleware/requestId.js

- crypto.randomUUID() (Node 18, nativo)
- Guarda en req.requestId
- Agrega header X-Request-Id en response

## 4. Actualizar server.js:
- Importar config (valida env vars al arrancar)
- app.use(requestId) antes de todas las rutas
- Registrar adminRouter (del bug)

CommonJS (require/module.exports). NO instalar dependencias.
```

### Parte C: Script de Migración

```
# SPRINT 0C: Migrar datos históricos de Google Sheets a DynamoDB

Lee el contexto general y los ESQUEMAS DYNAMODB.

## Objetivo:
Leer todos los datos de Google Sheets y escribirlos en DynamoDB.
Después de esto, DynamoDB tiene toda la historia y Google Sheets sigue siendo el espejo.

## Crear: scripts/migrate-sheets-to-dynamo.js

Este script:
1. Lee todas las hojas de turnos (beezero + ecodelivery) del GOOGLE_SHEET_ID
2. Lee todas las hojas de carreras del CARRERAS_DRIVERS_SHEET_ID
3. Transforma los datos al esquema DynamoDB
4. Escribe en DynamoDB con BatchWrite (máximo 25 items por batch)
5. Loguea progreso: "Migrado: 45/200 turnos..."
6. Loguea errores sin detener la migración
7. Al final: resumen de cuánto se migró y qué falló

## Estructura del script:
const { DynamoDBClient, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');

// Función para cada tipo de entidad
async function migrateTurnos() { ... }
async function migrateCarreras() { ... }

// Transformadores: Sheet row → DynamoDB item
function turnoSheetToDynamo(row, userId) {
  return {
    PK: { S: `USER#${userId}` },
    SK: { S: `TURNO#${generateId(row)}` },
    // ... resto de atributos según esquema
  };
}

// Main
async function main() {
  console.log('=== MIGRACIÓN SHEETS → DYNAMODB ===');
  await migrateTurnos();
  await migrateCarreras();
  console.log('=== MIGRACIÓN COMPLETADA ===');
}

main().catch(console.error);

## IMPORTANTE:
- El script NO borra datos de Google Sheets (solo lee)
- Si un item ya existe en DynamoDB (misma PK+SK) → sobrescribir (idempotente)
- Usar variables de entorno del archivo .env del backend
- El script se ejecuta UNA SOLA VEZ antes del lanzamiento oficial
- Estimado: ~5-10 min para migrar datos actuales

## Para ejecutar:
cd backend
node scripts/migrate-sheets-to-dynamo.js

## Verificar después:
aws dynamodb scan --table-name bee-tracked-turnos-prod --select COUNT
```

### Parte D: Servicio Híbrido Base

```
# SPRINT 0D: Servicio híbrido (DynamoDB primero, Sheets como espejo)

Lee el contexto general y los ESQUEMAS DYNAMODB.

## Crear: backend/src/services/hybridWrite.js

Este servicio encapsula el patrón de escritura híbrida.
TODOS los writes en la app deben pasar por este servicio.

class HybridWrite {
  /**
   * Escribe en DynamoDB (obligatorio) + Google Sheets (best-effort).
   * @param {Object} options
   * @param {Function} options.dynamo   - función async que escribe en DynamoDB
   * @param {Function} options.sheets   - función async que escribe en Sheets (puede fallar)
   * @param {string}   options.context  - descripción para logs (ej: "cerrar turno")
   */
  async write({ dynamo, sheets, context }) {
    // 1. Escribir en DynamoDB (si falla → lanzar error, operación falla)
    await dynamo();
    
    // 2. Escribir en Sheets (si falla → loguear, operación NO falla)
    try {
      await sheets();
    } catch (err) {
      logger.warn({ err, context }, 'Sheets write failed (non-critical)');
      // TODO futuro: agregar a retry queue si se necesita garantía
    }
  }
}

module.exports = new HybridWrite();

## Ejemplo de uso en una ruta:
const hybridWrite = require('../services/hybridWrite');

await hybridWrite.write({
  context: 'cerrar turno',
  dynamo: async () => {
    await dynamodb.put({
      TableName: config.dynamo.turnosTable,
      Item: marshall({ PK: `USER#${userId}`, SK: `TURNO#${turnoId}`, ...turnoData }),
    });
  },
  sheets: async () => {
    await googleSheets.updateTurno(turnoId, turnoData);
  },
});

CommonJS (require/module.exports).
```

---

## 📢 SPRINT 1: Anuncios Andi + Usuario RRHH (4-5 días)

### Parte A: Usuario Andi

```
# SPRINT 1A: Crear usuario Andi (tipo rrhh)

Lee el contexto general.

## Andi = tipo rrhh:
- Solo puede crear/ver/eliminar anuncios
- NO ve carreras ni turnos
- Al hacer login → redirige a /andi/dashboard

## Cambios necesarios:

### 1. backend/src/routes/auth.js
- Soporte para userType === 'rrhh' en el flow de login
- Andi retorna userType: 'rrhh' en la respuesta

### 2. frontend/src/App.tsx
Agregar:
- RrhhGuard: redirige si userType !== 'rrhh'
- DashboardRouter: si userType === 'rrhh' → navigate('/andi/dashboard')
- Rutas: /andi/dashboard, /andi/anuncios, /andi/anuncios/crear

### 3. frontend/src/pages/andi/DashboardAndi.tsx (NUEVO)
Dashboard simple:
- Tarjeta: "Crear anuncio" → /andi/anuncios/crear
- Tarjeta: "Ver mis anuncios" → /andi/anuncios
- Badge: "X anuncios activos ahora"

Mismo estilo visual que DashboardAdmin pero con colores verdes o naranja
para diferenciar visualmente el panel de RRHH.

### Archivos:
- [ ] frontend/src/pages/andi/DashboardAndi.tsx (nuevo)
- [ ] frontend/src/App.tsx (rutas /andi/*, RrhhGuard, DashboardRouter)
- [ ] backend/src/routes/auth.js (soporte rrhh)
```

### Parte B: Backend Anuncios (DynamoDB)

```
# SPRINT 1B: Backend de anuncios con DynamoDB

Lee el contexto general y los ESQUEMAS DYNAMODB.

## Tablas:
- bee-tracked-anuncios-prod (anuncios)
- bee-tracked-lecturas-prod (quién leyó qué)

## Crear: backend/src/routes/andi.js (NUEVO)

Importar: config, DynamoDBClient, hybridWrite, logger

### POST /api/andi/announcements (solo rrhh)
Body: { title, message, startDate, endDate?, audience, priority }
Validaciones:
- title: max 100 chars
- message: max 500 chars
- startDate: no puede ser fecha pasada
- audience: 'all' | 'beezero' | 'ecodelivery'
- priority: 'normal' | 'important' | 'urgent'

Proceso:
1. Generar anuncioId = crypto.randomUUID()
2. Escribir en DynamoDB (anuncios-prod)
3. Escribir en Sheets (hoja "Anuncios") como espejo — best-effort
4. Response: { success: true, announcement }

### GET /api/andi/announcements (solo rrhh)
- Leer de DynamoDB con GSI: status-startDate-index
- Query: status (opcional, default 'active')
- Ordenar por createdAt DESC
- Response: { success: true, announcements, total }

### DELETE /api/andi/announcements/:id (solo rrhh)
- Soft delete: UpdateItem → status = 'deleted'
- Response: { success: true }

### GET /api/andi/announcements/:id/stats (solo rrhh)
- Contar items en bee-tracked-lecturas-prod con PK = ANUNCIO#${id}
- Response: { total, read, pending, percentage }

## Crear: backend/src/routes/announcements.js (NUEVO)
(Endpoints públicos para todos los usuarios autenticados)

### GET /api/announcements/pending
- Obtener anuncios con status='active' Y startDate <= HOY Y (endDate >= HOY o endDate null)
- Usar GSI: status-startDate-index
- Para cada anuncio, verificar si el userId ya está en lecturas (si sí → excluir)
- Filtrar por audience: si 'beezero' → solo users tipo beezero, etc.
- Ordenar: urgent primero, important segundo, normal último
- Response: { success: true, announcements }

### POST /api/announcements/:id/read
- PutItem en bee-tracked-lecturas-prod: PK=ANUNCIO#${id}, SK=USER#${userId}
- Response: { success: true }

## Registrar en server.js:
const andiRouter = require('./routes/andi');
const announcementsRouter = require('./routes/announcements');
app.use('/api/andi', andiRouter);
app.use('/api/announcements', announcementsRouter);

CommonJS (require/module.exports). Sin dependencias nuevas.
```

### Parte C: Frontend Anuncios

```
# SPRINT 1C: Frontend de anuncios

Lee el contexto general y SPRINT 1B.

## 1. Pop-up obligatorio al login

### frontend/src/components/AnnouncementModal.tsx (NUEVO)

Modal que:
- Muestra 1 anuncio a la vez (no se puede cerrar, solo avanzar)
- Si hay N anuncios: muestra "1 de N" y botón "Siguiente"
- En el último: botón "Entendido"
- Al hacer "Entendido": llama POST /api/announcements/:id/read para CADA anuncio
- NO se puede cerrar clickeando fuera

Colores:
- normal → borde azul, fondo azul claro
- important → borde amarillo, fondo amarillo claro
- urgent → borde rojo, fondo rojo claro + badge "URGENTE"

### Integrar en frontend/src/pages/Login.tsx:
Después del login exitoso:
1. GET /api/announcements/pending
2. Si hay anuncios → mostrar AnnouncementModal
3. Modal onComplete → navigate a dashboard
4. Si no hay → navigate directo

## 2. Panel Andi: Crear Anuncio

### frontend/src/pages/andi/CrearAnuncio.tsx (NUEVO)

Formulario:
- Título: max 100 chars, contador "XX/100"
- Mensaje: textarea, max 500 chars, contador "XXX/500"
- Fecha inicio: date, mínimo mañana
- Fecha fin: date, opcional
- Audiencia: select (Todos / Solo BeeZero / Solo EcoDelivery)
- Prioridad: radio (Normal / Importante / Urgente)
- Preview: muestra cómo se verá el modal (mismo diseño)
- Botones: Cancelar / Publicar

Al publicar:
- POST /api/andi/announcements
- Toast "✅ Anuncio publicado"
- Redirect a /andi/anuncios

## 3. Panel Andi: Lista de Anuncios

### frontend/src/pages/andi/ListaAnuncios.tsx (NUEVO)

Lista con:
- Filtros: Todos / Activos / Expirados
- Por anuncio: card con título, fechas, audiencia, badge de prioridad
- Botón "📊 Stats" → GET /api/andi/announcements/:id/stats → mostrar "X leyeron de Y (Z%)"
- Botón "🗑️ Eliminar"

## 4. Service: frontend/src/services/andiApi.ts (NUEVO)

export const andiApi = {
  createAnnouncement(data): Promise<Response>,
  getAnnouncements(status?): Promise<{ announcements }>,
  deleteAnnouncement(id): Promise<void>,
  getStats(id): Promise<{ total, read, pending, percentage }>,
};

export const announcementsApi = {
  getPending(): Promise<{ announcements }>,
  markRead(id): Promise<void>,
};

## Archivos a crear:
- [ ] frontend/src/components/AnnouncementModal.tsx
- [ ] frontend/src/pages/andi/CrearAnuncio.tsx
- [ ] frontend/src/pages/andi/ListaAnuncios.tsx
- [ ] frontend/src/services/andiApi.ts

## Archivos a modificar:
- [ ] frontend/src/pages/Login.tsx (check anuncios post-login)
- [ ] frontend/src/App.tsx (rutas /andi/*)
```

---

## 📊 SPRINT 2: Dashboard Tiempo Real (3-4 días)

```
# SPRINT 2: Dashboard en tiempo real para admins

Lee el contexto general y los ESQUEMAS DYNAMODB.

## Objetivo:
Admins ven en tiempo real:
1. Quién tiene turno activo AHORA (BeeZero + EcoDelivery separados)
2. Últimas carreras del día
3. Resumen numérico del día

## Backend: Agregar en backend/src/routes/admin.js

### GET /api/admin/dashboard/live

Proceso:
1. Query DynamoDB turnos con GSI estado-fecha-index:
   - PK: estado = 'activo', SK: fecha = HOY (YYYY-MM-DD)
   - Filtrar userType para separar beezero vs ecodelivery

2. Query DynamoDB carreras con GSI fecha-index:
   - PK: fecha = HOY
   - Count total del día

3. Response:
{
  "success": true,
  "beezero": {
    "activos": [{ userId, nombre, horaInicio, placa, tiempoTranscurrido }],
    "totalActivos": N
  },
  "ecodelivery": {
    "activos": [{ userId, nombre, horaInicio, tiempoTranscurrido }],
    "totalActivos": N
  },
  "resumen": {
    "totalActivos": N,
    "carrerasHoy": N,
    "timestamp": ISO string
  }
}

Función helper: calcularTiempo(horaInicio) → "2h 30m"
Si no hay datos → retornar arrays vacíos (no error).

## Frontend: frontend/src/pages/admin/DashboardLive.tsx (NUEVO)

Polling cada 30 segundos:
useEffect(() => {
  const fetch = async () => { ... };
  fetch();
  const interval = setInterval(fetch, 30000);
  return () => clearInterval(interval);
}, []);

Layout:
1. Header: "Dashboard en tiempo real" + tiempo desde última actualización
   + botón "Actualizar ahora"

2. Fila de cards resumen:
   - BeeZero activos (verde)
   - EcoDelivery activos (azul)
   - Total activos (púrpura)
   - Carreras hoy (gris)

3. Tabla "BeeZero trabajando":
   Columnas: Nombre | Hora inicio | Placa | Tiempo
   Si vacía: "Nadie de BeeZero está trabajando ahora"

4. Tabla "EcoDelivery trabajando":
   Columnas: Nombre | Hora inicio | Tiempo
   Si vacía: ídem

Detección de cambios entre polls:
- Turno nuevo → Toast "🟢 [Nombre] inició turno"
- Turno cerrado → Toast "⚪ [Nombre] cerró turno"

## Actualizar:
- frontend/src/pages/admin/DashboardAdmin.tsx → agregar tarjeta "Tiempo Real" → /admin/dashboard/live
- frontend/src/services/adminApi.ts → getLiveDashboard()
- frontend/src/App.tsx → ruta /admin/dashboard/live

## Archivos a crear:
- [ ] frontend/src/pages/admin/DashboardLive.tsx

## Archivos a modificar:
- [ ] backend/src/routes/admin.js (endpoint /dashboard/live)
- [ ] frontend/src/pages/admin/DashboardAdmin.tsx
- [ ] frontend/src/services/adminApi.ts
- [ ] frontend/src/App.tsx
```

---

## 🙋 SPRINT 3: Sistema de Permisos (3-4 días)

```
# SPRINT 3: Solicitudes de permiso (drivers/bikers → admins)

Lee el contexto general y los ESQUEMAS DYNAMODB.

## Objetivo:
- Driver/biker solicita día libre desde la app
- Admin aprueba/rechaza con 1 click
- En el dashboard live, ausente con permiso muestra badge "PERMISO"

## Backend: Crear backend/src/routes/permisos.js (NUEVO)

Importar: config, DynamoDB, hybridWrite, logger

### POST /api/permisos/solicitar (autenticado)
Body: { fecha, motivo, nota? }
Validaciones:
- fecha: debe ser futura (mínimo mañana)
- motivo: 'Personal' | 'Salud' | 'Vacaciones' | 'Otro'

Proceso:
1. Generar permisoId = crypto.randomUUID()
2. Escribir en DynamoDB (permisos-prod)
3. Escribir en Sheets hoja "Permisos" como espejo — best-effort
4. Response: { success: true, permiso }

### GET /api/permisos/mis-permisos (autenticado)
- Query DynamoDB GSI: userId-fecha-index
- Response: { success: true, permisos }

### GET /api/permisos/pendientes (solo admin)
- Query DynamoDB GSI: estado-fecha-index, estado='pendiente'
- Ordenar por fecha ASC (los más próximos primero)
- Response: { success: true, permisos }

### POST /api/permisos/:permisoId/responder (solo admin)
Body: { accion: 'aprobar'|'rechazar', razon? }

Proceso:
1. UpdateItem en DynamoDB: estado → 'aprobado'|'rechazado', respondidoPor, respondidoEn
2. Actualizar en Sheets — best-effort
3. Registrar en audit log
4. Response: { success: true }

## Frontend: Solicitar Permiso

### frontend/src/pages/beezero/SolicitarPermiso.tsx (NUEVO)
Formulario:
- Fecha: date picker, mínimo mañana
- Motivo: select (Personal / Salud / Vacaciones / Otro)
- Nota: textarea opcional, max 200 chars
- Botones: Cancelar / Enviar Solicitud

Toast: "✅ Permiso solicitado. Las admins serán notificadas."
Redirigir al dashboard.

### Crear versión para bikers también:
frontend/src/pages/ecodelivery/SolicitarPermiso.tsx (igual, distinta ruta)

### frontend/src/pages/admin/GestionPermisos.tsx (NUEVO)
Lista de permisos pendientes:
- Por cada uno: nombre, fecha, motivo, nota
- Botones: ✓ Aprobar | ✗ Rechazar
- Contador en DashboardAdmin: "X permisos pendientes"

### frontend/src/services/permisosApi.ts (NUEVO)
export const permisosApi = {
  solicitar(data): Promise<Response>,
  getMisPermisos(): Promise<{ permisos }>,
  getPendientes(): Promise<{ permisos }>,  // admin
  responder(id, accion, razon?): Promise<void>,  // admin
};

## Registrar en server.js:
const permisosRouter = require('./routes/permisos');
app.use('/api/permisos', permisosRouter);

## Actualizar dashboard live:
En el endpoint /api/admin/dashboard/live, agregar:
- Para cada usuario sin turno activo: verificar si tiene permiso aprobado HOY
- Si tiene → incluir en respuesta con { tienePermiso: true }
- Frontend: mostrar badge "PERMISO" en vez de "AUSENTE"

## Archivos a crear:
- [ ] backend/src/routes/permisos.js
- [ ] frontend/src/pages/beezero/SolicitarPermiso.tsx
- [ ] frontend/src/pages/ecodelivery/SolicitarPermiso.tsx
- [ ] frontend/src/pages/admin/GestionPermisos.tsx
- [ ] frontend/src/services/permisosApi.ts

## Archivos a modificar:
- [ ] backend/src/routes/admin.js (dashboard live + ausentes con permiso)
- [ ] frontend/src/pages/admin/DashboardAdmin.tsx (badge permisos pendientes)
- [ ] frontend/src/App.tsx (rutas permisos)
```

---

## 📄 SPRINT 4: Paginación en todas las vistas (2-3 días)

```
# SPRINT 4: Paginación en todas las vistas de lista

Lee el contexto general.

## Estrategia: paginación del lado del cliente
Los datos ya se cargan completos (DynamoDB los devuelve todos).
La paginación es visual, 20 items por página. NO cambia el backend.

## Componente: frontend/src/components/Pagination.tsx (NUEVO)

Props:
- total: number (total items)
- page: number (página actual, base 1)
- pageSize: number (default 20)
- onPageChange: (page: number) => void

UI:
- "Mostrando X-Y de Z resultados"
- Botones: < Anterior | 1 | 2 | ... | N | Siguiente >
- Deshabilitar extremos cuando no aplica
- Si hay más de 7 páginas → mostrar: 1 ... [actual-1] [actual] [actual+1] ... N

## Hook: frontend/src/hooks/usePagination.ts (NUEVO)

function usePagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  
  // Resetear a página 1 si cambian los items (filtros, búsqueda)
  useEffect(() => { setPage(1); }, [items.length]);
  
  const totalPages = Math.ceil(items.length / pageSize);
  const currentItems = items.slice((page - 1) * pageSize, page * pageSize);
  
  return { page, setPage, totalPages, currentItems, total: items.length };
}

## Vistas donde agregar paginación:

Patrón en cada una:
const { page, setPage, currentItems, total } = usePagination(todosLosItems, 20);
// renderizar currentItems en vez de todosLosItems
<Pagination total={total} page={page} pageSize={20} onPageChange={setPage} />

Vistas:
- [ ] frontend/src/pages/beezero/MisCarreras.tsx
- [ ] frontend/src/pages/beezero/MisTurnos.tsx
- [ ] frontend/src/pages/ecodelivery/MisTurnos.tsx
- [ ] frontend/src/pages/ecodelivery/MisKilometrajes.tsx
- [ ] frontend/src/pages/admin/CarrerasDrivers.tsx
- [ ] frontend/src/pages/admin/TurnosBeezero.tsx

## Archivos a crear:
- [ ] frontend/src/components/Pagination.tsx
- [ ] frontend/src/hooks/usePagination.ts
```

---

## 🎓 SPRINT 5: Tutorial de Onboarding (2-3 días)

```
# SPRINT 5: Tutorial de la plataforma

Lee el contexto general.

## Comportamiento:
- Primera vez que el usuario hace login → tutorial obligatorio (modal wizard)
- Después: botón "¿Cómo uso esto?" en el Layout, siempre visible
- Contenido diferente según userType

## Detectar primer login:
En frontend/src/services/storage.ts, agregar:
- getTutorialCompleted(userId): boolean → localStorage key: tutorial_done_${userId}
- setTutorialCompleted(userId): void

## Componente: frontend/src/components/TutorialModal.tsx (NUEVO)

Modal wizard con pasos:
- Barra de progreso: "Paso X de N"
- NO se puede cerrar (solo Siguiente / Entendido)
- Botón "Anterior" para volver

Pasos por userType:

beezero (driver):
1. "¡Bienvenido a Bee Tracked! 👋" — qué es la app, por qué usarla
2. "Cómo iniciar tu turno" — pasos con iconos
3. "Cómo registrar una carrera" — pasos con iconos
4. "Cómo cerrar tu turno" — importante: siempre cerrar al terminar

ecodelivery (biker):
1. "¡Bienvenido a Bee Tracked! 👋"
2. "Cómo iniciar tu turno"
3. "Cómo registrar tu kilometraje"
4. "Cómo cerrar tu turno"

admin:
1. "¡Bienvenido al panel admin! 👋"
2. "Ver carreras de tus drivers"
3. "Ver turnos activos en tiempo real"
4. "Gestionar permisos"

rrhh (Andi):
1. "¡Bienvenida, Andi! 👋"
2. "Cómo crear un anuncio"
3. "Cómo ver quién leyó el anuncio"

## Botón en Layout.tsx:
Agregar en el header o barra inferior: "? Ayuda" o ícono "?"
Al clickear → abre TutorialModal (aunque ya lo haya completado)

## Integración en Login.tsx (orden post-login):
1. GET /api/announcements/pending
2. Si hay anuncios → mostrar AnnouncementModal
   → onComplete → paso 3
3. Si !getTutorialCompleted(userId) → mostrar TutorialModal
   → onComplete → setTutorialCompleted(userId) → paso 4
4. navigate('/dashboard')

## Archivos a crear:
- [ ] frontend/src/components/TutorialModal.tsx

## Archivos a modificar:
- [ ] frontend/src/pages/Login.tsx (orden: anuncios → tutorial → dashboard)
- [ ] frontend/src/components/Layout.tsx (botón "? Ayuda")
- [ ] frontend/src/services/storage.ts (getTutorialCompleted, setTutorialCompleted)
```

---

## 🔧 SPRINT 6: Estabilidad y Pulido (2-3 días)

```
# SPRINT 6: Mejoras de estabilidad y UX

Lee el contexto general.

## 1. Compresión de fotos antes de subir

Verificar frontend/src/utils/image.ts — si no tiene compresión real, agregar:

async function compressImage(dataUrl: string, maxSizeMB = 0.8): Promise<string>
- Max 1920px de ancho (mantener aspect ratio)
- JPEG quality 0.85
- Si ya es menor → retornar sin cambios

Integrar en todos los componentes que suben fotos (IniciarTurno, CerrarTurno, NuevaCarrera, etc.)

## 2. Aviso antes de expirar sesión

En frontend/src/hooks/useInactivityTimeout.ts:
- 2 minutos antes de expirar → mostrar Toast: "Tu sesión expira en 2 minutos"
- Con botón "Mantener sesión" que resetea el timer
- Si no hace nada → cerrar sesión normalmente

## 3. Página 404

frontend/src/pages/NotFound.tsx:
- "Página no encontrada"
- Botón "Volver al inicio"
- Registrar en App.tsx como catch-all: <Route path="*" element={<NotFound />} />

## 4. Mejorar error handler en backend

En server.js el handler actual usa console.error básico.
Mejorar:
- Incluir req.requestId en la response
- Log estructurado: { requestId, path, method, error: err.message }
- En producción (NODE_ENV === 'production'): NO exponer stack trace al cliente

## 5. Middleware requireAdmin

Crear backend/src/middleware/requireAdmin.js:
- Verifica que req.user existe y req.user.userType === 'admin'
- Si no → 403 con { code: 'FORBIDDEN', error: 'Solo admins pueden hacer esto' }

Usar en todas las rutas de /api/admin/* que lo necesiten.

## Checklist final:
- [ ] Fotos se comprimen antes de subir
- [ ] Aviso pre-expiración de sesión
- [ ] Página 404 existe
- [ ] Error handler mejorado
- [ ] requireAdmin middleware creado
- [ ] Admin router registrado en server.js
```

---

## 📊 ESTADO ACTUAL DEL PROYECTO (Junio 2026)

### ✅ Completo y funcionando:
- BeeZero: dashboard, iniciar/cerrar turno, nueva carrera, mis carreras, mis turnos
- EcoDelivery: dashboard, iniciar/cerrar turno, kilometraje, mis turnos
- Auth con sesiones en DynamoDB
- Admin: ver carreras por driver, ver turnos (leen de Google Sheets)
- ToastContext, LoadingSpinner, inactivity timeout
- SessionStore (DynamoDB + Memory fallback)

### 🔴 Bugs conocidos:
- `backend/src/routes/admin.js` NO está registrado en `server.js` → /api/admin/* retorna 404

### 🟡 Sprints pendientes:
| Sprint | Contenido | Días est. |
|--------|-----------|-----------|
| 0 | Tablas DynamoDB + config + migración de datos + hybridWrite | 4-5 |
| 1 | Andi (rrhh) + anuncios con pop-up obligatorio | 4-5 |
| 2 | Dashboard tiempo real admins | 3-4 |
| 3 | Sistema de permisos | 3-4 |
| 4 | Paginación en todas las vistas | 2-3 |
| 5 | Tutorial de onboarding | 2-3 |
| 6 | Compresión fotos, aviso sesión, 404, pulido | 2-3 |

### 🚀 Escalado (cuando llegue):
DynamoDB escala sin cambios de arquitectura. Solo aumenta el costo:
- 110 usuarios → ~$1-2/mes
- 300 usuarios → ~$3-5/mes
- 1000 usuarios → ~$8-12/mes
No hay migraciones pendientes porque DynamoDB es primario desde el inicio.

---

## 📝 CÓMO USAR ESTOS PROMPTS

1. **Empezá siempre por el bug urgente** (admin router no registrado)
2. **Luego Sprint 0** — sin las tablas DynamoDB y la migración, los sprints siguientes no funcionan
3. **Copia el contexto general** al inicio de cada conversación con Cursor
4. **Ve paso a paso:** Backend → Probar → Frontend
5. **Revisá el código antes de hacer deploy**

### Principios que Cursor no debe olvidar:
- CommonJS: require() / module.exports (NO import/export en backend)
- DynamoDB = fuente de verdad. Sheets = espejo best-effort
- 110 usuarios ahora → diseño debe escalar a 300+ sin cambios
- Sin instalar dependencias nuevas sin consultarte

### Si algo falla:
```
Cursor, el código que generaste tiene un error: [descripción].
El error es: [mensaje de error]
Revisa el archivo: [ruta]
Recuerda: Node.js 18, CommonJS, DynamoDB primario, Google Sheets es solo espejo.
Arréglalo.
```
