# Estructura de Carpetas en S3

Este documento describe la organización de archivos en el bucket S3 del proyecto BeeTracked.

## Bucket

- **Nombre**: `bee-tracked-photos` (configurable en `AWS_S3_BUCKET`)
- **Región**: `us-east-1` (configurable en `AWS_REGION`)

## Estructura de Carpetas

```
bee-tracked-photos/
├── Registros_BeeTracked/
│   ├── Ecodelivery/
│   │   ├── Turnos/          # Fotos de iniciar/cerrar turno Ecodelivery
│   │   └── Deliveries/      # Fotos de registrar delivery (carreras)
│   └── Beezero/             # Fotos de turnos Beezero
```

---

## 1. Registros_BeeTracked/Ecodelivery/Turnos/

**Propósito**: Almacena fotos de los turnos de Ecodelivery (iniciar turno y cerrar turno).

**Formato del nombre de archivo**:
```
{usuario}_{YYYY-MM-DD}_{HH-mm-ss}_{momento}.{ext}
```

**Ejemplo**:
```
Jhon_Kevin_Fernandez_2026-02-07_08-30-15_inicio.jpg
Jhon_Kevin_Fernandez_2026-02-07_14-00-30_cierre.jpg
```

**Código backend**: `uploadEcodeliveryPhoto()` en `backend/src/services/s3Upload.js`

**Rutas frontend**:
- `frontend/src/pages/ecodelivery/IniciarTurnoBiker.tsx`
- `frontend/src/pages/ecodelivery/CerrarTurnoBiker.tsx`

**API endpoint**: `POST /api/ecodelivery/upload-photo`

**Parámetros**:
- `dataUrl`: string (imagen en formato base64, data:image/...)
- `username`: string (nombre del biker)
- `momento`: 'inicio' | 'cierre'

---

## 2. Registros_BeeTracked/Ecodelivery/Deliveries/

**Propósito**: Almacena fotos de los deliveries registrados por bikers de Ecodelivery.

**Formato del nombre de archivo**:
```
{usuario}_{YYYY-MM-DD}_{HH-mm-ss}.{ext}
```

**Ejemplo**:
```
Jhon_Kevin_Fernandez_2026-02-07_10-45-22.jpg
```

**Código backend**: `uploadEcodeliveryDeliveryPhoto()` en `backend/src/services/s3Upload.js`

**Rutas frontend**:
- `frontend/src/pages/ecodelivery/NuevoDelivery.tsx`

**API endpoint**: `POST /api/ecodelivery/upload-delivery-photo`

**Parámetros**:
- `dataUrl`: string (imagen en formato base64, data:image/...)
- `username`: string (nombre del biker)

---

## 3. Registros_BeeTracked/Beezero/

**Propósito**: Almacena fotos de los turnos de Beezero.

**Formato**: (Por definir en implementación futura)

---

## Crear la Estructura

Para crear todas las carpetas en S3:

```bash
cd backend
node scripts/create-s3-registros.js
```

Este script:
1. Verifica que el bucket existe (o lo crea si no existe)
2. Crea todas las "carpetas" (prefijos) necesarias
3. Muestra un resumen de la estructura creada

## Configuración Requerida

En `backend/.env`:

```env
AWS_S3_BUCKET=bee-tracked-photos
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
```

## Permisos

El usuario/rol de AWS debe tener permisos para:
- `s3:PutObject` (subir archivos)
- `s3:GetObject` (leer archivos, si es necesario)
- `s3:ListBucket` (listar contenido del bucket)
- `s3:CreateBucket` (crear bucket, si no existe)

## URLs de Acceso

Las fotos subidas tienen URLs públicas del formato:

```
https://{bucket}.s3.{region}.amazonaws.com/{key}
```

**Ejemplo**:
```
https://bee-tracked-photos.s3.us-east-1.amazonaws.com/Registros_BeeTracked/Ecodelivery/Deliveries/Jhon_Kevin_Fernandez_2026-02-07_10-45-22.jpg
```

**Nota**: Para que las URLs sean accesibles públicamente, el bucket debe tener una política de acceso público configurada. De lo contrario, las URLs solo serán accesibles con credenciales de AWS.
