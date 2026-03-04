# 🚗🚴 Bee Tracked - Plataforma Multi-Usuario para Drivers

Aplicación web móvil (PWA) que soporta dos tipos de usuarios con interfaces diferenciadas:
- **BeeZero**: Conductores de auto (interfaz completa - tema amarillo) 🚗
- **EcoDelivery**: Bikers de delivery (interfaz simplificada - tema verde) 🚴

## ✨ Funcionalidades por Plataforma

### 🚗 BeeZero (Conductores de Auto)
- 🔐 **Autenticación con AWS Cognito**
- 🚗 **Registro de Carreras** - Carreras completas con cliente, precio, distancia, tiempo
- ⏰ **Gestión de Turnos** - Control de caja, fotos de auto, daños
- 📸 **Fotos** - Pantalla y exterior del vehículo (opcional)
- 📍 **Geolocalización** - GPS automático en inicio/cierre
- 💰 **Control de Caja** - Apertura, cierre, QR, diferencia
- 📊 **Historial Completo** - Turnos y carreras detalladas
- 📝 **Google Sheets** - Todos los datos se guardan automáticamente

### 🚴 EcoDelivery (Bikers de Delivery)
- 🔐 **Autenticación con AWS Cognito**
- 📦 **Registro de Deliveries** - Cliente, origen, destino, distancia, por hora, notas
- 🕐 **Hora Inicio/Fin** - Selección fácil con selectores HH:mm
- 📸 **Foto opcional** - Para deliveries y turnos
- ⚡ **Turnos Simplificados** - Inicio/cierre con ubicación automática
- 📍 **Geolocalización Automática** - GPS en todos los registros
- 📊 **Historial de Deliveries** - Vista desde Google Sheet sincronizada
- 📝 **Google Sheets** - Cada biker tiene su propia pestaña en "Carreras_bikers"
- 💾 **Almacenamiento S3** - Fotos organizadas por tipo (Turnos/Deliveries)

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ y npm
- Variables de entorno configuradas (ver sección de configuración)

### 1. Instalación

```bash
# Instalar dependencias del frontend
cd frontend
npm install

# Instalar dependencias del backend
cd ../backend
npm install
```

### 2. Configuración

#### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:3001
VITE_COGNITO_USER_POOL_ID=us-east-1_REsVOVqcY
VITE_COGNITO_CLIENT_ID=29rgiplrp6t3aq2b58ee91i54v
```

#### Backend (`backend/.env`)
```env
# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# AWS Cognito
COGNITO_USER_POOL_ID=us-east-1_REsVOVqcY
COGNITO_REGION=us-east-1

# AWS S3
AWS_S3_BUCKET=bee-tracked-photos
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key

# Google Sheets
GOOGLE_SHEET_ID=1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8
CARRERAS_BIKERS_SHEET_ID=1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs
GOOGLE_CREDENTIALS_PATH=./google-credentials.json
```

### 3. Ejecutar la Aplicación

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Abre http://localhost:3000

### 4. Crear estructura en S3 (primera vez)

```bash
cd backend
node scripts/create-s3-registros.js
```

Esto creará:
```
Registros_BeeTracked/
├── Ecodelivery/
│   ├── Turnos/
│   └── Deliveries/
└── Beezero/
```

### Compartir desde Celular

**Opción 1: ngrok (Recomendado para demo)**
```bash
# Terminal 1
cd frontend
npm run dev

# Terminal 2
ngrok http 3000
```

Copia la URL HTTPS que aparece y compártela.

**Opción 2: IP Local (Misma WiFi)**
```bash
# Obtén tu IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Inicia la app
cd frontend
npm run dev
```

Comparte: `http://TU_IP:3000` (ej: http://192.168.0.6:3000)

**Opción 3: Producción (AWS)**  
El frontend en producción se despliega con GitHub Actions (ver [docs/GITHUB_ACTIONS_AWS.md](docs/GITHUB_ACTIONS_AWS.md)). Comparte la URL de CloudFront.

## 🏗️ Stack Tecnológico

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS con sistema de temas dinámicos
- **Estado**: Context API + React Hooks personalizados
- **PWA**: Service Worker + Manifest para instalación
- **HTTP Client**: Axios con interceptores
- **Routing**: React Router v6
- **Autenticación**: Amazon Cognito Identity SDK

### Backend
- **Runtime**: Node.js + Express
- **Lenguaje**: JavaScript (CommonJS)
- **Autenticación**: AWS Cognito + JWT
- **Base de datos**: Google Sheets API
- **Almacenamiento**: AWS S3 (SDK v3)
- **Sesiones**: In-memory session manager

### Infraestructura
- **Autenticación**: AWS Cognito User Pools
- **Almacenamiento**: AWS S3 (fotos)
- **Base de datos**: Google Sheets (2 spreadsheets)
- **Hosting**: AWS S3 + CloudFront (frontend) + AWS Lambda/API Gateway (backend)
- **CI/CD**: GitHub Actions (deploy automático a AWS al push a `main`)

### Servicios Externos
- **AWS Cognito**: Autenticación y gestión de usuarios
- **AWS S3**: Almacenamiento de fotos de turnos y deliveries
- **Google Sheets API**: Base de datos en tiempo real
- **Geolocation API**: Captura de ubicación GPS

## 📦 Estructura de Datos

### Google Sheets

#### 1. Hoja "Ecodelivery" (Turnos)
**Spreadsheet ID**: `1L69tZzVSHlhuKGP9MCdcezOGPsYyjC2Mm-i03Hm5tM8`

Columnas:
- TurnoId, Usuario, Fecha Inicio, Hora Inicio, Lat Inicio, Lng Inicio
- Timestamp Inicio, Foto Inicio, Fecha Cierre, Hora Cierre
- Lat Cierre, Lng Cierre, Timestamp Cierre, Foto Cierre
- Estado, Timestamp Creación, Timestamp Actualización

#### 2. Hoja "Carreras_bikers" (Deliveries)
**Spreadsheet ID**: `1OkM4FLSe0CsLo8w4o50xcVdzsUcHVzpaYRqhGBwJRcs`

Cada biker tiene su propia pestaña con columnas:
- DeliveryId, Biker, Fecha Registro, Hora Registro
- Cliente, Lugar Origen, Hora Inicio, Lugar Destino, Hora Fin
- Distancia (km), Por Hora, Notas, Foto

### AWS S3 - Estructura de Carpetas

```
bee-tracked-photos/
└── Registros_BeeTracked/
    ├── Ecodelivery/
    │   ├── Turnos/          # Fotos de iniciar/cerrar turno
    │   │   └── {usuario}_{YYYY-MM-DD}_{HH-mm-ss}_{inicio|cierre}.{ext}
    │   └── Deliveries/      # Fotos de deliveries
    │       └── {usuario}_{YYYY-MM-DD}_{HH-mm-ss}.{ext}
    └── Beezero/             # Fotos de turnos BeeZero
```

### AWS Cognito - Grupos de Usuarios

- **beezero**: Acceso a `/beezero/*` (conductores de auto)
- **operador**: Acceso administrativo
- **ecodelivery**: Acceso a `/ecodelivery/*` (bikers de delivery)

Configurado en User Pool: `us-east-1_REsVOVqcY`

## 🎯 Estructura del Proyecto

```
bee-tracked/
├── frontend/                          # Aplicación React PWA
│   ├── public/
│   │   ├── manifest.json             # Configuración PWA
│   │   └── sw.js                     # Service Worker
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx             # Login con Cognito
│   │   │   ├── beezero/              # 🚗 Páginas BeeZero
│   │   │   │   ├── DashboardBeezero.tsx
│   │   │   │   ├── IniciarTurno.tsx
│   │   │   │   ├── CerrarTurno.tsx
│   │   │   │   ├── NuevaCarrera.tsx
│   │   │   │   ├── MisCarreras.tsx
│   │   │   │   ├── MisTurnos.tsx
│   │   │   │   └── DetalleTurno.tsx
│   │   │   └── ecodelivery/          # 🚴 Páginas EcoDelivery
│   │   │       ├── DashboardBiker.tsx
│   │   │       ├── IniciarTurnoBiker.tsx
│   │   │       ├── CerrarTurnoBiker.tsx
│   │   │       ├── NuevoDelivery.tsx
│   │   │       ├── MisDeliveries.tsx (sincronizado con Google Sheet)
│   │   │       └── MisTurnos.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── ThemeProvider.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── TimeSelect.tsx        # Selector HH:mm
│   │   │   └── CarreraCard.tsx
│   │   ├── config/
│   │   │   ├── constants.ts
│   │   │   ├── routes.ts
│   │   │   └── themes.ts
│   │   ├── hooks/
│   │   │   ├── useTheme.ts
│   │   │   ├── useGeolocation.ts
│   │   │   ├── useImageUpload.ts
│   │   │   └── useInactivityTimeout.ts
│   │   ├── services/
│   │   │   ├── api.ts
│   │   │   ├── api-mock.ts
│   │   │   ├── auth.ts
│   │   │   ├── cognito.ts           # AWS Cognito integration
│   │   │   ├── ecodeliveryApi.ts    # API específica Ecodelivery
│   │   │   ├── axiosInterceptor.ts
│   │   │   └── storage.ts
│   │   ├── types/
│   │   │   ├── index.ts
│   │   │   └── turno.ts
│   │   ├── utils/
│   │   │   ├── errors.ts
│   │   │   ├── formatters.ts        # Formateadores de fecha/hora
│   │   │   ├── geolocation.ts
│   │   │   ├── image.ts
│   │   │   └── validation.ts
│   │   └── App.tsx
│   └── package.json
├── backend/                           # API Node.js + Express
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js              # JWT validation
│   │   ├── routes/
│   │   │   ├── auth.js              # Rutas de autenticación
│   │   │   ├── turnos.js            # Rutas de turnos BeeZero
│   │   │   └── ecodelivery.js       # Rutas Ecodelivery (turnos + deliveries)
│   │   ├── services/
│   │   │   ├── googleSheets.js      # Integración Google Sheets API
│   │   │   ├── s3Upload.js          # Subida de fotos a S3 (SDK v3)
│   │   │   └── sessionManager.js    # Control de sesiones concurrentes
│   │   └── server.js
│   ├── scripts/
│   │   ├── create-s3-registros.js   # Crear estructura S3
│   │   ├── list-sheets.js           # Diagnóstico de sheets
│   │   └── add-foto-column-carreras.js
│   └── package.json
├── data/
│   ├── usuarios-y-contraseñas-ecodelivery.md  # Roles de usuarios
│   └── Biker-WhatsApp-unicos.csv              # Lista de bikers
├── docs/
│   ├── SHEET_ECODELIVERY.md         # Documentación de Google Sheets
│   ├── S3_STRUCTURE.md              # Estructura de carpetas S3
│   └── GITHUB_ACTIONS_AWS.md       # Deploy con GitHub Actions
├── scripts/
│   ├── setup-cognito-roles.sh       # Crear grupos en Cognito
│   ├── update-cognito-roles.sh      # Asignar usuarios a grupos
│   └── deploy-secrets.sh            # (opcional) Subir secretos a AWS
├── .github/workflows/
│   └── deploy-aws.yml              # CI/CD: deploy frontend a S3 + CloudFront
├── apps-script/                     # ⚠️ Deprecated (usar backend/)
└── README.md
```

## 📱 Funcionalidades Detalladas

### 🚗 BeeZero (Interfaz Completa - Amarillo)

#### 1. Iniciar Turno
- Captura automática de ubicación GPS
- Hora de inicio automática (HH:mm)
- Formulario con campos opcionales de fotos
- Guardado en Google Sheet "Ecodelivery"

#### 2. Nueva Carrera
- Cliente (con autocompletado)
- Fecha y horarios de inicio/fin (selectores HH:mm)
- Lugar de recojo y destino
- Tiempo de viaje y distancia
- Precio en Bs
- Observaciones opcionales

#### 3. Cerrar Turno
- Captura automática de ubicación GPS
- Hora de cierre automática (HH:mm)
- Fotos opcionales
- Actualización del registro en Google Sheet

#### 4. Historial
- Ver turno actual en curso
- Historial de turnos cerrados
- Detalles completos de cada turno
- Lista de carreras por fecha

### 🚴 EcoDelivery (Interfaz Simplificada - Verde)

#### 1. Iniciar Turno
- **Un solo botón**: "Obtener Ubicación e Iniciar Turno"
- Auto-captura: ubicación GPS, hora (HH:mm), usuario
- Foto opcional
- Guardado en Google Sheet "Ecodelivery"
- Sin formularios complejos

#### 2. Registrar Delivery
- Biker (auto-completado con usuario actual)
- Cliente
- Lugar de origen y destino
- Hora Inicio y Hora Fin (selectores HH:mm)
- Distancia en km
- **Carrera por hora** (checkbox)
- **Notas** (textarea opcional)
- **Foto** (opcional, sube a S3)
- Se guarda en Google Sheet "Carreras_bikers" (pestaña del biker)

#### 3. Cerrar Turno
- **Un solo botón**: "Obtener Ubicación y Cerrar Turno"
- Auto-captura: ubicación GPS, hora (HH:mm)
- Foto opcional
- Actualiza registro en Google Sheet

#### 4. Historial
- **Mis Deliveries**: Vista sincronizada con Google Sheet
  - Muestra TODOS los deliveries del biker desde el sheet
  - Incluye: cliente, origen, destino, distancia, por hora, notas
  - Fotos ocultas (pendiente configurar acceso público en S3)
- **Mis Turnos**: Historial de turnos cerrados

## 🔐 Autenticación y Seguridad

### AWS Cognito
- **User Pool ID**: `us-east-1_REsVOVqcY`
- **Client ID**: `29rgiplrp6t3aq2b58ee91i54v`
- **Auth Flows**: `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_REFRESH_TOKEN_AUTH`

### Grupos y Roles
- **beezero**: Conductores de auto → `/beezero/*`
- **operador**: Acceso administrativo
- **ecodelivery**: Bikers de delivery → `/ecodelivery/*`

### Control de Sesiones
- **Sesiones concurrentes**: Solo 1 sesión activa por usuario
- **Timeout por inactividad**: 10 minutos
- **Token refresh**: Automático con interceptores Axios
- **Session ID**: Incluido en headers de todas las requests

### Seguridad
- JWT validation en backend
- Session manager in-memory
- CORS configurado para frontend específico
- Credentials nunca en repositorio (.gitignore)

---

## 📊 APIs y Endpoints

### Backend Endpoints

#### Autenticación
- `POST /api/auth/login` - Login con Cognito
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/refresh` - Refresh token

#### Ecodelivery - Turnos
- `POST /api/ecodelivery/turnos/iniciar` - Iniciar turno
- `PUT /api/ecodelivery/turnos/:id/cerrar` - Cerrar turno
- `GET /api/ecodelivery/turnos/:id` - Obtener turno por ID
- `GET /api/ecodelivery/turnos` - Listar todos los turnos
- `POST /api/ecodelivery/upload-photo` - Subir foto de turno

#### Ecodelivery - Deliveries
- `POST /api/ecodelivery/deliveries/registrar` - Registrar delivery
- `GET /api/ecodelivery/deliveries/:bikerName` - Obtener deliveries del biker
- `POST /api/ecodelivery/upload-delivery-photo` - Subir foto de delivery

#### BeeZero - Turnos
- `POST /api/turnos/iniciar` - Iniciar turno
- `PUT /api/turnos/:id/cerrar` - Cerrar turno
- `GET /api/turnos/:id` - Obtener turno por ID
- `GET /api/turnos` - Listar turnos

---

## 🛠️ Desarrollo y Scripts

### Comandos Disponibles

```bash
# Frontend
cd frontend
npm run dev               # Dev server en http://localhost:3000
npm run build             # Build para producción
npm run preview           # Preview del build
npm run lint              # Linter ESLint

# Backend
cd backend
npm run dev               # Dev server con nodemon en puerto 3001
npm run start             # Producción
node scripts/create-s3-registros.js    # Crear estructura S3
node scripts/list-sheets.js            # Diagnóstico Google Sheets
```

### Scripts de Gestión

```bash
# Cognito (primera vez)
bash scripts/setup-cognito-roles.sh      # Crear grupos
bash scripts/update-cognito-roles.sh     # Asignar usuarios a grupos

# Sincronizar usuarios desde Google Sheet con Cognito
# Crea usuarios nuevos, elimina los que ya no están en la hoja, asigna grupos
cd backend && node scripts/sync-cognito-from-sheet.js
```

---

## 🎨 Diseño y UX

### Sistema de Temas Dinámicos
- **BeeZero**: Amarillo (#FFD700) + Negro
- **EcoDelivery**: Verde (#10B981) + Blanco/Negro
- Logo y colores cambian según tipo de usuario
- Responsive: Diseñado móvil primero
- PWA: Instalable como app nativa

### Componentes Personalizados
- **TimeSelect**: Selector de hora HH:mm con selectores nativos
- **Layout**: Sistema de theming dinámico
- **LoadingSpinner**: Spinner con colores del tema activo
- **ThemeProvider**: Context provider de temas

### Mobile-First
- Inputs con `font-size: 16px` para evitar zoom en iOS
- Selectores nativos para mejor UX en móvil
- Botones con `min-height: 48px` para touch targets
- Diseño responsive con TailwindCSS

---

## 💰 Costos Estimados

### Desarrollo
- Frontend/Backend: $0 (local)
- Google Sheets API: $0
- AWS Cognito: $0 (< 50,000 MAU)

### Producción (estimado)
- Frontend: S3 + CloudFront (~$1-2/mes)
- Backend: Lambda + API Gateway (free tier o ~$1-5/mes)
- AWS Cognito: $0 (< 50,000 MAU)
- AWS S3 (fotos): ~$0.50-2/mes
- Google Sheets API: $0

**Total estimado: ~$3-10/mes**

---

## 🚀 Deploy a Producción

### Frontend (automático con GitHub Actions)

Cada **push a `main`** (con cambios en `frontend/`) despliega el frontend a **S3** e invalida **CloudFront**.

- **Configuración**: Ver [docs/GITHUB_ACTIONS_AWS.md](docs/GITHUB_ACTIONS_AWS.md) (secretos y variables en GitHub).
- **URL de producción**: La que tenga tu distribución CloudFront (ej. `https://d19ls0k7de9u6w.cloudfront.net`).

### Backend

- **AWS Lambda + API Gateway**: Ya configurado; actualizar código con `aws lambda update-function-code`.
- **Railway**: Ver [RAILWAY_DEPLOY.md](RAILWAY_DEPLOY.md).
- **Manual (AWS/EC2)**: Ver [DEPLOY_AWS.md](DEPLOY_AWS.md) si aplica.

### Configurar S3 para acceso público a fotos (opcional)

```bash
aws s3api put-bucket-policy --bucket bee-tracked-photos --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::bee-tracked-photos/*"
  }]
}'
```

---

## 📞 Documentación Adicional

- **Backend**: `backend/README.md`
- **Google Sheets**: `docs/SHEET_ECODELIVERY.md`
- **S3**: `docs/S3_STRUCTURE.md`
- **Deploy con GitHub Actions**: `docs/GITHUB_ACTIONS_AWS.md`
- **Ejecutar local**: `RUN.md`

## 🔧 Troubleshooting

### Error: "The requested module does not provide an export named 'useAuth'"
- **Solución**: Importar desde `services/auth.ts` en lugar de `contexts/AuthContext.tsx`

### Error 403 en fotos de S3
- **Causa**: Bucket sin acceso público configurado
- **Solución**: Las fotos están ocultas en el UI. Configurar bucket policy para habilitar.

### Error: "EADDRINUSE: address already in use :::3001"
- **Solución**: `lsof -ti :3001 | xargs kill -9`

### Deliveries no aparecen en "Mis Deliveries"
- **Solución**: Ahora se sincronizan con Google Sheet. Verificar que el backend esté corriendo.

---

## 🎯 Próximas Mejoras

- [ ] Implementar URLs pre-firmadas para fotos en S3
- [ ] Dashboard administrativo para operadores
- [ ] Reportes y estadísticas por biker
- [ ] Notificaciones push
- [ ] Modo offline completo con sincronización
- [ ] Exportar datos a Excel/PDF
- [ ] Integración con mapas para rutas
- [ ] Chat de soporte integrado

---

**Desarrollado con ❤️ para BeeZero y EcoDelivery**
