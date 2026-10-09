/* CloudISP Service Worker - Mobile App (v2) */
const CACHE_NAME = "cloudisp-cache-v2";

const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // cache.addAll fail ho jata hai agar 1 file bhi 404 ho, is liye one-by-one try karo
      for (const url of FILES_TO_CACHE) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn("SW: cache skip", url);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // Navigation (page open) -> network first, warna cache wala index.html
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Baqi files -> cache first, warna network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((res) => {
          // Supabase / API calls ko cache mat karo
          const url = event.request.url;
          if (url.includes("supabase") || url.includes("api.")) return res;
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return res;
        })
      );
    }).catch(() => {
      // image fail ho to khali mat chhoro
      if (event.request.destination === "image") {
        return caches.match("/icon-192.png");
      }
    })
  );
});
