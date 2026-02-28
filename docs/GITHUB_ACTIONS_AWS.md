# Desplegar a AWS con GitHub Actions

Cada vez que hagas **push a `main`** (con cambios en `frontend/`), el frontend se construye y se sube a S3 y se invalida CloudFront.

## 1. Configurar secretos y variables en GitHub

En tu repo: **Settings → Secrets and variables → Actions**.

### Secretos (Settings → Secrets and variables → Actions → Secrets)

| Nombre | Descripción |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Access Key de un usuario IAM con permisos S3 y CloudFront |
| `AWS_SECRET_ACCESS_KEY` | Secret Key del mismo usuario |

### Variables (Settings → Secrets and variables → Actions → Variables)

| Nombre | Descripción | Ejemplo |
|--------|-------------|---------|
| `VITE_API_URL` | URL del backend en producción | `https://1d9blio38d.execute-api.us-east-1.amazonaws.com` |
| `VITE_COGNITO_USER_POOL_ID` | User Pool ID de Cognito | `us-east-1_REsVOVqcY` |
| `VITE_COGNITO_CLIENT_ID` | App client ID de Cognito | `29rgiplrp6t3aq2b58ee91i54v` |

## 2. Crear usuario IAM para GitHub Actions (solo una vez)

1. En AWS: **IAM → Users → Create user** (ej: `github-actions-bee-tracked`).
2. **Attach policies directly** y asigna una política que permita:
   - Subir a tu bucket S3 (`s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` en `arn:aws:s3:::bee-tracked-frontend-1770454156` y `arn:aws:s3:::bee-tracked-frontend-1770454156/*`).
   - Invalidar CloudFront (`cloudfront:CreateInvalidation` en tu distribución).

Ejemplo de política (reemplaza `447924811196` por tu Account ID si es distinto):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::bee-tracked-frontend-1770454156",
        "arn:aws:s3:::bee-tracked-frontend-1770454156/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "cloudfront:CreateInvalidation",
      "Resource": "arn:aws:cloudfront::447924811196:distribution/E7WOJ080IV37F"
    }
  ]
}
```

3. Crea **Access key** para ese usuario y copia **Access key ID** y **Secret access key** a los secretos de GitHub.

## 3. Cuándo se ejecuta el workflow

- **Automático:** al hacer **push** (o merge) a la rama **main** y que toquen archivos en `frontend/` o el propio workflow.
- **Manual:** en GitHub → **Actions** → **Deploy Frontend to AWS** → **Run workflow**.

## 4. Ver el resultado

- **Actions** en la pestaña del repo: ahí ves cada ejecución y los logs.
- Si todo va bien, en unos minutos la app en CloudFront tendrá los últimos cambios.

## 5. Resumen de pasos

1. Crear usuario IAM con la política anterior y crear Access Key.
2. En el repo: **Settings → Secrets and variables → Actions**.
3. Añadir **Secrets:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
4. Añadir **Variables:** `VITE_API_URL`, `VITE_COGNITO_USER_POOL_ID`, `VITE_COGNITO_CLIENT_ID`.
5. Hacer push a `main` (o ejecutar el workflow a mano) y revisar en **Actions**.
