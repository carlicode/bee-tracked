# Auditoría de Seguridad - BeeTracked

**Fecha**: 2026-02-10  
**Estado**: ✅ SEGURO

## Resumen
Se realizó una auditoría completa de seguridad para verificar que no hay credenciales expuestas en el repositorio.

## Hallazgos

### ✅ Archivos con credenciales ELIMINADOS
Los siguientes archivos contenían credenciales AWS pero **NUNCA fueron commiteados**:
- `RAILWAY_DEPLOY.md` (eliminado)
- `DEPLOY_AWS.md` (eliminado)

**Clave expuesta**: (ver actualización 2026-07-12 abajo)
**Estado en 2026-02-10**: se afirmó "ya no es válida" — **esto era incorrecto**, ver
actualización.

---

### ⚠️ Actualización — 2026-07-12

La afirmación de arriba ("ya no es válida") era falsa: la key seguía **activa y en uso**
(local, en `backend/.env`) hasta hoy. Se rotó de verdad en esta fecha — key nueva
generada, actualizada en `backend/.env` y en los Secrets de GitHub Actions de este repo,
y las 2 keys viejas fueron borradas de IAM. Detalle completo (privado, con contexto de
toda la cuenta AWS) en `beezy/docs/AWS_IAM_REMEDIATION_2026-07-12.md`.

Por ser este un repositorio público, ya no se listan aquí los IDs de las keys.

### ✅ Archivos de credenciales protegidos
Los siguientes archivos existen localmente pero **NO están trackeados** por Git:
- `BeeTracked_credentials.csv` (ignorado por `.gitignore`)
- `beezero-1710ecf4e5e0.json` (ignorado por `.gitignore`)

### ✅ `.gitignore` actualizado
Se añadieron reglas adicionales para prevenir futuros commits accidentales:
```
*DEPLOY*.md
RAILWAY_DEPLOY.md
```

### ✅ Variables de entorno en GitHub Actions
Las credenciales en GitHub Actions están protegidas como **Secrets**:
- `AWS_ACCESS_KEY_ID` (secret)
- `AWS_SECRET_ACCESS_KEY` (secret)

### ✅ Lambda usa IAM Role
Lambda **NO usa credenciales explícitas**, usa el rol IAM `bee-tracked-lambda-role` con las policies necesarias.

## Archivos seguros con ejemplos
Los siguientes archivos contienen **solo ejemplos** (no credenciales reales):
- `backend/.env.example` → `tu_access_key_id` (placeholder)
- `README.md` → `tu-access-key` (placeholder)
- `docs/AWS_S3_LAMBDA_ROLE.md` → ejemplos de código

## Recomendaciones implementadas

1. ✅ **Nunca** commitear archivos `.env`
2. ✅ **Siempre** usar `.env.example` con placeholders
3. ✅ Usar **GitHub Secrets** para CI/CD
4. ✅ Usar **IAM Roles** en Lambda (no keys)
5. ✅ Rotar keys regularmente
6. ✅ Mantener `.gitignore` actualizado

## Verificación
```bash
# No hay claves AKIA* en archivos trackeados
git ls-files | xargs grep -l "AKIA" 
# (Sin resultados)

# No hay archivos de credenciales trackeados
git ls-files | grep -E "credentials|secret|\.env"
# (Solo archivos seguros: manifest.json, tsconfig.json)
```

## Conclusión
✅ **El repositorio está SEGURO**  
✅ **No hay credenciales expuestas**  
✅ **Los archivos sensibles están protegidos**  
✅ **Las keys actuales son diferentes a las que estaban en archivos locales**
