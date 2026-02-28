import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import { refreshSession, isCognitoConfigured } from './cognito';

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Setup axios interceptors para:
 * 1. Agregar el token automáticamente a cada request
 * 2. Renovar el token si expira (401)
 */
export function setupAxiosInterceptors() {
  // Request interceptor: agregar token y sessionId
  axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = storage.getToken();
      const sessionId = storage.getSessionId();

      if (token && token !== 'demo-token' && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (sessionId && config.headers) {
        config.headers['X-Session-Id'] = sessionId;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: manejar errores 401 y renovar token
  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Si es 401 y no hemos intentado renovar ya
      if (error.response?.status === 401 && !originalRequest._retry) {
        // Si ya estamos renovando, esperar a que termine
        if (isRefreshing) {
          return new Promise((resolve) => {
            subscribeTokenRefresh((token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(axios(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          // Intentar renovar token con Cognito
          if (isCognitoConfigured()) {
            const refreshToken = storage.getRefreshToken();
            const username = storage.getUsername();

            if (refreshToken && username) {
              console.log('🔄 Renovando token de Cognito...');
              const result = await refreshSession(username, refreshToken);

              // Guardar nuevos tokens
              storage.setToken(result.idToken);
              storage.setRefreshToken(result.refreshToken);
              
              // Notificar a requests en espera
              onTokenRefreshed(result.idToken);
              isRefreshing = false;

              // Reintentar request original con nuevo token
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${result.idToken}`;
              }
              return axios(originalRequest);
            }
          }

          // No se pudo renovar: limpiar storage y redirigir a login
          storage.clear();
          window.location.href = '/';
          isRefreshing = false;
          return Promise.reject(error);
        } catch (refreshError) {
          console.error('❌ Error renovando token:', refreshError);
          storage.clear();
          window.location.href = '/';
          isRefreshing = false;
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
}
