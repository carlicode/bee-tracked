# 🐝 bee zero - Drivers App

Aplicación web móvil para que drivers de bee zero registren sus carreras, inicien/cierren turnos y gestionen su información laboral.

## ✨ Funcionalidades

- 🔐 **Autenticación** con Google OAuth
- 🚗 **Registro de Carreras** - Registra carreras diarias con detalles completos
- ⏰ **Gestión de Turnos** - Inicia y cierra turnos con control de caja
- 📸 **Fotos** - Captura fotos de pantalla y exterior del auto
- 📍 **Geolocalización** - Registra ubicación GPS automáticamente
- 💰 **Control de Caja** - Apertura, cierre y cálculo de diferencia
- 📊 **Historial** - Visualiza turnos y carreras registradas

## 🚀 Inicio Rápido (Demo)

### Modo Demo - Sin Backend

El frontend funciona sin backend con datos de demostración:

```bash
cd frontend
npm install
npm run dev
```

Abre http://localhost:3000 y click en **"Entrar como Demo Driver"**

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

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **Backend**: Google Apps Script (opcional)
- **Base de datos**: Google Sheets (opcional)
- **Autenticación**: Google OAuth 2.0
- **Hosting**: Vercel/Netlify (gratis)

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
eco-app-drivers/
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── pages/           # Páginas principales
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── IniciarTurno.tsx
│   │   │   ├── CerrarTurno.tsx
│   │   │   ├── NuevaCarrera.tsx
│   │   │   ├── MisTurnos.tsx
│   │   │   ├── DetalleTurno.tsx
│   │   │   └── MisCarreras.tsx
│   │   ├── components/      # Componentes reutilizables
│   │   ├── services/        # Servicios API
│   │   └── types/           # TypeScript types
│   └── package.json
└── apps-script/             # Backend Google Apps Script (opcional)
    ├── Code.gs
    ├── Auth.gs
    ├── Carreras.gs
    └── Utils.gs
```

## 📱 Funcionalidades Principales

### 1. Iniciar Turno
- Registra apertura de caja
- Captura foto de pantalla
- Captura foto exterior del auto
- Registra daños al auto
- Captura ubicación GPS
- **Hora de inicio automática**

### 2. Cerrar Turno
- Registra cierre de caja
- Registra monto QR
- Captura fotos finales
- Captura ubicación GPS de cierre
- Cálculo automático de diferencia
- **Hora de cierre automática**

### 3. Nueva Carrera
- Cliente (con autocompletado)
- Fecha y horarios
- Lugar de recojo y destino
- Tiempo, distancia y precio
- Observaciones

### 4. Mis Turnos
- Ver turno actual en curso
- Historial de turnos cerrados
- Detalles completos de cada turno

### 5. Mis Carreras
- Lista de carreras por fecha
- Resumen de totales
- Filtros por fecha

## 🎨 Diseño

- **Colores BeeZero**: Amarillo (#FFD700) y Negro
- **Responsive**: Diseñado para móvil primero
- **PWA**: Instalable como app nativa

## 💰 Costos

- Frontend Hosting: $0 (Vercel/Netlify free tier)
- Google Apps Script: $0 (opcional)
- Google Sheets: $0 (opcional)
- Google OAuth: $0

**Total: $0/mes** (demo sin backend)

## 📝 Notas

- El modo demo funciona completamente sin backend
- Los datos se guardan en localStorage del navegador
- Para producción, configurar Google Apps Script y Sheets
- Ver `apps-script/README.md` para setup del backend

## 🚀 Deploy

### Frontend (Vercel)

```bash
cd frontend
npm run build
vercel --prod
```

## 📞 Soporte

Para configurar el backend completo, ver `apps-script/README.md`
