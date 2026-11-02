// Network first, cache as fallback: always up to date online, still playable offline
// once every file has been loaded at least one time.
const CACHE = 'mini-jeux-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // The page itself always asks the server, past the browser cache, so a new version shows at once.
  const live = request.mode === 'navigate' ? fetch(request.url, { cache: 'no-cache' }) : fetch(request);
  event.respondWith(
    live
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./');
        return Response.error();
      }),
  );
});
