# 🎯 PLAN MAESTRO - Bee Tracked para 110 Usuarios

**Versión:** 2.0 Optimizada  
**Presupuesto AWS:** $1-2/mes  
**Duración:** 6 semanas  
**Prioridad:** Trazabilidad + Modularidad + Resolver Bugs Críticos

---

## 📊 Contexto del Proyecto

### Situación Actual
- **Usuarios:** 50 drivers + 60 bikers = 110 total
- **Admins:** Carli, Miguel, Andi, Ale (4)
- **Uso:** Login diario, registran carreras 1 vez/semana, turnos diarios
- **Problemas críticos:**
  1. ❌ Bug turno no cierra → usuario bloqueado
  2. ❌ Login lento (5-10s)
  3. ❌ Sin feedback visual → no saben si guardó
  4. ❌ Admins no ven quién trabaja en tiempo real
  5. ❌ Sin sistema de comunicación (anuncios RRHH)

### Objetivos
1. **Trazabilidad:** Saber QUÉ pasó, CUÁNDO, QUIÉN lo hizo
2. **Modularidad:** Código organizado, fácil de mantener
3. **Confiabilidad:** 0% pérdida de datos
4. **UX Clara:** Usuario siempre sabe qué está pasando
5. **Costo bajo:** $1-2/mes en AWS

---

## 🏗️ Arquitectura Final (110 Usuarios)

```
┌────────────────────────────────────────────┐
│   FRONTEND (S3 + CloudFront - Gratis)     │
│   React + TypeScript + PWA                │
└──────────────────┬─────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────┐
│   API GATEWAY + LAMBDA ($0.40/mes)          │
│   Node.js 18 + Express                      │
└─────┬────────────┬───────────┬──────────────┘
      │            │           │
      ▼            ▼           ▼
┌──────────┐  ┌─────────┐  ┌──────────┐
│Google    │  │DynamoDB │  │    S3    │
│Sheets    │  │2 tablas │  │  Fotos   │
│(DB Main) │  │$0.50/mes│  │$0.20/mes │
│  GRATIS  │  │         │  │          │
└──────────┘  └─────────┘  └──────────┘
     ▲             │
     │             │
     └─────┬───────┘
           │ Sync cada 5min
      ┌────▼─────┐
      │Lambda    │ $0 (free tier)
      │Cron      │
      └──────────┘

TOTAL: ~$1.10/mes
```

### Base de Datos Híbrida (110 usuarios)

#### Google Sheets (Gratis - DB Principal)
- ✅ **Turnos** (inicio/cierre)
- ✅ **Carreras** registradas
- ✅ **Anuncios** de Andi
- ✅ **Permisos** solicitados/aprobados
- ✅ **Usuarios** (lista con roles)

**Por qué:** Gratis, ya lo usan, admins pueden editar directo

#### DynamoDB (Pagado ~$0.50/mes - Velocidad)
- ✅ **Sesiones** activas (lookup rápido <50ms, TTL automático)
- ✅ **Audit Log** (historial de cambios, trazabilidad)

**Por qué:** Sesiones necesitan velocidad, audit log separado del Sheet

#### S3 ($0.20/mes - Storage)
- ✅ **Fotos** de turnos y carreras

**Por qué:** Barato, ilimitado, URLs públicas

---

## 📁 Estructura de Código MODULAR

```
backend/src/
├── config/
│   └── index.js                    # ⭐ Centraliza TODAS las env vars
│
├── utils/
│   ├── logger.js                   # ⭐ Pino structured logging
│   ├── errors.js                   # ⭐ Custom error classes
│   └── validators.js               # Joi schemas validación
│
├── middleware/
│   ├── requestId.js                # ⭐ UUID por request (trazabilidad)
│   ├── requestLogger.js            # ⭐ Logger con contexto
│   ├── errorHandler.js             # ⭐ Global error handling
│   └── auth.js                     # requireAuth, optionalAuth
│
├── repositories/                   # ⭐ Data Access Layer
│   ├── SessionRepository.js        # DynamoDB sessions
│   ├── AuditRepository.js          # DynamoDB audit
│   └── GoogleSheetsRepository.js   # Google Sheets wrapper
│
├── services/                       # ⭐ Business Logic
│   ├── turnoService.js
│   ├── carreraService.js
│   ├── anuncioService.js
│   ├── permisoService.js
│   ├── s3Service.js
│   └── syncService.js              # Sync Sheets ↔ DynamoDB
│
└── routes/                         # Controllers
    ├── auth.js
    ├── turnos.js
    ├── carreras.js
    ├── anuncios.js
    ├── permisos.js
    └── admin.js

frontend/src/
├── components/                     # Shared UI
│   ├── Toast.tsx                   # ⭐ Feedback visual
│   ├── LoadingButton.tsx
│   └── ErrorBoundary.tsx           # ⭐ Catch errors React
│
├── hooks/                          # ⭐ Custom hooks (lógica reutilizable)
│   ├── useCarreraForm.ts
│   ├── useFotoUpload.ts
│   └── usePolling.ts
│
├── services/                       # ⭐ API clients
│   ├── apiClient.ts                # Base con retry y error handling
│   ├── turnosApi.ts
│   ├── carrerasApi.ts
│   └── anunciosApi.ts
│
└── pages/                          # Páginas
    ├── Login.tsx
    ├── beezero/
    ├── admin/
    └── ...
```

**Principios de Modularidad:**
1. ✅ Cada archivo tiene 1 responsabilidad
2. ✅ Repositorios = acceso a datos (solo leen/escriben)
3. ✅ Services = lógica de negocio (validaciones, transformaciones)
4. ✅ Routes = controllers (validan request, llaman services)
5. ✅ Config centralizado (NO más `process.env` disperso)

---

## 🗓️ ROADMAP POR FASES (6 Semanas)

---

## 📦 FASE 0: SETUP AWS (3 días)

**Objetivo:** Infraestructura lista, sin tocar otros proyectos

### Recursos AWS que YA existen
- ✅ S3 bucket: `bee-tracked-photos`
- ✅ Lambda + API Gateway desplegados
- ✅ DynamoDB: `bee-tracked-sessions-prod`
- ✅ CloudFront: `d19ls0k7de9u6w.cloudfront.net`
- ✅ Cognito User Pool

### Recursos que CREAR (solo 1 tabla)
- 🆕 DynamoDB: `bee-tracked-audit` (historial cambios)

### Tareas

#### Día 1: Verificación
```bash
# 1. Verificar S3 bucket
aws s3 ls | grep bee-tracked-photos
# ✅ Debe aparecer

# 2. Verificar Lambda
aws lambda get-function --function-name bee-tracked-backend-prod-api --region us-east-1
# ✅ Debe responder con config

# 3. Verificar DynamoDB sessions
aws dynamodb describe-table --table-name bee-tracked-sessions-prod --region us-east-1
# ✅ Debe responder

# 4. Test endpoint
curl https://1d9blio38d.execute-api.us-east-1.amazonaws.com/api/health
# ✅ Debe devolver {"status":"ok"}
```

**Checklist:**
- [ ] S3 bucket existe
- [ ] Lambda responde
- [ ] DynamoDB sessions existe
- [ ] Endpoint funciona

---

#### Día 2: Crear Tabla Audit

**Archivo:** `backend/serverless.deploy.yml`

**Agregar en `custom`:**
```yaml
custom:
  sessionsTableName: bee-tracked-sessions-${sls:stage}
  auditTableName: bee-tracked-audit-${sls:stage}  # ⬅️ NUEVO
```

**Agregar en `provider.environment`:**
```yaml
provider:
  environment:
    # ... existentes
    AUDIT_TABLE_NAME: ${self:custom.auditTableName}  # ⬅️ NUEVO
```

**Agregar en `resources`:**
```yaml
resources:
  Resources:
    SessionsTable:
      # ... ya existe, no tocar
    
    AuditTable:  # ⬅️ NUEVO
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:custom.auditTableName}
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

**Agregar permisos en `provider.iam.role.statements`:**
```yaml
- Effect: Allow
  Action:
    - dynamodb:PutItem
    - dynamodb:Query
  Resource:
    - !GetAtt AuditTable.Arn
```

**Deploy:**
```bash
cd backend
serverless deploy --stage prod --config serverless.deploy.yml
```

**Verificar:**
```bash
aws dynamodb describe-table --table-name bee-tracked-audit-prod --region us-east-1
```

**Checklist:**
- [ ] Tabla audit creada en DynamoDB
- [ ] Lambda tiene permisos
- [ ] Variable AUDIT_TABLE_NAME en env

---

#### Día 3: Setup Código Base

**Crear archivos base de modularidad:**

**1. Config centralizado**
```bash
# Archivo: backend/src/config/index.js
```

**2. Logger estructurado**
```bash
npm install pino
# Archivo: backend/src/utils/logger.js
```

**3. Error handling**
```bash
# Archivo: backend/src/utils/errors.js
# Archivo: backend/src/middleware/errorHandler.js
```

**4. Repositories**
```bash
# Archivo: backend/src/repositories/SessionRepository.js
# Archivo: backend/src/repositories/AuditRepository.js
```

**Checklist:**
- [ ] Config centralizado creado
- [ ] Logger Pino instalado y configurado
- [ ] Error classes creadas
- [ ] Repositories base creados
- [ ] Deploy de prueba funciona

**Resultado Fase 0:** Infraestructura AWS lista + base de código modular

---

## 🔥 FASE 1: ARREGLAR BUGS CRÍTICOS (Semana 1 = 5 días)

**Objetivo:** Resolver problemas que bloquean operación

### Prioridad #1: Bug Turno No Cierra (Días 1-2)

**Problema:**
- Usuario cierra turno pero no se guarda en Sheet
- No hay mensaje de error claro
- Usuario queda bloqueado (no puede abrir nuevo turno)

**Root Cause:**
1. Sesión expira silenciosamente
2. Request falla pero frontend no lo detecta
3. Google Sheets no se actualiza
4. No hay logs para saber qué pasó

**Solución - Backend:**

**Archivo:** `backend/src/routes/turnos.js`

```javascript
// ANTES (problemático):
router.post('/cerrar', optionalAuth, validateSession, async (req, res) => {
  // Si falla validateSession → error genérico 500
});

// DESPUÉS (robusto):
router.post('/cerrar', optionalAuth, async (req, res) => {
  const requestId = req.requestId; // De middleware
  const logger = req.log; // Logger con contexto
  
  try {
    // 1. Validar sesión EXPLÍCITAMENTE con mensaje claro
    const { userId, sessionId } = req.body;
    const sessionValid = await sessionRepo.isValid(userId, sessionId);
    
    if (!sessionValid) {
      logger.warn({ userId, sessionId }, 'Sesión expirada al cerrar turno');
      return res.status(401).json({
        success: false,
        error: 'Tu sesión expiró. Inicia sesión de nuevo.',
        code: 'SESSION_EXPIRED',
        action: 'REDIRECT_LOGIN',
      });
    }

    // 2. Cerrar turno en Google Sheets con RETRY
    const turnoData = { /* ... */ };
    let sheetSuccess = false;
    let retryCount = 0;
    
    while (!sheetSuccess && retryCount < 3) {
      try {
        await googleSheets.updateTurno(turnoId, turnoData);
        sheetSuccess = true;
        logger.info({ turnoId, userId }, 'Turno cerrado en Google Sheets');
      } catch (err) {
        retryCount++;
        logger.warn({ err, turnoId, retryCount }, 'Retry cerrar turno');
        if (retryCount >= 3) throw err;
        await sleep(1000 * retryCount); // Backoff: 1s, 2s, 3s
      }
    }

    // 3. Registrar en audit log (DynamoDB)
    await auditRepo.log({
      entityType: 'turno',
      entityId: turnoId,
      action: 'cerrar',
      userId,
      changes: [{ field: 'estado', from: 'activo', to: 'cerrado' }],
      timestamp: Date.now(),
      requestId,
    });

    // 4. Response exitoso
    logger.info({ turnoId, userId, requestId }, 'Turno cerrado exitosamente');
    res.json({ success: true, turnoId });
    
  } catch (err) {
    logger.error({ err, turnoId, requestId }, 'Error cerrando turno');
    
    // Error específico según tipo
    if (err.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: 'Servidor lento. Tus datos se guardarán automáticamente.',
        code: 'TIMEOUT',
        action: 'SAVE_LOCAL',
      });
    }
    
    throw err; // Global error handler lo maneja
  }
});
```

**Solución - Frontend:**

**Archivo:** `frontend/src/pages/beezero/CerrarTurno.tsx`

```typescript
const handleCerrar = async () => {
  setLoading(true);
  
  try {
    const response = await turnosApi.cerrar(turnoId, formData);
    
    // ✅ Éxito - Feedback claro
    toast.show('✅ Turno cerrado correctamente', 'success', { duration: 3000 });
    navigate('/dashboard');
    
  } catch (error: any) {
    // ❌ Error - Manejo específico por código
    
    if (error.code === 'SESSION_EXPIRED') {
      toast.show('Tu sesión expiró. Inicia sesión de nuevo', 'error');
      storage.clearAuth();
      navigate('/login');
      return;
    }
    
    if (error.code === 'TIMEOUT') {
      // Guardar en localStorage para reintentar después
      storage.setPendingAction({
        type: 'cerrarTurno',
        data: { turnoId, ...formData },
        timestamp: Date.now(),
      });
      toast.show('⚠️ Sin conexión estable. Se guardará cuando vuelvas online.', 'warning');
      navigate('/dashboard');
      return;
    }
    
    // Error genérico
    toast.show(`Error: ${error.message}`, 'error', {
      action: { label: 'Reintentar', onClick: handleCerrar },
    });
  } finally {
    setLoading(false);
  }
};
```

**Archivos a crear/modificar:**
- [ ] `backend/src/repositories/AuditRepository.js`
- [ ] `backend/src/middleware/requestId.js`
- [ ] `backend/src/middleware/requestLogger.js`
- [ ] `backend/src/routes/turnos.js` (refactor completo)
- [ ] `frontend/src/services/turnosApi.ts` (error handling)
- [ ] `frontend/src/pages/beezero/CerrarTurno.tsx`
- [ ] `frontend/src/services/storage.ts` (pendingActions)

**Tests:**
- [ ] Cerrar turno con sesión válida → éxito
- [ ] Cerrar turno con sesión expirada → mensaje claro
- [ ] Cerrar turno sin internet → guarda local
- [ ] Ver logs en CloudWatch → tiene requestId
- [ ] Ver audit log en DynamoDB → registro existe

---

### Prioridad #2: Login Rápido (Días 3-4)

**Problema:**
- Login tarda 5-10 segundos
- Usuario espera pantalla en blanco

**Análisis:**
```
Tiempo actual:
1. POST /login (Cognito)              500ms
2. Cargar perfil usuario (Sheet)      2000ms
3. Cargar anuncios pendientes (Sheet) 1500ms
4. Cargar turno activo (Sheet)        2000ms
5. Renderizar dashboard               500ms
────────────────────────────────────────────
TOTAL: 6.5 segundos
```

**Solución: Lazy Loading**

**Backend:**

**Archivo:** `backend/src/routes/auth.js`

```javascript
router.post('/login', async (req, res) => {
  const { user, password } = req.body;
  const logger = req.log;
  
  try {
    // 1. Validar credenciales (rápido)
    const authResult = await validateCredentials(user, password);
    if (!authResult.success) {
      return res.status(401).json({ 
        success: false, 
        error: 'Usuario o contraseña incorrectos',
        code: 'AUTH_INVALID',
      });
    }

    // 2. Crear sesión en DynamoDB (rápido <50ms)
    const sessionId = await sessionRepo.create({
      userId: authResult.userId,
      userType: authResult.userType,
      name: authResult.name,
      expiresAt: Date.now() + 600000, // 10min
    });

    // 3. Response INMEDIATO (solo datos esenciales)
    logger.info({ userId: authResult.userId }, 'Login exitoso');
    
    res.json({
      success: true,
      user: {
        userId: authResult.userId,
        name: authResult.name,
        userType: authResult.userType,
      },
      sessionId,
      token: generateJWT(authResult.userId),
    });

    // 4. Pre-fetch en BACKGROUND (no bloquea response)
    setImmediate(async () => {
      try {
        // Cargar datos secundarios después del login
        await Promise.all([
          anuncioService.getPendientes(authResult.userId),
          turnoService.getActivo(authResult.userId),
        ]);
        logger.info({ userId: authResult.userId }, 'Pre-fetch completado');
      } catch (err) {
        logger.error({ err }, 'Error en pre-fetch');
        // No importa si falla, se cargará después
      }
    });
    
  } catch (err) {
    logger.error({ err }, 'Error en login');
    throw err;
  }
});
```

**Frontend:**

**Archivo:** `frontend/src/pages/Login.tsx`

```typescript
const handleLogin = async (username: string, password: string) => {
  setLoading(true);
  
  try {
    // 1. Login rápido (solo credenciales)
    const response = await authApi.login(username, password);
    
    // 2. Guardar auth inmediatamente
    storage.setToken(response.token);
    storage.setSessionId(response.sessionId);
    storage.setUser(response.user);
    
    // 3. Mostrar dashboard AHORA (aunque no tenga todos los datos)
    toast.show(`¡Bienvenido ${response.user.name}!`, 'success');
    navigate('/dashboard');
    
    // 4. Cargar datos secundarios en background
    // El dashboard mostrará loading parcial mientras carga
    
  } catch (error: any) {
    if (error.code === 'AUTH_INVALID') {
      toast.show('Usuario o contraseña incorrectos', 'error');
    } else {
      toast.show('Error al iniciar sesión. Intenta de nuevo', 'error');
    }
  } finally {
    setLoading(false);
  }
};
```

**Dashboard con Lazy Loading:**

**Archivo:** `frontend/src/pages/beezero/DashboardBeezero.tsx`

```typescript
export const DashboardBeezero: React.FC = () => {
  const [turnoActivo, setTurnoActivo] = useState<Turno | null>(null);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Cargar datos en paralelo (no secuencial)
    const loadData = async () => {
      try {
        const [turnoRes, anunciosRes] = await Promise.all([
          turnosApi.getActivo(),
          anunciosApi.getPendientes(),
        ]);
        
        setTurnoActivo(turnoRes.turno);
        setAnuncios(anunciosRes.anuncios);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Renderizar INMEDIATAMENTE con skeleton
  return (
    <div>
      <h1>Dashboard</h1>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton height={100} /> {/* Loading state */}
          <Skeleton height={200} />
        </div>
      ) : (
        <>
          {turnoActivo ? (
            <TurnoActivoCard turno={turnoActivo} />
          ) : (
            <IniciarTurnoButton />
          )}
          
          {anuncios.length > 0 && (
            <AnunciosModal anuncios={anuncios} />
          )}
        </>
      )}
    </div>
  );
};
```

**Cache en Lambda (gratis):**

**Archivo:** `backend/src/utils/cache.js`

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

class CacheService {
  get(key) {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > CACHE_TTL) {
      cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  set(key, value) {
    cache.set(key, { value, timestamp: Date.now() });
  }
}

module.exports = new CacheService();
```

**Usar en services:**

```javascript
// backend/src/services/turnoService.js
async function getTurnoActivo(userId) {
  const cacheKey = `turno:activo:${userId}`;
  
  // Revisar cache primero
  const cached = cacheService.get(cacheKey);
  if (cached) return cached;
  
  // Si no hay cache, consultar Sheet
  const turno = await googleSheets.getTurnoActivo(userId);
  
  // Guardar en cache
  cacheService.set(cacheKey, turno);
  
  return turno;
}
```

**Archivos a crear/modificar:**
- [ ] `backend/src/routes/auth.js` (lazy loading)
- [ ] `backend/src/utils/cache.js`
- [ ] `backend/src/services/turnoService.js` (con cache)
- [ ] `frontend/src/pages/Login.tsx`
- [ ] `frontend/src/pages/beezero/DashboardBeezero.tsx`
- [ ] `frontend/src/components/Skeleton.tsx`

**Tests:**
- [ ] Login completa en <2s
- [ ] Dashboard renderiza inmediatamente (con skeleton)
- [ ] Datos se cargan en background
- [ ] Cache funciona (2da request más rápida)

---

### Prioridad #3: Feedback Visual (Día 5)

**Problema:**
- Usuario no sabe si se guardó
- No hay loading states
- Errores genéricos

**Solución: Sistema de Toasts + Loading States**

**Archivo:** `frontend/src/components/Toast.tsx`

```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, action }) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl 
                     flex items-center gap-3 min-w-[320px] max-w-md animate-slide-up`}>
      <span className="text-3xl">{icons[type]}</span>
      <span className="flex-1 font-semibold">{message}</span>
      {action && (
        <button 
          onClick={action.onClick}
          className="ml-3 px-4 py-2 bg-white/20 rounded hover:bg-white/30 
                     font-bold transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
```

**Loading Button:**

**Archivo:** `frontend/src/components/LoadingButton.tsx`

```typescript
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({ 
  loading, 
  children, 
  disabled,
  ...props 
}) => {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`${props.className} relative`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" 
                    stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Guardando...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
```

**Uso en formularios:**

```typescript
const [loading, setLoading] = useState(false);

<LoadingButton
  type="submit"
  loading={loading}
  className="bg-blue-500 text-white px-6 py-3 rounded-lg"
>
  Guardar Carrera
</LoadingButton>
```

**Archivos a crear:**
- [ ] `frontend/src/components/Toast.tsx`
- [ ] `frontend/src/components/LoadingButton.tsx`
- [ ] `frontend/src/components/Skeleton.tsx`
- [ ] `frontend/src/contexts/ToastContext.tsx` (provider)

**Agregar en todas las acciones:**
- [ ] Registrar carrera → Toast + Loading
- [ ] Iniciar turno → Toast + Loading
- [ ] Cerrar turno → Toast + Loading
- [ ] Login → Toast + Loading
- [ ] Solicitar permiso → Toast + Loading

**Tests:**
- [ ] Usuario ve loading spinner al guardar
- [ ] Usuario ve "✅ Guardado" después
- [ ] Errores muestran "❌ Error: [mensaje claro]"
- [ ] Errores tienen botón "Reintentar"

**Resultado Fase 1:** 
- ✅ Bug turno cerrado RESUELTO
- ✅ Login <2s
- ✅ Feedback visual en toda la app
- ✅ Logs estructurados con requestId
- ✅ Trazabilidad completa

---

## 📊 FASE 2: DASHBOARD ADMIN TIEMPO REAL (Semana 2 = 5 días)

**Objetivo:** Admins ven quién trabaja sin abrir Google Sheets

### Feature 1: Vista Turnos Activos (Días 1-3)

**Qué hace:**
- Muestra quién tiene turno abierto HOY
- Muestra quién NO inició turno (ausentes)
- Se actualiza cada 30 segundos
- Notificación cuando alguien inicia/cierra

**Backend - Endpoint:**

**Archivo:** `backend/src/routes/admin.js`

```javascript
router.get('/dashboard/turnos-activos', requireAuth, requireAdmin, async (req, res) => {
  const logger = req.log;
  const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  try {
    // 1. Obtener turnos activos de Google Sheets
    const turnosHoy = await googleSheets.getTurnosPorFecha(hoy);
    const turnosActivos = turnosHoy.filter(t => t.estado === 'activo');
    
    // 2. Enriquecer con datos de usuario
    const turnosConUsuario = turnosActivos.map(turno => ({
      turnoId: turno.id,
      userId: turno.userId,
      nombreCompleto: turno.abejita,
      userType: turno.userType || 'beezero',
      horaInicio: turno.horaInicio,
      placa: turno.placa,
      kmInicio: turno.kmInicio,
      tiempoTranscurrido: calcularTiempo(turno.horaInicio),
    }));
    
    // 3. Detectar ausentes (usuarios sin turno)
    const todosUsuarios = await getUsersFromSheet();
    const usuariosConTurno = new Set(turnosActivos.map(t => t.userId));
    const ausentes = todosUsuarios.filter(u => !usuariosConTurno.has(u.userId));
    
    // 4. Verificar permisos para ausentes
    const permisosHoy = await googleSheets.getPermisosPorFecha(hoy);
    const ausentesConInfo = ausentes.map(user => ({
      userId: user.userId,
      nombreCompleto: user.name,
      userType: user.userType,
      tienePermiso: permisosHoy.some(p => 
        p.userId === user.userId && p.estado === 'aprobado'
      ),
    }));
    
    logger.info({ 
      trabajando: turnosConUsuario.length, 
      ausentes: ausentesConInfo.length 
    }, 'Dashboard turnos activos');
    
    res.json({
      success: true,
      trabajando: turnosConUsuario,
      ausentes: ausentesConInfo,
      resumen: {
        totalTrabajando: turnosConUsuario.length,
        totalAusentes: ausentesConInfo.length,
        ausentesSinPermiso: ausentesConInfo.filter(a => !a.tienePermiso).length,
      },
      timestamp: Date.now(),
    });
    
  } catch (err) {
    logger.error({ err }, 'Error obteniendo turnos activos');
    throw err;
  }
});
```

**Frontend - Dashboard:**

**Archivo:** `frontend/src/pages/admin/DashboardTiempoReal.tsx`

```typescript
export const DashboardTiempoReal: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const toast = useToast();

  // Polling cada 30 segundos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await adminApi.getDashboardTurnosActivos();
        
        // Detectar cambios para notificaciones
        if (data) {
          detectarCambios(data, response);
        }
        
        setData(response);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
        toast.show('Error cargando datos', 'error');
      }
    };

    fetchData(); // Carga inicial
    const interval = setInterval(fetchData, 30000); // Cada 30s

    return () => clearInterval(interval);
  }, [data]);

  const detectarCambios = (anterior: DashboardData, nuevo: DashboardData) => {
    // Detectar turnos nuevos
    const nuevosIniciados = nuevo.trabajando.filter(
      t => !anterior.trabajando.some(a => a.userId === t.userId)
    );

    nuevosIniciados.forEach(turno => {
      toast.show(`🟢 ${turno.nombreCompleto} inició turno`, 'success', {
        duration: 5000,
      });
    });

    // Detectar turnos cerrados
    const cerrados = anterior.trabajando.filter(
      t => !nuevo.trabajando.some(n => n.userId === t.userId)
    );

    cerrados.forEach(turno => {
      toast.show(`⚪ ${turno.nombreCompleto} cerró turno`, 'info', {
        duration: 5000,
      });
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard en Tiempo Real</h1>
        <div className="text-sm text-gray-500">
          Actualizado hace {formatDistanceToNow(lastUpdate, { locale: es })}
        </div>
      </div>

      {/* Resumen Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon="🟢"
          label="Trabajando Ahora"
          value={data.resumen.totalTrabajando}
          color="green"
        />
        <StatCard
          icon="🔴"
          label="Ausentes Hoy"
          value={data.resumen.totalAusentes}
          color="gray"
        />
        <StatCard
          icon="⚠️"
          label="Sin Permiso"
          value={data.resumen.ausentesSinPermiso}
          color="red"
        />
      </div>

      {/* Tabla Trabajando */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-bold">Trabajando Ahora</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold">Estado</th>
              <th className="px-6 py-3 text-left font-semibold">Nombre</th>
              <th className="px-6 py-3 text-left font-semibold">Tipo</th>
              <th className="px-6 py-3 text-left font-semibold">Hora Inicio</th>
              <th className="px-6 py-3 text-left font-semibold">Placa</th>
              <th className="px-6 py-3 text-left font-semibold">Tiempo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.trabajando.map(turno => (
              <tr key={turno.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    🟢 Activo
                  </span>
                </td>
                <td className="px-6 py-4 font-medium">{turno.nombreCompleto}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    turno.userType === 'beezero' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {turno.userType === 'beezero' ? 'Driver' : 'Biker'}
                  </span>
                </td>
                <td className="px-6 py-4">{turno.horaInicio}</td>
                <td className="px-6 py-4">{turno.placa}</td>
                <td className="px-6 py-4 text-gray-600">
                  {turno.tiempoTranscurrido}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lista Ausentes */}
      {data.ausentes.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-bold">No Iniciaron Turno Hoy</h2>
          </div>
          <div className="divide-y">
            {data.ausentes.map(ausente => (
              <div key={ausente.userId} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${ausente.tienePermiso ? '🟡' : '🔴'}`}>
                    {ausente.tienePermiso ? '🟡' : '🔴'}
                  </span>
                  <div>
                    <div className="font-medium">{ausente.nombreCompleto}</div>
                    {ausente.tienePermiso && (
                      <div className="text-sm text-gray-500">Con permiso aprobado</div>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  ausente.tienePermiso 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {ausente.tienePermiso ? 'PERMISO' : 'AUSENTE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

**Archivos a crear:**
- [ ] `backend/src/routes/admin.js` (nuevo endpoint)
- [ ] `backend/src/middleware/requireAdmin.js`
- [ ] `backend/src/services/googleSheets.js` (helpers getTurnosPorFecha, getPermisosPorFecha)
- [ ] `frontend/src/pages/admin/DashboardTiempoReal.tsx`
- [ ] `frontend/src/services/adminApi.ts`
- [ ] `frontend/src/components/StatCard.tsx`

**Tests:**
- [ ] Admin ve turnos activos
- [ ] Admin ve ausentes
- [ ] Polling actualiza cada 30s
- [ ] Notificación cuando alguien inicia/cierra
- [ ] Distingue ausentes con/sin permiso

---

### Feature 2: Sistema de Permisos (Días 4-5)

**Qué hace:**
- Driver solicita permiso desde app
- Admin ve solicitudes en dashboard
- Admin aprueba/rechaza con 1 click
- Driver con permiso NO aparece como ausente

**Backend - Routes:**

**Archivo:** `backend/src/routes/permisos.js` (NUEVO)

```javascript
const express = require('express');
const router = express.Router();
const { v4: uuid } = require('uuid');

// Solicitar permiso (driver/biker)
router.post('/solicitar', requireAuth, async (req, res) => {
  const { fecha, motivo, nota } = req.body;
  const userId = req.user.id;
  const userName = req.user.name;
  const logger = req.log;
  
  try {
    // Validar fecha futura
    if (new Date(fecha) <= new Date()) {
      return res.status(400).json({
        success: false,
        error: 'La fecha del permiso debe ser futura',
        code: 'INVALID_DATE',
      });
    }

    const permisoId = uuid();
    const permiso = {
      permisoId,
      userId,
      userName,
      fecha,
      motivo, // 'Personal' | 'Salud' | 'Vacaciones' | 'Otro'
      nota: nota || '',
      estado: 'pendiente',
      fechaSolicitud: new Date().toISOString(),
    };

    // Guardar en Google Sheets (hoja "Permisos")
    await googleSheets.appendRow('Permisos', [
      permisoId,
      userId,
      userName,
      fecha,
      motivo,
      nota,
      'pendiente',
      permiso.fechaSolicitud,
      '', // aprobadoPor (vacío)
      '', // fechaRespuesta (vacío)
    ]);

    logger.info({ permisoId, userId, fecha }, 'Permiso solicitado');

    res.json({ success: true, permiso });
    
  } catch (err) {
    logger.error({ err }, 'Error solicitando permiso');
    throw err;
  }
});

// Listar permisos pendientes (admin)
router.get('/pendientes', requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await googleSheets.getAllRows('Permisos');
    
    const permisos = rows
      .filter(row => row[6] === 'pendiente') // columna estado
      .map(row => ({
        permisoId: row[0],
        userId: row[1],
        userName: row[2],
        fecha: row[3],
        motivo: row[4],
        nota: row[5],
        estado: row[6],
        fechaSolicitud: row[7],
      }))
      .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    res.json({ success: true, permisos });
    
  } catch (err) {
    req.log.error({ err }, 'Error obteniendo permisos pendientes');
    throw err;
  }
});

// Aprobar/Rechazar permiso (admin)
router.post('/:permisoId/responder', requireAuth, requireAdmin, async (req, res) => {
  const { permisoId } = req.params;
  const { accion, razon } = req.body; // 'aprobar' | 'rechazar'
  const adminId = req.user.id;
  const adminName = req.user.name;
  const logger = req.log;

  try {
    if (!['aprobar', 'rechazar'].includes(accion)) {
      return res.status(400).json({
        success: false,
        error: 'Acción inválida. Usa "aprobar" o "rechazar"',
      });
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';

    // Buscar y actualizar en Google Sheets
    await googleSheets.updateRowById('Permisos', permisoId, {
      estado: nuevoEstado,
      aprobadoPor: adminName,
      fechaRespuesta: new Date().toISOString(),
      razonRechazo: razon || '',
    });

    // Registrar en audit log
    await auditRepo.log({
      entityType: 'permiso',
      entityId: permisoId,
      action: accion,
      userId: adminId,
      timestamp: Date.now(),
      requestId: req.requestId,
    });

    logger.info({ permisoId, accion, adminId }, 'Permiso respondido');

    res.json({
      success: true,
      message: `Permiso ${nuevoEstado}`,
    });
    
  } catch (err) {
    logger.error({ err, permisoId }, 'Error respondiendo permiso');
    throw err;
  }
});

module.exports = router;
```

**Frontend - Solicitar Permiso:**

**Archivo:** `frontend/src/pages/SolicitarPermiso.tsx` (NUEVO)

```typescript
export const SolicitarPermiso: React.FC = () => {
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fecha || !motivo) {
      toast.show('Completa todos los campos requeridos', 'warning');
      return;
    }

    setLoading(true);
    try {
      await permisosApi.solicitar({ fecha, motivo, nota });
      toast.show('✅ Permiso solicitado. Te avisaremos cuando sea revisado', 'success');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === 'INVALID_DATE') {
        toast.show('La fecha debe ser futura', 'error');
      } else {
        toast.show(`Error: ${error.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1); // Mínimo mañana

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Solicitar Permiso</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block font-medium mb-2">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            min={minDate.toISOString().split('T')[0]}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Motivo *</label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500"
            required
          >
            <option value="">Seleccionar...</option>
            <option value="Personal">Personal</option>
            <option value="Salud">Salud (cita médica)</option>
            <option value="Vacaciones">Vacaciones</option>
            <option value="Otro">Otro</option>
          </select>
        </div>

        <div>
          <label className="block font-medium mb-2">Nota (opcional)</label>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            rows={3}
            placeholder="Detalles adicionales..."
            className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 border-2 border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <LoadingButton
            type="submit"
            loading={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Enviar Solicitud
          </LoadingButton>
        </div>
      </form>
    </div>
  );
};
```

**Frontend - Panel Admin:**

**Archivo:** `frontend/src/pages/admin/GestionPermisos.tsx` (NUEVO)

```typescript
export const GestionPermisos: React.FC = () => {
  const [permisos, setPermisos] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadPermisos();
  }, []);

  const loadPermisos = async () => {
    try {
      const response = await permisosApi.getPendientes();
      setPermisos(response.permisos);
    } catch (error) {
      toast.show('Error cargando permisos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResponder = async (permisoId: string, accion: 'aprobar' | 'rechazar') => {
    try {
      await permisosApi.responder(permisoId, accion);
      toast.show(
        accion === 'aprobar' ? '✅ Permiso aprobado' : '❌ Permiso rechazado',
        'success'
      );
      await loadPermisos(); // Recargar lista
    } catch (error: any) {
      toast.show(`Error: ${error.message}`, 'error');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Solicitudes de Permiso</h1>

      {permisos.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No hay solicitudes pendientes
        </div>
      ) : (
        <div className="space-y-4">
          {permisos.map(permiso => (
            <div key={permiso.permisoId} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{permiso.userName}</h3>
                  <div className="mt-2 space-y-1 text-gray-600">
                    <p>📅 <strong>Fecha:</strong> {formatDate(permiso.fecha)}</p>
                    <p>🏷️ <strong>Motivo:</strong> {permiso.motivo}</p>
                    {permiso.nota && (
                      <p className="text-sm italic">"{permiso.nota}"</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Solicitado: {formatDistanceToNow(new Date(permiso.fechaSolicitud), { 
                        addSuffix: true, 
                        locale: es 
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleResponder(permiso.permisoId, 'aprobar')}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 font-semibold"
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => handleResponder(permiso.permisoId, 'rechazar')}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-semibold"
                  >
                    ✗ Rechazar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

**Archivos a crear:**
- [ ] `backend/src/routes/permisos.js` (NUEVO)
- [ ] `backend/src/middleware/requireAdmin.js`
- [ ] `frontend/src/pages/SolicitarPermiso.tsx` (NUEVO)
- [ ] `frontend/src/pages/admin/GestionPermisos.tsx` (NUEVO)
- [ ] `frontend/src/services/permisosApi.ts` (NUEVO)
- [ ] Agregar hoja "Permisos" en Google Sheets con columnas

**Google Sheets Setup:**
Crear hoja "Permisos" con columnas:
```
A: PermisoId
B: UserId
C: UserName
D: Fecha
E: Motivo
F: Nota
G: Estado (pendiente/aprobado/rechazado)
H: FechaSolicitud
I: AprobadoPor
J: FechaRespuesta
K: RazonRechazo
```

**Tests:**
- [ ] Driver solicita permiso → aparece en panel admin
- [ ] Admin aprueba permiso → driver NO aparece como ausente
- [ ] Admin rechaza permiso → driver recibe notificación
- [ ] Permisos ordenados por fecha (más próximos primero)

**Resultado Fase 2:**
- ✅ Dashboard tiempo real funcionando
- ✅ Admins ven turnos activos (polling 30s)
- ✅ Sistema de permisos completo
- ✅ Detección de ausencias con/sin permiso
- ✅ Notificaciones de cambios

---

## 📢 FASE 3: SISTEMA ANUNCIOS ANDI (Semana 3 = 5 días)

**Objetivo:** RRHH puede comunicarse con drivers/bikers

### Feature 1: Backend Anuncios (Días 1-2)

**Archivo:** `backend/src/routes/anuncios.js` (NUEVO)

**Ver implementación detallada en ROADMAP_FASES.md líneas 1750-2100**

**Google Sheets Setup:**
Crear hoja "Anuncios" con columnas:
```
A: AnuncioId
B: Titulo
C: Mensaje
D: FechaInicio
E: FechaFin
F: Destinatarios (JSON string)
G: Prioridad (normal/importante/urgente)
H: Estado (activo/expirado)
I: CreadoPor
J: FechaCreacion
```

Crear hoja "Anuncios_Lecturas":
```
A: AnuncioId
B: UserId
C: Leido (si/no)
D: FechaLectura
```

**Archivos a crear:**
- [ ] `backend/src/routes/anuncios.js`
- [ ] `backend/src/services/anuncioService.js`

---

### Feature 2: Frontend Anuncios (Días 3-5)

**Modal Login:**
**Archivo:** `frontend/src/components/AnunciosModal.tsx`

**Panel Andi:**
**Archivos:**
- [ ] `frontend/src/pages/admin/CrearAnuncio.tsx`
- [ ] `frontend/src/pages/admin/ListaAnuncios.tsx`
- [ ] `frontend/src/services/anunciosApi.ts`

**Ver implementación completa en ROADMAP_FASES.md líneas 2100-2400**

**Tests:**
- [ ] Andi crea anuncio → se guarda en Sheet
- [ ] Driver hace login → ve anuncio programado
- [ ] Driver marca "Entendido" → se registra lectura
- [ ] Andi ve estadísticas (43/50 leyeron)

**Resultado Fase 3:**
- ✅ Andi puede crear anuncios programados
- ✅ Drivers ven anuncios al login
- ✅ Tracking de lecturas
- ✅ Estadísticas en tiempo real

---

## ✏️ FASE 4: EDICIÓN POR ADMINS (Semana 4 = 5 días)

**Objetivo:** Admins pueden corregir datos desde la app

### Feature 1: Editar Carrera (Días 1-3)

**Backend:**

**Archivo:** `backend/src/routes/admin.js`

```javascript
// Editar carrera
router.put('/carreras/:carreraId', requireAuth, requireAdmin, async (req, res) => {
  const { carreraId } = req.params;
  const updates = req.body;
  const logger = req.log;
  
  try {
    // 1. Obtener carrera actual de Google Sheets
    const carreraActual = await googleSheets.getCarreraById(carreraId);
    if (!carreraActual) {
      return res.status(404).json({
        success: false,
        error: 'Carrera no encontrada',
        code: 'NOT_FOUND',
      });
    }

    // 2. Detectar cambios
    const changes = [];
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = carreraActual[field];
      if (oldValue !== newValue) {
        changes.push({ field, from: oldValue, to: newValue });
      }
    }

    if (changes.length === 0) {
      return res.json({ success: true, message: 'Sin cambios' });
    }

    // 3. Actualizar en Google Sheets
    await googleSheets.updateCarrera(carreraId, { ...carreraActual, ...updates });

    // 4. Registrar en audit log (DynamoDB)
    await auditRepo.log({
      entityType: 'carrera',
      entityId: carreraId,
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      changes,
      timestamp: Date.now(),
      requestId: req.requestId,
    });

    logger.info({ carreraId, changes, adminId: req.user.id }, 'Carrera editada');

    res.json({
      success: true,
      message: 'Carrera actualizada',
      changes,
    });
    
  } catch (err) {
    logger.error({ err, carreraId }, 'Error editando carrera');
    throw err;
  }
});

// Ver historial de cambios
router.get('/carreras/:carreraId/historial', requireAuth, requireAdmin, async (req, res) => {
  const { carreraId } = req.params;
  
  try {
    // Query DynamoDB audit log
    const historial = await auditRepo.getHistory('carrera', carreraId);
    
    res.json({
      success: true,
      historial,
    });
    
  } catch (err) {
    req.log.error({ err, carreraId }, 'Error obteniendo historial');
    throw err;
  }
});
```

**Frontend:**

**Archivo:** `frontend/src/pages/admin/EditarCarreraModal.tsx`

```typescript
export const EditarCarreraModal: React.FC<Props> = ({ carrera, onClose, onSave }) => {
  const [formData, setFormData] = useState(carrera);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const loadHistorial = async () => {
    try {
      const response = await adminApi.getCarreraHistorial(carrera.carreraId);
      setHistorial(response.historial);
      setShowHistorial(true);
    } catch (error) {
      toast.show('Error cargando historial', 'error');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await adminApi.editarCarrera(carrera.carreraId, formData);
      toast.show('✅ Carrera actualizada', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      toast.show(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-500 text-white px-6 py-4 flex justify-between items-center sticky top-0">
          <div>
            <h2 className="text-xl font-bold">Editar Carrera</h2>
            <p className="text-sm opacity-90">ID: {carrera.carreraId}</p>
          </div>
          <button
            onClick={loadHistorial}
            className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-sm font-medium"
          >
            📜 Ver Historial
          </button>
        </div>

        {/* Formulario editable */}
        <div className="p-6 space-y-4">
          {/* Campos editables: fecha, cliente, precio, etc. */}
          <div>
            <label className="block font-medium mb-2">Cliente</label>
            <input
              type="text"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Precio (Bs)</label>
              <input
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Distancia (km)</label>
              <input
                type="number"
                step="0.01"
                value={formData.distancia}
                onChange={(e) => setFormData({ ...formData, distancia: parseFloat(e.target.value) })}
                className="w-full border-2 border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          {/* ... más campos ... */}
        </div>

        {/* Historial (si está visible) */}
        {showHistorial && (
          <div className="border-t p-6 bg-gray-50">
            <h3 className="font-bold mb-4">Historial de Cambios</h3>
            <div className="space-y-3">
              {historial.map(log => (
                <div key={log.timestamp} className="bg-white rounded p-3 text-sm">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{log.userName}</span>
                    <span className="text-gray-500">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {log.changes.map((change, idx) => (
                      <div key={idx} className="text-gray-700">
                        <span className="font-medium">{change.field}:</span>{' '}
                        <span className="line-through text-red-600">{change.from}</span>{' '}
                        → <span className="text-green-600">{change.to}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-4 border-t pt-4">
          <button
            onClick={onClose}
            className="flex-1 border-2 border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <LoadingButton
            onClick={handleSave}
            loading={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Guardar Cambios
          </LoadingButton>
        </div>
      </div>
    </div>
  );
};
```

**Archivos a crear:**
- [ ] `backend/src/repositories/AuditRepository.js` (getHistory method)
- [ ] `backend/src/services/googleSheets.js` (getCarreraById, updateCarrera)
- [ ] `backend/src/routes/admin.js` (endpoints edit + historial)
- [ ] `frontend/src/pages/admin/EditarCarreraModal.tsx`
- [ ] `frontend/src/services/adminApi.ts` (métodos edit + historial)

**Tests:**
- [ ] Admin edita precio de carrera → se guarda en Sheet
- [ ] Se registra en audit log con userName
- [ ] Admin ve historial de cambios
- [ ] Historial muestra quién, qué y cuándo

---

### Feature 2: Editar Turno (Días 4-5)

Similar a editar carrera pero para turnos.

**Campos editables:**
- Km inicial/final
- Batería inicial/final
- Horas de inicio/cierre
- Observaciones
- Forzar cerrar (si quedó abierto)

**Archivos a crear:**
- [ ] Backend: métodos similares en `/admin.js`
- [ ] Frontend: `EditarTurnoModal.tsx`

**Resultado Fase 4:**
- ✅ Admins editan carreras desde app
- ✅ Admins editan turnos desde app
- ✅ Historial de cambios completo
- ✅ Trazabilidad: quién cambió qué y cuándo

---

## 🔄 FASE 5: SINCRONIZACIÓN HÍBRIDA (Semana 5 = 5 días)

**Objetivo:** Google Sheets + DynamoDB funcionan juntos sin conflictos

### Estrategia de Sync (Días 1-3)

**Flujo de Escritura (App → Sheets):**

```javascript
// backend/src/services/syncService.js
class SyncService {
  async writeCarrera(carrera) {
    try {
      // 1. Escribir PRIMERO a Google Sheets (fuente de verdad)
      await googleSheets.appendCarrera(carrera);
      
      // 2. Registrar en audit log (DynamoDB) para trazabilidad
      await auditRepo.log({
        entityType: 'carrera',
        entityId: carrera.carreraId,
        action: 'create',
        userId: carrera.userId,
        timestamp: Date.now(),
        source: 'app',
      });

      return { success: true };
      
    } catch (err) {
      // Si falla, agregar a cola de retry
      await this.addToRetryQueue({
        type: 'writeCarrera',
        data: carrera,
        attempts: 0,
        maxAttempts: 3,
      });
      
      throw err;
    }
  }

  async addToRetryQueue(task) {
    // Guardar en DynamoDB para procesar después
    await dynamodb.put({
      TableName: 'bee-tracked-retry-queue',
      Item: {
        taskId: uuid(),
        ...task,
        nextRetry: Date.now() + 60000, // Retry en 1min
      },
    });
  }
}
```

**Lambda Cron (Procesar Retry Queue):**

```javascript
// Cada 1 minuto, procesar tareas fallidas
exports.processRetryQueue = async (event) => {
  const tasks = await getTasksReadyForRetry();
  
  for (const task of tasks) {
    try {
      if (task.type === 'writeCarrera') {
        await googleSheets.appendCarrera(task.data);
        await deleteTask(task.taskId); // Éxito → eliminar
      }
    } catch (err) {
      if (task.attempts >= task.maxAttempts) {
        // Máximo intentos → notificar admin
        await notifyAdmin(`Task ${task.taskId} failed permanently`);
        await deleteTask(task.taskId);
      } else {
        // Incrementar intentos
        await updateTask(task.taskId, {
          attempts: task.attempts + 1,
          nextRetry: Date.now() + (60000 * (task.attempts + 1)), // Backoff exponencial
        });
      }
    }
  }
};
```

**Archivos a crear:**
- [ ] `backend/src/services/syncService.js`
- [ ] `backend/lambdas/processRetryQueue.js`
- [ ] Tabla DynamoDB: `bee-tracked-retry-queue`
- [ ] EventBridge rule: trigger cada 1min

**Tests:**
- [ ] Registrar carrera → se guarda en Sheet
- [ ] Si falla → se agrega a retry queue
- [ ] Lambda procesa queue → reintenta
- [ ] Después de 3 intentos → notifica admin

---

### Sync Inverso (Días 4-5)

**Si admin edita en Sheet directamente:**

```javascript
// Lambda Cron (cada 5 minutos)
exports.syncFromSheets = async (event) => {
  const logger = createLogger();
  
  try {
    // 1. Obtener última sync timestamp de DynamoDB
    const lastSync = await getLastSyncTimestamp();
    
    // 2. Leer todas las carreras de Google Sheets
    const carreras = await googleSheets.getAllCarreras();
    
    // 3. Para cada carrera, verificar si cambió desde lastSync
    for (const carrera of carreras) {
      const auditEntry = await auditRepo.getLatestForEntity('carrera', carrera.carreraId);
      
      // Si no hay audit entry O Sheet tiene timestamp más reciente
      if (!auditEntry || carrera.fechaModificacion > auditEntry.timestamp) {
        // Detectar qué cambió
        const oldData = auditEntry?.data || {};
        const changes = detectChanges(oldData, carrera);
        
        if (changes.length > 0) {
          // Registrar cambio en audit log
          await auditRepo.log({
            entityType: 'carrera',
            entityId: carrera.carreraId,
            action: 'update',
            userId: 'SYSTEM',
            userName: 'Google Sheets',
            changes,
            timestamp: Date.now(),
            source: 'google-sheets',
          });
          
          logger.info({ carreraId: carrera.carreraId, changes }, 'Sync desde Sheet detectado');
        }
      }
    }
    
    // 4. Actualizar última sync timestamp
    await updateLastSyncTimestamp(Date.now());
    
    logger.info('Sync desde Sheets completado');
    
  } catch (err) {
    logger.error({ err }, 'Error en sync desde Sheets');
    throw err;
  }
};
```

**Archivos a crear:**
- [ ] `backend/lambdas/syncFromSheets.js`
- [ ] EventBridge rule: cada 5 minutos
- [ ] Tabla DynamoDB: guardar last sync timestamp

**Tests:**
- [ ] Admin edita precio en Sheet
- [ ] Lambda detecta cambio en 5min
- [ ] Se registra en audit log
- [ ] Audit log dice "source: google-sheets"

**Resultado Fase 5:**
- ✅ App escribe a Sheets con retry automático
- ✅ Ediciones en Sheet se detectan
- ✅ Todo cambio se registra en audit log
- ✅ 0% pérdida de datos

---

## 🎨 FASE 6: PULIDO FINAL (Semana 6 = 5 días)

**Objetivo:** App fácil, confiable, rápida

### Mejoras UX (Días 1-3)

**1. Comprimir Fotos Antes de Subir**

```typescript
// frontend/src/utils/imageCompression.ts
export async function compressImage(dataUrl: string, maxSizeMB: number = 1): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Redimensionar si es muy grande
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = width * (MAX_HEIGHT / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // Comprimir con calidad ajustable
      let quality = 0.8;
      let compressed = canvas.toDataURL('image/jpeg', quality);

      // Si todavía es muy grande, reducir quality
      while (compressed.length > maxSizeMB * 1024 * 1024 && quality > 0.1) {
        quality -= 0.1;
        compressed = canvas.toDataURL('image/jpeg', quality);
      }

      resolve(compressed);
    };

    img.onerror = reject;
    img.src = dataUrl;
  });
}
```

**Usar al subir foto:**

```typescript
const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (ev) => {
    const original = ev.target?.result as string;
    
    // Comprimir antes de guardar
    const compressed = await compressImage(original, 0.8); // Max 800KB
    
    setFotoPreview(compressed);
    setFormData(prev => ({ ...prev, foto: compressed }));
  };

  reader.readAsDataURL(file);
};
```

**2. Indicador de Sincronización**

```typescript
// frontend/src/components/SyncIndicator.tsx
export const SyncIndicator: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    // Escuchar eventos de sync del service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_START') {
          setSyncing(true);
        }
        if (event.data.type === 'SYNC_COMPLETE') {
          setSyncing(false);
          setLastSync(new Date());
        }
      });
    }
  }, []);

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2">
      {syncing ? (
        <>
          <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm text-blue-600 font-medium">Sincronizando...</span>
        </>
      ) : (
        <>
          <span className="text-green-500">✓</span>
          <span className="text-sm text-gray-600">
            Sincronizado {lastSync && formatDistanceToNow(lastSync, { addSuffix: true, locale: es })}
          </span>
        </>
      )}
    </div>
  );
};
```

**3. Tutorial Primer Uso**

```typescript
// frontend/src/components/Tutorial.tsx
export const Tutorial: React.FC = () => {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(!storage.get('tutorialCompleted'));

  const steps = [
    {
      title: '¡Bienvenido a Bee Tracked!',
      description: 'Te guiaremos por las funciones principales',
      target: null,
    },
    {
      title: 'Iniciar Turno',
      description: 'Comienza tu día registrando tu turno aquí',
      target: '#btn-iniciar-turno',
    },
    {
      title: 'Registrar Carreras',
      description: 'Guarda cada carrera que hagas durante el día',
      target: '#btn-nueva-carrera',
    },
    {
      title: 'Cerrar Turno',
      description: 'Al final del día, cierra tu turno con los datos finales',
      target: '#btn-cerrar-turno',
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      storage.set('tutorialCompleted', true);
      setShow(false);
    }
  };

  if (!show) return null;

  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 max-w-md">
        <h2 className="text-xl font-bold mb-2">{currentStep.title}</h2>
        <p className="text-gray-600 mb-6">{currentStep.description}</p>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {step + 1} de {steps.length}
          </span>
          <button
            onClick={handleNext}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold"
          >
            {step < steps.length - 1 ? 'Siguiente' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Archivos a crear:**
- [ ] `frontend/src/utils/imageCompression.ts`
- [ ] `frontend/src/components/SyncIndicator.tsx`
- [ ] `frontend/src/components/Tutorial.tsx`

---

### Testing Final (Días 4-5)

**Checklist de Tests Críticos:**

**Flujos Principales:**
- [ ] Login → Dashboard (<2s)
- [ ] Iniciar turno → Se guarda en Sheet
- [ ] Registrar carrera → Se guarda en Sheet
- [ ] Cerrar turno → Se guarda en Sheet
- [ ] Admin ve turnos activos en dashboard
- [ ] Admin aprueba permiso → driver no aparece ausente
- [ ] Andi crea anuncio → driver lo ve al login
- [ ] Admin edita carrera → se registra en audit log

**Tests de Error:**
- [ ] Cerrar turno con sesión expirada → mensaje claro
- [ ] Registrar carrera sin internet → guarda local
- [ ] Subir foto >6MB → error claro
- [ ] Login con credenciales incorrectas → mensaje específico

**Tests de Trazabilidad:**
- [ ] Ver logs en CloudWatch → tienen requestId
- [ ] Ver audit log en DynamoDB → todos los cambios
- [ ] Historial de carrera → muestra quién editó
- [ ] Retry queue funciona → tarea fallida se reintenta

**Tests de Performance:**
- [ ] Login: <2s (p95)
- [ ] Registrar carrera: <3s (p95)
- [ ] Dashboard admin: <1s carga inicial
- [ ] Polling dashboard: <500ms por request

**Tests con 4 Admins + 10 Drivers Beta:**
- [ ] Todos pueden hacer login
- [ ] Drivers pueden registrar carreras
- [ ] Admins ven dashboard tiempo real
- [ ] Sistema de permisos funciona
- [ ] Anuncios aparecen correctamente
- [ ] Edición de datos funciona
- [ ] No hay errores en CloudWatch

---

## 📊 MÉTRICAS DE ÉXITO FINAL

### Técnicas
- ✅ Login <2s (p95)
- ✅ 0% pérdida de datos
- ✅ 100% logs con requestId
- ✅ Audit log completo (quién, qué, cuándo)
- ✅ Código modular (repos, services, routes)
- ✅ Error handling robusto

### Negocio
- ✅ Bug turno cerrado RESUELTO
- ✅ Admins ven turnos activos sin abrir Sheet
- ✅ RRHH comunica con anuncios programados
- ✅ Admins corrigen datos desde app
- ✅ Drivers solicitan permisos desde app

### Costo
- ✅ AWS: $1-2/mes (110 usuarios)
- ✅ Google Sheets: $0 (gratis)
- ✅ Total: $1-2/mes

---

## 🚀 DESPUÉS DEL PLAN (Cuando Crezcas)

### Señales de que Necesitas Escalar:

**1. Google Sheets da Rate Limit (429 errors)**
→ Migrar turnos a DynamoDB (+$2/mes)

**2. Dashboard muy lento**
→ Agregar DynamoDB cache (+$1/mes)

**3. >200 Usuarios Activos**
→ Migrar todo a DynamoDB (+$5-8/mes)

**Crecimiento Natural:**
```
Mes 1-3:  110 usuarios → $1/mes
Mes 4-6:  150 usuarios → $3/mes (agregar cache)
Mes 7-12: 200 usuarios → $8/mes (migrar turnos)
Año 2:    300 usuarios → $15/mes (migrar todo)
```

---

## ✅ RESUMEN EJECUTIVO

**Lo que vas a construir:**
1. Sistema 100% funcional para 110 usuarios
2. Código modular y mantenible
3. Trazabilidad completa (logs + audit)
4. UX clara (feedback visual siempre)
5. Costo: $1-2/mes AWS

**Tiempo total:** 6 semanas

**Prioridades:**
1. Trazabilidad (saber qué pasó siempre)
2. Modularidad (código fácil de mantener)
3. Resolver bugs críticos (turno cerrado)
4. Features clave (dashboard admin, anuncios, permisos)

**Próximo paso:** Ejecutar Fase 0 (Setup AWS)

---

**Este plan está listo para ejecutar con Cursor!** 🚀
