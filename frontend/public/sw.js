// Service Worker para PWA - Network first para siempre tener la última versión
const CACHE_NAME = 'eco-drivers-v2';

// Install - solo activar, no cachear assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate - limpiar caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Network first: siempre intentar red, cache solo si offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || event.request.url.endsWith('.js') || event.request.url.endsWith('.css')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Passthrough a la red; .catch evita "Uncaught (in promise)" si la petición falla (CORS, offline).
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.warn('[sw] fetch error:', event.request.url, err);
      return Response.error();
    })
  );
});

