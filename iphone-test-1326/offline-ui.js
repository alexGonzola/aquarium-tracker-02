document.addEventListener("DOMContentLoaded", () => {
  const bereich = document.createElement("section");
  bereich.className = "card";
  const titel = document.createElement("h2");
  titel.textContent = "Offline-Vorbereitung";
  const status = document.createElement("p");
  status.id = "offlineTestStatus";
  status.textContent = "Die Testdateien werden für den Offline-Test gespeichert. Bitte warten.";
  bereich.append(titel, status);
  document.body.prepend(bereich);
  if (!navigator.serviceWorker) {
    status.textContent = "Service Worker nicht verfügbar. Bitte diese Adresse in Chrome öffnen.";
    return;
  }
  let bereit = false;
  setTimeout(() => {
    if (!bereit) status.textContent = "Offline-Vorbereitung noch nicht abgeschlossen. Bitte diese Meldung im Chat nennen.";
  }, 12000);

  async function pruefen() {
    try {
      await navigator.serviceWorker.ready;
      const cache = await caches.open("aquarium-iphone-test-1326-1");
      const dateien = ["testspeicher.js", "./", "index.html", "style.css", "test-sdk.js", "schreibschutz.js",
        "app.js", "wartung.js", "supabase.js", "offline-ui.js", "manifest.json",
        "reset.html", "reset.js", "icon-192.png", "icon-512.png"];
      const vorhanden = await Promise.all(dateien.map(pfad => cache.match(new URL(pfad, location.href).href)));
      if (vorhanden.some(antwort => !antwort)) {
        status.textContent = "Offline-Testdateien noch nicht vollständig gespeichert. Bitte diese Meldung im Chat nennen.";
        return;
      }
      bereit = true;
      status.textContent = navigator.serviceWorker.controller
        ? "Offline-Vorbereitung: bereit. Alle Testdateien sind gespeichert."
        : "Alle Testdateien sind gespeichert. Bitte jetzt einmal mit Strg + R normal neu laden.";
    } catch (fehler) {
      status.textContent = "Offline-Vorbereitung fehlgeschlagen: " + fehler.message;
    }
  }
  navigator.serviceWorker.addEventListener("controllerchange", pruefen);
  pruefen();
});
