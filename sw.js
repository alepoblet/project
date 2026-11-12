/* =========================================================
   SERVICE WORKER - GUÍA RUTA LAGOS Y VOLCANES
   ========================================================= */

// 1. Sube la versión cada vez que hagas cambios importantes en el HTML
const CACHE = 'guia-lagos-v20';

// 2. Archivos esenciales para que la app abra
const CORE = [
  './',
  './index.html',
  './manifest.json'
];

// 3. Todas las fotos locales que usa tu HTML
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
      
      // Guardamos los archivos esenciales primero
      await cache.addAll(CORE);
      
      // Guardamos las fotos una por una. Si falta una, la app no se rompe.
      await Promise.all(
        PHOTOS.map(url =>
          cache.add(url).catch(() => console.warn('[SW] Foto no encontrada:', url))
        )
      );
      
      // Forzamos a que el nuevo Service Worker tome el control rápido
      self.skipWaiting();
    })()
  );
});

/* ---------- ACTIVATE (Activación y limpieza) ---------- */
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Borramos las versiones viejas de la caché para ahorrar espacio
      await Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      );
      // Tomamos el control de las pestañas abiertas
      await self.clients.claim();
    })()
  );
});

/* ---------- MENSAJES (Para el botón de descarga) ---------- */
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
  
  // Solo manejamos peticiones GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Ignorar dominios externos (Google Maps, Google Fonts, etc.)
  // Dejamos que el navegador los maneje normalmente.
  if (url.origin !== location.origin) return;

  // 1. Documentos HTML -> Network First (Busca red, si no hay, usa caché)
  // Esto asegura que si hay internet, siempre veas la última versión.
  if (req.mode === 'navigate' || req.destination === 'document' ||
      url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(networkFirst(req));
    return;
  }

  // 2. Imágenes y otros assets -> Cache First (Busca caché, si no hay, usa red)
  // Esto hace que las fotos carguen instantáneamente.
  event.respondWith(cacheFirst(req));
});

/* =========================================================
   FUNCIONES DE ESTRATEGIA
   ========================================================= */

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(req);
    // Si la respuesta es buena, actualizamos la caché
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    // Si falla la red (offline), devolvemos el HTML guardado
    const cached = await cache.match(req);
    return cached || cache.match('./index.html');
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  // Buscamos en la caché primero
  const cached = await cache.match(req);
  if (cached) return cached;
  
  // Si no está en caché, lo buscamos en la red
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.status === 200) {
      cache.put(req, fresh.clone());
    }
    return fresh;
  } catch (e) {
    // Si no hay red y no está en caché, devolvemos error 404 controlado
    return new Response('', { status: 404, statusText: 'Offline' });
  }
}
