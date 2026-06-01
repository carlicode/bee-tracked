# Requirements - Sistema Bee Tracked
**Fecha:** 2026-06-01  
**Versión:** 2.0

---

## 1. CONTEXTO DEL NEGOCIO

### Usuarios Actuales
- **50 drivers** (Bee Zero)
- **60 bikers** (Ecodelivery)
- **4 admins:** Carli, Miguel, Andi, Ale
- **Total:** 114 usuarios activos

### Proyección de Crecimiento
- **+10-20 usuarios/mes** durante 6 meses
- **Meta 6 meses:** 170-230 usuarios totales
- **Crecimiento gradual y sostenido**

### Patrones de Uso
- **Mayor concurrencia:** Registro de entrada/salida (turnos)
- **Carreras:** Se registran **1 vez por semana** (batch manual)
- **Dispositivos:** Principalmente celular, admins usan celu + computadora
- **Horarios pico:** 6-9am (inicio turnos), 6-9pm (cierre turnos)

---

## 2. PROBLEMAS CRÍTICOS ACTUALES

### 🔴 P1: App Lenta (Incluso Login)
**Síntoma:** Login tarda 5-10 segundos, navegación lenta  
**Impacto:** Frustración, drivers no quieren usar la app  
**Causa probable:** 
- Sin cache
- Multiple llamadas a Google Sheets en cada operación
- Sesiones mal gestionadas

### 🔴 P2: Bug de Estado de Turno
**Síntoma:** Turno no cambia a "cerrado" en Google Sheet → driver no puede cerrar ni iniciar nuevo turno  
**Impacto:** CRÍTICO - bloquea operación diaria  
**Causa probable:**
- Sesión expirada sin mensaje claro al usuario
- Write a Google Sheets falla silenciosamente
- Race condition entre múltiples escrituras
- Usuario no ve feedback claro de que falló

### 🔴 P3: Falta de Confianza en la App
**Síntoma:** Admins y drivers prefieren Google Sheets  
**Causas:**
- No saben si los datos se guardaron
- App lenta → asumen que está rota
- Bugs sin resolver → pierden confianza
- No pueden corregir errores fácilmente en la app

### 🔴 P4: Admins Sin Información en Tiempo Real
**Síntoma:** No saben quién está trabajando sin revisar manualmente el Sheet  
**Impacto:** Gestión ineficiente, no detectan ausencias a tiempo

---

## 3. NUEVAS FUNCIONALIDADES REQUERIDAS

### 3.1 Sistema de Anuncios de Andi (RRHH)

#### Casos de Uso
**Ejemplo 1 - Anuncio General:**
> "Mañana todos con la polera amarilla"
> - **Para:** Todos (drivers + bikers)
> - **Fecha:** 2026-06-02
> - **Tipo:** Recordatorio

**Ejemplo 2 - Anuncio Específico:**
> "Patricia, Ruben y Ana: no olviden registrar sus datos"
> - **Para:** Patricia, Ruben, Ana (nombres específicos)
> - **Fecha:** 2026-06-01 al 2026-06-03
> - **Tipo:** Recordatorio

#### Requisitos Funcionales

**RF-AN-01: Crear Anuncio**
- Andi puede crear anuncios desde la app (panel admin)
- Campos requeridos:
  - Título (max 100 caracteres)
  - Mensaje (max 500 caracteres)
  - Fecha inicio (YYYY-MM-DD)
  - Fecha fin (YYYY-MM-DD) - opcional
  - Destinatarios: 
    - [ ] Todos
    - [ ] Solo Drivers
    - [ ] Solo Bikers
    - [ ] Lista específica (input de nombres separados por coma)
  - Prioridad: Normal | Importante | Urgente

**RF-AN-02: Programación por Fecha**
- Anuncios se muestran solo cuando el usuario hace login en el rango de fechas
- No se muestran antes ni después del rango
- Un anuncio se muestra **1 sola vez por usuario**

**RF-AN-03: Visualización en Login**
- Al hacer login, si hay anuncios programados para hoy → mostrar popup modal
- Si hay múltiples anuncios → mostrar uno por uno (botón "Siguiente")
- Usuario debe dar "OK" / "Entendido" para cerrar
- Anuncios urgentes tienen icono rojo y aparecen primero

**RF-AN-04: Confirmación de Lectura**
- Sistema registra quién leyó cada anuncio (user + timestamp)
- Andi puede ver estadísticas:
  - Total destinatarios: 50
  - Leyeron: 43 (86%)
  - Pendientes: 7 (14%)
  - Lista de quiénes NO leyeron (para follow-up)

**RF-AN-05: Gestión de Anuncios**
- Andi puede ver lista de anuncios activos/pasados/futuros
- Puede editar anuncios futuros (no iniciados)
- Puede eliminar anuncios (solo futuros)
- Puede duplicar anuncios para reusar mensajes

#### Requisitos No Funcionales
- **Latencia:** Popup debe aparecer <1s después de login
- **Persistencia:** Anuncios en DynamoDB + backup en Google Sheet
- **Offline:** Si usuario hace login offline, ver anuncios al reconectar

---

### 3.2 Dashboard Admin en Tiempo Real

#### RF-DA-01: Vista de Turnos Activos
**Pantalla principal del dashboard:**

```
┌─────────────────────────────────────────────┐
│  🟢 Trabajando Ahora: 12 drivers, 8 bikers │
├─────────────────────────────────────────────┤
│  Driver          Turno Desde   Auto    Km   │
│  ─────────────────────────────────────────  │
│  🟢 Carla        07:15am       XYZ123  142km│
│  🟢 Omar         06:30am       ABC456  89km │
│  🟢 Patricia     08:00am       DEF789  12km │
│  ...                                         │
├─────────────────────────────────────────────┤
│  🔴 NO iniciaron turno hoy: 3               │
│     • Ruben (sin permiso)                   │
│     • Ana (sin permiso)                     │
│     • Miguel (PERMISO aprobado ✓)           │
└─────────────────────────────────────────────┘
```

**Datos mostrados:**
- Nombre del driver/biker
- Estado: 🟢 Trabajando | 🔴 No inició | 🟡 Permiso
- Hora de inicio del turno
- Auto/placa asignado
- Km inicial (para tracking)
- Tiempo transcurrido (auto-actualizado)

**Actualización:**
- Polling cada 10 segundos (inicialmente)
- Migrar a WebSockets en Fase 2 para tiempo real
- Sonido + popup cuando evento importante:
  - ✅ "Carla inició turno"
  - ✅ "Omar cerró turno"
  - ⚠️ "Ruben no ha iniciado turno (ya son las 9am)"

#### RF-DA-02: Alertas Automáticas
- **Turno muy largo:** >12 horas sin cerrar → alerta amarilla
- **No inició turno:** Después de las 9am sin turno → alerta roja
- **Sin permiso:** No inició y no tiene permiso aprobado → notificar
- **Turno sin cerrar ayer:** Turno del día anterior abierto → alerta crítica

#### RF-DA-03: Filtros y Búsqueda
- Filtrar por:
  - Estado (todos / trabajando / ausentes / con permiso)
  - Grupo (drivers / bikers / todos)
  - Buscar por nombre

#### RF-DA-04: Acciones Rápidas desde Dashboard
- Click en driver → ver detalle completo:
  - Historial de turnos (últimos 7 días)
  - Carreras registradas esta semana
  - Permisos activos
  - Botón "Contactar" (WhatsApp si está configurado)

---

### 3.3 Sistema de Permisos y Ausencias

#### RF-PA-01: Solicitar Permiso (Driver/Biker)
**Pantalla en la app (drivers):**
```
┌────────────────────────────────┐
│  Solicitar Permiso de Ausencia │
├────────────────────────────────┤
│  Fecha:  [2026-06-05]          │
│  Motivo: [Personal / Salud /   │
│           Vacaciones / Otro]   │
│  Nota:   [texto opcional]      │
│                                 │
│  [Cancelar]  [Enviar Solicitud]│
└────────────────────────────────┘
```

**Flujo:**
1. Driver selecciona fecha futura
2. Elige motivo y agrega nota opcional
3. Click "Enviar" → solicitud va a dashboard admin
4. Driver ve estado: ⏳ Pendiente | ✅ Aprobado | ❌ Rechazado

#### RF-PA-02: Gestionar Permisos (Admin)
**Panel admin muestra:**
```
┌─────────────────────────────────────────┐
│  📋 Solicitudes de Permiso Pendientes   │
├─────────────────────────────────────────┤
│  Patricia - 2026-06-05 - Salud          │
│  "Cita médica"                          │
│  [✓ Aprobar] [✗ Rechazar]              │
├─────────────────────────────────────────┤
│  Ruben - 2026-06-08 al 10 - Vacaciones │
│  "Viaje familiar"                       │
│  [✓ Aprobar] [✗ Rechazar]              │
└─────────────────────────────────────────┘
```

**Acciones admin:**
- Aprobar → driver recibe notificación + permiso guardado
- Rechazar → driver recibe notificación con razón opcional
- Ver historial de permisos por usuario

#### RF-PA-03: Integración con Dashboard
- Drivers con permiso aprobado NO aparecen como "ausentes"
- Se muestran con tag 🟡 "PERMISO" en lugar de 🔴 "AUSENTE"
- Filtro "Ver permisos activos hoy"

---

### 3.4 Corrección de Datos por Admins

#### RF-CD-01: Editar Carrera
**Admins pueden:**
- Ver lista de carreras de cualquier driver
- Click en carrera → formulario de edición
- Modificar cualquier campo (cliente, fecha, precio, etc.)
- Guardar cambios → se actualiza en DB + Google Sheet
- Log de auditoría: "Carli editó carrera #1234 el 2026-06-01 14:30"

#### RF-CD-02: Editar Turno
**Admins pueden:**
- Corregir km inicial/final
- Corregir hora inicio/cierre
- Agregar observaciones
- Forzar cerrar turno (si quedó abierto por error)

#### RF-CD-03: Auditoría
- Cada edición se registra:
  - Quién editó (admin name)
  - Qué cambió (campo: valor anterior → valor nuevo)
  - Cuándo (timestamp)
- Visible en "Historial de cambios" de cada registro

---

## 4. REQUISITOS DE EXPERIENCIA DE USUARIO

### UX-01: Claridad Extrema
**Problema:** Alta fricción con apps nuevas  
**Solución:**
- Textos claros y simples (ej: "Guardar Carrera" no "Submit")
- Iconos universales (✓ ✗ 🏠 📊)
- Confirmaciones visuales grandes:
  - ✅ "Carrera guardada" (verde, 3 segundos)
  - ❌ "Error al guardar. Intenta de nuevo" (rojo, con botón "Reintentar")
- Tutorial interactivo en primer uso (con sistema de Andi)

### UX-02: Feedback Inmediato
**Para cada acción crítica:**
- Loading spinners claros ("Guardando...")
- Confirmación visual cuando completa
- Error con mensaje claro + acción sugerida:
  - ❌ "Sin conexión. Los datos se guardarán cuando vuelvas a tener internet"
  - ❌ "Sesión expirada. Inicia sesión de nuevo" [Botón: Ir a Login]

### UX-03: Estados Visuales Claros
**Turnos:**
- 🟢 Turno Activo (verde)
- 🔴 Turno Cerrado (gris)
- 🟡 Turno con Alerta (amarillo)

**Sincronización:**
- 🔄 "Sincronizando..." (mientras guarda)
- ✓ "Sincronizado" (cuando confirma)
- ⚠️ "Pendiente de sincronizar" (si está offline)

### UX-04: Diseño Mobile-First
- Botones grandes (mínimo 44x44px para touch)
- Formularios con campos grandes
- Sin scroll horizontal
- Optimizado para una mano (botones importantes abajo)

---

## 5. REQUISITOS TÉCNICOS

### 5.1 Performance

**PERF-01: Login Rápido**
- **Actual:** 5-10 segundos
- **Meta:** <2 segundos (p95)
- **Cómo:** Cache de credenciales, optimizar Cognito, pre-cargar datos esenciales

**PERF-02: Navegación Instantánea**
- **Meta:** Cambio de página <500ms
- **Cómo:** Code splitting, lazy loading, prefetch de rutas comunes

**PERF-03: Guardar Carrera/Turno**
- **Meta:** <3 segundos (incluye subir foto)
- **Cómo:** Compresión de imágenes, escritura paralela, feedback inmediato

**PERF-04: Dashboard Admin**
- **Meta:** Carga inicial <2s, actualización <500ms
- **Cómo:** Cache agresivo, polling optimizado, paginación

### 5.2 Confiabilidad

**REL-01: Sin Pérdida de Datos**
- Escritura dual (DynamoDB + Google Sheets) con retry
- Queue de escrituras fallidas (reintentar hasta 3 veces)
- Modo offline: guardar en localStorage, sincronizar al reconectar

**REL-02: Idempotencia**
- Cada operación tiene ID único
- Mismo request duplicado no crea datos duplicados
- Retry seguro en caso de timeout

**REL-03: Detección de Conflictos**
- Si admin edita carrera mientras driver también la edita → alerta
- Last-write-wins con timestamp para resolver
- Log de conflictos para análisis

### 5.3 Escalabilidad

**SCAL-01: Soportar 250 Usuarios**
- Arquitectura debe soportar sin cambios mayores
- Cache agresivo en DynamoDB
- CloudFront para frontend
- Lambda con reserved concurrency

**SCAL-02: Picos de Concurrencia**
- 100 usuarios iniciando turno simultáneamente (6-7am)
- Sin rate limiting de Google Sheets → cache + batch writes
- Lambda escalamiento automático

**SCAL-03: Crecimiento de Datos**
- Paginación en todas las listas (50 items/página)
- Archivado de datos antiguos (>6 meses) en S3
- Índices optimizados en DynamoDB

---

## 6. ESTRATEGIA DE MIGRACIÓN: ENFOQUE HÍBRIDO

### Fase 1: Doble Escritura (Mes 1-2)
**Arquitectura:**
```
Usuario → App → DynamoDB (primaria)
                    ↓
              Google Sheets (sync)
```

**Flujo:**
1. App escribe primero a DynamoDB (rápido)
2. Luego sincroniza a Google Sheets (background)
3. Lecturas SOLO desde DynamoDB (con cache)
4. Admins pueden editar en Sheet → sincroniza a DynamoDB cada 5min

**Beneficios:**
- App es rápida (DynamoDB)
- Admins mantienen acceso a Sheet (confianza)
- Ambos están sincronizados (transparencia)

### Fase 2: Sheet como Backup (Mes 3-4)
**Arquitectura:**
```
Usuario → App → DynamoDB (única fuente de verdad)
                    ↓
              Export cada hora a Google Sheets (solo lectura)
```

**Flujo:**
1. Escrituras SOLO a DynamoDB
2. Google Sheet se actualiza cada hora automáticamente
3. Sheet marcado como "SOLO LECTURA - Ver app para editar"
4. Admins editan desde app (nuevo UI fácil)

**Beneficios:**
- DynamoDB es fuente de verdad
- Sheet disponible para análisis/reportes
- Admins aprenden a usar app (con UI mejorado)

### Fase 3: Sheet Opcional (Mes 5+)
- Evaluar si todavía necesitan el Sheet
- Si sí → mantener export automático
- Si no → migrar completamente a DynamoDB

---

## 7. PRIORIZACIÓN (Próximos 3 meses)

### Orden de Prioridad
1. **D** - Reducir errores/pérdida de datos ⭐⭐⭐⭐⭐
2. **A** - Reducir tiempo gestión admins ⭐⭐⭐⭐
3. **B** - Aumentar confianza drivers ⭐⭐⭐⭐
4. **E** - Comunicación RRHH → Drivers (Andi) ⭐⭐⭐
5. **C** - Escalar (10-20 usuarios/mes) ⭐⭐

### Principios Guía
✅ **Trazabilidad primero:** Cada acción debe ser auditable  
✅ **Código modular:** Fácil de mantener y extender  
✅ **Confianza sobre velocidad:** Mejor lento y confiable que rápido y con bugs  
✅ **UX clara:** Si el usuario no entiende, no sirve  
✅ **Migración gradual:** Híbrido primero, migración completa después  

---

## 8. MÉTRICAS DE ÉXITO

### Sprint 1 (Semanas 1-2)
- ✅ Login <2s (p95)
- ✅ Bug turno cerrado resuelto (0 incidentes/semana)
- ✅ Feedback visual en todas las acciones
- ✅ 100% escrituras exitosas (retry automático)

### Sprint 2 (Semanas 3-4)
- ✅ Dashboard tiempo real funcionando (polling 10s)
- ✅ Admins pueden ver turnos activos sin abrir Sheet
- ✅ Sistema de permisos funcional
- ✅ 80% de admins usan app en lugar de Sheet para ver turnos

### Sprint 3 (Semanas 5-6)
- ✅ Sistema de anuncios Andi completo
- ✅ 90% de drivers leen anuncios en <24h
- ✅ Admins pueden editar carreras desde app
- ✅ Doble escritura DynamoDB + Sheets sin errores

### Sprint 4+ (Semanas 7-12)
- ✅ 95% de confianza de usuarios en la app
- ✅ Admins reducen tiempo de gestión en 50%
- ✅ Soporta 200+ usuarios sin degradación
- ✅ Sheet pasa a "solo lectura" exitosamente

---

**Documento preparado para:** Equipo de desarrollo  
**Próximo paso:** Ver `ROADMAP_FASES.md` para plan de implementación detallado
