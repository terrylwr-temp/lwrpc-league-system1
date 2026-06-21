const CACHE_NAME = "pbcc-pwa-static-v7";
const STATIC_CACHE_PREFIX = "pbcc-pwa-static-";
const PRECACHE_URLS = [
  "/pbcc-manifest.webmanifest",
  "/pbcc-header-pickleball-icon-192.png",
  "/pbcc-header-pickleball-icon-512.png",
  "/favicon.ico",
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

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "PBCourtCommand";
  const options = {
    body: payload.body || "You have a new PBCourtCommand notification.",
    icon: payload.icon || "/pbcc-header-pickleball-icon-192.png",
    badge: payload.badge || "/pbcc-header-pickleball-icon-192.png",
    tag: payload.tag || "pbcc-app-notification",
    data: {
      url: payload.url || "/pbcc/player",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/pbcc/player", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients.find((item) => item.url === targetUrl);
      if (client) return client.focus();
      return self.clients.openWindow(targetUrl);
    })
  );
});
