const CACHE = 'guia-lagos-v15'; // Subimos versión

const CORE = [
  './',
  './index.html',
  './manifest.json'
];

const PHOTOS = [
  './img/fondo.webp', './img/lago.webp', './img/osorno.webp',
  './img/villarrica.webp', './img/conguillio.webp', './img/vpr.webp',
  './img/frutillar.webp', './img/iglesia.webp', './img/teatro.webp',
  './img/pewe.webp', './img/termas.webp', './img/templo.webp', './img/feri.webp'
];

const ALL = [...CORE, ...PHOTOS];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return cache.addAll(CORE).then(() => {
        return Promise.all(
          PHOTOS.map(url => cache.add(url).catch(() => console.warn('Falta foto:', url)))
        );
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(event.request, copy));
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
