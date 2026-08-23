/* Bukang PWA Service Worker — offline & installable di HP */
const CACHE_NAME = "bukang-v1";
const STATIC_CACHE = "bukang-static-v1";
const RUNTIME_CACHE = "bukang-runtime-v1";

// Assets yang akan di-cache saat install (jika ada)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/pwa-192x192.png",
  "/pwa-512x512.png",
  "/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS.map((u) => new Request(u, { cache: "reload" }))).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: network first, fallback cache
async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    // Cache hanya untuk GET 200
    if (request.method === "GET" && res.ok) {
      const clone = res.clone();
      // Jangan cache API auth yang sensitif? tetap cache roster untuk offline baca
      cache.put(request, clone);
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // fallback untuk navigasi: kembalikan index.html
    if (request.mode === "navigate") {
      const fallback = await caches.match("/index.html");
      if (fallback) return fallback;
    }
    throw new Error("offline");
  }
}

// Helper: cache first, fallback network
async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    // update di background (stale-while-revalidate)
    fetch(request).then((res) => {
      if (res.ok) cache.put(request, res.clone());
    }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    // fallback untuk image
    throw new Error("offline");
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Hanya handle GET
  if (req.method !== "GET") return;

  // Navigasi (HTML) -> network first, fallback ke index.html
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // API: /api/* -> network first, fallback cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // OSM tiles & Nominatim & foto uploads -> cache first
  if (
    url.hostname.includes("tile.openstreetmap.org") ||
    url.hostname.includes("nominatim.openstreetmap.org") ||
    url.pathname.startsWith("/uploads") ||
    url.hostname.includes("huggingface.co") ||
    req.destination === "image" ||
    req.destination === "style" ||
    req.destination === "script" ||
    req.destination === "font"
  ) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Default: cache first
  event.respondWith(cacheFirst(req));
});

// Handle share target & sync (future)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
