# Roadmap de Implementación por Fases
**Proyecto:** Bee Tracked V2.0  
**Duración Total:** 12 semanas (3 meses)  
**Enfoque:** Trazabilidad + Modularidad + UX + Escalabilidad

---

## 🎯 FASE 0: FOUNDATION (Semana 0 - Preparación)
**Duración:** 3-5 días  
**Objetivo:** Sentar bases sólidas antes de desarrollar features

### Tareas Críticas

#### F0.1 - Setup de Infraestructura Base
- [ ] Crear tabla DynamoDB: `bee-tracked-sessions`
  - PK: `userId`, SK: `sessionId`
  - TTL: `expiresAt` (10 minutos inactividad)
  - GSI: `sessionId-index` para lookup rápido

- [ ] Crear tabla DynamoDB: `bee-tracked-turnos`
  - PK: `userId`, SK: `turnoId`
  - Attributes: `estado`, `fechaInicio`, `horaInicio`, `placa`, `kmInicio`, etc.
  - GSI: `estado-fecha-index` para queries por estado (activo/cerrado)
  - GSI: `fecha-index` para queries por fecha

- [ ] Crear tabla DynamoDB: `bee-tracked-carreras`
  - PK: `userId`, SK: `carreraId`
  - Attributes: todos los campos de carrera
  - GSI: `fecha-index`

- [ ] Crear tabla DynamoDB: `bee-tracked-anuncios`
  - PK: `anuncioId`, SK: `metadata`
  - Attributes: `titulo`, `mensaje`, `fechaInicio`, `fechaFin`, `destinatarios`, `prioridad`
  - GSI: `fecha-index` para queries por rango de fechas

- [ ] Crear tabla DynamoDB: `bee-tracked-anuncios-lecturas`
  - PK: `anuncioId`, SK: `userId`
  - Attributes: `leido`, `fechaLectura`
  - Para tracking de quién leyó cada anuncio

- [ ] Crear tabla DynamoDB: `bee-tracked-permisos`
  - PK: `userId`, SK: `permisoId`
  - Attributes: `fecha`, `motivo`, `estado`, `aprobadoPor`, `fechaSolicitud`
  - GSI: `estado-fecha-index` para permisos pendientes

- [ ] Crear tabla DynamoDB: `bee-tracked-audit-log`
  - PK: `entityType#entityId`, SK: `timestamp`
  - Attributes: `action`, `userId`, `changes`, `metadata`
  - Para trazabilidad completa

#### F0.2 - Implementar Logger Estructurado
```javascript
// backend/src/utils/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: {
    env: process.env.NODE_ENV,
    service: 'bee-tracked-api',
  },
});

function createRequestLogger(req) {
  return logger.child({
    requestId: req.requestId,
    userId: req.user?.id,
    path: req.path,
    method: req.method,
  });
}

module.exports = { logger, createRequestLogger };
```

- [ ] Instalar Pino: `npm install pino`
- [ ] Crear middleware de request ID
- [ ] Reemplazar todos los console.log/error

#### F0.3 - Centralizar Configuración
```javascript
// backend/src/config/index.js
class Config {
  constructor() {
    this.validate();
  }

  validate() {
    const required = [
      'GOOGLE_SHEET_ID',
      'AWS_S3_BUCKET',
      'AWS_REGION',
      'DYNAMODB_TURNOS_TABLE',
      'DYNAMODB_CARRERAS_TABLE',
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }
  }

  // Google Sheets
  get googleSheetId() { return process.env.GOOGLE_SHEET_ID; }
  get carrerasSpreadsheetId() {
    return process.env.CARRERAS_DRIVERS_SHEET_ID || 
           process.env.CARRERAS_BIKERS_SHEET_ID;
  }

  // DynamoDB Tables
  get turnosTable() { return process.env.DYNAMODB_TURNOS_TABLE; }
  get carrerasTable() { return process.env.DYNAMODB_CARRERAS_TABLE; }
  get anunciosTable() { return process.env.DYNAMODB_ANUNCIOS_TABLE; }
  get permisosTable() { return process.env.DYNAMODB_PERMISOS_TABLE; }
  get auditTable() { return process.env.DYNAMODB_AUDIT_TABLE; }

  // AWS
  get s3Bucket() { return process.env.AWS_S3_BUCKET; }
  get awsRegion() { return process.env.AWS_REGION || 'us-east-1'; }

  // App
  get nodeEnv() { return process.env.NODE_ENV || 'development'; }
  get isProduction() { return this.nodeEnv === 'production'; }
  get frontendUrl() { return process.env.FRONTEND_URL; }
}

module.exports = new Config();
```

- [ ] Crear archivo config
- [ ] Refactorizar todos los `process.env` directos
- [ ] Actualizar `.env.example`

#### F0.4 - Crear Repositorios Base (DDD Pattern)
```javascript
// backend/src/repositories/BaseRepository.js
class BaseRepository {
  constructor(tableName, dynamoClient) {
    this.tableName = tableName;
    this.dynamo = dynamoClient;
  }

  async create(item) { /* ... */ }
  async findById(pk, sk) { /* ... */ }
  async update(pk, sk, updates) { /* ... */ }
  async delete(pk, sk) { /* ... */ }
  async query(params) { /* ... */ }
}

// backend/src/repositories/TurnoRepository.js
class TurnoRepository extends BaseRepository {
  async findActivosByFecha(fecha) {
    // Query usando GSI estado-fecha-index
  }

  async findByUserId(userId) {
    // Query PK=userId
  }

  async cerrarTurno(turnoId, dataCierre) {
    // Update con validación
  }
}
```

- [ ] Crear BaseRepository
- [ ] Crear TurnoRepository
- [ ] Crear CarreraRepository
- [ ] Crear AnuncioRepository
- [ ] Crear PermisoRepository

#### F0.5 - Implementar Error Handling Robusto
```javascript
// backend/src/utils/errors.js
class AppError extends Error {
  constructor(message, code, statusCode = 500, meta = {}) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.meta = meta;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, field) {
    super(message, 'VALIDATION_ERROR', 400, { field });
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} no encontrado`, 'NOT_FOUND', 404, { resource, id });
  }
}

// backend/src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  req.log.error({ err }, 'Request failed');

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
      meta: err.meta,
    });
  }

  // Error inesperado
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
    requestId: req.requestId,
  });
}
```

- [ ] Crear clases de errores
- [ ] Middleware global de errores
- [ ] Reemplazar res.status(500) por throw new AppError()

**Resultado Fase 0:**
- ✅ Infraestructura DynamoDB lista
- ✅ Logger estructurado funcionando
- ✅ Config centralizado
- ✅ Repositorios base creados
- ✅ Error handling consistente
- ✅ Base sólida para desarrollo

---

## 🚀 FASE 1: ARREGLAR CRÍTICOS (Semanas 1-2)
**Objetivo:** Resolver bugs que impiden operación normal  
**Prioridad:** CRÍTICA

### Sprint 1.1 - Bug de Turno Cerrado (Semana 1, días 1-3)

#### F1.1 - Diagnóstico y Fix del Bug
**Problema:** Turno no cambia a "cerrado" → usuario bloqueado

**Root Cause Analysis:**
1. Sesión expira silenciosamente
2. Request de cerrar turno falla en auth
3. No hay feedback visual → usuario asume que cerró
4. Google Sheets no se actualiza
5. Próximo intento ve "turno ya cerrado" en DB pero "abierto" en Sheet

**Solución:**

```javascript
// backend/src/routes/turnos.js - ANTES
router.post('/cerrar', optionalAuth, validateSession, async (req, res) => {
  // Si validateSession falla, no llega aquí → silencio total
});

// DESPUÉS
router.post('/cerrar', optionalAuth, async (req, res) => {
  try {
    const sessionValid = await isSessionValid(userId, sessionId);
    if (!sessionValid) {
      return res.status(401).json({
        success: false,
        error: 'Tu sesión expiró. Inicia sesión de nuevo.',
        code: 'SESSION_EXPIRED',
        action: 'REDIRECT_LOGIN', // Frontend usa esto
      });
    }

    // Escritura transaccional (ambas o ninguna)
    await Promise.all([
      turnoRepo.cerrarTurno(turnoId, dataCierre), // DynamoDB
      syncToGoogleSheet(turnoData),                // Google Sheets
    ]);

    req.log.info({ turnoId, userId }, 'Turno cerrado exitosamente');

    res.json({
      success: true,
      message: 'Turno cerrado correctamente',
      turnoId,
    });
  } catch (err) {
    req.log.error({ err, turnoId }, 'Error cerrando turno');
    
    // Retry automático si es timeout
    if (err.code === 'ETIMEDOUT') {
      // Agregar a cola de retry
      await retryQueue.add({ action: 'cerrarTurno', data: turnoData });
    }

    throw new AppError(
      'Error al cerrar turno. Intentando de nuevo...',
      'TURNO_CLOSE_ERROR',
      500,
      { turnoId, retry: true }
    );
  }
});
```

**Frontend Fix:**
```typescript
// frontend/src/pages/beezero/CerrarTurno.tsx
const handleCerrar = async () => {
  setLoading(true);
  try {
    const response = await turnosApi.cerrar(turnoId, data);
    
    if (response.success) {
      toast.show('✅ Turno cerrado correctamente', 'success');
      navigate('/dashboard');
    }
  } catch (error) {
    // Error handling específico
    if (error.code === 'SESSION_EXPIRED') {
      toast.show('Tu sesión expiró. Inicia sesión de nuevo', 'error');
      storage.clearAuth();
      navigate('/login');
    } else if (error.code === 'TURNO_CLOSE_ERROR' && error.meta?.retry) {
      toast.show('Error temporal. Los datos se guardarán automáticamente.', 'warning');
      // Guardar en localStorage para retry
      storage.setPendingAction({ type: 'cerrarTurno', data });
    } else {
      toast.show(`Error: ${error.message}`, 'error');
    }
  } finally {
    setLoading(false);
  }
};
```

**Checklist:**
- [ ] Implementar detección de sesión expirada con mensaje claro
- [ ] Retry automático en timeouts
- [ ] Cola de operaciones pendientes (localStorage + DynamoDB)
- [ ] Logging completo de cada intento
- [ ] Frontend muestra estado real (loading/success/error)
- [ ] Test manual: cerrar turno con sesión expirada → mensaje claro
- [ ] Test manual: cerrar turno sin internet → se reintenta al reconectar

#### F1.2 - Optimizar Performance de Login (Semana 1, días 4-5)

**Problema Actual:** Login tarda 5-10s

**Análisis de Latencia:**
```
Login flow actual:
1. POST /api/auth/login              → 500ms  (Cognito)
2. Cargar datos usuario              → 2s     (Google Sheets: perfil + permisos)
3. Cargar anuncios no leídos         → 1.5s   (Google Sheets)
4. Cargar turno activo (si existe)   → 2s     (Google Sheets)
5. Renderizar dashboard              → 500ms
─────────────────────────────────────────────
TOTAL: 6.5 segundos
```

**Optimización:**
```
Login flow optimizado:
1. POST /api/auth/login              → 500ms  (Cognito)
2. Cargar datos esenciales (cache)   → 300ms  (DynamoDB)
3. Pre-fetch en background:
   - Anuncios                        → 200ms  (DynamoDB)
   - Turno activo                    → 200ms  (DynamoDB)
4. Renderizar dashboard              → 300ms
─────────────────────────────────────────────
TOTAL: 1.3 segundos (5x más rápido)
```

**Implementación:**

```javascript
// backend/src/routes/auth.js
router.post('/login', async (req, res) => {
  const { user, password } = req.body;
  
  // 1. Validar credenciales (Cognito o CSV)
  const authResult = await validateCredentials(user, password);
  if (!authResult.success) {
    return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
  }

  // 2. Crear sesión
  const sessionId = await registerSession(userId, { userType: authResult.userType });

  // 3. Datos mínimos para renderizar (desde cache)
  const userData = await userCache.get(userId) || await loadUserData(userId);
  
  req.log.info({ userId, userType: authResult.userType }, 'Login exitoso');

  // 4. Response rápido
  res.json({
    success: true,
    user: userData,
    sessionId,
    token: generateJWT(userId),
  });

  // 5. Pre-warming en background (no bloquea response)
  setImmediate(async () => {
    await Promise.all([
      anuncioRepo.findPendientesByUser(userId),
      turnoRepo.findActivoByUser(userId),
    ]);
  });
});
```

**Frontend Optimization:**
```typescript
// frontend/src/services/auth.ts
export async function login(username: string, password: string) {
  // 1. Login rápido
  const response = await api.post('/api/auth/login', { user: username, password });
  
  // 2. Guardar auth inmediatamente
  storage.setToken(response.token);
  storage.setSessionId(response.sessionId);
  storage.setUser(response.user);

  // 3. Pre-fetch en paralelo (no await)
  Promise.all([
    anunciosApi.getPendientes(),
    turnosApi.getTurnoActivo(),
  ]).then(([anuncios, turno]) => {
    storage.setCache('anuncios', anuncios);
    storage.setCache('turnoActivo', turno);
  });

  return response;
}
```

**Checklist:**
- [ ] Implementar cache de usuario en DynamoDB (TTL 5min)
- [ ] Pre-fetch de datos en background
- [ ] Lazy loading de componentes pesados
- [ ] Comprimir assets (Gzip + Brotli)
- [ ] Agregar Service Worker para cache de assets
- [ ] Test: Login debe ser <2s (p95)

#### F1.3 - Feedback Visual Claro (Semana 2, días 1-2)

**Componente de Toast Mejorado:**
```typescript
// frontend/src/components/Toast.tsx
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

export const Toast: React.FC<ToastProps> = ({ message, type, duration, action }) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
  };

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
    loading: 'bg-gray-500',
  };

  return (
    <div className={`${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3`}>
      <span className="text-2xl">{icons[type]}</span>
      <span className="flex-1 font-medium">{message}</span>
      {action && (
        <button onClick={action.onClick} className="underline font-bold">
          {action.label}
        </button>
      )}
    </div>
  );
};
```

**Loading States:**
```typescript
// frontend/src/components/LoadingButton.tsx
export const LoadingButton: React.FC<ButtonProps> = ({ loading, children, ...props }) => {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" />
          Guardando...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
```

**Checklist:**
- [ ] Crear componente Toast robusto
- [ ] Agregar loading states a todos los botones
- [ ] Confirmaciones visuales grandes (3s)
- [ ] Errores con acción sugerida
- [ ] Estado de sincronización visible
- [ ] Test: Cada acción tiene feedback claro

#### F1.4 - Sistema de Retry y Queue (Semana 2, días 3-5)

**Objetivo:** Garantizar 0% pérdida de datos

```javascript
// backend/src/services/retryQueue.js
class RetryQueue {
  constructor(dynamoTable) {
    this.table = dynamoTable;
  }

  async add(task) {
    const taskId = uuid();
    await this.dynamo.put({
      TableName: this.table,
      Item: {
        taskId,
        userId: task.userId,
        action: task.action,
        data: task.data,
        attempts: 0,
        maxAttempts: 3,
        status: 'pending',
        createdAt: Date.now(),
        nextRetry: Date.now(),
      },
    });
    return taskId;
  }

  async processPending() {
    const tasks = await this.dynamo.query({
      TableName: this.table,
      IndexName: 'status-nextRetry-index',
      KeyConditionExpression: 'status = :pending AND nextRetry <= :now',
      ExpressionAttributeValues: {
        ':pending': 'pending',
        ':now': Date.now(),
      },
    });

    for (const task of tasks.Items) {
      await this.processTask(task);
    }
  }

  async processTask(task) {
    try {
      await this.executeAction(task.action, task.data);
      await this.markComplete(task.taskId);
    } catch (err) {
      await this.handleFailure(task, err);
    }
  }

  async executeAction(action, data) {
    switch (action) {
      case 'cerrarTurno':
        return turnoService.cerrar(data);
      case 'registrarCarrera':
        return carreraService.registrar(data);
      // ... otros
    }
  }

  async handleFailure(task, err) {
    const newAttempts = task.attempts + 1;
    if (newAttempts >= task.maxAttempts) {
      await this.markFailed(task.taskId, err.message);
      // Notificar a admins
      await notifyAdmins(`Task ${task.taskId} failed after ${newAttempts} attempts`);
    } else {
      await this.scheduleRetry(task.taskId, newAttempts);
    }
  }
}

// Lambda trigger cada 1 minuto para procesar queue
exports.processRetryQueue = async (event) => {
  const queue = new RetryQueue(config.retryQueueTable);
  await queue.processPending();
};
```

**Checklist:**
- [ ] Crear tabla DynamoDB para retry queue
- [ ] Implementar RetryQueue service
- [ ] Lambda trigger cada 1min
- [ ] Agregar retry en operaciones críticas
- [ ] Dashboard admin para ver failed tasks
- [ ] Test: Operación con timeout → se reintenta automáticamente

**Resultado Fase 1:**
- ✅ Bug de turno cerrado RESUELTO
- ✅ Login <2s
- ✅ Feedback visual en toda la app
- ✅ 0% pérdida de datos (retry queue)
- ✅ Logs estructurados para debugging
- ✅ Error handling robusto

---

## 📊 FASE 2: DASHBOARD ADMIN TIEMPO REAL (Semanas 3-4)
**Objetivo:** Admins ven quién trabaja sin abrir Google Sheets  
**Prioridad:** ALTA

### Sprint 2.1 - Vista de Turnos Activos (Semana 3, días 1-3)

#### F2.1 - Backend: Endpoint de Dashboard

```javascript
// backend/src/routes/admin.js
router.get('/dashboard/turnos-activos', requireAuth, requireAdmin, async (req, res) => {
  try {
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Query usando GSI: estado-fecha-index
    const turnosActivos = await turnoRepo.query({
      IndexName: 'estado-fecha-index',
      KeyConditionExpression: 'estado = :activo AND fechaInicio = :hoy',
      ExpressionAttributeValues: {
        ':activo': 'activo',
        ':hoy': hoy,
      },
    });

    // Enriquecer con datos de usuario
    const turnosConUsuario = await Promise.all(
      turnosActivos.map(async (turno) => {
        const user = await userRepo.findById(turno.userId);
        return {
          ...turno,
          nombreCompleto: user.name,
          userType: user.userType, // driver | biker
        };
      })
    );

    // Obtener ausencias (usuarios sin turno)
    const todosUsuarios = await userRepo.findByType(['driver', 'biker']);
    const usuariosConTurno = new Set(turnosActivos.map(t => t.userId));
    const ausentes = todosUsuarios.filter(u => !usuariosConTurno.has(u.userId));

    // Verificar si tienen permiso
    const ausentesConPermisos = await Promise.all(
      ausentes.map(async (user) => {
        const permiso = await permisoRepo.findByUserAndFecha(user.userId, hoy);
        return {
          userId: user.userId,
          nombreCompleto: user.name,
          tienePermiso: !!permiso,
          motivoPermiso: permiso?.motivo,
        };
      })
    );

    res.json({
      success: true,
      trabajando: turnosConUsuario,
      ausentes: ausentesConPermisos,
      resumen: {
        totalTrabajando: turnosConUsuario.length,
        totalAusentes: ausentesConPermisos.length,
        ausentesSinPermiso: ausentesConPermisos.filter(a => !a.tienePermiso).length,
      },
    });
  } catch (err) {
    req.log.error({ err }, 'Error obteniendo dashboard turnos activos');
    throw new AppError('Error al cargar dashboard', 'DASHBOARD_ERROR', 500);
  }
});
```

**Checklist:**
- [ ] Endpoint `/admin/dashboard/turnos-activos`
- [ ] GSI optimizado para queries
- [ ] Enriquecimiento con datos de usuario
- [ ] Detección de ausencias
- [ ] Verificación de permisos
- [ ] Cache de 30s (suficiente para dashboard)

#### F2.2 - Frontend: Dashboard Component

```typescript
// frontend/src/pages/admin/DashboardTiempoReal.tsx
export const DashboardTiempoReal: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const toast = useToast();

  // Polling cada 10 segundos
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await adminApi.getDashboardTurnosActivos();
        
        // Detectar cambios para mostrar notificaciones
        if (data) {
          detectarCambios(data, response);
        }
        
        setData(response);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Error cargando dashboard:', error);
        toast.show('Error cargando datos. Reintentando...', 'error');
      }
    };

    fetchData(); // Carga inicial
    const interval = setInterval(fetchData, 10000); // Cada 10s

    return () => clearInterval(interval);
  }, [data]);

  const detectarCambios = (anterior: DashboardData, nuevo: DashboardData) => {
    // Detectar nuevos turnos iniciados
    const nuevosIniciados = nuevo.trabajando.filter(
      t => !anterior.trabajando.some(a => a.userId === t.userId)
    );

    nuevosIniciados.forEach(turno => {
      toast.show(`🟢 ${turno.nombreCompleto} inició turno`, 'success', {
        duration: 5000,
        sound: true,
      });
    });

    // Detectar turnos cerrados
    const cerrados = anterior.trabajando.filter(
      t => !nuevo.trabajando.some(n => n.userId === t.userId)
    );

    cerrados.forEach(turno => {
      toast.show(`⚪ ${turno.nombreCompleto} cerró turno`, 'info', {
        duration: 5000,
        sound: true,
      });
    });

    // Detectar nuevas ausencias sin permiso (después de las 9am)
    const horaActual = new Date().getHours();
    if (horaActual >= 9) {
      const nuevasAusencias = nuevo.ausentes.filter(
        a => !a.tienePermiso && !anterior.ausentes.some(ant => ant.userId === a.userId)
      );

      if (nuevasAusencias.length > 0) {
        toast.show(
          `⚠️ ${nuevasAusencias.length} ausencia(s) sin permiso detectada(s)`,
          'warning',
          { duration: 10000 }
        );
      }
    }
  };

  if (loading && !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header con resumen */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Dashboard en Tiempo Real</h1>
          <div className="text-sm text-gray-500">
            Última actualización: {formatDistanceToNow(lastUpdate, { addSuffix: true, locale: es })}
          </div>
        </div>

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
      </div>

      {/* Tabla de turnos activos */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Trabajando Ahora</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Estado</th>
                <th className="px-6 py-3 text-left">Nombre</th>
                <th className="px-6 py-3 text-left">Tipo</th>
                <th className="px-6 py-3 text-left">Hora Inicio</th>
                <th className="px-6 py-3 text-left">Auto/Placa</th>
                <th className="px-6 py-3 text-left">Km Inicial</th>
                <th className="px-6 py-3 text-left">Tiempo</th>
                <th className="px-6 py-3 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.trabajando.map((turno) => (
                <TurnoActivoRow key={turno.turnoId} turno={turno} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lista de ausentes */}
      {data.ausentes.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">No Iniciaron Turno Hoy</h2>
          </div>
          <div className="divide-y">
            {data.ausentes.map((ausente) => (
              <AusenteRow key={ausente.userId} ausente={ausente} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

**Checklist:**
- [ ] Componente DashboardTiempoReal
- [ ] Polling cada 10s
- [ ] Detección de cambios con notificaciones
- [ ] Sonido en notificaciones importantes
- [ ] StatCards con resumen
- [ ] Tabla responsive
- [ ] Loading states
- [ ] Error handling con retry

### Sprint 2.2 - Sistema de Permisos (Semana 3, días 4-5)

#### F2.3 - Backend: Permisos CRUD

```javascript
// backend/src/routes/permisos.js
const router = express.Router();

// Solicitar permiso (driver/biker)
router.post('/solicitar', requireAuth, async (req, res) => {
  const { fecha, motivo, nota } = req.body;
  const userId = req.user.id;

  // Validar fecha futura
  if (new Date(fecha) <= new Date()) {
    throw new ValidationError('La fecha debe ser futura', 'fecha');
  }

  const permisoId = uuid();
  const permiso = {
    permisoId,
    userId,
    fecha,
    motivo, // 'Personal' | 'Salud' | 'Vacaciones' | 'Otro'
    nota: nota || '',
    estado: 'pendiente',
    fechaSolicitud: new Date().toISOString(),
  };

  await permisoRepo.create(permiso);
  
  req.log.info({ permisoId, userId, fecha }, 'Permiso solicitado');

  res.json({
    success: true,
    permiso,
  });
});

// Listar permisos propios (driver/biker)
router.get('/mis-permisos', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const permisos = await permisoRepo.findByUserId(userId);
  
  res.json({
    success: true,
    permisos,
  });
});

// Listar permisos pendientes (admin)
router.get('/pendientes', requireAuth, requireAdmin, async (req, res) => {
  const permisos = await permisoRepo.query({
    IndexName: 'estado-fecha-index',
    KeyConditionExpression: 'estado = :pendiente',
    ExpressionAttributeValues: { ':pendiente': 'pendiente' },
  });

  // Enriquecer con datos de usuario
  const permisosConUsuario = await Promise.all(
    permisos.map(async (p) => {
      const user = await userRepo.findById(p.userId);
      return { ...p, nombreCompleto: user.name };
    })
  );

  res.json({
    success: true,
    permisos: permisosConUsuario,
  });
});

// Aprobar/Rechazar permiso (admin)
router.post('/:permisoId/responder', requireAuth, requireAdmin, async (req, res) => {
  const { permisoId } = req.params;
  const { accion, razon } = req.body; // 'aprobar' | 'rechazar'

  const permiso = await permisoRepo.findById(permisoId);
  if (!permiso) throw new NotFoundError('Permiso', permisoId);

  const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado';

  await permisoRepo.update(permisoId, {
    estado: nuevoEstado,
    aprobadoPor: req.user.id,
    fechaRespuesta: new Date().toISOString(),
    razonRechazo: razon,
  });

  // TODO: Notificar al usuario (push notification o ver en próximo login)

  req.log.info({ permisoId, accion, adminId: req.user.id }, 'Permiso respondido');

  res.json({
    success: true,
    message: `Permiso ${nuevoEstado}`,
  });
});

module.exports = router;
```

**Checklist:**
- [ ] Endpoints CRUD de permisos
- [ ] Validación de fecha futura
- [ ] Estados: pendiente | aprobado | rechazado
- [ ] Enriquecimiento con datos de usuario
- [ ] Logs de auditoría
- [ ] Test: Flujo completo de solicitud → aprobación

#### F2.4 - Frontend: Solicitar Permiso

```typescript
// frontend/src/pages/SolicitarPermiso.tsx
export const SolicitarPermiso: React.FC = () => {
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState<string>('');
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
      toast.show('✅ Permiso solicitado correctamente', 'success');
      navigate('/dashboard');
    } catch (error) {
      toast.show(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Solicitar Permiso</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block font-medium mb-2">Fecha *</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block font-medium mb-2">Motivo *</label>
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar...</option>
            <option value="Personal">Personal</option>
            <option value="Salud">Salud</option>
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
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 border px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <LoadingButton
            type="submit"
            loading={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Enviar Solicitud
          </button>
        </div>
      </form>
    </div>
  );
};
```

**Checklist:**
- [ ] Formulario de solicitud
- [ ] Validación fecha futura
- [ ] Motivos predefinidos
- [ ] Vista de mis permisos
- [ ] Estados visuales (pendiente/aprobado/rechazado)

#### F2.5 - Frontend: Panel Admin de Permisos

```typescript
// frontend/src/pages/admin/GestionPermisos.tsx
export const GestionPermisos: React.FC = () => {
  const [permisosPendientes, setPermisosPendientes] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    loadPermisosPendientes();
  }, []);

  const loadPermisosPendientes = async () => {
    try {
      const response = await permisosApi.getPendientes();
      setPermisosPendientes(response.permisos);
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
      await loadPermisosPendientes(); // Recargar lista
    } catch (error) {
      toast.show(`Error: ${error.message}`, 'error');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestión de Permisos</h1>

      {permisosPendientes.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No hay solicitudes pendientes
        </div>
      ) : (
        <div className="space-y-4">
          {permisosPendientes.map((permiso) => (
            <div key={permiso.permisoId} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{permiso.nombreCompleto}</h3>
                  <p className="text-gray-600">
                    📅 {formatDate(permiso.fecha)} • {permiso.motivo}
                  </p>
                  {permiso.nota && (
                    <p className="text-sm text-gray-500 mt-2">"{permiso.nota}"</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Solicitado: {formatDistanceToNow(new Date(permiso.fechaSolicitud), { addSuffix: true, locale: es })}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleResponder(permiso.permisoId, 'aprobar')}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    ✓ Aprobar
                  </button>
                  <button
                    onClick={() => handleResponder(permiso.permisoId, 'rechazar')}
                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
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

**Checklist:**
- [ ] Lista de permisos pendientes
- [ ] Botones aprobar/rechazar
- [ ] Confirmación antes de rechazar (con modal para razón)
- [ ] Actualización automática después de acción
- [ ] Filtros: pendientes / aprobados / rechazados / todos
- [ ] Test: Flujo completo desde solicitud hasta aprobación

**Resultado Fase 2:**
- ✅ Dashboard tiempo real funcionando
- ✅ Polling cada 10s con notificaciones
- ✅ Sistema de permisos completo
- ✅ Admins ven quién trabaja sin abrir Sheets
- ✅ Detección de ausencias sin permiso

---

## 📢 FASE 3: SISTEMA DE ANUNCIOS ANDI (Semanas 5-6)
**Objetivo:** RRHH puede comunicarse efectivamente con drivers/bikers  
**Prioridad:** ALTA

### Sprint 3.1 - Backend Anuncios (Semana 5, días 1-3)

#### F3.1 - Modelo de Datos y Repositorio

```javascript
// backend/src/repositories/AnuncioRepository.js
class AnuncioRepository extends BaseRepository {
  async create(anuncio) {
    // anuncio: { titulo, mensaje, fechaInicio, fechaFin, destinatarios, prioridad }
    const anuncioId = uuid();
    const item = {
      anuncioId,
      ...anuncio,
      creadoPor: anuncio.userId,
      fechaCreacion: new Date().toISOString(),
      estado: 'activo', // activo | expirado | eliminado
    };

    await this.dynamo.put({
      TableName: this.tableName,
      Item: item,
    });

    return item;
  }

  async findActivosByFecha(fecha) {
    // Buscar anuncios activos para una fecha específica
    return this.query({
      IndexName: 'estado-fecha-index',
      KeyConditionExpression: 'estado = :activo AND fechaInicio <= :fecha',
      FilterExpression: 'fechaFin >= :fecha OR attribute_not_exists(fechaFin)',
      ExpressionAttributeValues: {
        ':activo': 'activo',
        ':fecha': fecha,
      },
    });
  }

  async findPendientesByUser(userId) {
    // Anuncios que el usuario NO ha leído
    const hoy = new Date().toISOString().split('T')[0];
    const anunciosActivos = await this.findActivosByFecha(hoy);

    // Filtrar por destinatarios
    const anunciosParaUsuario = anunciosActivos.filter((anuncio) =>
      this.isDestinatario(anuncio, userId)
    );

    // Verificar cuáles ya leyó
    const lecturas = await lecturaRepo.findByUserId(userId);
    const anunciosLeidos = new Set(lecturas.map(l => l.anuncioId));

    return anunciosParaUsuario.filter(a => !anunciosLeidos.has(a.anuncioId));
  }

  isDestinatario(anuncio, userId) {
    const { destinatarios } = anuncio;

    if (destinatarios.tipo === 'todos') return true;
    if (destinatarios.tipo === 'drivers' && user.userType === 'beezero') return true;
    if (destinatarios.tipo === 'bikers' && user.userType === 'ecodelivery') return true;
    if (destinatarios.tipo === 'especificos') {
      return destinatarios.lista.includes(userId) || destinatarios.lista.includes(user.name);
    }

    return false;
  }

  async marcarLeido(anuncioId, userId) {
    await lecturaRepo.create({
      anuncioId,
      userId,
      leido: true,
      fechaLectura: new Date().toISOString(),
    });
  }

  async getEstadisticas(anuncioId) {
    const anuncio = await this.findById(anuncioId);
    const lecturas = await lecturaRepo.findByAnuncioId(anuncioId);

    // Calcular total destinatarios
    let totalDestinatarios = 0;
    if (anuncio.destinatarios.tipo === 'todos') {
      totalDestinatarios = await userRepo.countAll();
    } else if (anuncio.destinatarios.tipo === 'drivers') {
      totalDestinatarios = await userRepo.countByType('beezero');
    } else if (anuncio.destinatarios.tipo === 'bikers') {
      totalDestinatarios = await userRepo.countByType('ecodelivery');
    } else {
      totalDestinatarios = anuncio.destinatarios.lista.length;
    }

    const leyeron = lecturas.length;
    const pendientes = totalDestinatarios - leyeron;

    return {
      totalDestinatarios,
      leyeron,
      pendientes,
      porcentaje: Math.round((leyeron / totalDestinatarios) * 100),
      listaPendientes: await this.getUsuariosPendientes(anuncio, lecturas),
    };
  }

  async getUsuariosPendientes(anuncio, lecturas) {
    // Obtener lista de usuarios que NO leyeron
    const usuariosLeidos = new Set(lecturas.map(l => l.userId));
    
    let todosDestinatarios = [];
    if (anuncio.destinatarios.tipo === 'especificos') {
      todosDestinatarios = await userRepo.findByIds(anuncio.destinatarios.lista);
    } else {
      // ... lógica para otros tipos
    }

    return todosDestinatarios.filter(u => !usuariosLeidos.has(u.userId));
  }
}
```

**Checklist:**
- [ ] AnuncioRepository con métodos CRUD
- [ ] LecturaRepository para tracking
- [ ] Lógica de destinatarios (todos/drivers/bikers/específicos)
- [ ] Query por fecha con rango
- [ ] Estadísticas de lectura

#### F3.2 - Endpoints Backend

```javascript
// backend/src/routes/anuncios.js
const router = express.Router();

// Crear anuncio (solo Andi = admin)
router.post('/crear', requireAuth, requireAdmin, async (req, res) => {
  const { titulo, mensaje, fechaInicio, fechaFin, destinatarios, prioridad } = req.body;

  // Validar
  if (!titulo || !mensaje || !fechaInicio || !destinatarios) {
    throw new ValidationError('Faltan campos requeridos');
  }

  if (titulo.length > 100) {
    throw new ValidationError('Título muy largo (max 100 caracteres)', 'titulo');
  }

  if (mensaje.length > 500) {
    throw new ValidationError('Mensaje muy largo (max 500 caracteres)', 'mensaje');
  }

  const anuncio = await anuncioRepo.create({
    titulo,
    mensaje,
    fechaInicio,
    fechaFin: fechaFin || null,
    destinatarios, // { tipo: 'todos' | 'drivers' | 'bikers' | 'especificos', lista?: ['user1', 'user2'] }
    prioridad: prioridad || 'normal', // normal | importante | urgente
    userId: req.user.id,
  });

  req.log.info({ anuncioId: anuncio.anuncioId }, 'Anuncio creado');

  res.json({
    success: true,
    anuncio,
  });
});

// Listar anuncios (admin)
router.get('/lista', requireAuth, requireAdmin, async (req, res) => {
  const { estado } = req.query; // 'activo' | 'expirado' | 'todos'
  
  const anuncios = await anuncioRepo.findByEstado(estado || 'todos');

  res.json({
    success: true,
    anuncios,
  });
});

// Ver estadísticas de un anuncio (admin)
router.get('/:anuncioId/estadisticas', requireAuth, requireAdmin, async (req, res) => {
  const { anuncioId } = req.params;
  const stats = await anuncioRepo.getEstadisticas(anuncioId);

  res.json({
    success: true,
    estadisticas: stats,
  });
});

// Obtener anuncios pendientes de leer (driver/biker)
router.get('/pendientes', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const anuncios = await anuncioRepo.findPendientesByUser(userId);

  // Ordenar por prioridad (urgente primero)
  const ordenados = anuncios.sort((a, b) => {
    const prioridades = { urgente: 3, importante: 2, normal: 1 };
    return prioridades[b.prioridad] - prioridades[a.prioridad];
  });

  res.json({
    success: true,
    anuncios: ordenados,
  });
});

// Marcar anuncio como leído (driver/biker)
router.post('/:anuncioId/leer', requireAuth, async (req, res) => {
  const { anuncioId } = req.params;
  const userId = req.user.id;

  await anuncioRepo.marcarLeido(anuncioId, userId);

  req.log.info({ anuncioId, userId }, 'Anuncio marcado como leído');

  res.json({
    success: true,
    message: 'Anuncio marcado como leído',
  });
});

// Editar anuncio (admin, solo si no ha iniciado)
router.put('/:anuncioId', requireAuth, requireAdmin, async (req, res) => {
  const { anuncioId } = req.params;
  const anuncio = await anuncioRepo.findById(anuncioId);

  if (!anuncio) throw new NotFoundError('Anuncio', anuncioId);

  // Solo editar si todavía no empezó
  const hoy = new Date().toISOString().split('T')[0];
  if (anuncio.fechaInicio <= hoy) {
    throw new AppError('No se puede editar un anuncio ya iniciado', 'ANUNCIO_INICIADO', 400);
  }

  await anuncioRepo.update(anuncioId, req.body);

  req.log.info({ anuncioId }, 'Anuncio editado');

  res.json({
    success: true,
    message: 'Anuncio editado',
  });
});

// Eliminar anuncio (admin, solo si no ha iniciado)
router.delete('/:anuncioId', requireAuth, requireAdmin, async (req, res) => {
  const { anuncioId } = req.params;
  const anuncio = await anuncioRepo.findById(anuncioId);

  if (!anuncio) throw new NotFoundError('Anuncio', anuncioId);

  const hoy = new Date().toISOString().split('T')[0];
  if (anuncio.fechaInicio <= hoy) {
    throw new AppError('No se puede eliminar un anuncio ya iniciado', 'ANUNCIO_INICIADO', 400);
  }

  await anuncioRepo.delete(anuncioId);

  req.log.info({ anuncioId }, 'Anuncio eliminado');

  res.json({
    success: true,
    message: 'Anuncio eliminado',
  });
});

module.exports = router;
```

**Checklist:**
- [ ] CRUD completo de anuncios
- [ ] Endpoint pendientes por usuario
- [ ] Marcar como leído
- [ ] Estadísticas de lectura
- [ ] Validación de campos
- [ ] Permisos (solo admin crea/edita/elimina)
- [ ] Test: Crear anuncio → driver lo ve al login → marca leído

### Sprint 3.2 - Frontend Anuncios (Semana 5, días 4-5)

#### F3.3 - Modal de Anuncios en Login

```typescript
// frontend/src/components/AnunciosModal.tsx
interface Anuncio {
  anuncioId: string;
  titulo: string;
  mensaje: string;
  prioridad: 'normal' | 'importante' | 'urgente';
  fechaInicio: string;
}

export const AnunciosModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnunciosPendientes();
  }, []);

  const loadAnunciosPendientes = async () => {
    try {
      const response = await anunciosApi.getPendientes();
      setAnuncios(response.anuncios);
    } catch (error) {
      console.error('Error cargando anuncios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEntendido = async () => {
    const anuncioActual = anuncios[currentIndex];

    // Marcar como leído
    try {
      await anunciosApi.marcarLeido(anuncioActual.anuncioId);
    } catch (error) {
      console.error('Error marcando como leído:', error);
    }

    // Si hay más anuncios, mostrar el siguiente
    if (currentIndex < anuncios.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Terminó de leer todos
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Spinner />
        </div>
      </div>
    );
  }

  if (anuncios.length === 0) {
    onClose();
    return null;
  }

  const anuncioActual = anuncios[currentIndex];
  const prioridadColors = {
    normal: 'bg-blue-500',
    importante: 'bg-yellow-500',
    urgente: 'bg-red-500',
  };

  const prioridadIcons = {
    normal: 'ℹ️',
    importante: '⚠️',
    urgente: '🚨',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header con prioridad */}
        <div className={`${prioridadColors[anuncioActual.prioridad]} text-white px-6 py-4 rounded-t-xl flex items-center gap-3`}>
          <span className="text-3xl">{prioridadIcons[anuncioActual.prioridad]}</span>
          <div className="flex-1">
            <h2 className="font-bold text-lg">{anuncioActual.titulo}</h2>
            <p className="text-sm opacity-90">
              {anuncioActual.prioridad === 'urgente' ? 'URGENTE' : 
               anuncioActual.prioridad === 'importante' ? 'Importante' : 'Información'}
            </p>
          </div>
        </div>

        {/* Mensaje */}
        <div className="p-6">
          <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
            {anuncioActual.mensaje}
          </p>
        </div>

        {/* Footer con contador y botón */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            {currentIndex + 1} de {anuncios.length}
          </span>
          <button
            onClick={handleEntendido}
            className="bg-black text-white px-8 py-3 rounded-lg font-bold hover:bg-gray-800 transition"
          >
            {currentIndex < anuncios.length - 1 ? 'Siguiente' : 'Entendido'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

**Integración en Login:**
```typescript
// frontend/src/pages/Login.tsx
export const Login: React.FC = () => {
  const [showAnuncios, setShowAnuncios] = useState(false);
  const navigate = useNavigate();

  const handleLoginSuccess = async () => {
    // ... login exitoso

    // Verificar si hay anuncios pendientes
    try {
      const response = await anunciosApi.getPendientes();
      if (response.anuncios.length > 0) {
        setShowAnuncios(true);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      // Si falla, continuar normal
      navigate('/dashboard');
    }
  };

  return (
    <div>
      {/* ... formulario login ... */}

      {showAnuncios && (
        <AnunciosModal onClose={() => navigate('/dashboard')} />
      )}
    </div>
  );
};
```

**Checklist:**
- [ ] Modal de anuncios
- [ ] Colores por prioridad
- [ ] Mostrar uno por uno
- [ ] Marcar como leído al cerrar
- [ ] Contador (1 de 3)
- [ ] Integración en login
- [ ] Test: Login → ver anuncios → marcar leídos → ir a dashboard

### Sprint 3.3 - Panel Admin Anuncios (Semana 6, días 1-5)

#### F3.4 - Crear Anuncio (Admin)

```typescript
// frontend/src/pages/admin/CrearAnuncio.tsx
export const CrearAnuncio: React.FC = () => {
  const [titulo, setTitulo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [prioridad, setPrioridad] = useState<'normal' | 'importante' | 'urgente'>('normal');
  const [destinatariosTipo, setDestinatariosTipo] = useState<'todos' | 'drivers' | 'bikers' | 'especificos'>('todos');
  const [listaEspecificos, setListaEspecificos] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo || !mensaje || !fechaInicio) {
      toast.show('Completa todos los campos requeridos', 'warning');
      return;
    }

    if (titulo.length > 100) {
      toast.show('Título muy largo (max 100 caracteres)', 'warning');
      return;
    }

    if (mensaje.length > 500) {
      toast.show('Mensaje muy largo (max 500 caracteres)', 'warning');
      return;
    }

    setLoading(true);
    try {
      const destinatarios = {
        tipo: destinatariosTipo,
        lista: destinatariosTipo === 'especificos' 
          ? listaEspecificos.split(',').map(n => n.trim()).filter(n => n)
          : undefined,
      };

      await anunciosApi.crear({
        titulo,
        mensaje,
        fechaInicio,
        fechaFin: fechaFin || undefined,
        destinatarios,
        prioridad,
      });

      toast.show('✅ Anuncio creado correctamente', 'success');
      navigate('/admin/anuncios');
    } catch (error) {
      toast.show(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Crear Anuncio</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Título */}
        <div>
          <label className="block font-medium mb-2">
            Título * <span className="text-sm text-gray-500">({titulo.length}/100)</span>
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            maxLength={100}
            placeholder="Ej: Mañana todos con polera amarilla"
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        {/* Mensaje */}
        <div>
          <label className="block font-medium mb-2">
            Mensaje * <span className="text-sm text-gray-500">({mensaje.length}/500)</span>
          </label>
          <textarea
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            maxLength={500}
            rows={5}
            placeholder="Escribe el mensaje para los conductores..."
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-2">Fecha Inicio *</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block font-medium mb-2">
              Fecha Fin <span className="text-sm text-gray-500">(opcional)</span>
            </label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Prioridad */}
        <div>
          <label className="block font-medium mb-2">Prioridad</label>
          <div className="flex gap-3">
            {(['normal', 'importante', 'urgente'] as const).map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value={p}
                  checked={prioridad === p}
                  onChange={() => setPrioridad(p)}
                  className="w-4 h-4"
                />
                <span className="capitalize">{p}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Destinatarios */}
        <div>
          <label className="block font-medium mb-2">Destinatarios *</label>
          <select
            value={destinatariosTipo}
            onChange={(e) => setDestinatariosTipo(e.target.value as any)}
            className="w-full border rounded px-3 py-2 mb-3"
          >
            <option value="todos">Todos (drivers + bikers)</option>
            <option value="drivers">Solo Drivers (Bee Zero)</option>
            <option value="bikers">Solo Bikers (Ecodelivery)</option>
            <option value="especificos">Usuarios Específicos</option>
          </select>

          {destinatariosTipo === 'especificos' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Nombres separados por coma:
              </label>
              <input
                type="text"
                value={listaEspecificos}
                onChange={(e) => setListaEspecificos(e.target.value)}
                placeholder="Patricia, Ruben, Ana"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="border-t pt-6">
          <h3 className="font-bold mb-3">Vista Previa:</h3>
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className={`${
              prioridad === 'urgente' ? 'bg-red-100 border-red-500' :
              prioridad === 'importante' ? 'bg-yellow-100 border-yellow-500' :
              'bg-blue-100 border-blue-500'
            } border-l-4 p-4 rounded`}>
              <h4 className="font-bold mb-2">{titulo || '(Sin título)'}</h4>
              <p className="whitespace-pre-wrap">{mensaje || '(Sin mensaje)'}</p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/anuncios')}
            className="flex-1 border px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <LoadingButton
            type="submit"
            loading={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Publicar Anuncio
          </button>
        </div>
      </form>
    </div>
  );
};
```

**Checklist:**
- [ ] Formulario completo de creación
- [ ] Validación de longitudes
- [ ] Selector de destinatarios
- [ ] Preview del anuncio
- [ ] Fechas con validación
- [ ] Test: Crear anuncio → driver lo ve al día siguiente

#### F3.5 - Lista y Estadísticas de Anuncios (Admin)

```typescript
// frontend/src/pages/admin/ListaAnuncios.tsx
export const ListaAnuncios: React.FC = () => {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'activo' | 'expirado'>('todos');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadAnuncios();
  }, [filtro]);

  const loadAnuncios = async () => {
    setLoading(true);
    try {
      const response = await anunciosApi.getLista(filtro);
      setAnuncios(response.anuncios);
    } catch (error) {
      console.error('Error cargando anuncios:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestión de Anuncios</h1>
        <button
          onClick={() => navigate('/admin/anuncios/crear')}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Crear Anuncio
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-3">
          {(['todos', 'activo', 'expirado'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded ${
                filtro === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'activo' ? 'Activos' : 'Expirados'}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de anuncios */}
      {loading ? (
        <LoadingSpinner />
      ) : anuncios.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          No hay anuncios {filtro !== 'todos' && `(${filtro}s)`}
        </div>
      ) : (
        <div className="space-y-4">
          {anuncios.map((anuncio) => (
            <AnuncioCard key={anuncio.anuncioId} anuncio={anuncio} onUpdate={loadAnuncios} />
          ))}
        </div>
      )}
    </div>
  );
};

// Componente de tarjeta de anuncio
const AnuncioCard: React.FC<{ anuncio: Anuncio; onUpdate: () => void }> = ({ anuncio, onUpdate }) => {
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<EstadisticasAnuncio | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const response = await anunciosApi.getEstadisticas(anuncio.anuncioId);
      setStats(response.estadisticas);
      setShowStats(true);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const prioridadColors = {
    normal: 'border-blue-500',
    importante: 'border-yellow-500',
    urgente: 'border-red-500',
  };

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${prioridadColors[anuncio.prioridad]} p-6`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-bold text-lg">{anuncio.titulo}</h3>
          <p className="text-gray-600 mt-2 whitespace-pre-wrap">{anuncio.mensaje}</p>
          
          <div className="flex gap-4 mt-4 text-sm text-gray-500">
            <span>📅 {anuncio.fechaInicio} {anuncio.fechaFin && `→ ${anuncio.fechaFin}`}</span>
            <span>👥 {anuncio.destinatarios.tipo}</span>
            <span className="capitalize">⚡ {anuncio.prioridad}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            {loadingStats ? 'Cargando...' : '📊 Ver Stats'}
          </button>
        </div>
      </div>

      {/* Modal de estadísticas */}
      {showStats && stats && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-bold mb-3">Estadísticas de Lectura:</h4>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-green-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-700">{stats.leyeron}</div>
              <div className="text-sm text-gray-600">Leyeron</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded">
              <div className="text-2xl font-bold text-yellow-700">{stats.pendientes}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-700">{stats.porcentaje}%</div>
              <div className="text-sm text-gray-600">Tasa de lectura</div>
            </div>
          </div>

          {/* Lista de pendientes */}
          {stats.listaPendientes.length > 0 && (
            <div>
              <h5 className="font-semibold mb-2">Pendientes de leer:</h5>
              <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                {stats.listaPendientes.map((user) => (
                  <div key={user.userId} className="text-sm py-1">
                    • {user.nombreCompleto}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => setShowStats(false)}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Cerrar estadísticas
          </button>
        </div>
      )}
    </div>
  );
};
```

**Checklist:**
- [ ] Lista de anuncios con filtros
- [ ] Tarjetas con preview
- [ ] Estadísticas de lectura
- [ ] Lista de usuarios pendientes
- [ ] Progreso visual (barra o porcentaje)
- [ ] Botón editar (solo futuros)
- [ ] Botón eliminar (solo futuros)
- [ ] Test: Crear → ver stats → verificar lecturas

**Resultado Fase 3:**
- ✅ Sistema de anuncios completo
- ✅ Andi puede programar mensajes
- ✅ Drivers ven anuncios al login
- ✅ Tracking de lecturas
- ✅ Estadísticas en tiempo real
- ✅ Segmentación por grupos

---

## ✏️ FASE 4: EDICIÓN POR ADMINS + MIGRACIÓN BD (Semanas 7-9)
**Objetivo:** Admins pueden corregir datos + Doble escritura DynamoDB/Sheets  
**Prioridad:** ALTA

### Sprint 4.1 - Edición de Carreras por Admins (Semana 7)

#### F4.1 - Backend: Editar Carrera con Auditoría

```javascript
// backend/src/services/auditService.js
class AuditService {
  async logEdit({ entityType, entityId, userId, changes, metadata = {} }) {
    const auditId = uuid();
    const timestamp = Date.now();

    await auditRepo.create({
      pk: `${entityType}#${entityId}`,
      sk: timestamp,
      auditId,
      action: 'edit',
      userId,
      userName: metadata.userName,
      changes, // [{ field: 'precio', from: 50, to: 55 }, ...]
      timestamp: new Date(timestamp).toISOString(),
      metadata,
    });
  }

  async getHistory(entityType, entityId) {
    return auditRepo.query({
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: {
        ':pk': `${entityType}#${entityId}`,
      },
      ScanIndexForward: false, // Más recientes primero
    });
  }
}

// backend/src/routes/admin.js
router.put('/carreras/:carreraId', requireAuth, requireAdmin, async (req, res) => {
  const { carreraId } = req.params;
  const updates = req.body;

  // Obtener carrera actual
  const carreraActual = await carreraRepo.findById(carreraId);
  if (!carreraActual) throw new NotFoundError('Carrera', carreraId);

  // Detectar cambios
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

  // Actualizar en DynamoDB
  await carreraRepo.update(carreraId, updates);

  // Sincronizar a Google Sheets
  await syncCarreraToSheet(carreraId, { ...carreraActual, ...updates });

  // Log de auditoría
  await auditService.logEdit({
    entityType: 'carrera',
    entityId: carreraId,
    userId: req.user.id,
    changes,
    metadata: { userName: req.user.name },
  });

  req.log.info({ carreraId, changes }, 'Carrera editada por admin');

  res.json({
    success: true,
    message: 'Carrera actualizada',
    changes,
  });
});

// Ver historial de cambios
router.get('/carreras/:carreraId/historial', requireAuth, requireAdmin, async (req, res) => {
  const { carreraId } = req.params;
  const history = await auditService.getHistory('carrera', carreraId);

  res.json({
    success: true,
    historial: history,
  });
});
```

**Checklist:**
- [ ] Endpoint PUT para editar carrera
- [ ] Detección automática de cambios
- [ ] AuditService para logging
- [ ] Sincronización a Google Sheets
- [ ] Endpoint de historial
- [ ] Test: Editar carrera → ver cambios en historial

#### F4.2 - Frontend: Modal de Edición

```typescript
// frontend/src/pages/admin/EditarCarreraModal.tsx
interface EditarCarreraModalProps {
  carrera: Carrera;
  onClose: () => void;
  onSave: () => void;
}

export const EditarCarreraModal: React.FC<EditarCarreraModalProps> = ({ 
  carrera, 
  onClose, 
  onSave 
}) => {
  const [formData, setFormData] = useState<Carrera>(carrera);
  const [loading, setLoading] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [historial, setHistorial] = useState<AuditLog[]>([]);
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
    } catch (error) {
      toast.show(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-500 text-white px-6 py-4 rounded-t-xl flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">Editar Carrera</h2>
            <p className="text-sm opacity-90">ID: {carrera.carreraId}</p>
          </div>
          <button
            onClick={loadHistorial}
            className="px-3 py-1 bg-white/20 rounded hover:bg-white/30 text-sm"
          >
            📜 Ver Historial
          </button>
        </div>

        {/* Formulario */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Cliente</label>
              <input
                type="text"
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-2">Hora Inicio</label>
              <input
                type="time"
                value={formData.horaInicio}
                onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Hora Fin</label>
              <input
                type="time"
                value={formData.horaFin}
                onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Lugar Recojo</label>
            <input
              type="text"
              value={formData.lugarRecojo}
              onChange={(e) => setFormData({ ...formData, lugarRecojo: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">Lugar Destino</label>
            <input
              type="text"
              value={formData.lugarDestino}
              onChange={(e) => setFormData({ ...formData, lugarDestino: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-2">Distancia (km)</label>
              <input
                type="number"
                step="0.01"
                value={formData.distancia}
                onChange={(e) => setFormData({ ...formData, distancia: parseFloat(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Precio (Bs)</label>
              <input
                type="number"
                step="0.01"
                value={formData.precio}
                onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-medium mb-2">Tiempo</label>
              <input
                type="text"
                value={formData.tiempo}
                onChange={(e) => setFormData({ ...formData, tiempo: e.target.value })}
                placeholder="0:17"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium mb-2">Observaciones</label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={3}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.porHora}
                onChange={(e) => setFormData({ ...formData, porHora: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Por Hora</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.aCuenta}
                onChange={(e) => setFormData({ ...formData, aCuenta: e.target.checked })}
                className="w-4 h-4"
              />
              <span>A Cuenta</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.pagoPorQR}
                onChange={(e) => setFormData({ ...formData, pagoPorQR: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Pago por QR</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 border px-4 py-2 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <LoadingButton
            onClick={handleSave}
            loading={loading}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Guardar Cambios
          </button>
        </div>

        {/* Modal de Historial */}
        {showHistorial && (
          <div className="border-t p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Historial de Cambios</h3>
              <button onClick={() => setShowHistorial(false)} className="text-sm text-blue-600">
                Cerrar
              </button>
            </div>

            <div className="space-y-3">
              {historial.map((log) => (
                <div key={log.auditId} className="bg-white rounded p-3 text-sm">
                  <div className="flex justify-between items-start mb-2">
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
      </div>
    </div>
  );
};
```

**Checklist:**
- [ ] Modal de edición completo
- [ ] Todos los campos editables
- [ ] Botón ver historial
- [ ] Preview de cambios antes de guardar
- [ ] Validación de campos
- [ ] Test: Editar carrera → verificar en Sheet + historial

### Sprint 4.2 - Doble Escritura DynamoDB + Sheets (Semanas 8-9)

#### F4.3 - Servicio de Sincronización

```javascript
// backend/src/services/syncService.js
class SyncService {
  constructor() {
    this.queue = []; // Cola en memoria (migrar a SQS en producción)
  }

  async writeCarrera(carrera) {
    const startTime = Date.now();

    try {
      // 1. Escribir a DynamoDB (rápido, ~50ms)
      await carreraRepo.create(carrera);
      logger.info({ carreraId: carrera.carreraId, latency: Date.now() - startTime }, 'Carrera escrita a DynamoDB');

      // 2. Sincronizar a Google Sheets (async, no bloquea response)
      this.queue.push({ type: 'carrera', action: 'create', data: carrera });
      setImmediate(() => this.processSyncQueue());

      return { success: true, carreraId: carrera.carreraId };
    } catch (err) {
      logger.error({ err, carrera }, 'Error escribiendo carrera');
      
      // Si DynamoDB falla, agregar a retry queue
      await retryQueue.add({ action: 'writeCarrera', data: carrera });
      throw err;
    }
  }

  async processSyncQueue() {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, 10); // Procesar máx 10 por vez

    for (const task of batch) {
      try {
        await this.syncToSheet(task);
      } catch (err) {
        logger.error({ err, task }, 'Error sincronizando a Google Sheets');
        // Agregar a retry queue
        await retryQueue.add({ action: 'syncToSheet', data: task });
      }
    }

    // Si quedan más, procesar siguiente batch
    if (this.queue.length > 0) {
      setTimeout(() => this.processSyncQueue(), 100);
    }
  }

  async syncToSheet(task) {
    const { type, action, data } = task;

    if (type === 'carrera') {
      if (action === 'create') {
        await this.writeCarreraToSheet(data);
      } else if (action === 'update') {
        await this.updateCarreraInSheet(data);
      }
    } else if (type === 'turno') {
      // Similar para turnos
    }
  }

  async writeCarreraToSheet(carrera) {
    const spreadsheetId = config.carrerasSpreadsheetId;
    const sheetTitle = carrera.driverName;

    // Asegurar que existe la pestaña
    await googleSheetsService.getOrCreateSheet(spreadsheetId, sheetTitle);

    // Convertir objeto a fila (orden correcto de columnas)
    const row = this.carreraToRow(carrera);

    await googleSheetsService.appendRow(spreadsheetId, sheetTitle, row);
    
    logger.info({ carreraId: carrera.carreraId }, 'Carrera sincronizada a Google Sheets');
  }

  carreraToRow(carrera) {
    return [
      carrera.carreraId,
      carrera.abejita,
      carrera.fecha,
      carrera.cliente,
      carrera.horaInicio,
      carrera.horaFin,
      carrera.lugarRecojo,
      carrera.lugarDestino,
      carrera.tiempo,
      carrera.distancia,
      carrera.precio,
      carrera.observaciones,
      carrera.foto,
      carrera.fechaCreacion,
      carrera.horaCreacion,
      carrera.porHora ? 'si' : 'no',
      carrera.aCuenta ? 'si' : 'no',
      carrera.pagoPorQR ? 'si' : 'no',
    ];
  }

  // Sincronización desde Google Sheets hacia DynamoDB (cada 5min)
  async syncFromSheet() {
    logger.info('Iniciando sincronización desde Google Sheets');

    const spreadsheetId = config.carrerasSpreadsheetId;
    const tabs = await googleSheetsService.getSheetTabs(spreadsheetId);

    for (const tab of tabs) {
      try {
        await this.syncTabFromSheet(spreadsheetId, tab);
      } catch (err) {
        logger.error({ err, tab }, 'Error sincronizando tab desde Sheet');
      }
    }

    logger.info('Sincronización desde Google Sheets completada');
  }

  async syncTabFromSheet(spreadsheetId, tabName) {
    const rows = await googleSheetsService.getAllRows(spreadsheetId, tabName);

    for (const row of rows) {
      const carrera = this.rowToCarrera(row);
      
      // Verificar si existe en DynamoDB
      const existente = await carreraRepo.findById(carrera.carreraId);

      if (!existente) {
        // No existe → crear
        await carreraRepo.create(carrera);
        logger.info({ carreraId: carrera.carreraId }, 'Carrera importada desde Sheet');
      } else {
        // Existe → verificar si hubo cambios (admin editó en Sheet)
        const hasChanges = this.detectChanges(existente, carrera);
        if (hasChanges.length > 0) {
          await carreraRepo.update(carrera.carreraId, carrera);
          await auditService.logEdit({
            entityType: 'carrera',
            entityId: carrera.carreraId,
            userId: 'SYSTEM',
            changes: hasChanges,
            metadata: { source: 'google-sheets' },
          });
          logger.info({ carreraId: carrera.carreraId, changes: hasChanges }, 'Carrera actualizada desde Sheet');
        }
      }
    }
  }

  detectChanges(old, newData) {
    const changes = [];
    for (const field of Object.keys(newData)) {
      if (old[field] !== newData[field]) {
        changes.push({ field, from: old[field], to: newData[field] });
      }
    }
    return changes;
  }
}

module.exports = new SyncService();
```

**Lambda para Sync Periódico:**
```javascript
// backend/src/lambdas/syncFromSheets.js
exports.handler = async (event) => {
  // Trigger: EventBridge cada 5 minutos

  try {
    await syncService.syncFromSheet();
    return { statusCode: 200, body: 'Sync completado' };
  } catch (err) {
    logger.error({ err }, 'Error en sync desde Google Sheets');
    throw err;
  }
};
```

**Checklist:**
- [ ] SyncService con doble escritura
- [ ] Cola de sincronización async
- [ ] Lambda trigger cada 5min para sync inverso
- [ ] Detección de cambios desde Sheet
- [ ] Auditoría de cambios desde Sheet
- [ ] Retry en fallos
- [ ] Test: Escribir carrera → verificar en ambos lados
- [ ] Test: Editar en Sheet → sincroniza a DynamoDB

#### F4.4 - Banner de Confianza en Frontend

```typescript
// frontend/src/components/SyncStatus.tsx
export const SyncStatus: React.FC = () => {
  const [syncInfo, setSyncInfo] = useState<{ lastSync: string; status: 'ok' | 'syncing' | 'error' }>({
    lastSync: '',
    status: 'ok',
  });

  useEffect(() => {
    // Verificar estado de sincronización
    const checkSync = async () => {
      try {
        const response = await apiClient.get('/api/sync/status');
        setSyncInfo(response.data);
      } catch (error) {
        setSyncInfo({ ...syncInfo, status: 'error' });
      }
    };

    checkSync();
    const interval = setInterval(checkSync, 30000); // Cada 30s

    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    ok: { icon: '✓', text: 'Sincronizado', color: 'bg-green-100 text-green-700' },
    syncing: { icon: '🔄', text: 'Sincronizando...', color: 'bg-blue-100 text-blue-700' },
    error: { icon: '⚠️', text: 'Error de sincronización', color: 'bg-red-100 text-red-700' },
  };

  const config = statusConfig[syncInfo.status];

  return (
    <div className={`${config.color} px-4 py-2 rounded-lg flex items-center gap-2 text-sm`}>
      <span>{config.icon}</span>
      <span className="font-medium">{config.text}</span>
      {syncInfo.lastSync && (
        <span className="text-xs opacity-75">
          · Última sync: {formatDistanceToNow(new Date(syncInfo.lastSync), { addSuffix: true })}
        </span>
      )}
    </div>
  );
};

// Agregar en todas las páginas críticas
<div className="flex items-center justify-between mb-4">
  <h1>Dashboard</h1>
  <SyncStatus />
</div>
```

**Checklist:**
- [ ] Componente SyncStatus
- [ ] Endpoint `/api/sync/status`
- [ ] Mostrar en dashboard y páginas de registro
- [ ] Indicador visual claro
- [ ] Test: Usuario ve "Sincronizado" después de guardar

**Resultado Fase 4:**
- ✅ Admins pueden editar carreras/turnos
- ✅ Historial de cambios completo
- ✅ Doble escritura DynamoDB + Sheets
- ✅ Sincronización bidireccional cada 5min
- ✅ Usuarios ven estado de sincronización
- ✅ Confianza en la app aumenta

---

## 📈 FASE 5: PAGINACIÓN + OPTIMIZACIONES FINALES (Semanas 10-12)
**Objetivo:** Preparar para escala + Pulir UX  
**Prioridad:** MEDIA

### Sprint 5.1 - Paginación Backend + Frontend (Semana 10)

[... Continúa con implementación de paginación, lazy loading, optimizaciones de cache, etc...]

---

## 📊 ESTIMACIÓN DE COSTOS AWS

### Usuarios Actuales (110)
- DynamoDB: $5/mes (on-demand)
- Lambda: $10/mes (~1M invocations)
- S3: $5/mes (fotos)
- CloudWatch Logs: $3/mes
- **Total: ~$23/mes**

### Con 250 Usuarios (6 meses)
- DynamoDB: $15/mes
- Lambda: $25/mes
- S3: $12/mes
- CloudWatch: $8/mes
- **Total: ~$60/mes**

---

**¿Te parece bien este plan? ¿Quieres que profundice en alguna fase específica o ajuste prioridades?**
