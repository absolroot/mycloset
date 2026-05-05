const CACHE_NAME = "closet-pwa-v19";
const NAVIGATION_FALLBACK = "./";
const DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);
const IS_DEV_HOST = DEV_HOSTS.has(self.location.hostname);

self.addEventListener("install", (event) => {
  if (IS_DEV_HOST) {
    self.skipWaiting();
    return;
  }

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([NAVIGATION_FALLBACK]).catch(() => undefined)
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (IS_DEV_HOST) {
    event.waitUntil(
      Promise.all([
        self.registration.unregister(),
        caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      ]).then(() => self.clients.claim())
    );
    return;
  }

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (IS_DEV_HOST) return;
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (url.pathname.endsWith("/config.js")) {
    event.respondWith(networkFirst(event.request, { cacheResponse: false }));
    return;
  }

  if (url.pathname.startsWith(`${self.location.pathname.replace(/\/sw\.js$/, "")}/assets/`) || url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(NAVIGATION_FALLBACK, response.clone());
      return response;
    }
    return (await cache.match(NAVIGATION_FALLBACK)) || response;
  } catch (error) {
    return (await cache.match(request)) || (await cache.match(NAVIGATION_FALLBACK)) || Response.error();
  }
}

async function networkFirst(request, options = {}) {
  const cacheResponse = options.cacheResponse !== false;
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (cacheResponse && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await cache.match(request)) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}
