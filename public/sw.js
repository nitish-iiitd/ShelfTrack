const CACHE_NAME = 'shelftrack-v2';
const ASSETS_TO_CACHE = [
  './index.html',
  './icon.svg',
  './manifest.json',
  './assets/css/app.css',
  './assets/js/app.js',
  './assets/js/constants.js',
  './assets/js/db.js',
  './assets/js/importExportService.js',
  './assets/js/inventoryRepository.js',
  './assets/js/inventoryService.js',
  './assets/js/uiRenderer.js',
  './assets/js/utils.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
