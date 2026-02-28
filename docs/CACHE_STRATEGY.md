# Estrategia de Caché - BeeTracked Frontend

## Problema
Cuando desplegamos cambios al frontend, los usuarios pueden ver versiones antiguas debido al caché de:
1. CloudFront (CDN de AWS)
2. Navegadores (Chrome, Safari, etc.)

## Solución implementada

### 1. Headers de caché diferenciados

**Archivos con hash (JS, CSS, imágenes):**
```
Cache-Control: public, max-age=31536000, immutable
```
- Cachean por 1 año
- Es seguro porque cada build cambia el nombre del archivo
- Ejemplo: `index-BaNLR94A.js` → `index-XyZ123Ab.js`

**Archivos sin hash (index.html, manifest.json):**
```
Cache-Control: public, max-age=0, must-revalidate
```
- NO se cachean
- Siempre se piden al servidor
- Garantiza que el usuario vea la última versión

### 2. Deploy automático

El script de GitHub Actions (`.github/workflows/deploy-aws.yml`) ahora:

```bash
# 1. Subir archivos estáticos con caché largo
aws s3 sync dist/ s3://bucket/ --cache-control "public, max-age=31536000, immutable"

# 2. Sobrescribir index.html SIN caché
aws s3 cp dist/index.html s3://bucket/index.html \
  --cache-control "public, max-age=0, must-revalidate"

# 3. Invalidar CloudFront
aws cloudfront create-invalidation --paths "/*"
```

### 3. Deploy manual

Usar el script local:
```bash
./scripts/deploy-frontend.sh
```

## Beneficios

✅ **Velocidad**: Los assets con hash se cachean por 1 año (carga instantánea)  
✅ **Actualizaciones**: El HTML siempre trae la última versión  
✅ **Sin esperas**: Los usuarios ven cambios inmediatamente (tras invalidación)  
✅ **Costos**: Menos peticiones a S3 = menos costos  

## Cómo funciona

1. **Primera visita:**
   - Descarga `index.html` (sin caché)
   - El HTML referencia: `index-BaNLR94A.js`
   - Descarga y cachea ese JS por 1 año

2. **Nuevo deploy:**
   - Cambias código y haces build
   - Vite genera: `index-XyZ123Ab.js` (nuevo nombre)
   - Subes a S3 con el script
   - CloudFront se invalida

3. **Usuario regresa:**
   - Descarga `index.html` (no está cacheado, obtiene el nuevo)
   - El nuevo HTML referencia: `index-XyZ123Ab.js`
   - Como el nombre cambió, el navegador lo descarga
   - ✅ Usuario ve la versión nueva

## Verificar headers

```bash
# Ver headers de index.html (debe ser max-age=0)
curl -I https://d19ls0k7de9u6w.cloudfront.net/index.html

# Ver headers de un JS (debe ser max-age=31536000)
curl -I https://d19ls0k7de9u6w.cloudfront.net/assets/index-BaNLR94A.js
```

## Troubleshooting

**Error "Failed to load module script... MIME type of text/html" / pantalla en blanco (pero en incógnito sí entra):**

Tu navegador tiene una versión antigua de la app en caché. Hay que borrar caché **solo de este sitio**:

### En Chrome (recomendado)
1. Abre la página: https://d19ls0k7de9u6w.cloudfront.net
2. Abre DevTools: `F12` o `Cmd + Option + I` (Mac)
3. Ve a la pestaña **Application** (Aplicación)
4. En el menú izquierdo, **Storage** → **Clear site data** (Borrar datos del sitio)
5. Marca todo y clic en **Clear site data**
6. Cierra DevTools y recarga la página (`F5`)

Alternativa rápida: **Hard refresh**: `Ctrl + Shift + R` (Windows) o `Cmd + Shift + R` (Mac). Si no basta, usa los pasos de arriba.

**Si un usuario sigue viendo versión antigua (sin error MIME):**

1. **Hard refresh**: `Ctrl/Cmd + Shift + R`
2. **Borrar caché del sitio**: DevTools → Application → Clear storage
3. **Verificar invalidación**: 
   ```bash
   aws cloudfront get-invalidation \
     --distribution-id E7WOJ080IV37F \
     --id <INVALIDATION_ID>
   ```

**Si CloudFront cachea el HTML:**
- Verificar que el objeto en S3 tenga los headers correctos
- Re-ejecutar el script de deploy
- Crear nueva invalidación manualmente
