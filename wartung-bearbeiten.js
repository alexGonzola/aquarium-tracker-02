"use strict";

(() => {
  const arten = {
    filtersocken: "Vliesrolle wechseln", aktivkohle: "Aktivkohle wechseln",
    abschaeumer: "Abschäumer reinigen", uv: "UV-Anlage warten",
    pumpen: "Strömungspumpen reinigen", sonstiges: "Sonstige Wartung"
  };
  const dialog = document.createElement("dialog");
  dialog.className = "wartung-dialog";
  dialog.setAttribute("aria-labelledby", "wartungBearbeitenTitel");
  dialog.innerHTML = `<form id="wartungBearbeitenForm">
    <h2 id="wartungBearbeitenTitel">Wartung bearbeiten</h2>
    <label for="wartungBearbeitenArt">Wartungsart</label><select id="wartungBearbeitenArt"></select>
    <label for="wartungBearbeitenDatum">Datum</label><input type="date" id="wartungBearbeitenDatum" required>
    <label for="wartungBearbeitenNotiz">Notiz</label><textarea id="wartungBearbeitenNotiz" rows="3"></textarea>
    <p id="wartungBearbeitenStatus" role="status"></p>
    <div class="wartung-aktionen"><button type="button" id="wartungBearbeitenAbbrechen">Abbrechen</button><button type="submit">Änderungen speichern</button></div>
  </form>`;
  document.body.appendChild(dialog);
  const feldArt = document.getElementById("wartungBearbeitenArt");
  const feldDatum = document.getElementById("wartungBearbeitenDatum");
  const feldNotiz = document.getElementById("wartungBearbeitenNotiz");
  const status = document.getElementById("wartungBearbeitenStatus");
  let bearbeitung = null;

  function aufnahme(eintrag) {
    if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return null;
    const index = ereignisse.indexOf(eintrag);
    if (index < 0 || eintrag.typ !== "wartung") return null;
    const roh = localStorage.getItem(EREIGNIS_KEY);
    const speicher = JSON.stringify(ereignisse);
    if (JSON.stringify(JSON.parse(roh || "[]")) !== speicher) {
      throw new Error("Die Einträge haben sich verändert. Bitte die App neu laden.");
    }
    return { eintrag, index, roh, speicher };
  }

  function aktuellerStand(a) {
    return window.aquariumSchreibschutz?.darfSchreiben() === true &&
      ereignisse[a.index] === a.eintrag && a.eintrag.typ === "wartung" &&
      JSON.stringify(ereignisse) === a.speicher && localStorage.getItem(EREIGNIS_KEY) === a.roh;
  }

  function speichern(a, ersatz) {
    if (!aktuellerStand(a)) throw new Error("Speichern gestoppt: Einträge oder Schreibfreigabe haben sich geändert. Bitte neu laden.");
    const neu = ereignisse.slice();
    if (ersatz === null) neu.splice(a.index, 1);
    else neu[a.index] = ersatz;
    const text = JSON.stringify(neu);
    const key = "aquarium-wartung-aenderung-backup-v1:" + crypto.randomUUID();
    const backup = JSON.stringify({ erstelltAm: new Date().toISOString(), aktion: ersatz === null ? "loeschen" : "bearbeiten", ereignisse: JSON.parse(a.speicher) });
    localStorage.setItem(key, backup);
    if (localStorage.getItem(key) !== backup) throw new Error("Sicherheitskopie konnte nicht geprüft werden. Keine Änderung durchgeführt.");
    if (!aktuellerStand(a)) throw new Error("Speichern gestoppt: Der Datenstand wurde inzwischen verändert.");
    try {
      localStorage.setItem(EREIGNIS_KEY, text);
      if (localStorage.getItem(EREIGNIS_KEY) !== text) throw new Error("Speicherung konnte nicht geprüft werden.");
    } catch (fehler) {
      // Keine Rücksicherung über einen zwischenzeitlich unbekannten Stand schreiben.
      let unveraendert = false;
      try { unveraendert = localStorage.getItem(EREIGNIS_KEY) === a.roh; } catch {}
      if (!unveraendert) window.aquariumSchreibschutz?.markiereUnsicher();
      throw fehler;
    }
    // Den Arbeitsspeicher erst nach nachweislich erfolgreicher Speicherung ändern.
    ereignisse.splice(0, ereignisse.length, ...neu);
    aktualisiereTimeline();
    zeigeWartungsplan();
    zeigeWartungsErinnerungen();
    zeigeNaechsteWartungen();
    if (typeof speichereAutomatischInCloud === "function") {
      speichereAutomatischInCloud().catch(fehler => console.error("Wartungsänderung lokal gespeichert; Cloud-Synchronisierung fehlgeschlagen:", fehler));
    }
  }

  function datumFeld(datum) {
    const d = new Date(datum);
    if (Number.isNaN(d.getTime())) throw new Error("Das gespeicherte Datum ist ungültig.");
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function bearbeiten(eintrag) {
    try {
      const a = aufnahme(eintrag);
      if (!a) return;
      const erkannt = Object.keys(arten).find(id => eintrag.titel === "🔧 " + arten[id]);
      const art = Object.hasOwn(arten, eintrag.wartungId) ? eintrag.wartungId : erkannt || "bestehend";
      feldArt.replaceChildren();
      for (const [id, name] of Object.entries(arten)) {
        const option = document.createElement("option"); option.value = id; option.textContent = name; feldArt.appendChild(option);
      }
      if (art === "bestehend") {
        const option = document.createElement("option"); option.value = "bestehend"; option.textContent = eintrag.titel || "Bisherige Wartungsart"; feldArt.appendChild(option);
      }
      feldArt.value = art;
      feldDatum.value = datumFeld(eintrag.datum);
      feldNotiz.value = eintrag.notiz || "";
      bearbeitung = { ...a, art, datum: feldDatum.value };
      status.textContent = "";
      dialog.showModal();
    } catch (fehler) { alert(fehler.message); }
  }

  document.getElementById("wartungBearbeitenAbbrechen").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { bearbeitung = null; });
  document.getElementById("wartungBearbeitenForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!bearbeitung) return;
    try {
      const a = bearbeitung;
      const tag = feldDatum.value;
      const datum = new Date(tag + "T12:00:00");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tag) || Number.isNaN(datum.getTime()) || datumFeld(datum) !== tag) throw new Error("Bitte ein gültiges Datum wählen.");
      if (feldArt.value !== "bestehend" && !Object.hasOwn(arten, feldArt.value)) throw new Error("Bitte eine gültige Wartungsart wählen.");
      const neu = { ...a.eintrag, notiz: feldNotiz.value, datum: tag === a.datum ? a.eintrag.datum : tag + "T12:00:00" };
      if (feldArt.value !== a.art) {
        neu.wartungId = feldArt.value;
        neu.titel = "🔧 " + arten[feldArt.value];
      }
      if (JSON.stringify(neu) === JSON.stringify(a.eintrag)) { dialog.close(); return; }
      speichern(a, neu);
      dialog.close();
    } catch (fehler) { status.textContent = "Änderung nicht abgeschlossen: " + fehler.message; }
  });

  window.erstelleWartungsAktionen = eintrag => {
    const gruppe = document.createElement("div"); gruppe.className = "wartung-aktionen";
    const edit = document.createElement("button"); edit.type = "button"; edit.textContent = "Bearbeiten";
    edit.addEventListener("click", () => bearbeiten(eintrag));
    const loeschen = document.createElement("button"); loeschen.type = "button"; loeschen.className = "gefahr"; loeschen.textContent = "Löschen";
    loeschen.addEventListener("click", () => {
      try {
        const a = aufnahme(eintrag);
        if (!a) return;
        if (!confirm(`Diesen Wartungseintrag löschen?\n\n${eintrag.titel}\n${new Date(eintrag.datum).toLocaleDateString("de-AT")}\n\nDie Wartungserinnerungen werden neu berechnet. Die Löschung wird bei erfolgreicher Synchronisierung auch auf anderen Geräten übernommen.`)) return;
        speichern(a, null);
      } catch (fehler) { alert("Löschen nicht abgeschlossen: " + fehler.message); }
    });
    gruppe.append(edit, loeschen); return gruppe;
  };
  aktualisiereTimeline();
})();
