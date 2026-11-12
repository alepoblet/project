/* sw.js — Guía Ruta Lagos y Volcanes */
const CACHE = 'guia-lagos-v13'; // Subimos la versión

const CORE = [
  './',
  './index.html',
  './manifest.json'
];

const PHOTOS = [
  './img/fondo.webp',
  './img/lago.webp',
  './img/osorno.webp',
  './img/villarrica.webp',
  './img/conguillio.webp',
  './img/vpr.webp',
  './img/frutillar.webp',
  './img/iglesia.webp',
  './img/teatro.webp',
  './img/pewe.webp',
  './img/termas.webp',
  './img/templo.webp',
  './img/feri.webp'
];

const ALL = [...CORE, ...PHOTOS];

self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      await Promise.all(
        PHOTOS.map(url =>
          cache.add(url).catch(() => console.warn('[SW] Foto no encontrada:', url))
        )
      );
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', event => {
  if (event.data === 'precache') {
    event.waitUntil(
      caches.open(CACHE).then(cache =>
        Promise.all(
          ALL.map(url =>
            cache.match(url).then(hit => hit || cache.add(url).catch(() => {}))
          )
        )
      )
    );
  }
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || req.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(cacheFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || cache.match('./index.html');
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) cache.put(req, fresh.clone());
    return fresh;
  } catch (e) {
    return new Response('', { status: 404, statusText: 'Offline' });
  }
}
