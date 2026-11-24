const CACHE = "bm3-log-analyzer-v2";
const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];
const CDN_FILES = [
  "https://cdn.tailwindcss.com",
  "https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js",
  "https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"
];
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_FILES);
    await Promise.all(CDN_FILES.map(async url => {
      try {
        const response = await fetch(url, {mode: "no-cors"});
        if (response && (response.ok || response.type === "opaque")) {
          await cache.put(url, response);
        }
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) (await caches.open(CACHE)).put(req, fresh.clone());
        return fresh;
      } catch (_) {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
  } else if (CDN_FILES.includes(req.url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          (await caches.open(CACHE)).put(req, fresh.clone());
          return fresh;
        }
      } catch (_) {}
      return (await caches.match(req)) || Response.error();
    })());
  }
});
