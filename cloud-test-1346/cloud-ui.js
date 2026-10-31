document.addEventListener("DOMContentLoaded", () => {
  const bereich = document.createElement("section");
  bereich.id = "echterCloudTestHinweis";
  bereich.className = "card";
  const titel = document.createElement("h2");
  titel.textContent = "ECHTER CLOUD-TEST – ausschließlich Testkonto";
  const hinweis = document.createElement("p");
  hinweis.textContent = "Hier werden ausschließlich künstliche Aquarium-Daten des getrennten Testkontos zwischen Geräten übertragen. Bitte nur dessen Zugangsdaten verwenden.";
  const status = document.createElement("p");
  status.id = "echterCloudTestStatus";
  const zaehler = document.createElement("p");
  zaehler.id = "echterCloudTestZaehler";
  bereich.append(titel, hinweis, status, zaehler);
  document.body.prepend(bereich);

  function anzeigen() {
    const client = window.aquariumCloudTest;
    status.textContent = client?.status().angemeldet
      ? "Getrenntes Testkonto angemeldet."
      : "Bitte unten mit dem getrennten Testkonto anmelden.";
    try {
      const speicher = window.aquariumCloudTestspeicher;
      const lokal = JSON.parse(speicher.getItem("aquarium-tracker-messwerte-v1") ?? "[]");
      const bestaetigt = JSON.parse(speicher.getItem("aquarium-cloud-sync-backup-v1") ?? "null");
      const archive = Object.keys(speicher).filter(key =>
        key.startsWith("aquarium-cloud-download-sicherheitsbackup-archiv-")).length;
      const unsicher = speicher.getItem("aquarium-cloud-datenzustand-unsicher-v1") === "true";
      zaehler.textContent = "Lokale Messwerte: " + lokal.length +
        " · Zuletzt bestätigter Cloudstand: " + (bestaetigt?.messwerte?.length ?? "noch keiner") +
        " · Archivbackups: " + archive + " · Sicherheitssperre: " + (unsicher ? "aktiv" : "aus");
    } catch {
      zaehler.textContent = "Lokaler Testdatenstand konnte nicht gelesen werden. Bitte keine weiteren Änderungen vornehmen.";
    }
  }
  anzeigen();
  setInterval(anzeigen, 1000);
});
