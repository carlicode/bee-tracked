# Plan Sprint 8 — Nuevos Features

> **Rama de trabajo:** `feature/sprint-8` (creada desde `main` estable)  
> **Principio:** cero cambios al comportamiento existente — todo es aditivo o ajuste puntual.

---

## Resumen de features

| # | Feature | Área | Riesgo |
|---|---------|------|--------|
| 1 | Gestión de usuarios desde admin | Backend + Frontend | Bajo |
| 2 | Anuncios aparecen siempre al abrir el dashboard | Backend | Mínimo |
| 3 | Comprobante opcional en permisos + mensaje confirmación | Frontend + Backend | Bajo |
| 4 | Email al equipo cuando alguien solicita permiso | Backend | Bajo |
| 5 | Session extendida para admins (4 horas) | Backend | Bajo |
| 6 | Nueva pestaña "Rendimiento" para admins | Backend + Frontend | Medio |
| 7 | Biker cierra turno — N/A | — | — |
| 8 | Select de placa por gasto al cerrar turno (drivers) | Frontend + Backend | Bajo |
| 9 | Auditoría de tablas/columnas vs Google Sheets | Análisis | — |

---

## Preparación: crear branch

```bash
git checkout main
git pull origin main
git checkout -b feature/sprint-8
```

---

## Feature 1 — Gestión de usuarios desde admin

### Contexto
Los usuarios viven en `backend/data/usuarios-bee-tracked.csv` (columnas: `Nombre,Usuario,Contraseña,Rol`).  
Los roles permitidos son: `Ecodelivery`, `Bee Zero`, `Operador`, `Admin`.

### Backend

**Archivo:** `backend/src/routes/adminUsers.js` *(nuevo)*

```
GET  /api/admin/users         → Lista todos los usuarios (sin contraseña en respuesta)
POST /api/admin/users         → Agrega un usuario al CSV
DELETE /api/admin/users/:user → Elimina un usuario del CSV (opcional, se puede hacer después)
```

Lógica de `POST /api/admin/users`:
1. Validar: `nombre`, `usuario`, `password`, `rol` presentes.
2. Verificar que `usuario` no exista ya en el CSV.
3. Agregar nueva fila al final del CSV.
4. Retornar el usuario creado (sin contraseña).

**Archivo:** `backend/src/server.js` — registrar la nueva ruta bajo `/api/admin` con `requireAdmin`.

### Frontend

**Archivo nuevo:** `frontend/src/pages/admin/GestionUsuarios.tsx`

- Dos secciones:
  1. **Lista de usuarios** — tabla con Nombre, Usuario, Rol (sin mostrar contraseña).
  2. **Agregar usuario** — formulario: Nombre, Usuario, Contraseña, Rol (select con 4 opciones).
- Mensaje de éxito al agregar.
- Llamada a nueva función en `adminApi.ts`: `getUsers()` y `createUser(data)`.

**Cambios menores:**
- `frontend/src/App.tsx` — agregar ruta `/admin/usuarios`.
- `frontend/src/pages/admin/DashboardAdmin.tsx` — agregar card "Usuarios".

---

## Feature 2 — Anuncios aparecen siempre al abrir el dashboard

### Contexto
Comportamiento actual: al hacer "OK" en un anuncio, se escribe a `lecturasTable` y ese anuncio **nunca más aparece** para ese usuario.  
Comportamiento deseado: aparecer **cada vez que el usuario abre el dashboard** durante los días programados (incluso múltiples veces el mismo día).

### Cambio backend

**Archivo:** `backend/src/routes/announcements.js` — endpoint `GET /api/announcements/pending`

- Actualmente: filtra anuncios que el usuario ya leyó (`hasUserRead`).
- Cambio: **eliminar ese filtro**. Retornar todos los anuncios activos para hoy sin verificar lecturas previas.
- El endpoint `POST /api/announcements/:id/read` se mantiene igual — sigue escribiendo a `lecturasTable` para las **estadísticas de lectura** del panel de admin.

```js
// ANTES (remover estas líneas):
const readResult = await hasUserRead(item.announcementId, userId);
if (readResult) continue; // skip already read

// DESPUÉS: no filtrar por lectura, solo por fecha activa y audiencia
```

> El cambio es de 3-4 líneas en el backend. No toca el frontend.

---

## Feature 3 — Comprobante opcional en permisos + mensaje de confirmación

### Frontend

**Archivo:** `frontend/src/pages/permisos/SolicitarPermiso.tsx`

1. Agregar campo de foto (igual al upload de gastos en `beezero/CerrarTurno.tsx`):
   - `<input type="file" accept="image/*" capture="environment">` para abrir cámara.
   - También permitir subir desde galería.
   - Usa el mismo `uploadApi` que ya existe.
   - Es **opcional** — mostrar texto de ayuda:  
     _"💡 Adjuntar un comprobante aumenta las probabilidades de que el permiso sea aprobado."_

2. Después de enviar exitosamente, mostrar un **modal o toast** (no solo un toast pequeño — esto requiere atención del usuario):  
   _"Se envió la solicitud. Será respondida lo antes posible por el equipo. Puede tardar hasta 8 horas."_  
   Con un botón "Entendido" para cerrar.

### Backend

**Archivo:** `backend/src/services/permisosService.js`

- `createPermiso(...)` acepta nuevo parámetro `comprobante` (URL del archivo subido, opcional).
- Agrega `comprobante` al item de DynamoDB.
- `mirrorToSheets`: agregar columna 13 con la URL del comprobante.
- `mapPermiso`: incluir `comprobante` en el objeto retornado.

**Archivo:** `backend/src/routes/permisos.js`
- Extraer `comprobante` del body y pasarlo a `createPermiso`.

---

## Feature 4 — Email al equipo cuando alguien solicita permiso

### Contexto técnico importante
Los **service accounts de Google** (como `beezero-1710ecf4e5e0.json`) **no pueden enviar email vía Gmail API** directamente a menos que el dominio tenga **delegación de dominio en Google Workspace**. Si no tienen Workspace (cuentas `@gmail.com` normales), esta opción no funciona.

**Solución recomendada:** Nodemailer + Gmail SMTP con App Password — es gratis, ~500 emails/día, y 5 minutos de setup.

### Setup previo (configuración de cuenta de envío)
1. Ir a la cuenta Gmail que enviará los correos → Seguridad → Verificación en dos pasos (activar) → Contraseñas de aplicaciones → Generar password de 16 caracteres.
2. Agregar a variables de entorno del backend (Railway/Lambda):
   ```
   GMAIL_USER=tucuenta@gmail.com
   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
   PERMISO_NOTIFY_EMAILS=email1@ejemplo.com,email2@ejemplo.com,email3@ejemplo.com
   ```

### Backend

**Archivo nuevo:** `backend/src/services/emailService.js`

```js
// Usa nodemailer con transporte SMTP Gmail
// Función: sendPermisoNotification({ userName, fecha, motivo })
// Envía a los emails en PERMISO_NOTIFY_EMAILS
// Asunto: "Nueva solicitud de permiso — [Nombre]"
// Cuerpo:
//   "[Nombre] solicitó permiso para el [fecha] con motivo: [motivo].
//    Entra a la plataforma para aprobar o rechazar el permiso."
```

**Archivo:** `backend/src/services/permisosService.js`
- Al final de `createPermiso`, llamar `emailService.sendPermisoNotification(...)`.
- Envolver en try/catch — si el email falla, el permiso igual se crea (no es crítico).

**Instalar dependencia:**
```bash
cd backend && npm install nodemailer
```

---

## Feature 5 — Session extendida para admins (4 horas)

### Contexto
`INACTIVITY_TIMEOUT = 10 * 60 * 1000` (10 min) en `sessionManager.js` aplica a todos.  
El `sessionData` ya almacena `userType` al hacer login.

### Cambios

**Archivo:** `backend/src/services/sessionStore/MemorySessionStore.js`
- En `isValid(userId, sessionId)`, leer el `userType` del registro de sesión.
- Usar `4 * 60 * 60 * 1000` (4 horas) si `userType === 'admin'`, si no `10 * 60 * 1000`.

**Archivo:** `backend/src/services/sessionStore/DynamoDBSessionStore.js`
- En `set(userId, sessionData)`, calcular TTL basado en `sessionData.userType`:
  ```js
  const timeoutMs = sessionData.userType === 'admin'
    ? 4 * 60 * 60 * 1000   // 4 horas
    : 10 * 60 * 1000;       // 10 minutos
  const ttl = Math.floor(now / 1000) + timeoutMs / 1000;
  ```
- En `touch(userId)`, leer el `userType` del registro existente antes de calcular el nuevo TTL.

**Archivo:** `backend/src/services/sessionManager.js`
- Exportar constante `ADMIN_INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000` para documentación.

> Sin cambios en frontend — el cliente no maneja timeouts, solo responde al 401.

---

## Feature 6 — Nueva pestaña "Rendimiento" para admins

### Contexto
Las carreras en DynamoDB tienen campo `precio` (string, puede ser `''` o vacío si no se registró).  
No hay campo `placa` en las carreras actualmente — rendimiento por auto requeriría un join con turnos.

**Alcance de esta entrega:**
- **Rendimiento por driver** — disponible con datos existentes.
- **Rendimiento por auto** — señalizado como "próximamente" en la UI (requiere join turnos+carreras, se planifica en sprint siguiente).

### Backend

**Archivo:** `backend/src/routes/adminUsers.js` — agregar endpoint (o en `admin.js` existente):

```
GET /api/admin/rendimiento?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&tipo=beezero|ecodelivery|all
```

Lógica:
1. Escanear carreras en DynamoDB (`carrerasService`) para el rango de fechas.
2. Agrupar por `nombre` (driver):
   - `totalCarreras`: count total
   - `conPrecio`: count donde `precio` tiene valor > 0
   - `sinPrecio`: total - conPrecio
   - `porcentajeConPrecio`: (conPrecio / total) * 100
   - `totalGanancia`: suma de `parseFloat(precio)` donde precio válido
3. Retornar: array de drivers + objeto `totales` con sumas globales.

### Frontend

**Archivo nuevo:** `frontend/src/pages/admin/Rendimiento.tsx`

Layout:
```
┌─────────────────────────────────────────┐
│  Rendimiento  [Filtros: Desde / Hasta]  │
│              [Tipo: BeeZero / Eco / All]│
├─────────────────────────────────────────┤
│ RESUMEN TOTALES                         │
│  Total Bs: XXXX   Con precio: XX%       │
│  Carreras: XXXX   Sin precio: XXX       │
├─────────────────────────────────────────┤
│ Driver | Total | Con $ | Sin $ | % | Bs │
│ ------   -----   -----   -----   -   -- │
│ ...                                     │
└─────────────────────────────────────────┘
```

**Cambios menores:**
- `frontend/src/App.tsx` — agregar ruta `/admin/rendimiento`.
- `frontend/src/services/adminApi.ts` — agregar `getRendimiento(params)`.
- `frontend/src/pages/admin/DashboardAdmin.tsx` — agregar card "Rendimiento".

---

## Feature 7 — Biker cierra turno

**N/A** — confirmado que no aplica para esta entrega.

---

## Feature 8 — Select de placa por gasto al cerrar turno (drivers BeeZero)

### Contexto
Cuando un driver BeeZero cierra turno, puede agregar gastos. Actualmente el gasto tiene: tipo, monto, descripción, foto.  
Se quiere agregar una **placa de auto** por gasto, con default en la placa del turno actual y posibilidad de elegir otra de la flota.

### Tipos

**Archivo:** `frontend/src/types/turno.ts`  
- Agregar `placa?: string` al tipo `GastoCierreInput`.

### Frontend

**Archivo:** `frontend/src/pages/beezero/CerrarTurno.tsx`

En cada fila de gasto, después del select de `tipo`, agregar:
```tsx
<select
  value={gasto.placa ?? formData.auto ?? ''}
  onChange={(e) => updateGasto(gasto.id, { placa: e.target.value })}
>
  <option value="">Sin placa específica</option>
  {PLACAS_AUTO_ABEJITA.map((p) => (
    <option key={p} value={p}>{p}</option>
  ))}
</select>
```

En la inicialización de cada gasto nuevo (botón "Agregar gasto"), precargar `placa: formData.auto`.

En el payload enviado al backend, incluir `placa` en cada gasto.

### Backend

**Archivo:** `backend/src/services/turnosService.js`  
- Aceptar `placa` dentro de cada item de `gastos` y guardarlo en DynamoDB.
- Si ya hay columna en el sheet para gastos, agregar `placa`; si no, agregar como campo adicional.

---

## Feature 9 — Auditoría de tablas/columnas vs Google Sheets

### Cómo ejecutar

Necesito el **ID del spreadsheet principal** (`GOOGLE_SHEET_ID`) para comparar el código contra las pestañas reales.

Una vez tengas el ID, corremos:
```bash
node -e "
const { getSheetsInSpreadsheet } = require('./backend/src/services/googleSheets');
getSheetsInSpreadsheet(process.env.GOOGLE_SHEET_ID).then(sheets => {
  console.log(JSON.stringify(sheets.map(s => s.title), null, 2));
});
" 
```

### Pestañas que el código espera encontrar

| Pestaña esperada | Usado en | Propósito |
|-----------------|----------|-----------|
| `Permisos` | `permisosService.js` | Espejo de permisos (DynamoDB → Sheets) |
| `BeeZero` (turnos) | `turnosService.js` | Turnos de drivers BeeZero |
| `Biker` | `turnosService.js` | Turnos de bikers EcoDelivery |
| `Registros` / `registrosSheet.js` | `registrosSheet.js` | Kilometraje y registros |
| `Kilometraje` | `registrosSheet.js` | Registro de kilometraje |
| Pestaña por usuario | `carrerasService.js` | Una pestaña por abejita en `CARRERAS_DRIVERS_SHEET_ID` |
| Pestaña por biker | `carrerasService.js` | Una pestaña por biker en `CARRERAS_BIKERS_SHEET_ID` |

### Columnas esperadas en `Permisos`
`permisoId, userId, userName, userType, fecha, motivo, nota, estado, creadoEn, respondidoPor, respondidoEn, razonRechazo`  
_(con Feature 3: agregar columna `comprobante`)_

### Resultado esperado
Listado de:
- Pestañas que el código espera pero **no existen** en el sheet.
- Pestañas que existen en el sheet pero el código **no usa** (posible limpieza).
- Columnas faltantes o en orden diferente al esperado.

> Compartir el ID del spreadsheet para completar este análisis en el mismo sprint.

---

## Orden de implementación sugerido

```
Sprint 8 — implementación en 4 bloques:

Bloque A (sin riesgo, cambios mínimos):
  ✅ Feature 5 — Sessions admin (4h timeout)
  ✅ Feature 2 — Anuncios sin filtro de lectura

Bloque B (backend + frontend moderado):
  ✅ Feature 3 — Comprobante en permisos + mensaje
  ✅ Feature 4 — Email al solicitar permiso
  ✅ Feature 8 — Placa en gastos al cerrar turno

Bloque C (páginas nuevas):
  ✅ Feature 1 — Gestión de usuarios admin
  ✅ Feature 6 — Rendimiento tab

Bloque D (análisis):
  ✅ Feature 9 — Auditoría Google Sheets (requiere compartir sheet ID)
```

---

## Variables de entorno nuevas necesarias

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `GMAIL_USER` | Cuenta Gmail que envía los correos | `notificaciones@gmail.com` |
| `GMAIL_APP_PASSWORD` | App Password generado en Google | `xxxx xxxx xxxx xxxx` |
| `PERMISO_NOTIFY_EMAILS` | Emails separados por coma (hasta 3) | `a@x.com,b@x.com,c@x.com` |

Estas se agregan en Railway (producción) y en `.env` local para desarrollo.

---

## Notas finales

- **No se modifica `main` directamente** — todo va al branch `feature/sprint-8` y se hace PR cuando esté probado.
- **Los CSV existentes no se alteran** — el Feature 1 solo agrega, nunca reordena ni borra registros existentes (a menos que implementemos delete explícitamente).
- **Los anuncios existentes en DynamoDB** siguen funcionando — el cambio del Feature 2 es solo en la lógica de filtrado del endpoint, sin migración de datos.
- **Feature 4 (email):** Si el envío falla (sin credenciales configuradas), el permiso igual se crea correctamente — el email es no-crítico.
