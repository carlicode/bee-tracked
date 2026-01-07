# Google Apps Script Backend

Este directorio contiene el código del backend que corre en Google Apps Script.

## Setup

1. Abre tu Google Sheets "Eco Drivers Carreras"
2. Ve a **Extensions → Apps Script**
3. Copia y pega cada archivo `.gs` en el editor de Apps Script:
   - `Code.gs` → Crea nuevo archivo "Code"
   - `Auth.gs` → Crea nuevo archivo "Auth"
   - `Carreras.gs` → Crea nuevo archivo "Carreras"
   - `Utils.gs` → Crea nuevo archivo "Utils"

## Configuración

### 1. Configurar Script Properties

No se requieren propiedades adicionales para el funcionamiento básico.
Si necesitas configurar propiedades personalizadas en el futuro, puedes hacerlo en **Project Settings → Script properties**.

### 2. Configurar Google Sheets

Crea las siguientes pestañas en tu Google Sheets:

#### Pestaña "Config"
Esta pestaña debe tener las siguientes columnas:

| Email Driver | Nombre Driver |
|--------------|---------------|
| sebastian@gmail.com | Sebastian |
| cristian@gmail.com | Cristian |
| ... | ... |

- **Columna A**: Email del driver (debe coincidir con el email de Google)
- **Columna B**: Nombre del driver (se usará como nombre de pestaña)

#### Pestañas por Driver

Para cada driver, crea una pestaña con su nombre (ej: "Sebastian", "Cristian").

La primera fila debe tener los encabezados (se crean automáticamente si no existen):

| Fecha | Cliente | Hora inicio | Lugar recojo | Lugar destino | Hora fin | Tiempo | Distancia | Precio | Observaciones | Email | Timestamp |
|-------|---------|-------------|--------------|---------------|----------|--------|-----------|--------|---------------|-------|-----------|

## Deploy

1. En el editor de Apps Script, haz clic en **Deploy → New deployment**
2. Selecciona tipo: **Web app**
3. Configuración:
   - **Execute as**: Me
   - **Who has access**: Anyone
4. Haz clic en **Deploy**
5. Copia la **Web App URL** (necesitarás esto para el frontend)

## APIs Disponibles

### POST `/api/auth`
Verifica token de Google OAuth

**Request:**
```json
{
  "path": "auth",
  "idToken": "eyJhbGc..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "sebastian@gmail.com",
    "name": "Sebastian",
    "driverName": "Sebastian"
  }
}
```

### POST `/api/carreras`
Crea nueva carrera

**Request:**
```json
{
  "path": "carreras",
  "idToken": "eyJhbGc...",
  "fecha": "2025-01-15",
  "cliente": "Tarija",
  "horaInicio": "16:56",
  "lugarRecojo": "Tarija",
  "lugarDestino": "Capitán ñuflo",
  "horaFin": "17:13",
  "tiempo": "0:17",
  "distancia": 8,
  "precio": 18,
  "observaciones": ""
}
```

### GET `/api/carreras?token=xxx&fecha=2025-01-15`
Lista carreras del driver autenticado

### GET `/api/clientes?token=xxx&q=tar`
Autocompletado de clientes

## Testing

Puedes probar las funciones directamente en el editor de Apps Script:
1. Selecciona una función del menú desplegable
2. Haz clic en el botón "Run"
3. Revisa los logs en **Execution log**

