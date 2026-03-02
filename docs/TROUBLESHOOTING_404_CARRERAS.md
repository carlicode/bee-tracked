# Troubleshooting: 404 en GET /api/ecodelivery/carreras

## Síntoma

```
GET https://bxa273i618.execute-api.us-east-1.amazonaws.com/prod/api/ecodelivery/carreras?bikerName=Carlicode+Eco 404 (Not Found)
```

Mensaje en la app: "No se pudieron cargar las carreras del día."

---

## Causas posibles y soluciones

### 1. Backend Lambda no desplegado con las rutas de Kilometraje

**Causa:** El workflow de GitHub Actions despliega el frontend pero el deploy del backend puede fallar por permisos IAM.

**Verificar:**
1. Ir a **GitHub → Actions** y revisar la última ejecución de "Deploy to AWS".
2. Si el step "Deploy Backend (Lambda)" falló, el Lambda sigue con código antiguo (sin rutas `/carreras`, `/kilometraje`).

**Solución:** Desplegar el backend manualmente:

```bash
cd backend
npm ci
npx serverless deploy --stage prod --config serverless.deploy.yml
```

**Requisitos IAM:** El usuario/rol que ejecuta el deploy necesita permisos para:
- CloudFormation (crear/actualizar stacks)
- Lambda (UpdateFunctionCode, GetFunction)
- API Gateway
- IAM (para roles del Lambda)
- S3 (bucket de deploy de Serverless)

---

### 2. Path incluye el stage (/prod/...)

**Causa:** En API Gateway, el path que recibe el Lambda puede incluir el stage (ej. `/prod/api/ecodelivery/carreras`). Express espera `/api/ecodelivery/carreras`.

**Solución:** Ya implementada en `lambda.js`: un wrapper que elimina el stage del path antes de pasarlo a Express.

Si el 404 persiste después de desplegar, verificar en CloudWatch Logs del Lambda qué path está recibiendo.

---

### 3. Variable REGISTROS_SHEET_ID no configurada

**Causa:** El servicio `registrosSheet.js` requiere `REGISTROS_SHEET_ID`. Si no está en las variables de entorno del Lambda, la ruta devolvería 503, no 404.

**Verificar:** En AWS Lambda → bee-tracked-backend-prod-api → Configuration → Environment variables, debe existir `REGISTROS_SHEET_ID=1a8M19WHhfM2SWKSiWbTIpVU76gdAFCJ9uv7y0fnPA4g`.

**Solución:** Está en `serverless.deploy.yml`. Si falta, redeployar.

---

### 4. Verificar que el endpoint existe

Probar en terminal:

```bash
# Health check (debería devolver 200)
curl -s -o /dev/null -w "%{http_code}" https://bxa273i618.execute-api.us-east-1.amazonaws.com/prod/api/health

# Carreras (debería devolver 200 o 400, no 404)
curl -s -w "\nHTTP: %{http_code}" "https://bxa273i618.execute-api.us-east-1.amazonaws.com/prod/api/ecodelivery/carreras?bikerName=Test"
```

- **404** en ambos → Lambda no recibe bien el path o no está desplegado.
- **200** en health pero **404** en carreras → Rutas de Kilometraje no están en el código desplegado.
- **200** o **503** en carreras → Backend OK; si 503, revisar REGISTROS_SHEET_ID y permisos del spreadsheet.

---

### 5. Permisos del spreadsheet

El spreadsheet `1a8M19WHhfM2SWKSiWbTIpVU76gdAFCJ9uv7y0fnPA4g` debe estar compartido con la cuenta de servicio de Google (email en las credenciales) con permiso **Editor** en las hojas Registros y Kilometraje.

---

## Resumen de pasos

1. **Desplegar backend:** `cd backend && npx serverless deploy --stage prod --config serverless.deploy.yml`
2. **Verificar IAM** del usuario que hace deploy (CloudFormation, Lambda, API Gateway).
3. **Probar** con `curl` los endpoints.
4. **Revisar CloudWatch Logs** del Lambda si el error continúa.
