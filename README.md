# 🚗🚴 Bee Tracked - Plataforma Multi-Usuario para Drivers

Aplicación web móvil (PWA) que soporta dos tipos de usuarios con interfaces diferenciadas:
- **BeeZero**: Conductores de auto (interfaz completa - tema amarillo) 🚗
- **EcoDelivery**: Bikers de delivery (interfaz simplificada - tema verde) 🚴

## ✨ Funcionalidades por Plataforma

### 🚗 BeeZero (Conductores de Auto)
- 🔐 **Login con usuario/password simple**
- 🚗 **Registro de Carreras** - Carreras completas con cliente, precio, distancia
- ⏰ **Gestión de Turnos** - Control de caja, fotos de auto, daños
- 📸 **Fotos** - Pantalla y exterior del vehículo
- 📍 **Geolocalización** - GPS automático en inicio/cierre
- 💰 **Control de Caja** - Apertura, cierre, QR, diferencia
- 📊 **Historial Completo** - Turnos y carreras detalladas

### 🚴 EcoDelivery (Bikers de Delivery)
- 🔐 **Login con usuario/password simple**
- 📦 **Registro de Deliveries** - Cliente, origen, destino, distancia
- ⚡ **Turnos Simplificados** - Un botón para iniciar/cerrar (auto-captura ubicación y hora)
- 📍 **Geolocalización Automática** - Sin formularios complejos
- 📊 **Historial de Deliveries** - Vista simple de entregas

## 🚀 Inicio Rápido (Demo Local)

### Modo Demo - Sin Backend

El frontend funciona sin backend con datos de demostración:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:3000 

**Accesos:**
- Usuario: `eco` (sin password) → EcoDelivery Biker 🚴
- Usuario: `beezero` (sin password) → BeeZero Driver 🚗

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

**Opción 3: Deploy a Vercel (Producción)**
```bash
cd frontend
npm install -g vercel
vercel --prod
```

## 🏗️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: TailwindCSS con sistema de temas dinámicos
- **Estado**: Context API + React Hooks personalizados
- **PWA**: Service Worker + Manifest para instalación
- **Backend**: Google Apps Script (opcional) o API Mock
- **Base de datos**: Google Sheets (opcional) o localStorage
- **Autenticación**: Simple usuario/password (demo) o Google OAuth (producción)
- **Geolocalización**: Geolocation API nativa
- **Hosting**: Vercel/Netlify (gratis) o AWS S3+CloudFront

## 📦 Instalación

```bash
cd frontend
npm install
```

### Variables de Entorno (Opcional)

Si quieres conectar el backend, crea `.env` en `frontend/`:

```env
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfyc.../exec
```

## 🎯 Estructura del Proyecto

```
bee-tracked/
├── frontend/                          # Aplicación React PWA
│   ├── public/
│   │   ├── manifest.json             # Configuración PWA
│   │   └── sw.js                     # Service Worker
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.tsx             # Login unificado
│   │   │   ├── beezero/              # 🚗 Páginas BeeZero (conductores)
│   │   │   │   ├── DashboardBeezero.tsx    # 5 cards: turnos y carreras
│   │   │   │   ├── IniciarTurno.tsx        # Formulario completo con fotos
│   │   │   │   ├── CerrarTurno.tsx         # Cierre de caja y cálculos
│   │   │   │   ├── NuevaCarrera.tsx        # Registro detallado de carrera
│   │   │   │   ├── MisCarreras.tsx         # Historial de carreras
│   │   │   │   ├── MisTurnos.tsx           # Historial de turnos
│   │   │   │   └── DetalleTurno.tsx        # Vista detalle turno
│   │   │   └── ecodelivery/          # 🚴 Páginas EcoDelivery (bikers)
│   │   │       ├── DashboardBiker.tsx      # 4 cards simplificadas
│   │   │       ├── IniciarTurnoBiker.tsx   # 1 botón para iniciar
│   │   │       ├── CerrarTurnoBiker.tsx    # 1 botón para cerrar
│   │   │       ├── NuevoDelivery.tsx       # Formulario mínimo
│   │   │       ├── MisDeliveries.tsx       # Lista de deliveries
│   │   │       └── MisTurnos.tsx           # Historial simple
│   │   ├── components/               # Componentes reutilizables
│   │   │   ├── Layout.tsx            # Layout con theming dinámico
│   │   │   ├── ThemeProvider.tsx     # Context provider de temas
│   │   │   ├── LoadingSpinner.tsx    # Spinner de carga
│   │   │   └── CarreraCard.tsx       # Card de carrera
│   │   ├── config/                   # Configuración
│   │   │   ├── constants.ts          # Constantes globales
│   │   │   ├── routes.ts             # Definición de rutas
│   │   │   └── themes.ts             # Temas BeeZero/EcoDelivery
│   │   ├── hooks/                    # React Hooks personalizados
│   │   │   ├── useTheme.ts           # Hook de sistema de temas
│   │   │   ├── useGeolocation.ts     # Hook de geolocalización
│   │   │   └── useImageUpload.ts     # Hook para subir imágenes
│   │   ├── services/                 # Capa de servicios
│   │   │   ├── api.ts                # Cliente API principal
│   │   │   ├── api-mock.ts           # Mock data para demo
│   │   │   ├── auth.ts               # Servicio de autenticación
│   │   │   └── storage.ts            # localStorage helpers
│   │   ├── types/                    # TypeScript types
│   │   │   ├── index.ts              # Tipos principales
│   │   │   └── turno.ts              # Tipos de turnos
│   │   ├── utils/                    # Utilidades
│   │   │   ├── errors.ts             # Manejo de errores
│   │   │   ├── formatters.ts         # Formateo de datos
│   │   │   ├── geolocation.ts        # Helpers GPS
│   │   │   ├── image.ts              # Procesamiento imágenes
│   │   │   └── validation.ts         # Validaciones
│   │   ├── App.tsx                   # Componente principal
│   │   ├── main.tsx                  # Entry point
│   │   └── index.css                 # Estilos globales
│   ├── package.json                  # Dependencias frontend
│   ├── vite.config.ts                # Configuración Vite
│   ├── tailwind.config.js            # Configuración TailwindCSS
│   └── tsconfig.json                 # Configuración TypeScript
├── apps-script/                      # 📄 Backend opcional (Google Apps Script)
│   ├── Code.gs                       # Entry point del backend
│   ├── Auth.gs                       # Autenticación
│   ├── Carreras.gs                   # CRUD de carreras
│   ├── Utils.gs                      # Utilidades backend
│   └── README.md                     # Guía de setup backend
├── detener-aws.sh                    # 🛑 Script para detener recursos AWS
├── reactivar-aws.sh                  # ▶️ Script para reactivar AWS
├── reactivar-cloudfront.sh           # ☁️ Script para CloudFront
├── package.json                      # Scripts del workspace raíz
└── README.md                         # Este archivo
```

## 📱 Funcionalidades por Plataforma

### 🚗 BeeZero (Interfaz Completa - Amarillo)

#### 1. Iniciar Turno
- Formulario completo con múltiples campos
- Apertura de caja (monto en Bs)
- Placa del auto
- Daños al auto (descripción)
- Fotos: pantalla y exterior del vehículo
- Captura ubicación GPS
- Hora de inicio automática

#### 2. Nueva Carrera
- Cliente (con autocompletado)
- Fecha y horarios (inicio/fin)
- Lugar de recojo y destino
- Tiempo de viaje
- Distancia (km)
- Precio (Bs)
- Observaciones

#### 3. Cerrar Turno
- Cierre de caja (monto en Bs)
- Monto QR
- Cálculo automático de diferencia
- Fotos finales
- Ubicación GPS de cierre
- Hora de cierre automática

#### 4. Historial
- Ver turno actual en curso
- Historial de turnos cerrados
- Detalles completos de cada turno
- Lista de carreras por fecha
- Resumen de totales

### 🚴 EcoDelivery (Interfaz Simplificada - Verde)

#### 1. Iniciar Turno
- **¡Un solo botón!** "Obtener Ubicación e Iniciar Turno"
- Auto-captura: ubicación, hora, nombre
- Sin formularios complejos

#### 2. Registrar Delivery
- Cliente
- Lugar de origen
- Lugar de destino
- Distancia (km)
- Campos mínimos, interfaz rápida

#### 3. Cerrar Turno
- **¡Un solo botón!** "Obtener Ubicación y Cerrar Turno"
- Auto-captura: ubicación, hora
- Sin cálculos de caja

#### 4. Historial
- Ver turno actual si está activo
- Historial de turnos cerrados (simple)
- Lista de deliveries realizados
- Vista optimizada para móvil

## 🎨 Diseño

### Sistema de Temas Dinámicos
- **BeeZero**: Amarillo (#FFD700) + Negro
- **EcoDelivery**: Verde (#10B981) + Blanco/Negro
- Logo y colores cambian según tipo de usuario
- Responsive: Diseñado móvil primero
- PWA: Instalable como app nativa

### Experiencia de Usuario
- **BeeZero**: Dashboard con 5 cards (todas las opciones)
- **EcoDelivery**: Dashboard con 4 cards (opciones simplificadas)
- Navegación intuitiva por tipo de usuario
- Rutas organizadas: `/beezero/*` y `/ecodelivery/*`

## 💰 Costos

- Frontend Hosting: $0 (Vercel/Netlify free tier)
- Google Apps Script: $0 (opcional)
- Google Sheets: $0 (opcional)
- Google OAuth: $0

**Total: $0/mes** (demo sin backend)

## 📝 Notas Técnicas

### Modo Demo (Sin Backend)
- El frontend funciona completamente standalone con datos mock
- Los datos se guardan en localStorage del navegador
- Perfecto para demos, pruebas y desarrollo local
- No requiere configuración adicional

### Modo Producción (Con Backend)
- Conecta a Google Apps Script + Google Sheets
- Requiere configurar variables de entorno (`.env`)
- Ver `apps-script/README.md` para setup del backend
- Soporta Google OAuth 2.0

### PWA (Progressive Web App)
- Instalable en dispositivos móviles
- Service Worker para funcionamiento offline
- Manifest configurado para iOS y Android
- Experiencia similar a app nativa

### Sistema de Temas
- Cambio dinámico según tipo de usuario
- BeeZero: Amarillo (#FFD700) + Negro
- EcoDelivery: Verde (#10B981) + Blanco/Negro
- Logo y colores sincronizados automáticamente

---

## 🛠️ Desarrollo

### Comandos Disponibles

```bash
# Desde la raíz del proyecto
npm run dev:frontend       # Inicia dev server
npm run build:frontend     # Build para producción
npm run lint:frontend      # Linter ESLint

# Desde /frontend
npm run dev               # Dev server en http://localhost:3000
npm run build             # Build optimizado
npm run preview           # Preview del build
npm run lint              # Linter
```

### Variables de Entorno

Crear `.env` en `/frontend/` (opcional):

```env
# Google Apps Script (si usas backend)
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_ID/exec

# Google OAuth (si usas autenticación real)
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Configuración
VITE_API_MODE=mock          # 'mock' o 'production'
```

---

## 🚀 Deploy

### Deploy Rápido con Vercel (Recomendado)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

Te dará un link como: `https://bee-tracked.vercel.app`

### Deploy a AWS S3 + CloudFront

```bash
# Reactivar recursos AWS
./reactivar-aws.sh

# Deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://tu-bucket/ --delete

# Invalidar cache de CloudFront
./reactivar-cloudfront.sh

# Detener recursos para ahorrar costos
./detener-aws.sh
```

### Scripts de Gestión AWS

- `./reactivar-aws.sh` - Reactiva recursos AWS que están detenidos
- `./detener-aws.sh` - Detiene recursos AWS para ahorrar costos
- `./reactivar-cloudfront.sh` - Invalida caché de CloudFront tras deploy

---

## 🔐 Accesos para Demo

**Usuario:** `eco` (sin password)  
→ Interfaz EcoDelivery (verde, simplificada) 🚴

**Usuario:** `beezero` (sin password)  
→ Interfaz BeeZero (amarilla, completa) 🚗

---

## 📞 Soporte y Documentación

- **Backend Setup**: Ver `apps-script/README.md`
- **Estructura del código**: Revisar comentarios en componentes
- **Tipos TypeScript**: Ver `/frontend/src/types/`
- **Configuración**: Ver `/frontend/src/config/`
