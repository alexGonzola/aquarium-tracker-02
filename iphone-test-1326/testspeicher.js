// Die Test-App darf ausschließlich unter ihrem eigenen Präfix speichern.
// Ein anderer URL-Ordner allein würde den Browser-Speicher nicht trennen.
(() => {
  const testpfad = "/aquarium-tracker-02/iphone-test-1326/";
  const freigegeben = location.pathname.startsWith(testpfad) && (
    (location.protocol === "https:" && location.hostname === "alexgonzola.github.io") ||
    (location.protocol === "http:" && location.hostname === "127.0.0.1")
  );
  if (!freigegeben) throw new Error("Diese Testversion wurde außerhalb ihres freigegebenen Testordners geöffnet.");

  const browserSpeicher = window.localStorage;
  const praefix = "aquarium-iphone-test-1326:";
  const getItem = key => browserSpeicher.getItem(praefix + String(key));
  const setItem = (key, wert) => browserSpeicher.setItem(praefix + String(key), String(wert));
  const removeItem = key => browserSpeicher.removeItem(praefix + String(key));
  function schluessel() {
    const ergebnis = [];
    for (let i = 0; i < browserSpeicher.length; i++) {
      const key = browserSpeicher.key(i);
      if (typeof key === "string" && key.startsWith(praefix)) {
        ergebnis.push(key.slice(praefix.length));
      }
    }
    return ergebnis;
  }
  const methoden = new Map([
    ["getItem", getItem], ["setItem", setItem], ["removeItem", removeItem],
    ["key", index => schluessel()[index] ?? null],
    ["clear", () => schluessel().forEach(removeItem)]
  ]);
  const testspeicher = new Proxy({}, {
    get(ziel, name) {
      if (methoden.has(name)) return methoden.get(name);
      if (name === "length") return schluessel().length;
      return typeof name === "string" ? getItem(name) ?? undefined : undefined;
    },
    set(ziel, name, wert) {
      // Ausschließlich der lokale Fehler-Simulator darf diese Methode ersetzen.
      if (name === "setItem" && typeof wert === "function") {
        methoden.set(name, wert);
        return true;
      }
      throw new Error("Direktes Überschreiben des Testspeichers ist nicht erlaubt.");
    },
    ownKeys() { return schluessel(); },
    getOwnPropertyDescriptor(ziel, name) {
      if (typeof name === "string" && getItem(name) !== null) {
        return { configurable: true, enumerable: true, writable: false, value: getItem(name) };
      }
    }
  });
  Object.defineProperty(window, "aquariumIphoneTestspeicher", { value: testspeicher });
  Object.defineProperty(window, "aquariumIphoneTestEreignisschluessel", {
    value(event) {
      if (event.storageArea !== browserSpeicher) return undefined;
      if (event.key === null) return null;
      return typeof event.key === "string" && event.key.startsWith(praefix)
        ? event.key.slice(praefix.length) : undefined;
    }
  });
})();
