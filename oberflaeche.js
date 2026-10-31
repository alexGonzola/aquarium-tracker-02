"use strict";

const cloudKurzstatus = document.createElement("button");
cloudKurzstatus.type = "button";
cloudKurzstatus.className = "cloud-kurzstatus";
cloudKurzstatus.setAttribute("aria-label", "Cloud-Status; Einstellungen öffnen");
cloudKurzstatus.setAttribute("aria-live", "polite");
document.querySelector(".riff-header").after(cloudKurzstatus);
const cloudStatusQuelle = document.getElementById("cloudSyncStatus");
const aktualisiereKurzstatus = () => { cloudKurzstatus.textContent = cloudStatusQuelle.textContent; };
new MutationObserver(aktualisiereKurzstatus).observe(cloudStatusQuelle, { childList: true, characterData: true, subtree: true });
aktualisiereKurzstatus();
cloudKurzstatus.addEventListener("click", () => zeigeAnsicht("einstellungen"));

// Navigation und Diagrammauswahl ändern nur die Darstellung, keine gespeicherten Daten.
function zeigeAnsicht(name) {
  const bereiche = ["dashboard", "wasserwerte", "timeline", "einstellungen"];
  if (!bereiche.includes(name)) return;
  for (const bereich of bereiche) {
    document.getElementById("ansicht-" + bereich).hidden = bereich !== name;
  }
  document.querySelectorAll("[data-ansicht]").forEach(button => {
    if (button.dataset.ansicht === name) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  if (name === "timeline") document.querySelector("#ansicht-timeline details").open = true;
  if (name === "dashboard") zeichneDiagramm();
  window.scrollTo({ top: 0, behavior: "instant" });
  const titel = document.querySelector("#ansicht-" + name + " .seitentitel");
  if (titel) titel.focus({ preventScroll: true });
}

document.querySelectorAll("[data-ansicht]").forEach(button => {
  button.addEventListener("click", () => zeigeAnsicht(button.dataset.ansicht));
});
document.getElementById("neuerEintrag").addEventListener("click", () => {
  zeigeAnsicht("wasserwerte");
  document.getElementById("parameter").focus();
});
document.querySelectorAll("[data-zeitraum]").forEach(button => {
  button.addEventListener("click", () => {
    diagrammZeitraum = button.dataset.zeitraum;
    document.querySelectorAll("[data-zeitraum]").forEach(option => {
      option.setAttribute("aria-pressed", String(option === button));
    });
    zeichneDiagramm();
  });
});
document.getElementById("heutigesDatum").textContent = new Date().toLocaleDateString("de-AT", {
  weekday: "long", day: "numeric", month: "long"
});
