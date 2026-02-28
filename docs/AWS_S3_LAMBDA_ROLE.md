# Configuración S3 con Lambda IAM Role

## Problema
Al subir fotos desde la app en producción (AWS Lambda), se recibía error: `The AWS Access Key Id you provided does not exist in our records.`

## Causa
Lambda estaba intentando usar credenciales explícitas (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) en lugar de usar el rol IAM asignado.

## Solución
El código en `backend/src/services/s3Upload.js` ahora:

1. **Detecta si está corriendo en Lambda** usando `process.env.AWS_LAMBDA_FUNCTION_NAME`
2. **En Lambda**: NO configura credenciales explícitas, permitiendo que el SDK use automáticamente el rol IAM
3. **En local**: Usa las credenciales explícitas de `.env`
4. **Resetea el cliente** en cada invocación Lambda para evitar caching de credenciales

```javascript
const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

// En Lambda, resetear el cliente en cada invocación
if (isLambda && s3Client) {
  s3Client = null;
}

// Solo configurar credenciales en modo local
if (!isLambda) {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }
}
```

## Variables de entorno en Lambda
Lambda **NO necesita** `AWS_ACCESS_KEY_ID` ni `AWS_SECRET_ACCESS_KEY`. Solo necesita:

- `AWS_S3_BUCKET`: `bee-tracked-photos`
- El rol IAM (`bee-tracked-lambda-role`) con la policy `AmazonS3FullAccess`

## Variables de entorno en local (`.env`)
Para desarrollo local, el backend **sí necesita** credenciales explícitas:

```bash
AWS_REGION=us-east-1
AWS_S3_BUCKET=bee-tracked-photos
AWS_ACCESS_KEY_ID=tu_access_key_id
AWS_SECRET_ACCESS_KEY=tu_secret_access_key
```

## Verificación
Para probar que S3 funciona en Lambda:

```bash
curl -X POST https://1d9blio38d.execute-api.us-east-1.amazonaws.com/api/ecodelivery/upload-photo \
  -H "Content-Type: application/json" \
  -d '{
    "dataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "username": "TestUser",
    "momento": "inicio"
  }'
```

Respuesta esperada:
```json
{
  "success": true,
  "url": "https://bee-tracked-photos.s3.us-east-1.amazonaws.com/Registros_BeeTracked/Ecodelivery/Turnos/TestUser_2026-02-10_00-03-02_inicio.png"
}
```

## Principio de arquitectura
**Escalable y modular:**
- Lambda usa IAM roles (best practice de AWS)
- No hay credenciales hardcoded en el código
- El código detecta automáticamente su entorno (Lambda vs local)
- Una sola base de código funciona en ambos ambientes
