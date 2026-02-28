# Cómo correr la app bee-tracked

## 1. Instalar dependencias (solo la primera vez)

```bash
# Backend
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

## 2. Variables de entorno

### Backend (`backend/.env`)
Copia el ejemplo y ajusta si necesitas:
```bash
cp backend/.env.example backend/.env
```
Mínimo para probar: `PORT=3001`. Para turnos BeeZero y Cognito añade las variables del `.env.example`.

### Frontend (`frontend/.env.local`)
Para login con Cognito y conectar al backend:
```bash
cp frontend/.env.example frontend/.env.local
```
Edita y deja algo como:
```env
VITE_API_URL=http://localhost:3001
VITE_COGNITO_USER_POOL_ID=us-east-1_REsVOVqcY
VITE_COGNITO_CLIENT_ID=29rgiplrp6t3aq2b58ee91i54v
```

## 3. Arrancar la app

**Terminal 1 – Backend** (puerto 3001):
```bash
cd backend && npm run dev
```

**Terminal 2 – Frontend** (puerto 3000):
```bash
cd frontend && npm run dev
```

Vite abrirá el navegador en **http://localhost:3000**.

## 4. Probar el login

- **Con Cognito** (si configuraste `.env.local`): usuario del CSV, ej. `VictorCoca61` / contraseña = WhatsApp sin 591.
- **Sin backend** (solo frontend): usuario `eco` o `patricia` (contraseña opcional) para modo demo.
- **Con backend sin Cognito**: mismo usuario/contraseña que en el CSV vía `POST /api/auth/login`.

## Puertos

| Servicio | Puerto | URL |
|----------|--------|-----|
| Frontend (Vite) | 3000 | http://localhost:3000 |
| Backend (Express) | 3001 | http://localhost:3001 |

## Resolución de problemas

- **"Error de conexión"** al hacer login: comprueba que el backend esté en marcha en el puerto 3001 y que `VITE_API_URL` sea `http://localhost:3001`.
- **Cognito no configurado**: si no tienes `VITE_COGNITO_*`, el login usará solo el backend (CSV) o el modo demo.
- **Puerto en uso**: Vite usa 3000 por defecto; si está ocupado, usará el siguiente disponible (ej. 3001). Ajusta `VITE_API_URL` si el backend corre en otro puerto.
