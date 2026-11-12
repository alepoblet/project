/* sw.js — Guía Ruta Lagos y Volcanes */
const CACHE = 'guia-lagos-v18'; // Versión actual de la caché

// Archivos esenciales (si falla alguno, la instalación falla)
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

// Todas las fotos locales para el modo offline
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

/* ---------- INSTALL (Instalación) ---------- */
self.addEventListener('install', event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Núcleo: obligatorio
      await cache.addAll(CORE);
      // Fotos: se guardan una por una. Si falta alguna, no rompe la app.
      await Promise.all(
        PHOTOS.map(url =>
          cache.add(url).catch(() => console.warn('[SW] Foto no encontrada:', url))
        )
      );
      self.skipWaiting(); // Fuerza a que el nuevo SW tome el control de inmediato
    })()
  );
});

/* ---------- ACTIVATE (Activación) ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Borra las versiones viejas de la caché para ahorrar espacio
      await Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      );
      await self.clients.claim(); // Toma el control de las pestañas abiertas
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
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

/* ---------- FETCH (Estrategia de red) ---------- */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar dominios externos (ej: Google Maps, Google Fonts)
  if (url.origin !== location.origin) return;

  // HTML (index.html) -> Network First (Busca red, si no hay, usa caché)
  if (req.mode === 'navigate' || req.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Resto (imágenes, manifest) -> Cache First (Busca caché, si no hay, usa red)
  event.respondWith(cacheFirst(req));
});

/* ---------- ESTRATEGIAS DE CACHÉ ---------- */
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    // Si no hay internet, devuelve el HTML guardado en caché
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
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    return new Response('', { status: 404, statusText: 'Offline' });
  }
}
