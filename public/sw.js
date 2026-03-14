const CACHE_NAME = 'team4job-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => caches.delete(cacheName))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Development Mode / Bug Fix Bypass - fetch directly from network always to prevent aggressive caching
    event.respondWith(fetch(event.request));
});
