
const WARTUNGSPLAN_KEY = "aquarium-wartungsplan-v1";

const wartungsarten = [
  { id: "filtersocken", name: "Vliesrolle wechseln" },
  { id: "aktivkohle", name: "Aktivkohle wechseln" },
  { id: "abschaeumer", name: "Abschäumer reinigen" },
  { id: "uv", name: "UV-Anlage warten" },
  { id: "pumpen", name: "Strömungspumpen reinigen" }
];

const wartungsplan = JSON.parse(
  aquariumIphoneTestspeicher.getItem(WARTUNGSPLAN_KEY) || "{}"
);

function speichereWartungsplan() {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
  aquariumIphoneTestspeicher.setItem(
    WARTUNGSPLAN_KEY,
    JSON.stringify(wartungsplan)
  );
}

function letzteWartung(id) {
  const passende = ereignisse.filter(
    e => e.typ === "wartung" &&
      e.wartungId === id
  );

  passende.sort(
    (a, b) => new Date(b.datum) - new Date(a.datum)
  );

  return passende[0] || null;
}

function zeigeWartungsplan() {
  const container =
    document.getElementById("wartungsplan");

  if (!container) {
    console.error("Wartungsplan-Element nicht gefunden!");
    return;
  }

  container.replaceChildren();

  for (const art of wartungsarten) {
    const einstellung = wartungsplan[art.id] || {};

    const karte = document.createElement("div");
    karte.className = "wartungsplan-eintrag";

    const titel = document.createElement("strong");
    titel.textContent = art.name;

    const intervall = document.createElement("input");
    intervall.type = "number";
    intervall.min = "1";
    intervall.placeholder = "Intervall in Tagen";
    intervall.value = einstellung.intervall || "";

    const intervallLabel = document.createElement("label");
    intervallLabel.textContent = "📅 Wartungsintervall (Tage): ";
    intervallLabel.appendChild(intervall);

    const erinnerung = document.createElement("input");
    erinnerung.type = "checkbox";
    erinnerung.checked = einstellung.erinnerung || false;

    const erinnerungLabel = document.createElement("label");
    erinnerungLabel.append(
      erinnerung,
      " Auf dem iPhone erinnern"
    );

    const vorwarnung = document.createElement("input");
    vorwarnung.type = "number";
    vorwarnung.min = "0";
    vorwarnung.placeholder = "Tage vorher";
    vorwarnung.value = einstellung.vorwarnung ?? 1;

    const vorwarnungLabel = document.createElement("label");
    vorwarnungLabel.textContent = "🟡 Vorwarnung (Tage vorher): ";
    vorwarnungLabel.appendChild(vorwarnung);

    const status = document.createElement("p");

    const letzte = letzteWartung(art.id);

    if (letzte && einstellung.intervall) {
      const faellig = new Date(letzte.datum);
      faellig.setDate(
        faellig.getDate() + Number(einstellung.intervall)
      );

      const heute = new Date();
      heute.setHours(0, 0, 0, 0);
      faellig.setHours(0, 0, 0, 0);

      const tage = Math.round(
        (faellig - heute) / 86400000
      );

      status.textContent =
        tage > 0
          ? `Nächste Wartung in ${tage} Tagen`
          : tage === 0
            ? "Heute fällig"
            : `Seit ${Math.abs(tage)} Tagen überfällig`;
    } else {
      status.textContent =
        "Noch keine passende Wartung erfasst";
    }

    const speichern = document.createElement("button");
    speichern.type = "button";
    speichern.textContent = "Einstellungen speichern";

    speichern.addEventListener("click", () => {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
      const tage = Number(intervall.value);
      const vorlauf = Number(vorwarnung.value);

      if (
        !Number.isInteger(tage) ||
        tage < 1 ||
        !Number.isInteger(vorlauf) ||
        vorlauf < 0
      ) {
        alert("Bitte gültige Tageswerte eingeben.");
        return;
      }

      wartungsplan[art.id] = {
        intervall: tage,
        erinnerung: erinnerung.checked,
        vorwarnung: vorlauf
      };

      speichereWartungsplan();
zeigeWartungsplan();
zeigeWartungsErinnerungen();
zeigeNaechsteWartungen();
    });

    karte.append(
      titel,
      intervallLabel,
      erinnerungLabel,
      vorwarnungLabel,
      status,
      speichern
    );

    container.appendChild(karte);
  }
}

window.addEventListener("load", function() {
  zeigeWartungsplan();
});
function zeigeWartungsErinnerungen() {
  const container =
    document.getElementById("wartungsErinnerungen");

  if (!container) return;

  container.replaceChildren();

  let anzahlErinnerungen = 0;

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  for (const art of wartungsarten) {
    const einstellung = wartungsplan[art.id];

    if (
      !einstellung ||
      !einstellung.erinnerung ||
      !einstellung.intervall
    ) {
      continue;
    }

    const letzte = letzteWartung(art.id);

    if (!letzte) continue;

    const faellig = new Date(letzte.datum);

    faellig.setDate(
      faellig.getDate() + Number(einstellung.intervall)
    );

    faellig.setHours(0, 0, 0, 0);

    const tage = Math.round(
      (faellig - heute) / 86400000
    );

    const vorwarnung = einstellung.vorwarnung || 0;

    if (tage > vorwarnung) continue;

    anzahlErinnerungen++;

    const karte = document.createElement("div");

karte.className =
  tage <= 0
    ? "wartungsplan-eintrag erinnerung-rot"
    : "wartungsplan-eintrag erinnerung-gelb";

const titel = document.createElement("strong");
    titel.textContent = art.name;

    const status = document.createElement("p");

    if (tage < 0) {
      status.textContent =
        `🔴 Seit ${Math.abs(tage)} Tagen überfällig`;
    } else if (tage === 0) {
      status.textContent = "🔴 Heute fällig";
    } else {
      status.textContent =
        `🟡 In ${tage} Tagen fällig`;
    }

    karte.append(titel, status);
    container.appendChild(karte);
  }

 if (anzahlErinnerungen === 0) {
  const karte = document.createElement("div");
  karte.className = "wartungsplan-eintrag erinnerung-gruen";

  karte.textContent = "🟢 Aktuell keine Wartung fällig.";

  container.appendChild(karte);
}
}

window.addEventListener("load", function() {
  zeigeWartungsErinnerungen();
});

function zeigeNaechsteWartungen() {
  console.log("TEST: Funktion wurde gestartet!");
  
  const container = document.getElementById("naechsteWartungen");

  if (!container) return;

  container.replaceChildren();

const wartungsliste = [];

  for (const art of wartungsarten) {

  const einstellung = wartungsplan[art.id];
  const letzte = letzteWartung(art.id);

  console.log("Letzte Wartung:", art.name, letzte);

  console.log("Wartungsdatum:", letzte ? letzte.datum : "Noch keine Wartung");

    const zeile = document.createElement("div");

    zeile.classList.add("wartungskarte");

    wartungsliste.push({
  name: art.name,
  tage: null,
  element: zeile
});

    const titel = document.createElement("h3");

titel.textContent = "🔧 " + art.name;

zeile.appendChild(titel);

const intervallText = document.createElement("p");

intervallText.textContent =
  einstellung && einstellung.intervall
    ? "🔄 Wartungsintervall: " + einstellung.intervall + " Tage"
    : "⚠️ Noch kein Intervall eingestellt";

zeile.appendChild(intervallText);

  if (letzte) {
  const datum = new Date(letzte.datum);
  console.log("Datum als JavaScript-Objekt:", datum);

  if (einstellung && einstellung.intervall) {
    datum.setDate(datum.getDate() + Number(einstellung.intervall));
    console.log("Nächste Wartung:", datum);

    const heute = new Date();
heute.setHours(0, 0, 0, 0);

const tage = Math.round(
  (Date.UTC(datum.getFullYear(), datum.getMonth(), datum.getDate()) -
   Date.UTC(heute.getFullYear(), heute.getMonth(), heute.getDate())) / 86400000
);

wartungsliste[wartungsliste.length - 1].tage = tage;

const statusText = document.createElement("p");

zeile.appendChild(statusText);

if (tage < 0) {
  zeile.classList.add("rot");
  statusText.textContent = "🔴 " + Math.abs(tage) + " Tage überfällig";

} else if (tage === 0) {
  zeile.classList.add("rot");
  statusText.textContent = "🔴 Heute fällig";

} else if (tage <= Number(einstellung.vorwarnung || 0)) {
  zeile.classList.add("gelb");
  statusText.textContent = "🟡 In " + tage + " Tagen fällig";

} else {
  zeile.classList.add("gruen");
  statusText.textContent = "🟢 In " + tage + " Tagen fällig";
}


const datumText = document.createElement("p");

datumText.textContent =
  "📅 Nächste Wartung: " + datum.toLocaleDateString("de-AT");

zeile.insertBefore(datumText, statusText);  }
}


  

  }
  
  wartungsliste.sort((a, b) => (a.tage ?? Infinity) - (b.tage ?? Infinity));
  
  for (const eintrag of wartungsliste) {
  container.appendChild(eintrag.element);
  }

}
window.addEventListener("load", function() {
  zeigeNaechsteWartungen();
});