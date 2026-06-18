const CACHE_NAME = "pbcc-pwa-static-v2";
const STATIC_CACHE_PREFIX = "pbcc-pwa-static-";
const PRECACHE_URLS = [
  "/pbcc-manifest.webmanifest",
  "/pbcc-icon-192.png",
  "/pbcc-icon-512.png",
];
const STATIC_ASSET_PATTERN = /\.(?:css|js|png|jpg|jpeg|webp|svg|ico|woff2?|ttf)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(STATIC_CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") return;

  const shouldCache =
    PRECACHE_URLS.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/") ||
    STATIC_ASSET_PATTERN.test(url.pathname);

  if (!shouldCache) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        return networkResponse;
      });
    })
  );
});
