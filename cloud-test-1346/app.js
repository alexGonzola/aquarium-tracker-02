
const STORAGE_KEY = "aquarium-tracker-messwerte-v1";

const eintraege = JSON.parse(
  aquariumCloudTestspeicher.getItem(STORAGE_KEY) || "[]"
);

const einheiten = {
  KH: "dKH",
  Ca: "mg/l",
  Mg: "mg/l",
  NO3: "mg/l",
  PO4: "mg/l",
  "Salinität": "PSU",
  "Temperatur": "°C"
};

// Zielbereiche für die Wasserwerte
// Hier legen wir später die Grenzen für Grün, Gelb und Rot fest.

const zielbereiche = {
  KH: { min: 7, max: 9, toleranz: 0.5 },
  Ca: { min: 400, max: 450, toleranz: 20 },
  Mg: { min: 1250, max: 1400, toleranz: 50 },
  NO3: { min: 2, max: 15, toleranz: 5 },
  PO4: { min: 0.03, max: 0.10, toleranz: 0.02 },
  "Salinität": { min: 34, max: 36, toleranz: 0.5 },
  "Temperatur": { min: 24, max: 26, toleranz: 0.5 }
};

function pruefeWasserwert(parameter, wert) {
const khEinstellungen = leseZielbereich("KH");

const khFelderGueltig =
  document.getElementById("khMin").value.trim() !== "" &&
  document.getElementById("khMax").value.trim() !== "" &&
  document.getElementById("khToleranz").value.trim() !== "" &&
  khEinstellungen.min < khEinstellungen.max &&
  khEinstellungen.toleranz >= 0;

const bereich =
  parameter === "KH" && khFelderGueltig
    ? khEinstellungen
    : parameter === "Ca"
      ? leseZielbereich("Ca")
      : parameter === "Mg"
        ? leseZielbereich("Mg")
        : parameter === "NO3"
          ? leseZielbereich("NO3")
          : parameter === "PO4"
            ? leseZielbereich("PO4")
            : parameter === "Salinität"
              ? leseZielbereich("Salinität")
              : parameter === "Temperatur"
                ? leseZielbereich("Temperatur")
                : zielbereiche[parameter];

  if (!bereich) {
    return "unbekannt";
  }

  // 🟢 Wert liegt im Zielbereich
  if (wert >= bereich.min && wert <= bereich.max) {
    return "gruen";
  }

  // 🟡 Wert liegt knapp außerhalb des Zielbereichs
  if (
    wert >= bereich.min - bereich.toleranz &&
    wert <= bereich.max + bereich.toleranz
  ) {
    return "gelb";
  }

  // 🔴 Wert liegt deutlich außerhalb des Zielbereichs
  return "rot";
}

function wasserwertStatusText(status) {
  if (status === "gruen") {
    return "🟢 Im Zielbereich";
  }

  if (status === "gelb") {
    return "🟡 Leichte Abweichung";
  }

  if (status === "rot") {
    return "🔴 Deutliche Abweichung";
  }

  return "⚪ Kein Zielbereich festgelegt";
}

function leseKhEinstellungen() {
  const minimum = Number(document.getElementById("khMin").value);
  const maximum = Number(document.getElementById("khMax").value);
  const toleranz = Number(document.getElementById("khToleranz").value);

  return {
    min: minimum,
    max: maximum,
    toleranz: toleranz
  };
}

function leseZielbereich(parameter) {
  const felder = document.querySelectorAll(
    `[data-parameter="${parameter}"]`
  );

  const einstellungen = {};

  for (const feld of felder) {
    const name = feld.dataset.feld;
    einstellungen[name] = Number(feld.value);
  }

  return einstellungen;
}

function speichereKhEinstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const khMin = document.getElementById("khMin");
  const khMax = document.getElementById("khMax");
  const khToleranz = document.getElementById("khToleranz");

if (
  khMin.value.trim() === "" ||
  khMax.value.trim() === "" ||
  khToleranz.value.trim() === ""
) {
  alert("Bitte alle drei KH-Einstellungen ausfüllen.");
  return;
}



  const einstellungen = leseKhEinstellungen();

  if (einstellungen.min >= einstellungen.max) {
  alert("Das KH-Minimum muss kleiner als das Maximum sein.");
  return;
}

if (einstellungen.toleranz < 0) {
  alert("Die KH-Toleranz darf nicht negativ sein.");
  return;
}

  aquariumCloudTestspeicher.setItem(
    "aquariumKhEinstellungen",
    JSON.stringify(einstellungen)
  );
}

function speichereCaEinstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const einstellungen = leseZielbereich("Ca");

  if (
    document.getElementById("caMin").value.trim() === "" ||
    document.getElementById("caMax").value.trim() === "" ||
    document.getElementById("caToleranz").value.trim() === ""
  ) {
    alert("Bitte alle drei Calcium-Einstellungen ausfüllen.");
    return;
  }

  if (einstellungen.min >= einstellungen.max) {
    alert("Das Calcium-Minimum muss kleiner als das Maximum sein.");
    return;
  }

  if (einstellungen.toleranz < 0) {
    alert("Die Calcium-Toleranz darf nicht negativ sein.");
    return;
  }

  aquariumCloudTestspeicher.setItem(
    "aquariumCaEinstellungen",
    JSON.stringify(einstellungen)
  );
}

function speichereMgEinstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const einstellungen = leseZielbereich("Mg");

  if (
    document.getElementById("mgMin").value.trim() === "" ||
    document.getElementById("mgMax").value.trim() === "" ||
    document.getElementById("mgToleranz").value.trim() === ""
  ) {
    alert("Bitte alle drei Magnesium-Einstellungen ausfüllen.");
    return;
  }

  if (einstellungen.min >= einstellungen.max) {
    alert("Das Magnesium-Minimum muss kleiner als das Maximum sein.");
    return;
  }

  if (einstellungen.toleranz < 0) {
    alert("Die Magnesium-Toleranz darf nicht negativ sein.");
    return;
  }

  aquariumCloudTestspeicher.setItem(
    "aquariumMgEinstellungen",
    JSON.stringify(einstellungen)
  );
}

function speichereNo3Einstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const einstellungen = leseZielbereich("NO3");

  if (
    document.getElementById("no3Min").value.trim() === "" ||
    document.getElementById("no3Max").value.trim() === "" ||
    document.getElementById("no3Toleranz").value.trim() === ""
  ) {
    alert("Bitte alle drei NO3-Einstellungen ausfüllen.");
    return;
  }

  if (einstellungen.min >= einstellungen.max) {
    alert("Das NO3-Minimum muss kleiner als das Maximum sein.");
    return;
  }

  if (einstellungen.toleranz < 0) {
    alert("Die NO3-Toleranz darf nicht negativ sein.");
    return;
  }

  aquariumCloudTestspeicher.setItem(
    "aquariumNo3Einstellungen",
    JSON.stringify(einstellungen)
  );
}

function ladeNo3Einstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumNo3Einstellungen");

  if (!gespeichert) return;

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("no3Min").value = einstellungen.min;
  document.getElementById("no3Max").value = einstellungen.max;
  document.getElementById("no3Toleranz").value = einstellungen.toleranz;
}

function speicherePo4Einstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const einstellungen = leseZielbereich("PO4");

  if (
    document.getElementById("po4Min").value.trim() === "" ||
    document.getElementById("po4Max").value.trim() === "" ||
    document.getElementById("po4Toleranz").value.trim() === ""
  ) {
    alert("Bitte alle drei PO4-Einstellungen ausfüllen.");
    return;
  }

  if (einstellungen.min >= einstellungen.max) {
    alert("Das PO4-Minimum muss kleiner als das Maximum sein.");
    return;
  }

  if (einstellungen.toleranz < 0) {
    alert("Die PO4-Toleranz darf nicht negativ sein.");
    return;
  }

  aquariumCloudTestspeicher.setItem(
    "aquariumPo4Einstellungen",
    JSON.stringify(einstellungen)
  );
}

function ladePo4Einstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumPo4Einstellungen");

  if (!gespeichert) return;

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("po4Min").value = einstellungen.min;
  document.getElementById("po4Max").value = einstellungen.max;
  document.getElementById("po4Toleranz").value = einstellungen.toleranz;
}

function speichereSalEinstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const einstellungen = leseZielbereich("Salinität");

  if (
    document.getElementById("salMin").value.trim() === "" ||
    document.getElementById("salMax").value.trim() === "" ||
    document.getElementById("salToleranz").value.trim() === ""
  ) {
    alert("Bitte alle drei Salinitäts-Einstellungen ausfüllen.");
    return;
  }

  if (einstellungen.min >= einstellungen.max) {
    alert("Das Salinitäts-Minimum muss kleiner als das Maximum sein.");
    return;
  }

  if (einstellungen.toleranz < 0) {
    alert("Die Salinitäts-Toleranz darf nicht negativ sein.");
    return;
  }

  aquariumCloudTestspeicher.setItem(
    "aquariumSalEinstellungen",
    JSON.stringify(einstellungen)
  );
}

function ladeSalEinstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumSalEinstellungen");

  if (!gespeichert) return;

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("salMin").value = einstellungen.min;
  document.getElementById("salMax").value = einstellungen.max;
  document.getElementById("salToleranz").value = einstellungen.toleranz;
}

function speichereTempEinstellungen() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  const einstellungen = leseZielbereich("Temperatur");

  if (
    document.getElementById("tempMin").value.trim() === "" ||
    document.getElementById("tempMax").value.trim() === "" ||
    document.getElementById("tempToleranz").value.trim() === ""
  ) {
    alert("Bitte alle drei Temperatur-Einstellungen ausfüllen.");
    return;
  }

  if (einstellungen.min >= einstellungen.max) {
    alert("Das Temperatur-Minimum muss kleiner als das Maximum sein.");
    return;
  }

  if (einstellungen.toleranz < 0) {
    alert("Die Temperatur-Toleranz darf nicht negativ sein.");
    return;
  }

  aquariumCloudTestspeicher.setItem(
    "aquariumTempEinstellungen",
    JSON.stringify(einstellungen)
  );
}

function ladeTempEinstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumTempEinstellungen");

  if (!gespeichert) return;

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("tempMin").value = einstellungen.min;
  document.getElementById("tempMax").value = einstellungen.max;
  document.getElementById("tempToleranz").value = einstellungen.toleranz;
}

function ladeKhEinstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumKhEinstellungen");

  if (!gespeichert) {
    return;
  }

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("khMin").value = einstellungen.min;
  document.getElementById("khMax").value = einstellungen.max;
  document.getElementById("khToleranz").value = einstellungen.toleranz;
}

function ladeCaEinstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumCaEinstellungen");

  if (!gespeichert) return;

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("caMin").value = einstellungen.min;
  document.getElementById("caMax").value = einstellungen.max;
  document.getElementById("caToleranz").value = einstellungen.toleranz;
}

function ladeMgEinstellungen() {
  const gespeichert = aquariumCloudTestspeicher.getItem("aquariumMgEinstellungen");

  if (!gespeichert) return;

  const einstellungen = JSON.parse(gespeichert);

  document.getElementById("mgMin").value = einstellungen.min;
  document.getElementById("mgMax").value = einstellungen.max;
  document.getElementById("mgToleranz").value = einstellungen.toleranz;
}

const namen = {
  KH: "KH",
  Ca: "Calcium",
  Mg: "Magnesium",
  NO3: "Nitrat",
  PO4: "Phosphat",
  "Salinität": "Salinität",
  "Temperatur": "Temperatur"
};

const form = document.getElementById("werteForm");

form.addEventListener("submit", function(event) {
  event.preventDefault();
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;

  const parameter =
    document.getElementById("parameter").value;

  const wert =
    document.getElementById("messwert").value;

  if (wert.trim() === "") return;

  const eintrag = {
    id: crypto.randomUUID(),
    parameter: parameter,
    wert: Number(wert),
    datum: new Date().toISOString()
  };

  eintraege.push(eintrag);

  aquariumCloudTestspeicher.setItem(
  STORAGE_KEY,
  JSON.stringify(eintraege)
);

form.reset();
anzeigen();

// Automatische Cloud-Synchronisierung anfordern
if (typeof speichereAutomatischInCloud === "function") {
  speichereAutomatischInCloud().catch(fehler => {
    console.error(
      "🔴 Automatische Cloud-Synchronisierung fehlgeschlagen:",
      fehler
    );
  });
}
});

function anzeigen() {
  const aktuelleWerte =
    document.getElementById("aktuelleWerte");

  aktuelleWerte.replaceChildren();
 
  const sortiert = [...eintraege].sort(
    (a, b) => new Date(b.datum) - new Date(a.datum)
  );

  const letzteWerte = new Map();

  for (const eintrag of sortiert) {
    if (!letzteWerte.has(eintrag.parameter)) {
      letzteWerte.set(eintrag.parameter, eintrag);
    }
  }

  for (const [parameter, eintrag] of letzteWerte) {
    const karte = document.createElement("div");
    karte.className = "wert";

    const status = pruefeWasserwert(parameter, Number(eintrag.wert));

karte.classList.add("status-" + status);
    

    const titel = document.createElement("small");
    titel.textContent = namen[parameter] || parameter;

    const wert = document.createElement("strong");
    wert.textContent =
      `${eintrag.wert} ${einheiten[parameter] || ""}`;


const statusText = document.createElement("small");
statusText.textContent = wasserwertStatusText(status);
    
      karte.append(titel, wert, statusText);
    aktuelleWerte.appendChild(karte);
  }

  if (eintraege.length === 0) {
    aktuelleWerte.textContent =
      "Noch keine Messwerte vorhanden.";
  }
}

anzeigen();

const diagrammAuswahl =
  document.getElementById("diagrammParameter");

diagrammAuswahl.addEventListener(
  "change",
  zeichneDiagramm
);

function zeichneDiagramm() {
  const parameter = diagrammAuswahl.value;
  const container = document.getElementById("diagramm");

  container.replaceChildren();

  const daten = eintraege
    .filter(e =>
      e.parameter === parameter &&
      Number.isFinite(Number(e.wert)) &&
      !Number.isNaN(Date.parse(e.datum))
    )
    .sort((a, b) =>
      new Date(a.datum) - new Date(b.datum)
    );

  if (daten.length === 0) {
    const hinweis = document.createElement("p");
    hinweis.className = "hinweis";
    hinweis.textContent =
      "Noch keine Messwerte für diesen Parameter.";
    container.appendChild(hinweis);
    return;
  }

  const breite = 600;
  const hoehe = 260;
  const links = 60;
  const rechts = 20;
  const oben = 25;
  const unten = 45;

  const svgNS = "http://www.w3.org/2000/svg";

  function element(tag, attribute, text) {
    const el = document.createElementNS(svgNS, tag);

    for (const [name, wert] of Object.entries(attribute)) {
      el.setAttribute(name, wert);
    }

    if (text !== undefined) el.textContent = text;
    return el;
  }

  const svg = element("svg", {
    viewBox: `0 0 ${breite} ${hoehe}`,
    role: "img",
    "aria-label": `Verlauf für ${namen[parameter]}`
  });

  const werte = daten.map(e => Number(e.wert));
  const minWert = Math.min(...werte);
  const maxWert = Math.max(...werte);
  const abstand = Math.max((maxWert - minWert) * 0.15, 0.01);

  const yMin = minWert - abstand;
  const yMax = maxWert + abstand;

  const zeiten = daten.map(e => new Date(e.datum).getTime());
  const xMin = Math.min(...zeiten);
  const xMax = Math.max(...zeiten);

  function xPosition(zeit, index) {
    if (xMin === xMax) {
      return links + (breite - links - rechts) / 2;
    }

    return links +
      ((zeit - xMin) / (xMax - xMin)) *
      (breite - links - rechts);
  }

  function yPosition(wert) {
    return oben +
      (1 - (wert - yMin) / (yMax - yMin)) *
      (hoehe - oben - unten);
  }

  for (let i = 0; i <= 4; i++) {
    const y = oben + i * (hoehe - oben - unten) / 4;
    const wert = yMax - i * (yMax - yMin) / 4;

    svg.appendChild(element("line", {
      x1: links, y1: y,
      x2: breite - rechts, y2: y,
      class: "gitter"
    }));

    svg.appendChild(element("text", {
      x: links - 10,
      y: y + 4,
      "text-anchor": "end"
    }, Number(wert.toFixed(3)).toString()));
  }

  const punkte = daten.map((e, index) => ({
    x: xPosition(zeiten[index], index),
    y: yPosition(Number(e.wert)),
    datum: e.datum,
    wert: e.wert
  }));

  const pfad = punkte.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
  ).join(" ");

  svg.appendChild(element("path", {
    d: pfad,
    class: "linie"
  }));

  for (const p of punkte) {
    const kreis = element("circle", {
      cx: p.x,
      cy: p.y,
      r: 5,
      class: "punkt"
    });

    kreis.appendChild(element("title", {},
      `${new Date(p.datum).toLocaleString("de-AT")}: ` +
      `${p.wert} ${einheiten[parameter]}`
    ));

    svg.appendChild(kreis);
  }

  const startDatum = new Date(xMin).toLocaleDateString("de-AT");
  const endDatum = new Date(xMax).toLocaleDateString("de-AT");

  svg.appendChild(element("text", {
    x: links,
    y: hoehe - 12,
    "text-anchor": "start"
  }, startDatum));

  svg.appendChild(element("text", {
    x: breite - rechts,
    y: hoehe - 12,
    "text-anchor": "end"
  }, endDatum));

  container.appendChild(svg);
}

// Auch nach dem Speichern eines Messwerts aktualisieren
const urspruenglichAnzeigen = anzeigen;

anzeigen = function() {
  urspruenglichAnzeigen();
  zeichneDiagramm();
};

zeichneDiagramm();

const EREIGNIS_KEY = "aquarium-tracker-ereignisse-v1";

const ereignisse = JSON.parse(
  aquariumCloudTestspeicher.getItem(EREIGNIS_KEY) || "[]"
);

function speichereEreignis(typ, titel, notiz, datum, automatischSynchronisieren = true) {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  ereignisse.push({
    id: crypto.randomUUID(),
    typ,
    titel,
    notiz,
    datum: datum + "T12:00:00"
  });

  aquariumCloudTestspeicher.setItem(
    EREIGNIS_KEY,
    JSON.stringify(ereignisse)
  );

  aktualisiereTimeline();

  // Änderungen automatisch in der Cloud speichern
  if (
  automatischSynchronisieren &&
  typeof speichereAutomatischInCloud === "function"
) {
    speichereAutomatischInCloud().catch(fehler => {
      console.error(
        "🔴 Automatische Cloud-Synchronisierung fehlgeschlagen:",
        fehler
      );
    });
  }
}

function lokalesDatum() {
  const jetzt = new Date();
  const jahr = jetzt.getFullYear();
  const monat = String(jetzt.getMonth() + 1).padStart(2, "0");
  const tag = String(jetzt.getDate()).padStart(2, "0");
  return `${jahr}-${monat}-${tag}`;
}

document.getElementById("wasserwechselDatum").value =
  lokalesDatum();

document.getElementById("wartungDatum").value =
  lokalesDatum();

document.getElementById("wasserwechselForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;

    const datum =
      document.getElementById("wasserwechselDatum").value;

    const liter = Number(
      document.getElementById("wasserwechselLiter").value
    );

    const notiz =
      document.getElementById("wasserwechselNotiz").value;

    if (!Number.isFinite(liter) || liter <= 0) return;

    speichereEreignis(
      "wasserwechsel",
      `💧 ${liter} Liter Wasserwechsel`,
      notiz,
      datum
    );

    this.reset();
    document.getElementById("wasserwechselDatum").value =
      lokalesDatum();
  });


document.getElementById("wartungForm")
  .addEventListener("submit", function(event) {
    event.preventDefault();
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;

    const typ =
      document.getElementById("wartungTyp").value;

    const datum =
      document.getElementById("wartungDatum").value;

    const notiz =
      document.getElementById("wartungNotiz").value;

    const bezeichnungen = {
      filtersocken: "Vliesrolle wechseln",
      aktivkohle: "Aktivkohle wechseln",
      abschaeumer: "Abschäumer reinigen",
      uv: "UV-Anlage warten",
      pumpen: "Strömungspumpen reinigen"
    };

    const titel = bezeichnungen[typ] || typ;

    speichereEreignis(
  "wartung",
  "🔧 " + titel,
  notiz,
  datum,
  false
);

    // Wartungsart am letzten Ereignis hinterlegen
    const letztesEreignis =
      ereignisse[ereignisse.length - 1];

    if (letztesEreignis) {
      letztesEreignis.wartungId = typ;

      aquariumCloudTestspeicher.setItem(
        EREIGNIS_KEY,
        JSON.stringify(ereignisse)
      );

      zeigeNaechsteWartungen();
    }

    this.reset();

    document.getElementById("wartungDatum").value =
      lokalesDatum();

    // Wartungsübersicht aktualisieren
    if (typeof zeigeWartungsplan === "function") {
      zeigeWartungsplan();
    }

    // Vollständig gespeicherte Wartung automatisch synchronisieren
if (typeof speichereAutomatischInCloud === "function") {
  speichereAutomatischInCloud().catch(fehler => {
    console.error(
      "🔴 Automatische Wartungssynchronisierung fehlgeschlagen:",
      fehler
    );
  });
}
    
  });


// Bestehende Anzeige um die gemeinsame Timeline erweitern
const bisherigeAnzeige = anzeigen;

anzeigen = function() {
  bisherigeAnzeige();
  aktualisiereTimeline();
};



const backupExport =
  document.getElementById("backupExport");

const backupImport =
  document.getElementById("backupImport");

const backupStatus =
  document.getElementById("backupStatus");

// Backup Version 2 herunterladen
function erstelleAquariumBackup() {
  
const backup = {
  app: "Aquarium Tracker",
  version: 4,
  erstellt: new Date().toISOString(),

  messwerte: eintraege,
  ereignisse: ereignisse,
  dosierungen: dosierungen,

  wartungsplan: JSON.parse(
    aquariumCloudTestspeicher.getItem("aquarium-wartungsplan-v1") || "{}"
  ),

  zielbereiche: {
    KH: leseZielbereich("KH"),
    Ca: leseZielbereich("Ca"),
    Mg: leseZielbereich("Mg"),
    NO3: leseZielbereich("NO3"),
    PO4: leseZielbereich("PO4"),
    Salinitaet: leseZielbereich("Salinität"),
    Temperatur: leseZielbereich("Temperatur")
  }
};

   return backup;
}

window.erstelleAquariumBackup = erstelleAquariumBackup;

backupExport.addEventListener("click", function() {
  
  const backup = erstelleAquariumBackup();

  const datei = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(datei);
  const link = document.createElement("a");

  link.href = url;
  link.download =
  "aquarium-backup-v" + backup.version + "-" + lokalesDatum() + ".json";

  document.body.appendChild(link);
  link.click();
  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);

  backupStatus.textContent =
    alert("Backup Version " + backup.version + " wurde heruntergeladen.");
});

const CLOUD_WIEDERHERSTELLUNG_FREIGABE = Symbol(
  "aquarium-cloud-wiederherstellung"
);

// Gemeinsame Wiederherstellung für JSON und Cloud
function stelleAquariumBackupWiederHer(
  backup,
  bestaetigungErforderlich = true,
  freigabe = null
) {
  if (window.aquariumSchreibschutz?.darfSchreiben(bestaetigungErforderlich === false) !== true) {
    return false;
  }
  // Ein manueller Import darf keinen laufenden Cloud-Vorgang überholen.
  if (bestaetigungErforderlich === true && (
    (typeof automatischerUploadLaeuft !== "undefined" && automatischerUploadLaeuft) ||
    (typeof geschuetzterUploadLaeuft !== "undefined" && geschuetzterUploadLaeuft) ||
    (typeof cloudWiederherstellungLaeuft !== "undefined" && cloudWiederherstellungLaeuft) ||
    (typeof synchronisierungLaeuft !== "undefined" && synchronisierungLaeuft)
  )) {
    return false;
  }

  // Zuerst prüfen, ob gültige Daten übergeben wurden
  if (!backup || typeof backup !== "object") {
    throw new Error("Ungültige Backup-Daten.");
  }

  // Backup-Version überprüfen
if (
  backup.app !== "Aquarium Tracker" ||
  ![1, 2, 3, 4].includes(backup.version)
) {
  throw new Error("Ungültige Backup-Version.");
}

// Messwerte und Ereignisse überprüfen
if (
  !Array.isArray(backup.messwerte) ||
  !Array.isArray(backup.ereignisse)
) {
  throw new Error("Ungültige Messwerte oder Ereignisse.");
}

// Dosierungen ab Backup-Version 2 überprüfen
if (
  backup.version >= 2 &&
  !Array.isArray(backup.dosierungen)
) {
  throw new Error("Ungültige Dosierungen.");
}

// Ältere Backups hatten noch keine Dosierungen
const neueDosierungen =
  backup.version >= 2 ? backup.dosierungen : [];

// Wartungsplan ab Backup-Version 3 überprüfen
if (
  backup.version >= 3 &&
  (
    backup.wartungsplan === null ||
    typeof backup.wartungsplan !== "object" ||
    Array.isArray(backup.wartungsplan)
  )
) {
  throw new Error("Ungültiger Wartungsplan.");
}

// Ältere Backups hatten noch keinen Wartungsplan
const neuerWartungsplan =
  backup.version >= 3 ? backup.wartungsplan : {};

// Speicherplätze für unsere sieben Zielbereiche
const zielbereichSchluessel = {
  KH: "aquariumKhEinstellungen",
  Ca: "aquariumCaEinstellungen",
  Mg: "aquariumMgEinstellungen",
  NO3: "aquariumNo3Einstellungen",
  PO4: "aquariumPo4Einstellungen",
  Salinitaet: "aquariumSalEinstellungen",
  Temperatur: "aquariumTempEinstellungen"
};

// Zielbereiche ab Backup-Version 4 überprüfen
if (backup.version >= 4) {

  const gueltigeZielbereiche =
    backup.zielbereiche !== null &&
    typeof backup.zielbereiche === "object" &&
    !Array.isArray(backup.zielbereiche) &&
    Object.keys(zielbereichSchluessel).every(parameter => {

      const bereich = backup.zielbereiche[parameter];

      return (
        bereich !== null &&
        typeof bereich === "object" &&
        !Array.isArray(bereich) &&
        Number.isFinite(bereich.min) &&
        Number.isFinite(bereich.max) &&
        Number.isFinite(bereich.toleranz) &&
        bereich.min >= 0 &&
        bereich.min < bereich.max &&
        bereich.toleranz >= 0
      );
    });

  if (!gueltigeZielbereiche) {
    throw new Error("Ungültige Zielbereiche.");
  }

}

  // Einzelne Messwerte überprüfen
  
  // Einzelne Messwerte überprüfen
const gueltigeMesswerte = backup.messwerte.every(e =>
  e &&
  typeof e.parameter === "string" &&
  typeof e.wert === "number" &&
  Number.isFinite(e.wert) &&
  typeof e.datum === "string" &&
  Number.isFinite(Date.parse(e.datum))
);

if (!gueltigeMesswerte) {
  throw new Error("Ungültige Messwert-Einträge.");
}

// Einzelne Ereignisse überprüfen
const gueltigeEreignisse = backup.ereignisse.every(e =>
  e &&
  typeof e.typ === "string" &&
  typeof e.titel === "string" &&
  typeof e.notiz === "string" &&
  typeof e.datum === "string" &&
  Number.isFinite(Date.parse(e.datum))
);

if (!gueltigeEreignisse) {
  throw new Error("Ungültige Ereignis-Einträge.");
}

// Einzelne Dosierungen überprüfen
const gueltigeDosierungen = neueDosierungen.every(e =>
  e &&
  typeof e.produkt === "string" &&
  typeof e.menge === "number" &&
  Number.isFinite(e.menge) &&
  e.menge >= 0 &&
  typeof e.einheit === "string" &&
  typeof e.notiz === "string" &&
  typeof e.datum === "string" &&
  Number.isFinite(Date.parse(e.datum))
);

if (!gueltigeDosierungen) {
  throw new Error("Ungültige Dosierungs-Einträge.");
}

// Einzelne Wartungsplan-Einträge überprüfen
const gueltigerWartungsplan =
  neuerWartungsplan !== null &&
  typeof neuerWartungsplan === "object" &&
  !Array.isArray(neuerWartungsplan) &&
  Object.values(neuerWartungsplan).every(e =>
    e !== null &&
    typeof e === "object" &&
    !Array.isArray(e) &&
    Number.isInteger(e.intervall) &&
    e.intervall >= 1 &&
    typeof e.erinnerung === "boolean" &&
    Number.isInteger(e.vorwarnung) &&
    e.vorwarnung >= 0
  );

if (!gueltigerWartungsplan) {
  throw new Error("Ungültige Wartungsplan-Einträge.");
}
 
// Speicherplätze für die Wiederherstellung vorbereiten
const schluessel = [
  STORAGE_KEY,
  EREIGNIS_KEY,
  DOSIERUNG_KEY,
  "aquarium-wartungsplan-v1"
];

// Daten für die Wiederherstellung vorbereiten
const neueWerte = [
  backup.messwerte,
  backup.ereignisse,
  neueDosierungen,
  neuerWartungsplan
];

// Zielbereiche nur bei Backup-Version 4 übernehmen
if (backup.version >= 4) {
  for (const [parameter, speicherKey] of Object.entries(zielbereichSchluessel)) {
    schluessel.push(speicherKey);
    neueWerte.push(backup.zielbereiche[parameter]);
  }
}

// Bisherige Daten für eine mögliche Wiederherstellung sichern
const vorher = schluessel.map(
  key => aquariumCloudTestspeicher.getItem(key)
);

// 🔒 Ursprünglichen Datenzustand für die letzte Prüfung merken
const urspruenglicheDaten = [...vorher];

  console.log(
    "Gemeinsame Wiederherstellung vorbereitet:",
    backup.version
  );

// 🔒 Automatische Wiederherstellung nur mit internem Freigabewert
if (
  bestaetigungErforderlich === false &&
  freigabe !== CLOUD_WIEDERHERSTELLUNG_FREIGABE
) {
  throw new Error(
    "Automatische Wiederherstellung nicht autorisiert."
  );
}

  // 🔒 Bei manueller Wiederherstellung Bestätigung verlangen
if (bestaetigungErforderlich === true) {

  const bestaetigt = confirm(
    "Alle aktuellen Aquarium-Daten werden " +
    "durch dieses Backup ersetzt. Fortfahren?"
  );

  if (!bestaetigt) {
    console.log("Wiederherstellung abgebrochen.");
    return false;
  }

}

// Cloud-Wiederherstellung aktiviert
console.log("Cloud-Wiederherstellung gestartet.");
console.log("Betroffene Speicherplätze:", schluessel.length);

// 🔒 Prüfen, ob lokale Daten seit der Vorbereitung verändert wurden
const lokaleDatenNochUnveraendert = schluessel.every(
  (key, index) =>
    aquariumCloudTestspeicher.getItem(key) === urspruenglicheDaten[index]
);

if (!lokaleDatenNochUnveraendert) {
  console.warn(
    "🔒 Wiederherstellung gestoppt: Lokale Daten wurden zwischenzeitlich verändert."
  );

  return false;
}

// Aquarium-Daten sicher speichern
if (window.aquariumSchreibschutz?.darfSchreiben(bestaetigungErforderlich === false) !== true) {
  return false;
}
// 🔒 Alle Werte vor dem ersten Schreibvorgang vorbereiten
const neueSpeichertexte = neueWerte.map(wert => JSON.stringify(wert));
const geschriebeneIndizes = new Set();

// Auch der manuelle Import braucht Originaldaten bei einem Browserabbruch.
const manuellerMarkerKey = "aquarium-cloud-wiederherstellung-aktiv-v1";
if (bestaetigungErforderlich === true) {
  const sicherungsKey = "aquarium-json-import-sicherheitsbackup-v1:" + crypto.randomUUID();
  const sicherungsText = JSON.stringify(Object.fromEntries(
    schluessel.map((key, index) => [key, vorher[index]])
  ));
  if (aquariumCloudTestspeicher.getItem(sicherungsKey) !== null) {
    throw new Error("Ein vorhandenes Import-Sicherheitsbackup darf nicht ersetzt werden.");
  }
  aquariumCloudTestspeicher.setItem(sicherungsKey, sicherungsText);
  if (aquariumCloudTestspeicher.getItem(sicherungsKey) !== sicherungsText) {
    throw new Error("Import-Sicherheitsbackup konnte nicht bestätigt werden.");
  }
  aquariumCloudTestspeicher.setItem(manuellerMarkerKey, "true");
  if (aquariumCloudTestspeicher.getItem(manuellerMarkerKey) !== "true") {
    throw new Error("Import-Sicherheitskennzeichnung konnte nicht bestätigt werden.");
  }
}

// Veraltete Listen im Arbeitsspeicher dürfen nach einer Übernahme nicht gespeichert werden.
window.aquariumSchreibschutz.pausiereEingaben();

try {
  schluessel.forEach((key, index) => {
    // 🔒 Auch noch nicht geschriebene Bereiche erneut prüfen
    if (aquariumCloudTestspeicher.getItem(key) !== vorher[index]) {
      throw new Error("Lokale Daten wurden während der Wiederherstellung verändert.");
    }

    aquariumCloudTestspeicher.setItem(
      key,
      neueSpeichertexte[index]
    );
    geschriebeneIndizes.add(index);
  });

  // 🔒 Alle gespeicherten Daten nochmals kontrollieren
  const allesKorrektGespeichert = schluessel.every(
    (key, index) =>
      aquariumCloudTestspeicher.getItem(key) ===
      neueSpeichertexte[index]
  );

  if (!allesKorrektGespeichert) {
    throw new Error(
      "Wiederherstellung fehlgeschlagen: Gespeicherte Daten stimmen nicht überein."
    );
  }

} catch (fehler) {

  
  // 🔒 Bei fremden oder nicht lesbaren Änderungen nichts zurückschreiben
  let zustandIstErklaerbar = false;
  try {
    zustandIstErklaerbar = schluessel.every((key, index) => {
      const aktuell = aquariumCloudTestspeicher.getItem(key);
      return aktuell === vorher[index] || (
        geschriebeneIndizes.has(index) &&
        aktuell === neueSpeichertexte[index]
      );
    });
  } catch (pruefFehler) {
    console.error("Lokaler Zustand konnte vor der Rücknahme nicht geprüft werden.", pruefFehler);
  }

  if (!zustandIstErklaerbar) {
    window.aquariumSchreibschutz.markiereUnsicher();
    throw new Error(
      "KRITISCH: Lokaler Datenzustand ist ungeklärt. Keine automatische Rücknahme durchgeführt.",
      { cause: fehler }
    );
  }

  // Nur eigene, erfolgreich geschriebene Werte zurücknehmen
  let ruecksicherungFehlgeschlagen = false;

  for (const index of geschriebeneIndizes) {
    const key = schluessel[index];
    try {
      const aktuell = aquariumCloudTestspeicher.getItem(key);
      if (aktuell === vorher[index]) {
        continue;
      }
      if (aktuell !== neueSpeichertexte[index]) {
        throw new Error("Lokale Änderung vor der Rücknahme erkannt: " + key);
      }
      if (vorher[index] === null) {
        aquariumCloudTestspeicher.removeItem(key);
      } else {
        aquariumCloudTestspeicher.setItem(key, vorher[index]);
      }
    } catch (rollbackFehler) {
      ruecksicherungFehlgeschlagen = true;
      console.error(rollbackFehler);
      // 🔒 Nach einer Abweichung oder einem Fehler keine weiteren Werte ändern
      break;
    }
  }

// 🔒 Rücksicherung vollständig überprüfen
let ruecksicherungKorrekt = false;
try {
  ruecksicherungKorrekt = schluessel.every(
    (key, index) => aquariumCloudTestspeicher.getItem(key) === vorher[index]
  );
} catch (pruefFehler) {
  console.error("Rücknahme konnte nicht vollständig geprüft werden.", pruefFehler);
}

if (!ruecksicherungKorrekt) {
  ruecksicherungFehlgeschlagen = true;

  console.error(
    "🔴 Rücksicherung stimmt nicht mit den ursprünglichen Daten überein."
  );
}

  if (ruecksicherungFehlgeschlagen) {
  window.aquariumSchreibschutz.markiereUnsicher();
  throw new Error(
    "KRITISCH: Die Rücksicherung der ursprünglichen Aquarium-Daten ist fehlgeschlagen.",
    { cause: fehler }
  );
}

  throw fehler;
  
}

// Erfolgreiche Wiederherstellung melden
if (bestaetigungErforderlich === true) {
  aquariumCloudTestspeicher.removeItem(manuellerMarkerKey);
  if (aquariumCloudTestspeicher.getItem(manuellerMarkerKey) !== null) {
    throw new Error("Import-Unterbrechungskennzeichnung konnte nicht entfernt werden.");
  }
}
return true;

}

// 🔒 Gemeinsame Backup-Prüfung vorbereiten
function pruefeAquariumBackup(backup) {

  // Backup muss ein gültiges Objekt sein
  if (
    !backup ||
    typeof backup !== "object" ||
    Array.isArray(backup)
  ) {
    return false;
  }

  // Aquarium Tracker und Backup-Version prüfen
  if (
    backup.app !== "Aquarium Tracker" ||
    backup.version !== 4
  ) {
    return false;
  }

  // Grundstruktur überprüfen
  if (
    !Array.isArray(backup.messwerte) ||
    !Array.isArray(backup.ereignisse) ||
    !Array.isArray(backup.dosierungen)
  ) {
    return false;
  }

  // 💧 Einzelne Wasserwerte überprüfen
  const gueltigeMesswerte = backup.messwerte.every(e =>
    e &&
    typeof e.parameter === "string" &&
    typeof e.wert === "number" &&
    Number.isFinite(e.wert) &&
    typeof e.datum === "string" &&
    Number.isFinite(Date.parse(e.datum))
  );

  if (!gueltigeMesswerte) {
    return false;
  }

    // 📅 Einzelne Ereignisse überprüfen
  const gueltigeEreignisse = backup.ereignisse.every(e =>
    e &&
    typeof e.typ === "string" &&
    typeof e.titel === "string" &&
    typeof e.notiz === "string" &&
    typeof e.datum === "string" &&
    Number.isFinite(Date.parse(e.datum))
  );

  if (!gueltigeEreignisse) {
    return false;
  }

    // 🧪 Einzelne Dosierungen überprüfen
  const gueltigeDosierungen = backup.dosierungen.every(e =>
    e &&
    typeof e.produkt === "string" &&
    typeof e.menge === "number" &&
    Number.isFinite(e.menge) &&
    e.menge >= 0 &&
    typeof e.einheit === "string" &&
    typeof e.notiz === "string" &&
    typeof e.datum === "string" &&
    Number.isFinite(Date.parse(e.datum))
  );

  if (!gueltigeDosierungen) {
    return false;
  }

    // 🔧 Wartungsplan überprüfen
  if (
    !backup.wartungsplan ||
    typeof backup.wartungsplan !== "object" ||
    Array.isArray(backup.wartungsplan)
  ) {
    return false;
  }

  // 🔒 Einzelne Wartungseinstellungen überprüfen
  const gueltigerWartungsplan =
    Object.values(backup.wartungsplan).every(e =>
      e !== null &&
      typeof e === "object" &&
      !Array.isArray(e) &&
      Number.isInteger(e.intervall) &&
      e.intervall >= 1 &&
      typeof e.erinnerung === "boolean" &&
      Number.isInteger(e.vorwarnung) &&
      e.vorwarnung >= 0
    );

  if (!gueltigerWartungsplan) {
    return false;
  }

    // 🎯 Zielbereiche überprüfen
  if (
    !backup.zielbereiche ||
    typeof backup.zielbereiche !== "object" ||
    Array.isArray(backup.zielbereiche)
  ) {
    return false;
  }

  // 🔒 Alle sieben Zielbereiche überprüfen
  const parameterListe = [
    "KH",
    "Ca",
    "Mg",
    "NO3",
    "PO4",
    "Salinitaet",
    "Temperatur"
  ];

  const gueltigeZielbereiche = parameterListe.every(parameter => {

    const bereich = backup.zielbereiche[parameter];

    return (
      bereich !== null &&
      typeof bereich === "object" &&
      !Array.isArray(bereich) &&
      Number.isFinite(bereich.min) &&
      Number.isFinite(bereich.max) &&
      Number.isFinite(bereich.toleranz) &&
      bereich.min >= 0 &&
      bereich.min < bereich.max &&
      bereich.toleranz >= 0
    );

  });

  if (!gueltigeZielbereiche) {
    return false;
  }

  return true;
}

// 🧪 Backup-Prüfung für Tests bereitstellen
window.pruefeAquariumBackup = pruefeAquariumBackup;

// 🔒 Interne Wiederherstellung für den Cloud-Abgleich
function stelleCloudBackupAutomatischWiederHer(backup) {
  return stelleAquariumBackupWiederHer(
    backup,
    false,
    CLOUD_WIEDERHERSTELLUNG_FREIGABE
  );
}

window.stelleCloudBackupAutomatischWiederHer =
  stelleCloudBackupAutomatischWiederHer;

// 🔒 Wiederherstellungsfunktion bereitstellen
window.stelleAquariumBackupWiederHer =
  stelleAquariumBackupWiederHer;

// Backup Version 1 bis 4 wiederherstellen
backupImport.addEventListener("change", async function() {
  const datei = this.files[0];
  if (!datei) return;

  try {
    if (datei.size > 5 * 1024 * 1024) {
      throw new Error("Die Backup-Datei ist zu groß.");
    }

    const backup = JSON.parse(await datei.text());

    
if (
  backup.app !== "Aquarium Tracker" ||
  ![1, 2, 3, 4].includes(backup.version) ||
  !Array.isArray(backup.messwerte) ||
  !Array.isArray(backup.ereignisse) ||
  (backup.version >= 2 &&
    !Array.isArray(backup.dosierungen)) ||
  (backup.version >= 3 &&
    (
      backup.wartungsplan === null ||
      typeof backup.wartungsplan !== "object" ||
      Array.isArray(backup.wartungsplan)
    ))
) {
  throw new Error("Ungültiges Backup-Format.");
}


 const neueDosierungen =
  backup.version >= 2 ? backup.dosierungen : [];

const neuerWartungsplan =
  backup.version >= 3 ? backup.wartungsplan : {};

  const zielbereichSchluessel = {
  KH: "aquariumKhEinstellungen",
  Ca: "aquariumCaEinstellungen",
  Mg: "aquariumMgEinstellungen",
  NO3: "aquariumNo3Einstellungen",
  PO4: "aquariumPo4Einstellungen",
  Salinitaet: "aquariumSalEinstellungen",
  Temperatur: "aquariumTempEinstellungen"
};

const gueltigeZielbereiche =
  backup.version < 4 ||
  (
    backup.zielbereiche !== null &&
    typeof backup.zielbereiche === "object" &&
    !Array.isArray(backup.zielbereiche) &&
    Object.keys(zielbereichSchluessel).every(parameter => {
      const bereich = backup.zielbereiche[parameter];

      return (
        bereich !== null &&
        typeof bereich === "object" &&
        !Array.isArray(bereich) &&
        Number.isFinite(bereich.min) &&
        Number.isFinite(bereich.max) &&
        Number.isFinite(bereich.toleranz) &&
        bereich.min >= 0 &&
        bereich.min < bereich.max &&
        bereich.toleranz >= 0
      );
    })
  );

const gueltigerWartungsplan =
  neuerWartungsplan !== null &&
  typeof neuerWartungsplan === "object" &&
  !Array.isArray(neuerWartungsplan) &&
  Object.values(neuerWartungsplan).every(e =>
    e !== null &&
    typeof e === "object" &&
    !Array.isArray(e) &&
    Number.isInteger(e.intervall) &&
    e.intervall >= 1 &&
    typeof e.erinnerung === "boolean" &&
    Number.isInteger(e.vorwarnung) &&
    e.vorwarnung >= 0
  );

    const gueltigeMesswerte = backup.messwerte.every(e =>
      e &&
      typeof e.parameter === "string" &&
      typeof e.wert === "number" &&
      Number.isFinite(e.wert) &&
      typeof e.datum === "string" &&
      Number.isFinite(Date.parse(e.datum))
    );

    const gueltigeEreignisse = backup.ereignisse.every(e =>
      e &&
      typeof e.typ === "string" &&
      typeof e.titel === "string" &&
      typeof e.notiz === "string" &&
      typeof e.datum === "string" &&
      Number.isFinite(Date.parse(e.datum))
    );

    const gueltigeDosierungen = neueDosierungen.every(e =>
      e &&
      typeof e.produkt === "string" &&
      typeof e.menge === "number" &&
      Number.isFinite(e.menge) &&
      e.menge >= 0 &&
      typeof e.einheit === "string" &&
      typeof e.notiz === "string" &&
      typeof e.datum === "string" &&
      Number.isFinite(Date.parse(e.datum))
    );

    
if (
  !gueltigeMesswerte ||
  !gueltigeEreignisse ||
  !gueltigeDosierungen ||
  !gueltigerWartungsplan ||
  !gueltigeZielbereiche
) {

      throw new Error(
        "Das Backup enthält ungültige Einträge."
      );
    }

    // Gemeinsame Prüfung, Bestätigung und geschützte Rücknahme verwenden
    const wiederhergestellt = stelleAquariumBackupWiederHer(backup);
    if (wiederhergestellt !== true) {
      backupStatus.textContent = "Wiederherstellung abgebrochen. Lokale Daten wurden nicht überschrieben.";
      return;
    }

    backupStatus.textContent =
      "Backup erfolgreich wiederhergestellt.";

    location.reload();

  } catch (fehler) {
    backupStatus.textContent =
      "Fehler: " + fehler.message;
  } finally {
    this.value = "";
  }
});

const DOSIERUNG_KEY = "aquarium-dosierungen-v1";

const dosierungen = JSON.parse(
  aquariumCloudTestspeicher.getItem(DOSIERUNG_KEY) || "[]"
);

const dosierungForm =
  document.getElementById("dosierungForm");

document.getElementById("dosierungDatum").value =
  lokalesDatum();

dosierungForm.addEventListener("submit", function(event) {
  event.preventDefault();
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;

  const produkt =
    document.getElementById("dosierungProdukt").value;

  const menge = Number(
    document.getElementById("dosierungMenge").value
  );

  const einheit =
    document.getElementById("dosierungEinheit").value;

  const datum =
    document.getElementById("dosierungDatum").value;

  const notiz =
    document.getElementById("dosierungNotiz").value;

  if (!Number.isFinite(menge) || menge < 0) return;

  dosierungen.push({
    id: crypto.randomUUID(),
    produkt,
    menge,
    einheit,
    datum: datum + "T12:00:00",
    notiz
  });

  aquariumCloudTestspeicher.setItem(
    DOSIERUNG_KEY,
    JSON.stringify(dosierungen)
  );

    dosierungForm.reset();

  document.getElementById("dosierungDatum").value =
    lokalesDatum();

  zeigeDosierungen();

  // ☁️ Dosierung automatisch synchronisieren
  if (typeof speichereAutomatischInCloud === "function") {
    speichereAutomatischInCloud().catch(fehler => {
      console.error(
        "❌ Automatische Dosierungssynchronisierung fehlgeschlagen:",
        fehler
      );
    });
  }
});

function zeigeDosierungen() {
  const container =
    document.getElementById("aktuelleDosierungen");

  container.replaceChildren();

  const sortiert = [...dosierungen].sort(
    (a, b) => new Date(b.datum) - new Date(a.datum)
  );

  const aktuelle = new Map();

  for (const eintrag of sortiert) {
    if (!aktuelle.has(eintrag.produkt)) {
      aktuelle.set(eintrag.produkt, eintrag);
    }
  }

  for (const eintrag of aktuelle.values()) {
    const karte = document.createElement("div");
    karte.className = "eintrag";

    const titel = document.createElement("strong");
    titel.textContent = eintrag.produkt;

    const menge = document.createElement("p");
    menge.textContent =
      `${eintrag.menge} ${eintrag.einheit}`;

    karte.append(titel, menge);
    container.appendChild(karte);
  }

  if (aktuelle.size === 0) {
    container.textContent =
      "Noch keine Dosierungen hinterlegt.";
  }

  aktualisiereTimeline();
}

let timelineAnzahl = 10;

// Timeline um Dosierungsänderungen erweitern
aktualisiereTimeline = function() {
  const container =
    document.getElementById("timeline");

  container.replaceChildren();

  const messungen = eintraege.map(e => ({
    datum: e.datum,
    titel: `${namen[e.parameter] || e.parameter}: ` +
      `${e.wert} ${einheiten[e.parameter] || ""}`,
    notiz: ""
  }));

  const aenderungen = dosierungen.map(e => ({
    datum: e.datum,
    titel: `💊 ${e.produkt}: ${e.menge} ${e.einheit}`,
    notiz: e.notiz
  }));

  const alle = [
    ...messungen,
    ...ereignisse,
    ...aenderungen
  ].sort(
    (a, b) => new Date(b.datum) - new Date(a.datum)
  );

 const mehrButton = document.getElementById("timelineMehr");
 mehrButton.hidden = alle.length <= timelineAnzahl;

const wenigerButton = document.getElementById("timelineWeniger");
wenigerButton.hidden = timelineAnzahl <= 10;

 
  for (const eintrag of alle.slice(0, timelineAnzahl)) {
    const karte = document.createElement("div");
    karte.className = "eintrag";

    const datum = document.createElement("small");
    datum.textContent =
      new Date(eintrag.datum).toLocaleString("de-AT");

    const titel = document.createElement("p");
    titel.textContent = eintrag.titel;

    karte.append(datum, titel);

    if (eintrag.notiz) {
      const notiz = document.createElement("small");
      notiz.textContent = eintrag.notiz;
      karte.appendChild(notiz);
    }

    container.appendChild(karte);
  }

  if (alle.length === 0) {
    container.textContent =
      "Noch keine Ereignisse vorhanden.";
  }
};

zeigeDosierungen();

document.getElementById("timelineMehr").addEventListener("click", function() {
  timelineAnzahl += 10;
  aktualisiereTimeline();
});

document.getElementById("timelineWeniger").addEventListener("click", function() {
  timelineAnzahl = 10;
  aktualisiereTimeline();
});

document.getElementById("khMin").addEventListener("input", anzeigen);
document.getElementById("khMax").addEventListener("input", anzeigen);
document.getElementById("khToleranz").addEventListener("input", anzeigen);

document.getElementById("caMin").addEventListener("input", anzeigen);
document.getElementById("caMax").addEventListener("input", anzeigen);
document.getElementById("caToleranz").addEventListener("input", anzeigen);

document.getElementById("mgMin").addEventListener("input", anzeigen);
document.getElementById("mgMax").addEventListener("input", anzeigen);
document.getElementById("mgToleranz").addEventListener("input", anzeigen);

document.getElementById("no3Min").addEventListener("input", anzeigen);
document.getElementById("no3Max").addEventListener("input", anzeigen);
document.getElementById("no3Toleranz").addEventListener("input", anzeigen);

document.getElementById("po4Min").addEventListener("input", anzeigen);
document.getElementById("po4Max").addEventListener("input", anzeigen);
document.getElementById("po4Toleranz").addEventListener("input", anzeigen);

document.getElementById("salMin").addEventListener("input", anzeigen);
document.getElementById("salMax").addEventListener("input", anzeigen);
document.getElementById("salToleranz").addEventListener("input", anzeigen);

document.getElementById("tempMin").addEventListener("input", anzeigen);
document.getElementById("tempMax").addEventListener("input", anzeigen);
document.getElementById("tempToleranz").addEventListener("input", anzeigen);

document.getElementById("tempMin").addEventListener("change", speichereTempEinstellungen);
document.getElementById("tempMax").addEventListener("change", speichereTempEinstellungen);
document.getElementById("tempToleranz").addEventListener("change", speichereTempEinstellungen);

document.getElementById("salMin").addEventListener("change", speichereSalEinstellungen);
document.getElementById("salMax").addEventListener("change", speichereSalEinstellungen);
document.getElementById("salToleranz").addEventListener("change", speichereSalEinstellungen);

document.getElementById("po4Min").addEventListener("change", speicherePo4Einstellungen);
document.getElementById("po4Max").addEventListener("change", speicherePo4Einstellungen);
document.getElementById("po4Toleranz").addEventListener("change", speicherePo4Einstellungen);

document.getElementById("no3Min").addEventListener("change", speichereNo3Einstellungen);
document.getElementById("no3Max").addEventListener("change", speichereNo3Einstellungen);
document.getElementById("no3Toleranz").addEventListener("change", speichereNo3Einstellungen);

document.getElementById("mgMin").addEventListener("change", speichereMgEinstellungen);
document.getElementById("mgMax").addEventListener("change", speichereMgEinstellungen);
document.getElementById("mgToleranz").addEventListener("change", speichereMgEinstellungen);

document.getElementById("caMin").addEventListener("change", speichereCaEinstellungen);
document.getElementById("caMax").addEventListener("change", speichereCaEinstellungen);
document.getElementById("caToleranz").addEventListener("change", speichereCaEinstellungen);

document.getElementById("khMin").addEventListener("change", speichereKhEinstellungen);
document.getElementById("khMax").addEventListener("change", speichereKhEinstellungen);
document.getElementById("khToleranz").addEventListener("change", speichereKhEinstellungen);

ladeKhEinstellungen();
ladeCaEinstellungen();
ladeMgEinstellungen();
ladeNo3Einstellungen();
ladePo4Einstellungen();
ladeSalEinstellungen();
ladeTempEinstellungen();
anzeigen();



// Service Worker für Offline-Nutzung registrieren
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(registrierung => {
        console.log(
          "Service Worker registriert:",
          registrierung.scope
        );
      })
      .catch(fehler => {
        console.error(
          "Service Worker konnte nicht registriert werden:",
          fehler
        );
      });
  });
}
