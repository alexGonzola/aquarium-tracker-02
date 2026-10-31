// Eine aktive App pro Browser und Herkunft; andere Fenster dürfen nur lesen.
(() => {
  const schluessel = [
    "aquarium-tracker-messwerte-v1", "aquarium-tracker-ereignisse-v1",
    "aquarium-dosierungen-v1", "aquarium-wartungsplan-v1",
    "aquariumKhEinstellungen", "aquariumCaEinstellungen", "aquariumMgEinstellungen",
    "aquariumNo3Einstellungen", "aquariumPo4Einstellungen",
    "aquariumSalEinstellungen", "aquariumTempEinstellungen"
  ];
  const unsicherKey = "aquarium-cloud-datenzustand-unsicher-v1";
  const markerKey = "aquarium-cloud-wiederherstellung-aktiv-v1";
  let aktiv = false;
  let eingabenPausiert = false;
  let fremdeAenderungErkannt = false;
  let dokumentVerlassen = false;
  let sperreFreigeben = null;
  let grund = "Datenschutz wird vorbereitet. Bitte kurz warten.";
  let bereitMelden;
  const bereit = new Promise(resolve => { bereitMelden = resolve; });

  function hinweis(text) {
    grund = text;
    if (!document.body) return;
    let element = document.getElementById("aquariumSchreibschutzHinweis");
    if (!element) {
      element = document.createElement("p");
      element.id = "aquariumSchreibschutzHinweis";
      element.setAttribute("role", "alert");
      element.style.cssText = "padding:12px;border:2px solid #b45309;background:#fff7ed;color:#7c2d12;";
      document.body.prepend(element);
    }
    element.textContent = text;
    element.hidden = false;
  }

  function sperren(text) {
    aktiv = false;
    hinweis(text);
  }

  function darfSchreiben(wiederherstellung = false) {
    if (!aktiv) {
      hinweis(grund);
      return false;
    }
    if (!wiederherstellung && eingabenPausiert) {
      hinweis("Aquarium-Daten wurden wiederhergestellt. Bitte die Seite vor weiteren Änderungen neu laden.");
      return false;
    }
    try {
      if (aquariumCloudTestspeicher.getItem(unsicherKey) === "true") {
        hinweis("Speichern und Synchronisieren gesperrt: Der Aquarium-Datenzustand muss zuerst geprüft werden.");
        return false;
      }
      if (!wiederherstellung && aquariumCloudTestspeicher.getItem(markerKey) === "true") {
        hinweis("Eine Wiederherstellung ist aktiv oder wurde unterbrochen. Neue Änderungen bleiben vorerst gesperrt.");
        return false;
      }
    } catch (fehler) {
      sperren("Der lokale Speicher ist nicht zuverlässig lesbar. Änderungen bleiben gesperrt.");
      return false;
    }
    return true;
  }

  function pausiereEingaben() {
    eingabenPausiert = true;
  }

  function markiereUnsicher() {
    sperren("Der Aquarium-Datenzustand ist ungeklärt. Bitte keine weiteren Änderungen vornehmen und das Sicherheitsbackup behalten.");
    try {
      aquariumCloudTestspeicher.setItem(unsicherKey, "true");
    } catch (fehler) {
      console.error("Die Sicherheitssperre konnte nicht dauerhaft gespeichert werden.", fehler);
    }
  }

  window.aquariumSchreibschutz = Object.freeze({
    bereit, darfSchreiben, pausiereEingaben, markiereUnsicher
  });
  document.addEventListener("DOMContentLoaded", () => {
    if (!aktiv) hinweis(grund);
  });

  // Ein anderes oder älteres Fenster darf keinen veralteten Arbeitsspeicher hinterlassen.
  window.addEventListener("storage", event => {
    const testKey = window.aquariumCloudTestEreignisschluessel(event);
    if (testKey === undefined) return;
    if (testKey === null || schluessel.includes(testKey) ||
        testKey === unsicherKey || testKey === markerKey) {
      fremdeAenderungErkannt = true;
      sperren("Aquarium-Daten wurden in einem anderen Fenster verändert. Bitte andere Aquarium-Fenster schließen und diese Seite neu laden.");
    }
  });

  // Eine aus dem Zurück-Cache geholte Seite kann veraltete Daten enthalten.
  window.addEventListener("pageshow", event => {
    if (event.persisted) {
      fremdeAenderungErkannt = true;
      sperren("Diese Seite wurde aus dem Zwischenspeicher geöffnet. Bitte vor weiteren Änderungen neu laden.");
    }
  });

  window.addEventListener("pagehide", () => {
    dokumentVerlassen = true;
    sperren("Diese Seite wurde verlassen. Bitte vor weiteren Änderungen neu laden.");
    // Vor der Freigabe sind auch noch ausstehende Cloud-Antworten gesperrt.
    if (sperreFreigeben) sperreFreigeben();
  });

  let startzustand;
  try {
    startzustand = schluessel.map(key => aquariumCloudTestspeicher.getItem(key));
    if (!navigator.locks || typeof navigator.locks.request !== "function") {
      sperren("Dieser Browser kann die sichere Fenstersperre nicht bereitstellen. Speichern und Synchronisieren bleiben gesperrt.");
      bereitMelden(false);
      return;
    }
    navigator.locks.request(
      "aquarium-cloud-test-schreibzugriff-v1",
      { mode: "exclusive", ifAvailable: true },
      async lock => {
        if (!lock) {
          sperren("Aquarium Tracker ist bereits in einem anderen Fenster aktiv. Bitte dieses Fenster schließen oder nach dem Schließen des anderen Fensters neu laden.");
          bereitMelden(false);
          return;
        }
        if (dokumentVerlassen || fremdeAenderungErkannt ||
            !schluessel.every((key, index) => aquariumCloudTestspeicher.getItem(key) === startzustand[index])) {
          sperren("Aquarium-Daten haben sich beim Öffnen verändert. Bitte vor weiteren Änderungen neu laden.");
          bereitMelden(false);
          return;
        }
        aktiv = true;
        const element = document.getElementById("aquariumSchreibschutzHinweis");
        if (element) element.hidden = true;
        bereitMelden(true);
        // Kein Ablauf nach Zeit: auch ein langsamer Cloud-Vorgang bleibt geschützt.
        // Beim Verlassen freigeben, damit der Zurück-Cache keine neue Seite blockiert.
        await new Promise(resolve => { sperreFreigeben = resolve; });
      }
    ).catch(() => {
      sperren("Die sichere Fenstersperre konnte nicht eingerichtet werden. Änderungen bleiben gesperrt.");
      bereitMelden(false);
    });
  } catch (fehler) {
    sperren("Der Datenschutz konnte nicht vorbereitet werden. Änderungen bleiben gesperrt.");
    bereitMelden(false);
  }
})();
