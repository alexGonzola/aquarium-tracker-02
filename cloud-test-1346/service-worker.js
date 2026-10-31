const CACHE_NAME = "aquarium-cloud-test-1346-1";

const DATEIEN = [
  "./",
  "./index.html",
  "./style.css",
  "./testspeicher.js",
  "./supabase-sdk-2.118.0.js",
  "./cloud-guard.js",
  "./cloud-config.js",
  "./schreibschutz.js",
  "./app.js",
  "./wartung.js",
  "./supabase.js",
  "./cloud-ui.js",
  "./offline-ui.js",
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
          .filter(name => name.startsWith("aquarium-cloud-test-") && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Die gemeinsam installierten App-Dateien als eine Version verwenden.
// Sonst könnten neue HTML-Dateien mit alten Schutzfunktionen gemischt werden.
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  if (new URL(event.request.url).origin !== self.location.origin) return;

  const appDateien = DATEIEN.map(pfad => new URL(pfad, self.registration.scope).href);
  const anfrageUrl = new URL(event.request.url);
  anfrageUrl.search = "";
  if (!appDateien.includes(anfrageUrl.href)) return;

  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const gespeichert = await cache.match(anfrageUrl.href);
    // Fehlende Teile der App nicht unbemerkt aus einer anderen Version ergänzen.
    return gespeichert || new Response(
      "Die App-Version ist unvollständig. Bitte die Seite nach einem Update erneut öffnen.",
      { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
    );
  }));
});
