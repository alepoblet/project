/* sw.js — Guía Ruta Lagos y Volcanes */
const CACHE = 'guia-lagos-v6';

// Archivos indispensables (si falla alguno, falla la instalación)
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

// Fotos locales: se cachean por separado para que una faltante no rompa nada
const PHOTOS = [
  './img/lago.jpg',
  './img/osorno.jpg',
  './img/villarrica.jpg',
  './img/conguillio.jpg',
  './img/vpr.jpg',
  './img/frutillar.jpg',
  './img/iglesia.jpg',
  './img/teatro.jpg',
  './img/termas.jpg',
  './img/templo.jpg'
];

const ALL = [...CORE, ...PHOTOS];

/* ---------- INSTALL ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Núcleo: obligatorio
      await cache.addAll(CORE);
      // Fotos: cada una por separado (si falta una, sigue)
      await Promise.all(
        PHOTOS.map(url =>
          cache.add(url).catch(() => console.warn('[SW] Foto no encontrada:', url))
        )
      );
      self.skipWaiting();
    })()
  );
});

/* ---------- ACTIVATE ---------- */
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

/* ---------- MENSAJES ---------- */
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

/* ---------- FETCH ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar dominios externos (Google Maps, Booking, Yelp…)
  if (url.origin !== location.origin) return;

  // HTML → network-first (versión fresca + fallback offline)
  if (req.mode === 'navigate' || req.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Resto (imágenes, json, css) → cache-first (rápido y offline)
  event.respondWith(cacheFirst(req));
});

/* ---------- ESTRATEGIAS ---------- */
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
