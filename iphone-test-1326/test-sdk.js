// Ausschließlich für den lokalen Prüfstand. Keine Verbindung zu Supabase.
(() => {
  const TEST_KEY = "aquarium-chrome-test-isoliert-v1";
  const CLOUD_KEY = "aquarium-chrome-test-cloud-v1";
  const TEST_ID = "nur-kuenstliche-daten-1312";
  const MARKER = "aquarium-cloud-wiederherstellung-aktiv-v1";
  const UNSICHER = "aquarium-cloud-datenzustand-unsicher-v1";
  const SYNC_BACKUP = "aquarium-cloud-sync-backup-v1";
  const SYNC_STAND = "aquarium-cloud-sync-stand-v1";
  const zuordnung = {
    KH: "aquariumKhEinstellungen", Ca: "aquariumCaEinstellungen", Mg: "aquariumMgEinstellungen",
    NO3: "aquariumNo3Einstellungen", PO4: "aquariumPo4Einstellungen",
    Salinitaet: "aquariumSalEinstellungen", Temperatur: "aquariumTempEinstellungen"
  };
  const datenschluessel = [
    "aquarium-tracker-messwerte-v1", "aquarium-tracker-ereignisse-v1",
    "aquarium-dosierungen-v1", "aquarium-wartungsplan-v1", ...Object.values(zuordnung)
  ];
  const nativeSet = aquariumIphoneTestspeicher.setItem;
  let syncFehler = false;
  window.AQUARIUM_TEST_BEREIT = false;

  function sichererOrt() {
    return location.pathname.startsWith("/aquarium-tracker-02/iphone-test-1326/") && ((location.protocol === "https:" && location.hostname === "alexgonzola.github.io") || (location.protocol === "http:" && location.hostname === "127.0.0.1"));
  }

  function originalSpeichern(key, value) {
    nativeSet.call(aquariumIphoneTestspeicher, key, String(value));
  }

  function testBackup() {
    return {
      app: "Aquarium Tracker", version: 4, erstellt: "2026-10-30T12:00:00.000Z",
      messwerte: [{ id: "kuenstlicher-kh-wert", parameter: "KH", wert: 8, datum: "2026-10-30T12:00:00.000Z" }],
      ereignisse: [], dosierungen: [],
      wartungsplan: { filtersocken: { intervall: 7, erinnerung: true, vorwarnung: 1 } },
      zielbereiche: {
        KH: { min: 7, max: 9, toleranz: 0.5 }, Ca: { min: 400, max: 450, toleranz: 20 },
        Mg: { min: 1250, max: 1400, toleranz: 50 }, NO3: { min: 2, max: 15, toleranz: 5 },
        PO4: { min: 0.03, max: 0.1, toleranz: 0.02 },
        Salinitaet: { min: 34, max: 36, toleranz: 0.5 }, Temperatur: { min: 24, max: 26, toleranz: 0.5 }
      }
    };
  }

  function vorbelegung() {
    const backup = testBackup();
    originalSpeichern(datenschluessel[0], JSON.stringify(backup.messwerte));
    originalSpeichern(datenschluessel[1], "[]");
    originalSpeichern(datenschluessel[2], "[]");
    originalSpeichern(datenschluessel[3], JSON.stringify(backup.wartungsplan));
    for (const [parameter, key] of Object.entries(zuordnung)) {
      originalSpeichern(key, JSON.stringify(backup.zielbereiche[parameter]));
    }
    originalSpeichern(SYNC_BACKUP, JSON.stringify(backup));
    originalSpeichern(SYNC_STAND, JSON.stringify(backup.erstellt));
    originalSpeichern(CLOUD_KEY, JSON.stringify({ daten: backup, updated_at: backup.erstellt }));
    originalSpeichern(TEST_KEY, TEST_ID);
  }

  function cloudLesen() {
    if (!window.AQUARIUM_TEST_BEREIT) throw new Error("Lokaler Test ist nicht freigegeben.");
    return JSON.parse(aquariumIphoneTestspeicher.getItem(CLOUD_KEY));
  }

  async function antwort(data, error = null) {
    await new Promise(resolve => setTimeout(resolve, 60));
    return { data: structuredClone(data), error };
  }

  try {
    if (!sichererOrt()) throw new Error("Bitte ausschließlich die lokale Testadresse verwenden.");
    const vorhanden = aquariumIphoneTestspeicher.getItem(TEST_KEY);
    if (vorhanden !== TEST_ID) {
      if (vorhanden !== null || datenschluessel.some(key => aquariumIphoneTestspeicher.getItem(key) !== null) ||
          [SYNC_BACKUP, SYNC_STAND, MARKER, UNSICHER].some(key => aquariumIphoneTestspeicher.getItem(key) !== null)) {
        throw new Error("An dieser Adresse befinden sich bereits unbekannte Daten. Es wird nichts überschrieben.");
      }
      // Erstes Öffnen auf einer leeren, ausschließlich lokalen Testadresse.
      vorbelegung();
    }
    // Nur die fehlerhafte Vorbelegung dieses markierten Testpakets reparieren.
    // Die eigentlichen Aquarium-Testdaten und die Testcloud bleiben erhalten.
    if (vorhanden === TEST_ID && aquariumIphoneTestspeicher.getItem(SYNC_STAND) === "2026-10-30T12:00:00.000Z") {
      originalSpeichern(SYNC_STAND, JSON.stringify("2026-10-30T12:00:00.000Z"));
    }
    window.AQUARIUM_TEST_BEREIT = true;
  } catch (fehler) {
    document.addEventListener("DOMContentLoaded", () => {
      const hinweis = document.createElement("p");
      hinweis.textContent = "Test gesperrt: " + fehler.message;
      document.body.prepend(hinweis);
    });
  }

  // Ein einmaliger Schreibfehler ausschließlich am Sync-Backup dieser Testversion.
  aquariumIphoneTestspeicher.setItem = function(key, value) {
    if (window.AQUARIUM_TEST_BEREIT && this === aquariumIphoneTestspeicher && syncFehler && key === SYNC_BACKUP) {
      syncFehler = false;
      throw new DOMException("Künstlicher Speicherfehler im Chrome-Test", "QuotaExceededError");
    }
    return nativeSet.call(this, key, value);
  };

  window.supabase = Object.freeze({
    createClient(url) {
      if (url !== "lokale-testcloud-ohne-netzwerk") throw new Error("Echte Cloud-Adresse im Test nicht erlaubt.");
      return {
        auth: {
          getUser: () => antwort({ user: { id: "kuenstlicher-testnutzer" } }),
          signInWithPassword: () => antwort({ user: { id: "kuenstlicher-testnutzer" } })
        },
        from(tabelle) {
          if (tabelle !== "aquarium_daten") throw new Error("Unbekannte Testtabelle.");
          return { select: () => ({ eq: () => ({ maybeSingle: () => antwort(cloudLesen()) }) }) };
        },
        rpc(name, parameter) {
          if (name !== "aquarium_sicher_speichern") throw new Error("Unbekannter Testaufruf.");
          const bisher = cloudLesen();
          if (parameter.p_erwarteter_zeitstempel !== bisher.updated_at) {
            return antwort(null, { message: "Künstlicher Synchronisierungskonflikt" });
          }
          const zeit = new Date(Date.parse(bisher.updated_at) + 1000).toISOString();
          originalSpeichern(CLOUD_KEY, JSON.stringify({ daten: parameter.p_daten, updated_at: zeit }));
          return antwort(zeit);
        }
      };
    }
  });

  async function testdownload(mitFehler) {
    if (await window.aquariumSchreibschutz?.bereit !== true ||
        window.aquariumSchreibschutz.darfSchreiben() !== true) return;
    if (!window.AQUARIUM_TEST_BEREIT) return;
    const cloud = cloudLesen();
    cloud.daten.messwerte.push({
      id: crypto.randomUUID(), parameter: "KH", wert: 8.2,
      datum: new Date(Date.parse(cloud.updated_at) + 1000).toISOString()
    });
    cloud.updated_at = new Date(Date.parse(cloud.updated_at) + 1000).toISOString();
    originalSpeichern(CLOUD_KEY, JSON.stringify(cloud));
    syncFehler = mitFehler;
    document.dispatchEvent(new Event("aquarium-cloud-auto-download"));
  }

  window.AquariumChromeTest = Object.freeze({
    async zuruecksetzen() {
      if (!sichererOrt() || aquariumIphoneTestspeicher.getItem(TEST_KEY) !== TEST_ID) return false;
      if (!navigator.locks) return false;
      return navigator.locks.request("aquarium-iphone-test-schreibzugriff-v1", { ifAvailable: true }, lock => {
        if (!lock) return false;
        // Nur diese ausdrücklich markierten Testdaten, niemals fremde Browser-Daten.
        const entfernen = Object.keys(aquariumIphoneTestspeicher).filter(key => datenschluessel.includes(key) ||
          [SYNC_BACKUP, SYNC_STAND, MARKER, UNSICHER, CLOUD_KEY].includes(key) ||
          key.startsWith("aquarium-cloud-download-sicherheitsbackup-") ||
          key.startsWith("aquarium-json-import-sicherheitsbackup-"));
        entfernen.forEach(key => aquariumIphoneTestspeicher.removeItem(key));
        vorbelegung();
        return true;
      });
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    if (location.pathname.endsWith("reset.html")) return;
    const toolbar = document.createElement("section");
    toolbar.id = "chromeTestBereich";
    toolbar.className = "card";
    const titel = document.createElement("h2");
    titel.textContent = "IPHONE-TEST – nur künstliche Daten";
    const text = document.createElement("p");
    text.textContent = "Keine Verbindung zur echten Cloud. Keine Anmeldung und keine echten Aquarium-Werte eingeben.";
    const stand = document.createElement("p");
    stand.id = "chromeTestStand";
    const download = document.createElement("button");
    download.id = "testCloudDownload";
    download.textContent = "1. Wiederherstellung testen";
    download.addEventListener("click", () => testdownload(false));
    const fehler = document.createElement("button");
    fehler.id = "testSyncFehler";
    fehler.textContent = "2. Speicherfehler testen";
    fehler.addEventListener("click", () => testdownload(true));
    const reset = document.createElement("a");
    reset.href = "reset.html";
    reset.textContent = "Künstliche Testdaten zurücksetzen";
    toolbar.append(titel, text, stand, download, document.createTextNode(" "), fehler,
      document.createElement("br"), reset);
    document.body.prepend(toolbar);
    function anzeigen() {
      if (!window.AQUARIUM_TEST_BEREIT) { stand.textContent = "Test ist gesperrt."; return; }
      const lokal = JSON.parse(aquariumIphoneTestspeicher.getItem(datenschluessel[0]) || "[]");
      const cloud = cloudLesen();
      const archive = Object.keys(aquariumIphoneTestspeicher).filter(key => key.startsWith("aquarium-cloud-download-sicherheitsbackup-archiv-")).length;
      stand.textContent = "Lokale Messwerte: " + lokal.length + " · Testcloud: " + cloud.daten.messwerte.length +
        " · Archivbackups: " + archive + " · Sicherheitssperre: " +
        (aquariumIphoneTestspeicher.getItem(UNSICHER) === "true" ? "aktiv" : "aus");
    }
    anzeigen();
    setInterval(anzeigen, 500);
  });
})();
