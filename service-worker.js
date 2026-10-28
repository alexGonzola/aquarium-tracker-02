const CACHE_NAME = "aquarium-tracker-v2-dev-2";

const DATEIEN = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./wartung.js",
  "./supabase.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Dateien für die Offline-Nutzung speichern
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(DATEIEN);
    })
  );
});

// Alte Cache-Versionen entfernen
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(namen => {
      return Promise.all(
        namen
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Dateien zuerst aus dem Netzwerk laden
// Bei fehlender Verbindung den Cache verwenden
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});