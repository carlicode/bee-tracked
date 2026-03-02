# Backend - bee-tracked

Backend API para el sistema de gestión de conductores bee-tracked.

## 🚀 Tecnologías

- **Node.js** + **Express**: Servidor API REST
- **Google Sheets API**: Base de datos (turnos y carreras)
- **AWS S3**: Almacenamiento de fotos (próximamente)

## 📦 Instalación

```bash
cd backend
npm install
```

## ⚙️ Configuración

1. Copia el archivo de ejemplo de variables de entorno:

```bash
cp .env.example .env
```

2. Configura las variables en `.env`:

```env
PORT=3001
GOOGLE_SHEET_ID=tu_sheet_id_aqui
GOOGLE_CREDENTIALS_JSON={"type":"service_account",...}
FRONTEND_URL=http://localhost:5173
```

3. Sigue los pasos en `GOOGLE_CLOUD_SETUP.md` para obtener las credenciales de Google Cloud.

## 🏃‍♂️ Ejecución

### Desarrollo (con auto-reload):

```bash
npm run dev
```

### Producción:

```bash
npm start
```

El servidor estará disponible en `http://localhost:3001`

### Deploy a AWS Lambda

Para desplegar el backend a producción (requiere credenciales AWS configuradas):

```bash
cd backend
npm install
npm run deploy
```

Esto actualiza el Lambda con los últimos cambios (ej. columna "Pago por QR" en carreras).

## 📚 API Endpoints

### Turnos

#### Iniciar Turno
```
POST /api/turnos/iniciar
Content-Type: application/json

{
  "abejita": "Patricia",
  "auto": "6265 LUH",
  "aperturaCaja": 50,
  "kilometraje": 12500,
  "danosAuto": "ninguno",
  "fotoPantalla": "base64_string_or_url",
  "fotoExterior": "base64_string_or_url",
  "horaInicio": "08:30",
  "ubicacionInicio": {
    "lat": -17.3924,
    "lng": -66.0559
  }
}
```

#### Cerrar Turno
```
POST /api/turnos/:id/cerrar
Content-Type: application/json

{
  "cierreCaja": 320,
  "qr": 25,
  "kilometraje": 12650,
  "danosAuto": "Rayón puerta derecha",
  "fotoPantalla": "base64_string_or_url",
  "fotoExterior": "base64_string_or_url",
  "horaCierre": "16:45",
  "ubicacionFin": {
    "lat": -17.3850,
    "lng": -66.0600
  },
  "observaciones": "Todo bien hoy"
}
```

#### Obtener todos los turnos
```
GET /api/turnos
```

#### Obtener un turno por ID
```
GET /api/turnos/:id
```

### Health Check
```
GET /health
```

## 🗂️ Estructura del Proyecto

```
backend/
├── src/
│   ├── server.js              # Punto de entrada
│   ├── routes/
│   │   ├── turnos.js          # Rutas de turnos
│   │   └── carreras.js        # Rutas de carreras (TODO)
│   └── services/
│       ├── googleSheets.js    # Cliente de Google Sheets
│       └── s3Upload.js        # Upload a S3 (TODO)
├── .env.example               # Ejemplo de variables de entorno
├── .gitignore
├── package.json
└── README.md
```

## 🔐 Seguridad

- Las credenciales de Google Cloud **NUNCA** deben subirse a Git
- Usa variables de entorno para toda configuración sensible
- En AWS, usa **Secrets Manager** o **Parameter Store**
- El archivo `.env` debe estar en `.gitignore`

## 🚧 Próximos Pasos

- [ ] Implementar upload de fotos a AWS S3
- [ ] Implementar autenticación JWT
- [ ] Implementar endpoints para carreras
- [ ] Implementar endpoints para deliveries (EcoDelivery)
- [ ] Agregar validación de datos con Joi o Yup
- [ ] Agregar tests unitarios
- [ ] Dockerizar el backend
- [ ] Deploy a AWS (ECS, Lambda, o EC2)

## 📝 Notas

- Por ahora, las fotos se envían como base64 y se guardan como "PENDIENTE_S3"
- Una vez implementado S3, las fotos se subirán primero y solo se guardará la URL en Google Sheets
- El ID de los turnos se genera automáticamente: `turno_timestamp_uuid`
