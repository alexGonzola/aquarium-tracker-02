document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("testResetBestaetigen").addEventListener("click", async () => {
    const erfolgreich = await window.AquariumChromeTest.zuruecksetzen();
    if (erfolgreich) location.replace("./");
    else document.getElementById("resetStatus").textContent =
      "Zurücksetzen gesperrt. Bitte zuerst alle anderen Fenster dieser Testversion schließen und erneut versuchen.";
  });
});
