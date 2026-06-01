# Session Store – Almacén de sesiones modular

## Problema

Los turnos de BeeZero usan validación de sesión para control de concurrencia. En AWS Lambda, las sesiones en memoria no persisten entre instancias ni cold starts, provocando 401 al iniciar/cerrar turno.

## Solución

Almacén de sesiones **pluggable** con dos implementaciones:

| Store     | Uso              | Persistencia              |
|----------|------------------|---------------------------|
| `memory` | Desarrollo local | No (se pierde al reiniciar) |
| `dynamodb` | Producción Lambda | Sí (compartido entre instancias) |

## Configuración

### Variables de entorno

```bash
# Desarrollo (default)
SESSION_STORE=memory

# Producción Lambda
SESSION_STORE=dynamodb
SESSIONS_TABLE_NAME=bee-tracked-sessions-prod
```

### Despliegue

El `serverless.deploy.yml` ya incluye:

- Tabla DynamoDB `bee-tracked-sessions-prod` con TTL
- Permisos IAM para el Lambda
- Variables `SESSION_STORE` y `SESSIONS_TABLE_NAME`

```bash
cd backend
npm run deploy
```

## Estructura

```
backend/src/services/
├── sessionStore/
│   ├── index.js              # Factory: elige store según SESSION_STORE
│   ├── MemorySessionStore.js  # In-memory (desarrollo)
│   └── DynamoDBSessionStore.js # DynamoDB (producción)
└── sessionManager.js         # API unificada (registerSession, isSessionValid, etc.)
```

## API del store

Todas las implementaciones exponen:

- `set(userId, sessionData)` → `Promise<string>` (sessionId)
- `get(userId)` → `Promise<object|null>`
- `touch(userId)` → `Promise<boolean>`
- `delete(userId)` → `Promise<boolean>`
- `isValid(userId, sessionId)` → `Promise<boolean>`
- `cleanExpired()` → `Promise<number>`
- `getStats()` → `object`

## Añadir otro store (ej. Redis)

1. Crear `sessionStore/RedisSessionStore.js` con la misma interfaz.
2. Registrar en `sessionStore/index.js`:

```javascript
case 'redis':
  return new RedisSessionStore();
```

3. Documentar variables de entorno necesarias.
