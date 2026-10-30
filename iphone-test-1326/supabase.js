// Aquarium Tracker 0.2
// Supabase Cloud-Verbindung

const SUPABASE_URL = "lokale-testcloud-ohne-netzwerk";

const SUPABASE_KEY = "kuenstlicher-testschluessel";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Lokaler Speicherplatz für den letzten Cloud-Synchronisierungsstand
const SYNC_STAND_KEY = "aquarium-cloud-sync-stand-v1";

let synchronisierungLaeuft = false;

let geschuetzterUploadLaeuft = false;

let automatischerUploadLaeuft = false;

// Merkt sich weitere Änderungen während eines laufenden Uploads
let automatischerUploadAusstehend = false;

const SYNC_BACKUP_KEY = "aquarium-cloud-sync-backup-v1";

// 🔒 Sicherheitsbackup vor der ersten Cloud-Verbindung
const ERSTVERBINDUNG_BACKUP_KEY = "aquarium-cloud-erstverbindung-backup-v1";

// Letzten bekannten Cloud-Synchronisierungsstand auslesen
function leseSyncStand() {
  const gespeichert = aquariumIphoneTestspeicher.getItem(SYNC_STAND_KEY);

  if (!gespeichert) {
    return null;
  }

  try {
    return JSON.parse(gespeichert);
  } catch (fehler) {
    console.error("Synchronisierungsstand konnte nicht gelesen werden:", fehler);
    return null;
  }
}

// Letzten bekannten Cloud-Synchronisierungsstand speichern
function speichereSyncStand(zeitstempel) {
  if (window.aquariumSchreibschutz?.darfSchreiben(true) !== true) return false;
  if (typeof zeitstempel !== "string" || !Number.isFinite(Date.parse(zeitstempel))) {
    console.error("Ungültiger Synchronisierungszeitstempel.");
    return false;
  }

  try {
    aquariumIphoneTestspeicher.setItem(
      SYNC_STAND_KEY,
      JSON.stringify(zeitstempel)
    );

    return true;
  } catch (fehler) {
    console.error("Synchronisierungsstand konnte nicht gespeichert werden:", fehler);
    return false;
  }
}

// Daten unabhängig von der Reihenfolge der Objekteigenschaften vergleichen
function datenSindGleich(wert1, wert2) {
  if (Object.is(wert1, wert2)) {
    return true;
  }

  if (typeof wert1 !== typeof wert2) {
    return false;
  }

  if (wert1 === null || wert2 === null) {
    return false;
  }

  if (typeof wert1 !== "object") {
    return false;
  }

  if (Array.isArray(wert1) !== Array.isArray(wert2)) {
    return false;
  }

  const schluessel1 = Object.keys(wert1);
  const schluessel2 = Object.keys(wert2);

  if (schluessel1.length !== schluessel2.length) {
    return false;
  }

  return schluessel1.every(schluessel =>
    Object.prototype.hasOwnProperty.call(wert2, schluessel) &&
    datenSindGleich(wert1[schluessel], wert2[schluessel])
  );
}

// Zwei Aquarium-Backups anhand ihrer Daten vergleichen
function aquariumBackupsSindGleich(backup1, backup2) {
  if (!backup1 || !backup2) {
    return false;
  }

  const daten1 = {
    messwerte: backup1.messwerte,
    ereignisse: backup1.ereignisse,
    dosierungen: backup1.dosierungen,
    wartungsplan: backup1.wartungsplan,
    zielbereiche: backup1.zielbereiche
  };

  const daten2 = {
    messwerte: backup2.messwerte,
    ereignisse: backup2.ereignisse,
    dosierungen: backup2.dosierungen,
    wartungsplan: backup2.wartungsplan,
    zielbereiche: backup2.zielbereiche
  };

  return datenSindGleich(daten1, daten2);
}

// 🔒 Tatsächlich gespeicherte lokale Daten prüfen
function pruefeWiederhergestellteLokaleDaten(cloudBackup) {
  try {
    if (!cloudBackupIstGueltig(cloudBackup)) {
      return false;
    }

    const speicherVergleich = [
      ["aquarium-tracker-messwerte-v1", cloudBackup.messwerte],
      ["aquarium-tracker-ereignisse-v1", cloudBackup.ereignisse],
      ["aquarium-dosierungen-v1", cloudBackup.dosierungen],
      ["aquarium-wartungsplan-v1", cloudBackup.wartungsplan]
    ];

    for (const [schluessel, erwartet] of speicherVergleich) {
      const gespeichert = aquariumIphoneTestspeicher.getItem(schluessel);

      if (gespeichert === null) {
        return false;
      }

      const tatsaechlich = JSON.parse(gespeichert);

      if (!datenSindGleich(tatsaechlich, erwartet)) {
        console.error(
          "🔴 Wiederhergestellte Daten stimmen nicht überein:",
          schluessel
        );
        return false;
      }
    }

// 🔒 Wiederhergestellte Zielbereiche überprüfen
const zielbereichSchluessel = {
  KH: "aquariumKhEinstellungen",
  Ca: "aquariumCaEinstellungen",
  Mg: "aquariumMgEinstellungen",
  NO3: "aquariumNo3Einstellungen",
  PO4: "aquariumPo4Einstellungen",
  Salinitaet: "aquariumSalEinstellungen",
  Temperatur: "aquariumTempEinstellungen"
};

for (const [parameter, schluessel] of Object.entries(zielbereichSchluessel)) {
  const gespeichert = aquariumIphoneTestspeicher.getItem(schluessel);

  if (gespeichert === null) {
    console.error(
      "🔴 Zielbereich fehlt im lokalen Speicher:",
      parameter
    );
    return false;
  }

  const tatsaechlich = JSON.parse(gespeichert);
  const erwartet = cloudBackup.zielbereiche[parameter];

  if (!datenSindGleich(tatsaechlich, erwartet)) {
    console.error(
      "🔴 Wiederhergestellter Zielbereich stimmt nicht überein:",
      parameter
    );
    return false;
  }
}

    return true;

  } catch (fehler) {
    console.error(
      "🔴 Kontrolle der wiederhergestellten Daten fehlgeschlagen:",
      fehler
    );
    return false;
  }
}

function lokaleDatenSeitBackupVeraendert(backupVorher) {

  if (!backupVorher || typeof backupVorher !== "object") {
    return true;
  }

  const backupJetzt = window.erstelleAquariumBackup();

  return !aquariumBackupsSindGleich(
    backupVorher,
    backupJetzt
  );
}

function bestaetigeErfolgreichenUpload(backup, neuerZeitstempel) {

  // Backup und Zeitstempel prüfen
  if (
    !cloudBackupIstGueltig(backup) ||
    !cloudZeitstempelIstGueltig(neuerZeitstempel)
  ) {
    console.warn("🔒 Upload-Bestätigung abgelehnt: Ungültige Daten.");
    return false;
  }

  // Prüfen, ob sich lokale Daten inzwischen verändert haben
  if (lokaleDatenSeitBackupVeraendert(backup)) {
    console.warn(
      "🔒 Lokale Daten wurden inzwischen verändert. Synchronisierungsstand wird nicht aktualisiert."
    );

    return false;
  }

  console.log(
    "✅ Upload-Bestätigung geprüft. Synchronisierungsstand noch nicht verändert."
  );

  return true;
}

function speichereBestaetigtenSyncStand(backup, zeitstempel) {
  if (window.aquariumSchreibschutz?.darfSchreiben(true) !== true) return false;

  // Nur gültige Daten akzeptieren
  if (
    !cloudBackupIstGueltig(backup) ||
    !cloudZeitstempelIstGueltig(zeitstempel)
  ) {
    console.warn(
      "🔒 Synchronisierungsstand ungültig."
    );

    return false;
  }

    // Bisherigen Synchronisierungsstand sichern
  const alterBackupText = aquariumIphoneTestspeicher.getItem(SYNC_BACKUP_KEY);
  const alterZeitstempelText = aquariumIphoneTestspeicher.getItem(SYNC_STAND_KEY);

  try {
       // Genau das bestätigte Backup speichern
    const backupGespeichert = speichereSyncBackup(backup);

    if (backupGespeichert !== true) {
      throw new Error(
        "Bestätigtes Cloud-Backup konnte nicht gespeichert werden."
      );
    }

    // Zugehörigen Cloud-Zeitstempel speichern
    const zeitstempelGespeichert = speichereSyncStand(zeitstempel);

    if (zeitstempelGespeichert !== true) {
      throw new Error(
        "Cloud-Zeitstempel konnte nicht gespeichert werden."
      );
    }

// 🔒 Gespeicherten Synchronisierungsstand überprüfen
if (
  !datenSindGleich(leseSyncBackup(), backup) ||
  leseSyncStand() !== zeitstempel
) {
  throw new Error(
    "Gespeicherter Synchronisierungsstand stimmt nicht mit den bestätigten Cloud-Daten überein."
  );
}

    console.log(
      "✅ Bestätigter Synchronisierungsstand gespeichert."
    );

    return true;

    } catch (fehler) {

    // Wiederherstellung zusätzlich absichern
    try {

      if (alterBackupText === null) {
        aquariumIphoneTestspeicher.removeItem(SYNC_BACKUP_KEY);
      } else {
        aquariumIphoneTestspeicher.setItem(SYNC_BACKUP_KEY, alterBackupText);
      }

      if (alterZeitstempelText === null) {
        aquariumIphoneTestspeicher.removeItem(SYNC_STAND_KEY);
      } else {
        aquariumIphoneTestspeicher.setItem(SYNC_STAND_KEY, alterZeitstempelText);
      }

      // 🔒 Rücksicherung des Synchronisierungsstands überprüfen
if (
  aquariumIphoneTestspeicher.getItem(SYNC_BACKUP_KEY) !== alterBackupText ||
  aquariumIphoneTestspeicher.getItem(SYNC_STAND_KEY) !== alterZeitstempelText
) {
  throw new Error(
    "Rücksicherung des Synchronisierungsstands konnte nicht bestätigt werden."
  );
}

     } catch (wiederherstellungsFehler) {

  // 🛑 Synchronisierungszustand als unsicher markieren
  cloudDatenzustandUnsicher = true;

  // 🔒 Sicherheitssperre dauerhaft speichern
try {
  aquariumIphoneTestspeicher.setItem(
    CLOUD_DATENZUSTAND_KEY,
    "true"
  );
} catch (speicherFehler) {
  console.error(
    "🔴 Dauerhafte Sicherheitssperre konnte nicht gespeichert werden:",
    speicherFehler
  );
}

  console.error(
    "🔴 KRITISCH: Wiederherstellung des Synchronisierungsstands fehlgeschlagen:",
    wiederherstellungsFehler
  );

}

    console.error(
      "🔴 Synchronisierungsstand konnte nicht gespeichert werden:",
      fehler
    );

    return false;
  }
}

// Sicherheitsbackups erhalten, ohne den nächsten sicheren Download zu blockieren.
function archiviereCloudDownloadSicherheitsbackup(erwarteterText) {
  const aktiverKey = "aquarium-cloud-download-sicherheitsbackup-v1";
  try {
    if (window.aquariumSchreibschutz?.darfSchreiben(true) !== true) return false;
    if (typeof erwarteterText !== "string" || aquariumIphoneTestspeicher.getItem(aktiverKey) !== erwarteterText) {
      return false;
    }
    const backup = JSON.parse(erwarteterText);
    if (!backup || typeof backup !== "object" || Array.isArray(backup) ||
        Object.keys(backup).length !== 11 ||
        !Object.values(backup).every(wert => wert === null || typeof wert === "string")) {
      return false;
    }
    const archivKey = "aquarium-cloud-download-sicherheitsbackup-archiv-v1:" + crypto.randomUUID();
    // Auch bei einer unerwarteten Namenskollision kein vorhandenes Backup ersetzen.
    if (aquariumIphoneTestspeicher.getItem(archivKey) !== null) return false;
    aquariumIphoneTestspeicher.setItem(archivKey, erwarteterText);
    if (aquariumIphoneTestspeicher.getItem(archivKey) !== erwarteterText) return false;
    if (window.aquariumSchreibschutz.darfSchreiben(true) !== true ||
        aquariumIphoneTestspeicher.getItem(aktiverKey) !== erwarteterText) return false;
    aquariumIphoneTestspeicher.removeItem(aktiverKey);
    return aquariumIphoneTestspeicher.getItem(aktiverKey) === null &&
      aquariumIphoneTestspeicher.getItem(archivKey) === erwarteterText;
  } catch (fehler) {
    console.error("Sicherheitsbackup konnte nicht vollständig archiviert werden.", fehler);
    return false;
  }
}

function schliesseErfolgreichenUploadAb(backup, neuerZeitstempel) {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return false;

  // Genau das hochgeladene Backup als
  // letzten synchronisierten Stand speichern
  const gespeichert = speichereBestaetigtenSyncStand(
    backup,
    neuerZeitstempel
  );

  if (!gespeichert) {
    console.error(
      "🔴 Synchronisierungsstand konnte nicht gespeichert werden."
    );

    return false;
  }

  // Prüfen, ob während des Uploads
  // weitere lokale Änderungen entstanden sind
  if (lokaleDatenSeitBackupVeraendert(backup)) {

    console.log(
      "🟡 Upload erfolgreich, aber neue lokale Änderungen vorhanden."
    );

  } else {

    console.log(
      "✅ Upload erfolgreich. Alle lokalen Daten synchronisiert."
    );

  }

  return true;
}

async function starteGeschuetztenUpload(
  backup,
  zeitstempel,
  internerAutomatischerAufruf = false
) {
  if (await window.aquariumSchreibschutz?.bereit !== true || window.aquariumSchreibschutz.darfSchreiben() !== true) return false;

  // 🔒 Upload nur mit gültigem Synchronisierungsstand
if (!hatBestaetigtenSyncStand()) {

  console.error(
    "🔴 Upload gestoppt: Kein gültiger bestätigter Synchronisierungsstand vorhanden."
  );

  return false;
}

  // 🔒 Keine Uploads während einer Cloud-Wiederherstellung
  // oder bei ungeklärtem Datenzustand
  if (cloudWiederherstellungLaeuft || cloudDatenzustandUnsicher) {

    console.warn(
      "🔒 Geschützter Upload gestoppt: Cloud-Wiederherstellung oder Sicherheitssperre aktiv."
    );

    return false;
  }

  // Prüfen, ob bereits ein Upload läuft
  if (
  geschuetzterUploadLaeuft ||
  (automatischerUploadLaeuft && !internerAutomatischerAufruf) ||
  (internerAutomatischerAufruf && !automatischerUploadLaeuft)
) {
    console.warn(
      "🔒 Upload abgelehnt: Ein anderer Upload läuft bereits."
    );

    return false;
  }

  // Upload-Sperre aktivieren
  geschuetzterUploadLaeuft = true;

  try {

    // Unabhängige Kopie des Upload-Backups erstellen
    const uploadBackup = structuredClone(backup);

    // Geschützten Upload ausführen
    const neuerZeitstempel = await fuehreGeschuetztenUploadAus(
      uploadBackup,
      zeitstempel
    );

    // Nur bei erfolgreichem Upload fortfahren
    if (!neuerZeitstempel) {
      console.warn(
        "🔒 Upload nicht bestätigt. Synchronisierungsstand bleibt unverändert."
      );

      return false;
    }

    // Tatsächlich hochgeladenes Backup bestätigen
    return schliesseErfolgreichenUploadAb(
      uploadBackup,
      neuerZeitstempel
    );

  } catch (fehler) {

    console.error(
      "🔴 Fehler beim geschützten Upload:",
      fehler
    );

    return false;

  } finally {

    // Upload-Sperre immer wieder freigeben
    geschuetzterUploadLaeuft = false;

  }
}

async function fuehreGeschuetztenUploadAus(backup, zeitstempel) {
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return null;

  // Backup und Zeitstempel prüfen
  if (
    !cloudBackupIstGueltig(backup) ||
    !cloudZeitstempelIstGueltig(zeitstempel)
  ) {
    console.warn(
      "🔒 Geschützter Upload abgelehnt: Ungültige Daten."
    );

    return null;
  }

    // Prüfen, ob der übergebene Zeitstempel
  // unserem gespeicherten Synchronisierungsstand entspricht
  if (leseSyncStand() !== zeitstempel) {

    console.warn(
      "🔒 Upload abgelehnt: Synchronisierungsstand stimmt nicht überein."
    );

    return null;
  } 

    // Prüfen, ob das vorbereitete Backup
  // noch den aktuellen lokalen Daten entspricht
  if (lokaleDatenSeitBackupVeraendert(backup)) {

    console.warn(
      "🔒 Upload abgelehnt: Lokale Daten haben sich inzwischen verändert."
    );

    return null;
  }
  
  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return null;

  // Geschützten Upload bei Supabase ausführen
  const { data, error } = await supabaseClient.rpc(
    "aquarium_sicher_speichern",
    {
      p_daten: backup,
      p_erwarteter_zeitstempel: zeitstempel
    }
  );

  if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return null;

  // Fehler oder Synchronisierungskonflikt erkennen
  if (error) {
    console.error(
      "🔒 Geschützter Upload fehlgeschlagen:",
      error.message
    );

    return null;
  }

  // Neuen Cloud-Zeitstempel prüfen
  if (!cloudZeitstempelIstGueltig(data)) {
    console.error(
      "🔴 Supabase hat keinen gültigen Zeitstempel zurückgegeben."
    );

    return null;
  }

  console.log(
    "✅ Geschützter Upload erfolgreich."
  );

  return data;
}

// Letztes erfolgreich synchronisiertes Backup auslesen
function leseSyncBackup() {
  const gespeichert = aquariumIphoneTestspeicher.getItem(SYNC_BACKUP_KEY);

  if (!gespeichert) {
    return null;
  }

  try {
    return JSON.parse(gespeichert);
  } catch (fehler) {
    console.error(
      "Synchronisiertes Backup konnte nicht gelesen werden:",
      fehler
    );

    return null;
  }
}

// Letztes erfolgreich synchronisiertes Backup speichern
function speichereSyncBackup(backup) {
  if (window.aquariumSchreibschutz?.darfSchreiben(true) !== true) return false;
  if (!backup || typeof backup !== "object") {
    console.error("Ungültiges Synchronisierungsbackup.");
    return false;
  }

  try {
    aquariumIphoneTestspeicher.setItem(
      SYNC_BACKUP_KEY,
      JSON.stringify(backup)
    );

    return true;
  } catch (fehler) {
    console.error(
      "Synchronisierungsbackup konnte nicht gespeichert werden:",
      fehler
    );

    return false;
  }
}

// 🔒 Prüfen, ob ein bestätigter Synchronisierungsstand vorhanden ist
function hatBestaetigtenSyncStand() {
  const zeitstempel = leseSyncStand();
  const backup = leseSyncBackup();

  return (
  cloudZeitstempelIstGueltig(zeitstempel) &&
  cloudBackupIstGueltig(backup)
);
}

// 🔒 Prüfen, ob lokale Cloud-Synchronisierungsinformationen existieren
function hatGespeicherteSyncInformationen() {

  return (
    aquariumIphoneTestspeicher.getItem(SYNC_STAND_KEY) !== null ||
    aquariumIphoneTestspeicher.getItem(SYNC_BACKUP_KEY) !== null
  );

}

// 🔒 Voraussetzungen für den Erstverbindungsmodus prüfen
function darfErstverbindungPruefen() {

  // Bei ungeklärtem Datenzustand keine Erstverbindung
  if (cloudDatenzustandUnsicher) {
    return false;
  }

  // Bereits bestätigter Synchronisierungsstand vorhanden
  if (hatBestaetigtenSyncStand()) {
    return false;
  }

  // Vorhandene oder beschädigte Sync-Informationen
  if (hatGespeicherteSyncInformationen()) {
    return false;
  }

  return true;
}

// 🔒 Erstverbindung ohne Datenänderung vorprüfen
function pruefeErstverbindung() {

   // 🔒 Unsicheren Datenzustand zuerst prüfen
  if (cloudDatenzustandUnsicher) {
    return {
      erlaubt: false,
      grund: "Lokaler Datenzustand ist als unsicher markiert."
    };
  }

  // 🔒 Bereits gespeicherte Synchronisierungsinformationen
  if (hatGespeicherteSyncInformationen()) {
    return {
      erlaubt: false,
      grund: "Dieses Gerät besitzt bereits Cloud-Synchronisierungsinformationen."
    };
  }

    // 🔒 Vorhandenes Erstverbindungsbackup kontrollieren
if (hatVorhandenesErstverbindungsBackup()) {

  const pruefung = pruefeGespeichertesErstverbindungsBackup();

  if (
    !pruefung.gueltig ||
    lokaleDatenSeitBackupVeraendert(pruefung.backup)
  ) {
    return {
      erlaubt: false,
      grund: "Vorhandenes Sicherheitsbackup ist ungültig oder lokale Daten wurden verändert."
    };
  }

  console.log(
    "✅ Vorhandenes Erstverbindungsbackup geprüft. Lokale Daten unverändert."
  );

}

  // 🔒 Lokale Aquarium-Daten prüfen
  const lokalePruefung =
    pruefeLokaleDatenFuerErstverbindung();

  // 🔴 Ungültige oder nicht lesbare Daten
  if (lokalePruefung.status === "fehler") {
    return {
      erlaubt: false,
      grund: lokalePruefung.grund
    };
  }

  // 🟡 Vorhandene lokale Daten erkennen und schützen
if (lokalePruefung.status === "vorhanden") {
  return {
    erlaubt: true,
    bestaetigungErforderlich: true,
    grund: "Lokale Aquarium-Daten vorhanden. Sicherheitsbackup und ausdrückliche Bestätigung erforderlich."
  };
}

  // 🔒 Nur weitere Prüfungen erlauben
  if (lokalePruefung.status === "leer") {
    return {
      erlaubt: true,
      grund: "Keine erfassten Aquarium-Daten gefunden. Weitere Sicherheitsprüfungen erforderlich."
    };
  }

  // 🔴 Unbekannten Zustand sicherheitshalber blockieren
  return {
    erlaubt: false,
    grund: "Unbekannter lokaler Datenzustand."
  };
}

// 🔒 Lokale Aquarium-Daten vor Erstverbindung prüfen
function pruefeLokaleDatenFuerErstverbindung() {

  try {

    // Aktuelles lokales Backup erstellen
    const backup = window.erstelleAquariumBackup();

    // Backup muss gültig sein
    if (!cloudBackupIstGueltig(backup)) {
      return {
        status: "fehler",
        grund: "Lokales Aquarium-Backup ist ungültig."
      };
    }

    // Vorhandene Aquarium-Daten erkennen
    if (backupEnthaeltAquariumDaten(backup)) {
      return {
        status: "vorhanden",
        grund: "Auf diesem Gerät sind bereits Aquarium-Daten oder Einstellungen vorhanden."
      };
    }

    return {
      status: "leer",
      grund: "Keine erfassten Aquarium-Daten gefunden."
    };

  } catch (fehler) {

    console.error(
      "🔴 Lokale Datenprüfung fehlgeschlagen:",
      fehler
    );

    return {
      status: "fehler",
      grund: "Lokale Aquarium-Daten konnten nicht geprüft werden."
    };
  }
}

// Prüfen, ob lokale Aquarium-Daten verändert wurden
function lokaleDatenWurdenGeaendert() {
  const letztesBackup = leseSyncBackup();

  // Ohne bestätigten Synchronisierungsstand
  // können wir noch keinen sicheren Vergleich durchführen.
  if (!letztesBackup) {
    return null;
  }

  const aktuelleDaten = window.erstelleAquariumBackup();

  return !aquariumBackupsSindGleich(
    aktuelleDaten,
    letztesBackup
  );
}

// Prüfen, ob sich die Cloud seit der letzten Synchronisierung verändert hat
function cloudDatenWurdenGeaendert(cloudZeitstempel) {
  const letzterStand = leseSyncStand();

  // Ohne bestätigten Synchronisierungsstand
  // ist kein sicherer Vergleich möglich.
  if (!letzterStand || !cloudZeitstempel) {
    return null;
  }

  return letzterStand !== cloudZeitstempel;
}

// Lokale und Cloud-Änderungen gemeinsam beurteilen
function ermittleSyncStatus(cloudZeitstempel) {
  const lokalGeaendert = lokaleDatenWurdenGeaendert();
  const cloudGeaendert = cloudDatenWurdenGeaendert(cloudZeitstempel);

  // Noch kein bestätigter gemeinsamer Datenstand
  if (lokalGeaendert === null || cloudGeaendert === null) {
    return "unbekannt";
  }

  // Beide Seiten wurden verändert
  if (lokalGeaendert && cloudGeaendert) {
    return "konflikt";
  }

  // Nur lokale Daten wurden verändert
  if (lokalGeaendert) {
    return "lokal";
  }

  // Nur Cloud-Daten wurden verändert
  if (cloudGeaendert) {
    return "cloud";
  }

  // Beide Seiten sind unverändert
  return "aktuell";
}

// 🔒 Ausdrückliche Bestätigung bei einem Synchronisierungskonflikt
function bestaetigeCloudUebernahmeBeiKonflikt() {

  return window.confirm(
    "⚠️ Synchronisierungskonflikt erkannt!\n\n" +
    "Die lokalen Aquarium-Daten unterscheiden sich von den Cloud-Daten.\n\n" +
    "Möchtest du die Cloud-Daten übernehmen und die lokalen Daten ersetzen?\n\n" +
    "Vor der Übernahme muss ein überprüftes Sicherheitsbackup erstellt werden.\n\n" +
    "OK = Cloud übernehmen\n" +
    "Abbrechen = Keine Daten verändern"
  );

}

function ermittleSyncAktion(cloudZeitstempel) {
  const status = ermittleSyncStatus(cloudZeitstempel);

  if (status === "aktuell") {
    return "nichts";
  }

  if (status === "lokal") {
    return "hochladen";
  }

  if (status === "cloud") {
    return "herunterladen";
  }

  if (status === "konflikt") {
    return "konflikt";
  }

  return "pruefen";
}

async function ladeCloudSyncDaten() {

  // 🔒 Angemeldeten Benutzer überprüfen
  const { data: benutzerDaten, error: benutzerFehler } =
    await supabaseClient.auth.getUser();

  if (benutzerFehler || !benutzerDaten?.user) {
    console.error(
      "Cloud-Synchronisierung: Nicht angemeldet.",
      benutzerFehler
    );

    throw new Error(
      "Cloud-Daten können ohne gültige Anmeldung nicht geprüft werden."
    );
  }

  // ☁️ Cloud-Daten abrufen
  const { data, error } = await supabaseClient
    .from("aquarium_daten")
    .select("daten, updated_at")
    .eq("user_id", benutzerDaten.user.id)
    .maybeSingle();

  // 🔒 Fehler dürfen niemals als leere Cloud gelten
  if (error) {
    console.error(
      "Cloud-Daten konnten nicht geladen werden:",
      error
    );

    throw new Error(
      "Cloud-Abfrage fehlgeschlagen. Der Cloud-Zustand ist unbekannt."
    );
  }

  // 🟢 null bedeutet jetzt: Abfrage erfolgreich, kein Datensatz gefunden
  return data;
}

// 🔒 Erstverbindung sicher vorbereiten – ohne Datenänderung
async function bereiteErstverbindungVor() {

  // Lokale Voraussetzungen zuerst prüfen
  const lokalePruefung = pruefeErstverbindung();

  if (!lokalePruefung.erlaubt) {
    return lokalePruefung;
  }

  try {

    // Cloud-Daten des angemeldeten Benutzers abrufen
    const cloud = await ladeCloudSyncDaten();

    // Lokale Voraussetzungen und Cloud-Daten gemeinsam prüfen
    const ergebnis = pruefeErstverbindungMitCloud(cloud);

    return ergebnis;

  } catch (fehler) {

    console.error(
      "🔴 Vorbereitung der Erstverbindung fehlgeschlagen:",
      fehler
    );

    return {
      erlaubt: false,
      grund: "Cloud-Daten konnten nicht sicher geprüft werden."
    };
  }
}

// 🔒 Cloud-Backups mit der gemeinsamen Backup-Prüfung kontrollieren
function cloudBackupIstGueltig(backup) {

  // Prüffunktion aus app.js muss verfügbar sein
  if (typeof window.pruefeAquariumBackup !== "function") {
    console.error(
      "Cloud-Sicherheit: Backup-Prüfung aus app.js nicht verfügbar."
    );

    return false;
  }

  // Vollständige Backup-Prüfung verwenden
  try {
    return window.pruefeAquariumBackup(backup) === true;
  } catch (fehler) {
    console.error(
      "Cloud-Sicherheit: Fehler bei der Backup-Prüfung.",
      fehler
    );

    return false;
  }
}

// 🧪 Künstliches Backup für Sicherheitstests erstellen
function erstelleTestBackup() {

  return {
    app: "Aquarium Tracker",
    version: 4,
    erstellt: new Date().toISOString(),
    messwerte: [],
    ereignisse: [],
    dosierungen: [],
    wartungsplan: {},
    zielbereiche: {}
  };

}



// 🔒 Prüfen, ob ein Backup bereits Aquarium-Daten enthält
function backupEnthaeltAquariumDaten(backup) {

  // 🔒 Nur gültige Backups akzeptieren
  if (!cloudBackupIstGueltig(backup)) {
    return false;
  }

  // Prüfen, ob tatsächlich Aquarium-Daten erfasst wurden
  return (
    backup.messwerte.length > 0 ||
    backup.ereignisse.length > 0 ||
    backup.dosierungen.length > 0 ||
    Object.keys(backup.wartungsplan).length > 0
  );
}

function cloudZeitstempelIstGueltig(zeitstempel) {
  return (
    typeof zeitstempel === "string" &&
    zeitstempel.trim() !== "" &&
    Number.isFinite(Date.parse(zeitstempel))
  );
}

function cloudSyncDatenSindGueltig(cloud) {
  if (!cloud || typeof cloud !== "object") {
    return false;
  }

  if (!cloudBackupIstGueltig(cloud.daten)) {
    return false;
  }

  if (!cloudZeitstempelIstGueltig(cloud.updated_at)) {
    return false;
  }

  return true;
}

// 🔒 Cloud-Daten für die Erstverbindung prüfen
function pruefeCloudDatenFuerErstverbindung(cloud) {

  // Cloud-Datensatz muss vorhanden sein
  if (!cloud) {
    return {
      erlaubt: false,
      grund: "Noch keine Aquarium-Daten in der Cloud vorhanden."
    };
  }

  // Cloud-Daten und Zeitstempel überprüfen
  if (!cloudSyncDatenSindGueltig(cloud)) {
    return {
      erlaubt: false,
      grund: "Cloud-Daten oder Synchronisierungszeitstempel sind ungültig."
    };
  }

  // 🔒 Nur die weitere Prüfung erlauben
  return {
    erlaubt: true,
    grund: "Cloud-Daten gültig. Weitere Sicherheitsprüfungen erforderlich."
  };
}

// 🔒 Lokale Daten und Cloud-Daten gemeinsam prüfen
function pruefeErstverbindungMitCloud(cloud) {

  // 🔒 Zuerst lokale Voraussetzungen prüfen
  const lokalePruefung = pruefeErstverbindung();

  if (!lokalePruefung.erlaubt) {
    return {
      erlaubt: false,
      grund: lokalePruefung.grund
    };
  }

  // ☁️ Anschließend Cloud-Daten prüfen
  const cloudPruefung =
    pruefeCloudDatenFuerErstverbindung(cloud);

  if (!cloudPruefung.erlaubt) {
    return {
      erlaubt: false,
      grund: cloudPruefung.grund
    };
  }

   // 🔒 Beide Vorprüfungen erfolgreich
  return {
    erlaubt: true,
    bestaetigungErforderlich:
      lokalePruefung.bestaetigungErforderlich === true,
    grund: "Lokale Daten und Cloud-Daten geprüft. Weitere Sicherheitsprüfungen erforderlich."
  };
}

// 🔒 Ausdrückliche Bestätigung vor einer Erstverbindung
function bestaetigeErstverbindung() {

  return window.confirm(
    "☁️ Aquarium Tracker – Erstverbindung\n\n" +
    "Die Aquarium-Daten aus der Cloud sollen auf dieses Gerät übernommen werden.\n\n" +
    "ACHTUNG: Dabei können vorhandene lokale Aquarium-Daten und Einstellungen ersetzt werden.\n\n" +
    "Die Erstverbindung darf nur fortgesetzt werden, wenn zuvor ein Sicherheitsbackup erfolgreich erstellt wurde.\n\n" +
    "Möchtest du die Übernahme ausdrücklich bestätigen?"
  );

}

// 🔒 Lokale Daten vor einer Erstverbindung sichern
function erstelleErstverbindungsBackup() {

  try {

    if (typeof window.erstelleAquariumBackup !== "function") {
      return {
        erfolgreich: false,
        grund: "Backup-Funktion nicht verfügbar."
      };
    }

    const backup = window.erstelleAquariumBackup();

    if (!cloudBackupIstGueltig(backup)) {
      return {
        erfolgreich: false,
        grund: "Lokales Sicherheitsbackup ist ungültig."
      };
    }

    return {
      erfolgreich: true,
      backup: backup
    };

  } catch (fehler) {

    console.error(
      "🔴 Sicherheitsbackup für Erstverbindung fehlgeschlagen:",
      fehler
    );

    return {
      erfolgreich: false,
      grund: "Lokales Sicherheitsbackup konnte nicht erstellt werden."
    };

  }

}

// 🔒 Sicherheitsbackup der Erstverbindung speichern und prüfen
function speichereErstverbindungsBackup(backup) {
  if (window.aquariumSchreibschutz?.darfSchreiben(true) !== true) return false;

  try {

    // Backup vor dem Speichern überprüfen
    if (!cloudBackupIstGueltig(backup)) {
      return {
        erfolgreich: false,
        grund: "Sicherheitsbackup ist ungültig."
      };
    }

    // Vorhandenes Sicherheitsbackup niemals überschreiben
    if (aquariumIphoneTestspeicher.getItem(ERSTVERBINDUNG_BACKUP_KEY) !== null) {
      return {
        erfolgreich: false,
        grund: "Ein Sicherheitsbackup der Erstverbindung existiert bereits."
      };
    }

    // Backup speichern
    const backupText = JSON.stringify(backup);

    aquariumIphoneTestspeicher.setItem(
      ERSTVERBINDUNG_BACKUP_KEY,
      backupText
    );

    // Gespeichertes Backup wieder auslesen
    const gespeicherterText = aquariumIphoneTestspeicher.getItem(
      ERSTVERBINDUNG_BACKUP_KEY
    );

        // 🔒 Gespeicherten Inhalt auf Übereinstimmung prüfen
    if (gespeicherterText !== backupText) {

      console.error(
        "🔴 Erstverbindungsbackup stimmt nicht mit dem Original überein."
      );

      return {
        erfolgreich: false,
        grund: "Sicherheitsbackup konnte nicht zuverlässig gespeichert werden. Vorhandenen Backup-Eintrag bitte prüfen."
      };
    }

    return {
      erfolgreich: true,
      grund: "Sicherheitsbackup erfolgreich gespeichert."
    };

  } catch (fehler) {

    console.error(
      "🔴 Speichern des Erstverbindungsbackups fehlgeschlagen:",
      fehler
    );

    return {
      erfolgreich: false,
      grund: "Sicherheitsbackup konnte nicht gespeichert werden."
    };

  }

}

// 🔒 Gespeichertes Erstverbindungsbackup überprüfen
function pruefeGespeichertesErstverbindungsBackup() {

  try {

    const gespeicherterText = aquariumIphoneTestspeicher.getItem(
      ERSTVERBINDUNG_BACKUP_KEY
    );

    // Kein Backup vorhanden
    if (gespeicherterText === null) {
      return {
        gueltig: false,
        grund: "Kein Sicherheitsbackup der Erstverbindung vorhanden."
      };
    }

    // Gespeicherten Text wieder in ein Objekt umwandeln
    const backup = JSON.parse(gespeicherterText);

    // Backup überprüfen
    if (!cloudBackupIstGueltig(backup)) {
      return {
        gueltig: false,
        grund: "Gespeichertes Sicherheitsbackup ist ungültig."
      };
    }

    return {
      gueltig: true,
      backup: backup
    };

  } catch (fehler) {

    console.error(
      "🔴 Prüfung des Erstverbindungsbackups fehlgeschlagen:",
      fehler
    );

    return {
      gueltig: false,
      grund: "Sicherheitsbackup konnte nicht gelesen werden."
    };

  }

}

// 🔒 Sicherheitsbackup für Erstverbindung vorbereiten
function bereiteErstverbindungsBackupVor() {

   // 🔒 Vorhandenes Sicherheitsbackup prüfen und wiederverwenden
if (hatVorhandenesErstverbindungsBackup()) {

  const pruefung = pruefeGespeichertesErstverbindungsBackup();

  if (
    !pruefung.gueltig ||
    lokaleDatenSeitBackupVeraendert(pruefung.backup)
  ) {
    return {
      erfolgreich: false,
      grund: "Vorhandenes Sicherheitsbackup ist ungültig oder lokale Daten wurden verändert."
    };
  }

  console.log(
    "✅ Vorhandenes Sicherheitsbackup wird sicher wiederverwendet."
  );

  return {
    erfolgreich: true,
    grund: "Vorhandenes Sicherheitsbackup erfolgreich geprüft."
  };
}

  // 1. Lokales Backup erstellen
  const erstellung = erstelleErstverbindungsBackup();

  if (!erstellung.erfolgreich) {
    return erstellung;
  }

  // 2. Backup dauerhaft im Browser speichern
  const speicherung = speichereErstverbindungsBackup(
    erstellung.backup
  );

  if (!speicherung.erfolgreich) {
    return speicherung;
  }

  // 3. Gespeichertes Backup überprüfen
  const pruefung = pruefeGespeichertesErstverbindungsBackup();

  if (!pruefung.gueltig) {
    return {
      erfolgreich: false,
      grund: pruefung.grund
    };
  }

  return {
    erfolgreich: true,
    grund: "Sicherheitsbackup erfolgreich erstellt, gespeichert und überprüft."
  };

}

// 🔒 Prüfen, ob ein früheres Erstverbindungsbackup existiert
function hatVorhandenesErstverbindungsBackup() {

  try {

    return aquariumIphoneTestspeicher.getItem(
      ERSTVERBINDUNG_BACKUP_KEY
    ) !== null;

  } catch (fehler) {

    console.error(
      "🔴 Erstverbindungsbackup konnte nicht geprüft werden:",
      fehler
    );

    // Im Fehlerfall vorsichtshalber von einem Backup ausgehen
    return true;

  }

}

async function pruefeAutomatischeSynchronisierung() {

  if (synchronisierungLaeuft) {
    console.warn("🔒 Synchronisierung läuft bereits.");
    return "beschaeftigt";
  }

  synchronisierungLaeuft = true;

  try {
    const cloud = await ladeCloudSyncDaten();

    if (!cloud) {
      console.warn(
        "☁️ Cloud nicht erreichbar oder keine Cloud-Daten vorhanden."
      );

      return "pruefen";
    }

    if (!cloudSyncDatenSindGueltig(cloud)) {
      console.warn(
        "🔒 Cloud-Daten ungültig. Synchronisierung gestoppt."
      );

      return "pruefen";
    }

    const aktion = ermittleSyncAktion(cloud.updated_at);

    console.log("🔄 Geplante Synchronisierungsaktion:", aktion);

    return aktion;

  } catch (fehler) {
    console.error(
      "❌ Fehler bei der Synchronisierungsprüfung:",
      fehler
    );

    return "pruefen";

  } finally {
    synchronisierungLaeuft = false;
  }
}

// 🔒 Sperre für laufende Cloud-Wiederherstellungen
let cloudWiederherstellungLaeuft = false;

// 🔒 Dauerhafte Upload-Sperre bei ungeklärtem Datenzustand
const CLOUD_DATENZUSTAND_KEY =
  "aquarium-cloud-datenzustand-unsicher-v1";

let cloudDatenzustandUnsicher =
  aquariumIphoneTestspeicher.getItem(CLOUD_DATENZUSTAND_KEY) === "true";

  // 🔒 Kennzeichnung für unterbrochene Cloud-Wiederherstellungen
const CLOUD_WIEDERHERSTELLUNG_MARKER_KEY =
  "aquarium-cloud-wiederherstellung-aktiv-v1";


// 🔒 Unterbrochene Cloud-Wiederherstellung erkennen
if (
  aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) === "true"
) {
  cloudDatenzustandUnsicher = true;

  // 🔒 Sicherheitssperre dauerhaft speichern
  try {
    aquariumIphoneTestspeicher.setItem(
      CLOUD_DATENZUSTAND_KEY,
      "true"
    );
  } catch (speicherFehler) {
    console.error(
      "🔴 Dauerhafte Cloud-Sicherheitssperre konnte nicht gespeichert werden:",
      speicherFehler
    );
  }

  console.error(
    "🔴 Unterbrochene Cloud-Wiederherstellung erkannt. " +
    "Cloud-Synchronisierung bleibt aus Sicherheitsgründen gesperrt."
  );
}

async function speichereAutomatischInCloud() {
  if (await window.aquariumSchreibschutz?.bereit !== true || window.aquariumSchreibschutz.darfSchreiben() !== true) return false;

    // 🔒 Keine Uploads bei ungeklärtem Datenzustand
  if (cloudDatenzustandUnsicher) {
    console.error(
      "🔴 Automatischer Upload gesperrt: Datenzustand ist unsicher."
    );

    return false;
  }
  
  // 🔒 Kein automatischer Upload während einer Cloud-Wiederherstellung
  if (cloudWiederherstellungLaeuft) {
    console.warn(
      "🔒 Automatischer Upload gestoppt: Cloud-Wiederherstellung läuft."
    );

    return false;
  }

  // Verhindern, dass zwei automatische Uploads gleichzeitig starten
  if (automatischerUploadLaeuft) {

  // Weitere Synchronisierung für später vormerken
  automatischerUploadAusstehend = true;

  console.log(
    "🟡 Automatischer Upload läuft bereits. Weitere Synchronisierung vorgemerkt."
  );

  return false;
}


  // Prüfen, ob bereits ein geschützter Upload läuft
  if (geschuetzterUploadLaeuft) {
    console.warn(
      "🔒 Automatischer Upload gestoppt: Ein Upload läuft bereits."
    );

    return false;
  }

  // Automatischen Upload-Vorgang sperren
  automatischerUploadLaeuft = true;

  try {

    // Unabhängige Kopie der Daten erstellen
    const backup = structuredClone(
      window.erstelleAquariumBackup()
    );

    // Backup prüfen
    if (!backupEnthaeltAquariumDaten(backup)) {
      console.warn(
        "🔒 Automatischer Upload gestoppt: Backup enthält keine Aquarium-Einträge."
      );

      return false;
    }

    // Supabase-Anmeldung prüfen
    const { data: benutzerDaten, error: benutzerFehler } =
      await supabaseClient.auth.getUser();

    if (benutzerFehler || !benutzerDaten?.user) {
      console.warn(
        "🔒 Automatischer Upload gestoppt: Nicht bei Supabase angemeldet."
      );

      return false;
    }

    // Aktuellen Cloud-Datenstand laden
    const cloud = await ladeCloudSyncDaten();

    if (!cloud) {
      console.warn(
        "🔒 Automatischer Upload gestoppt: Cloud-Daten nicht verfügbar."
      );

      return false;
    }

    // Cloud-Daten überprüfen
    if (!cloudSyncDatenSindGueltig(cloud)) {
      console.warn(
        "🔒 Automatischer Upload gestoppt: Ungültige Cloud-Daten."
      );

      return false;
    }

    // Letzten bestätigten Cloud-Zeitstempel prüfen
    const letzterSyncStand = leseSyncStand();

    if (
      !cloudZeitstempelIstGueltig(letzterSyncStand) ||
      letzterSyncStand !== cloud.updated_at
    ) {
      console.warn(
        "🔒 Upload gestoppt: Cloud-Zeitstempel stimmt nicht mit dem letzten Synchronisierungsstand überein."
      );

      return false;
    }

    // Prüfen, ob ein Upload überhaupt notwendig ist
    const syncStatus = ermittleSyncStatus(cloud.updated_at);

    if (syncStatus !== "lokal") {
      console.warn(
        "🔒 Automatischer Upload nicht erlaubt. Status:",
        syncStatus
      );

      return false;
    }

    // Prüfen, ob lokale Daten während der Vorbereitung
    // verändert wurden
    if (lokaleDatenSeitBackupVeraendert(backup)) {
      console.warn(
        "🔒 Automatischer Upload gestoppt: Lokale Daten haben sich während der Prüfung verändert."
      );

      return false;
    }

   console.log(
  "✅ Backup, Anmeldung und Cloud-Daten erfolgreich geprüft."
);

// 🔒 Letzte Sicherheitsprüfung vor dem automatischen Upload
if (cloudWiederherstellungLaeuft || cloudDatenzustandUnsicher) {
  console.warn(
    "🔒 Automatischer Upload gestoppt: Cloud-Wiederherstellung oder Sicherheitssperre aktiv."
  );

  return false;
}

// Geschützten automatischen Upload durchführen
const uploadErfolgreich = await starteGeschuetztenUpload(
  backup,
  cloud.updated_at,
  true
);

if (!uploadErfolgreich) {
  console.warn(
    "🔒 Automatischer Cloud-Upload fehlgeschlagen oder gestoppt."
  );

  return false;
}

console.log(
  "✅ Aquarium-Daten automatisch und geschützt gespeichert."
);

return true;

  } catch (fehler) {

    console.error(
      "🔴 Fehler bei der automatischen Upload-Vorbereitung:",
      fehler
    );

    return false;

  } finally {

  // Sperre nach dem Upload wieder freigeben
  automatischerUploadLaeuft = false;

  // Prüfen, ob währenddessen eine weitere
  // Synchronisierung angefordert wurde
  if (automatischerUploadAusstehend) {

    // Vormerkung zurücksetzen
    automatischerUploadAusstehend = false;

    console.log(
      "🔄 Vorgemerkte Cloud-Synchronisierung wird gestartet."
    );

    // Erst nach Freigabe der Sperre erneut starten
    setTimeout(() => {

      speichereAutomatischInCloud().catch(fehler => {
        console.error(
          "🔴 Vorgemerkte Cloud-Synchronisierung fehlgeschlagen:",
          fehler
        );
      });

    }, 100);

  }

}

}

// Cloud-Anmeldung
document.addEventListener("DOMContentLoaded", function () {

  const loginForm = document.getElementById("cloudLoginForm");
  const cloudStatus = document.getElementById("cloudStatus");

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("cloudEmail").value.trim();
    const passwort = document.getElementById("cloudPasswort").value;

    cloudStatus.textContent = "⏳ Anmeldung läuft ...";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: passwort
    });

    if (error) {
      cloudStatus.textContent = "❌ Anmeldung fehlgeschlagen: " + error.message;
      return;
    }

    cloudStatus.textContent = "✅ Erfolgreich angemeldet!";
    document.getElementById("cloudPasswort").value = "";

    console.log("Supabase-Anmeldung erfolgreich.");
  });

});

// Cloud-Speicherbutton vorbereiten
document.addEventListener("DOMContentLoaded", function () {

  const cloudSpeichern = document.getElementById("cloudSpeichern");
  const cloudSpeicherStatus = document.getElementById("cloudSpeicherStatus");

  cloudSpeichern.addEventListener("click", async function () {
  if (await window.aquariumSchreibschutz?.bereit !== true || window.aquariumSchreibschutz.darfSchreiben() !== true) return false;

    // 🔒 Manuellen Upload bei laufenden Cloud-Vorgängen verhindern
if (
  automatischerUploadLaeuft ||
  geschuetzterUploadLaeuft ||
  cloudWiederherstellungLaeuft
) {
  cloudSpeicherStatus.textContent =
    "🛑 Cloud-Speichern gestoppt: Ein anderer Cloud-Vorgang läuft bereits.";

  console.warn(
    "🔒 Manueller Upload wegen laufendem Cloud-Vorgang blockiert."
  );

  return;
}

    const { data: { user }, error } =
      await supabaseClient.auth.getUser();

    if (error || !user) {
      cloudSpeicherStatus.textContent =
        "❌ Bitte zuerst anmelden.";
      return;
    }

    // 🔒 Manuelles Speichern bei unsicherem Datenzustand verhindern
if (cloudDatenzustandUnsicher) {
  cloudSpeicherStatus.textContent =
    "🛑 Cloud-Speichern gesperrt: Der lokale Datenzustand muss zuerst geprüft werden.";

  console.error(
    "🔒 Manueller Cloud-Upload wegen unsicherem Datenzustand blockiert."
  );

  return;
}

    const bestaetigt = confirm(
  "Möchtest du deine aktuellen Aquarium-Daten " +
  "in der Cloud speichern?\n\n" +
  "ACHTUNG: Ein bereits vorhandenes Cloud-Backup " +
  "wird dabei später überschrieben."
);

if (!bestaetigt) {
  cloudSpeicherStatus.textContent =
    "Cloud-Speichern abgebrochen.";
  return;
}

const backup = window.erstelleAquariumBackup();


// 🔒 Einheitliche Sicherheitsprüfung für manuelle Cloud-Uploads
if (!backupEnthaeltAquariumDaten(backup)) {
  cloudSpeicherStatus.textContent =
    "🛑 Cloud-Speichern gestoppt: Backup ungültig oder keine Aquarium-Daten vorhanden.";

  console.warn(
    "🔒 Manueller Upload gestoppt: Backup ungültig oder leer."
  );

  return;
}

console.log("Cloud-Backup vorbereitet:", {
  version: backup.version,
  messwerte: backup.messwerte.length,
  ereignisse: backup.ereignisse.length,
  dosierungen: backup.dosierungen.length
});

cloudSpeicherStatus.textContent =
  "✅ Aquarium-Daten für Cloud-Backup vorbereitet.";

  // Prüfen, ob bereits Cloud-Daten vorhanden sind
const { data: vorhandeneDaten, error: leseFehler } =
  await supabaseClient
    .from("aquarium_daten")
    .select("daten, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

if (leseFehler) {
  cloudSpeicherStatus.textContent =
    "❌ Cloud-Prüfung fehlgeschlagen.";

  console.error("Cloud-Fehler:", leseFehler);
  return;
}



if (vorhandeneDaten) {

    // 🔒 Vorhandenes Cloud-Backup überprüfen
  if (!cloudBackupIstGueltig(vorhandeneDaten.daten)) {

    console.warn(
      "🔒 Manueller Upload gestoppt: Cloud-Backup ungültig."
    );

    cloudSpeicherStatus.textContent =
      "🔒 Cloud-Speichern gestoppt: Vorhandene Cloud-Daten sind ungültig.";

    return;
  }

    // Sicherheitsprüfung: Cloud-Daten dürfen sich
  // seit der letzten Synchronisierung nicht verändert haben
  const letzterSyncStand = leseSyncStand();

  if (
    !cloudZeitstempelIstGueltig(letzterSyncStand) ||
    letzterSyncStand !== vorhandeneDaten.updated_at
  ) {
    console.warn(
      "🔒 Manueller Upload gestoppt: Cloud-Datenstand stimmt nicht überein."
    );

    cloudSpeicherStatus.textContent =
      "🔒 Cloud-Speichern gestoppt: Cloud-Daten wurden möglicherweise verändert.";

    return;
  }

  console.log("☁️ Cloud-Datensatz vorhanden.");
  cloudSpeicherStatus.textContent =
    "☁️ Cloud-Daten vorhanden. Noch nichts überschrieben.";
const ueberschreiben = confirm(
    "In der Cloud sind bereits Daten vorhanden.\n\n" +
    "Möchtest du diese durch dein aktuelles Aquarium-Backup ersetzen?"
  );

  if (!ueberschreiben) {
    cloudSpeicherStatus.textContent =
      "☁️ Cloud-Daten bleiben unverändert.";
    return;
  }
} else {
  console.warn(
    "🔒 Manueller Upload gestoppt: Noch kein Cloud-Datensatz vorhanden."
  );

  cloudSpeicherStatus.textContent =
    "🔒 Cloud-Speichern gestoppt: Erster Cloud-Datensatz muss separat eingerichtet werden.";

  return;
}

// 🔒 Letzte Sicherheitsprüfung vor dem manuellen Upload
if (
  automatischerUploadLaeuft ||
  geschuetzterUploadLaeuft ||
  cloudWiederherstellungLaeuft ||
  cloudDatenzustandUnsicher
) {
  cloudSpeicherStatus.textContent =
    "🛑 Cloud-Speichern gestoppt: Ein anderer Cloud-Vorgang läuft oder eine Sicherheitssperre ist aktiv.";

  console.warn(
    "🔒 Manueller Upload durch letzte Sicherheitsprüfung gestoppt."
  );

  return;
}

// Geschützten Cloud-Upload durchführen
const uploadErfolgreich = await starteGeschuetztenUpload(
  backup,
  vorhandeneDaten.updated_at
);

if (!uploadErfolgreich) {
  cloudSpeicherStatus.textContent =
    "❌ Geschützter Cloud-Upload fehlgeschlagen oder aus Sicherheitsgründen gestoppt.";

  return;
}

cloudSpeicherStatus.textContent =
  "✅ Aquarium-Daten erfolgreich und geschützt in der Cloud gespeichert!";

  });

});

// Cloud-Daten laden
document.addEventListener("DOMContentLoaded", function () {

  const cloudLaden = document.getElementById("cloudLaden");

  const cloudErstverbindung =
  document.getElementById("cloudErstverbindung");

const cloudErstverbindungStatus =
  document.getElementById("cloudErstverbindungStatus");

  const cloudLadenStatus = document.getElementById("cloudLadenStatus");


// 🔒 Gemeinsame Funktion für Cloud-Downloads
async function starteCloudDownload(
  erstverbindung = false,
  automatischerDownload = false
) {
  if (await window.aquariumSchreibschutz?.bereit !== true || window.aquariumSchreibschutz.darfSchreiben() !== true) return false;

    // 🔒 Erstverbindung bleibt bis zur Fertigstellung gesperrt
  if (erstverbindung === true) {
    cloudErstverbindungStatus.textContent =
      "🔒 Erstverbindung noch nicht vollständig eingerichtet.";

    console.warn(
      "🔒 Erstverbindung aus Sicherheitsgründen blockiert."
    );

    return;
  }

    // 🔒 Cloud-Download nicht starten, wenn ein Upload läuft
if (automatischerUploadLaeuft || geschuetzterUploadLaeuft) {

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt: Ein Upload läuft bereits.";

  console.warn(
    "🔒 Cloud-Download wegen laufendem Upload blockiert."
  );

  return;
}

      // 🔒 Verhindern, dass zwei Cloud-Downloads gleichzeitig laufen
  if (cloudWiederherstellungLaeuft) {

    cloudLadenStatus.textContent =
      "🛑 Cloud-Download gestoppt: Ein Download läuft bereits.";

    console.warn(
      "🔒 Zweiter Cloud-Download blockiert."
    );

    return;
  }

  // 🔒 Keinen Download bei unterbrochener Wiederherstellung erlauben
if (
  aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) === "true"
) {
  cloudDatenzustandUnsicher = true;

  // 🔒 Sicherheitssperre auch dauerhaft speichern
try {
  aquariumIphoneTestspeicher.setItem(
    CLOUD_DATENZUSTAND_KEY,
    "true"
  );
} catch (speicherFehler) {
  console.error(
    "🔴 Dauerhafte Cloud-Sicherheitssperre konnte nicht gespeichert werden:",
    speicherFehler
  );
}

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gesperrt: Unterbrochene Wiederherstellung erkannt.";

  console.error(
    "🔴 Cloud-Download wegen vorhandener Unterbrechungskennzeichnung blockiert."
  );

  return;
}

  // 🔒 Keinen neuen Download bei ungeklärtem Datenzustand erlauben
if (cloudDatenzustandUnsicher) {

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gesperrt: Bitte zuerst den lokalen Datenzustand prüfen.";

  console.error(
    "🔒 Cloud-Download blockiert: Datenzustand ist unsicher."
  );

  return;
}

    cloudLadenStatus.textContent =
      "☁️ Cloud-Daten werden geprüft...";

      cloudWiederherstellungLaeuft = true;

      let cloudWiederherstellungGestartet = false;

      let cloudNeuladenAusstehend = false;
      let downloadSicherungsText = null;

// 🔒 Auch im äußeren Fehlerzweig verfügbar halten
const sicherungsSchluessel = [
  "aquarium-tracker-messwerte-v1",
  "aquarium-tracker-ereignisse-v1",
  "aquarium-dosierungen-v1",
  "aquarium-wartungsplan-v1",
  "aquariumKhEinstellungen",
  "aquariumCaEinstellungen",
  "aquariumMgEinstellungen",
  "aquariumNo3Einstellungen",
  "aquariumPo4Einstellungen",
  "aquariumSalEinstellungen",
  "aquariumTempEinstellungen"
];
let gespeicherteOriginaldaten = null;

try {

    // Prüfen, ob der Benutzer angemeldet ist
const { data: { user }, error: authFehler } =
  await supabaseClient.auth.getUser();

if (authFehler || !user) {
  cloudLadenStatus.textContent =
    "❌ Bitte zuerst anmelden.";
  return;
}

// Aquarium-Daten aus Supabase lesen
const { data: cloudDaten, error: ladeFehler } =
  await supabaseClient
    .from("aquarium_daten")
    .select("daten, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

if (ladeFehler) {
  console.error("Cloud-Ladefehler:", ladeFehler);

  cloudLadenStatus.textContent =
    "❌ Cloud-Daten konnten nicht geladen werden.";
  return;
}

if (!cloudDaten) {
  cloudLadenStatus.textContent =
    "⚠️ Noch keine Aquarium-Daten in der Cloud vorhanden.";
  return;
}

cloudLadenStatus.textContent =
  "✅ Aquarium-Daten in der Cloud gefunden!";

 let konfliktUebernahmeBestaetigt = false;
 
  // 🔒 Sicherheitsprüfung vor dem Cloud-Download
const syncStatus = ermittleSyncStatus(
  cloudDaten.updated_at
);

console.log(
  "🔒 Synchronisierungsstatus vor Cloud-Download:",
  syncStatus
);

// 🔒 Bei Konflikten nur manuelle Übernahme erlauben
if (syncStatus === "konflikt" && automatischerDownload === false) {

  konfliktUebernahmeBestaetigt =
    bestaetigeCloudUebernahmeBeiKonflikt();

  if (!konfliktUebernahmeBestaetigt) {
    cloudLadenStatus.textContent =
      "☁️ Cloud-Übernahme abgebrochen. Lokale Daten bleiben unverändert.";

    return;
  }
}

if (
  syncStatus !== "cloud" &&
  syncStatus !== "aktuell" &&
  !(syncStatus === "konflikt" && konfliktUebernahmeBestaetigt === true)
) {

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt. Synchronisierungsstatus: " +
    syncStatus;

  console.warn(
    "Cloud-Download aus Sicherheitsgründen blockiert:",
    syncStatus
  );

  return;
}


  // Prüfen, ob die gemeinsame Wiederherstellung verfügbar ist
console.log(
  "Gemeinsame Wiederherstellung verfügbar:",
  typeof window.stelleAquariumBackupWiederHer
);

console.log("Cloud-Backup gefunden:", {
  version: cloudDaten.daten?.version,
  messwerte: cloudDaten.daten?.messwerte?.length,
  ereignisse: cloudDaten.daten?.ereignisse?.length,
  dosierungen: cloudDaten.daten?.dosierungen?.length
});

// Cloud-Backup an die gemeinsame Wiederherstellung übergeben


  // 🔒 Synchronisierungsstatus unmittelbar vor der Wiederherstellung prüfen
  const aktuellerStatus = ermittleSyncStatus(
    cloudDaten.updated_at
  );

  if (
  aktuellerStatus !== "cloud" &&
  aktuellerStatus !== "aktuell" &&
  !(
    aktuellerStatus === "konflikt" &&
    konfliktUebernahmeBestaetigt === true &&
    automatischerDownload === false
  )
) {

    cloudLadenStatus.textContent =
      "🛑 Cloud-Wiederherstellung gestoppt. Status: " +
      aktuellerStatus;

    console.warn(
      "🔒 Cloud-Wiederherstellung aus Sicherheitsgründen blockiert:",
      aktuellerStatus
    );

    return;
  }

  // 🔒 Cloud-Daten vor der Wiederherstellung erneut prüfen
  const cloudJetzt = await ladeCloudSyncDaten();

  if (
    !cloudJetzt ||
    !cloudSyncDatenSindGueltig(cloudJetzt) ||
    cloudJetzt.updated_at !== cloudDaten.updated_at
  ) {
    cloudLadenStatus.textContent =
      "🛑 Cloud-Daten haben sich verändert oder sind ungültig. Bitte erneut versuchen.";

    console.warn(
      "🔒 Cloud-Wiederherstellung gestoppt: Cloud-Prüfung fehlgeschlagen."
    );

    return;
  }

  // Auch nach dem erneuten Cloud-Abruf lokale Änderungen prüfen
  const statusNachPruefung = ermittleSyncStatus(
    cloudJetzt.updated_at
  );

  // 🔒 Automatischer Download nur bei neueren Cloud-Daten
if (
  automatischerDownload === true &&
  statusNachPruefung !== "cloud"
) {
  console.warn(
    "🔒 Automatischer Download gestoppt. Status:",
    statusNachPruefung
  );

  return;
}

  if (
  statusNachPruefung !== "cloud" &&
  statusNachPruefung !== "aktuell" &&
  !(
    statusNachPruefung === "konflikt" &&
    konfliktUebernahmeBestaetigt === true &&
    automatischerDownload === false
  )
) {

    cloudLadenStatus.textContent =
      "🛑 Cloud-Wiederherstellung gestoppt. Status: " +
      statusNachPruefung;

    return;
  }

// 🔒 Vorhandenes Sicherheitsbackup vor Überschreiben schützen
if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
if (
  aquariumIphoneTestspeicher.getItem(
    "aquarium-cloud-download-sicherheitsbackup-v1"
  ) !== null
) {
  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt: Ein früheres Sicherheitsbackup ist bereits vorhanden.";

  console.warn(
    "🔒 Vorhandenes Sicherheitsbackup wird nicht überschrieben."
  );

  return;
}

 // 🔒 Originale lokale Daten vor dem Cloud-Download sichern

try {

  const lokalesBackupVorDownload = {};

  // Ursprüngliche Speicherinhalte unverändert sichern
  sicherungsSchluessel.forEach(key => {
    lokalesBackupVorDownload[key] =
      aquariumIphoneTestspeicher.getItem(key);
  });

  downloadSicherungsText = JSON.stringify(lokalesBackupVorDownload);
  aquariumIphoneTestspeicher.setItem(
    "aquarium-cloud-download-sicherheitsbackup-v1",
    downloadSicherungsText
  );

// 🔒 Gespeichertes Sicherheitsbackup kontrollieren
const gespeichertesBackup = aquariumIphoneTestspeicher.getItem(
  "aquarium-cloud-download-sicherheitsbackup-v1"
);

if (
  gespeichertesBackup !==
  JSON.stringify(lokalesBackupVorDownload)
) {
  throw new Error(
    "Sicherheitsbackup stimmt nicht mit den Originaldaten überein."
  );
}

  console.log(
    "🔒 Originale lokale Aquarium-Daten vor Cloud-Download gesichert."
  );

} catch (fehler) {

  console.error(
    "🔴 Sicherheitsbackup konnte nicht gespeichert werden:",
    fehler
  );

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt: Sicherheitsbackup konnte nicht gespeichert werden.";

  return;
}

// 🔒 Prüfen, ob lokale Daten seit dem Sicherheitsbackup verändert wurden
// 🔒 Sicherheitsbackup kontrolliert einlesen
try {
  const backupText = aquariumIphoneTestspeicher.getItem(
    "aquarium-cloud-download-sicherheitsbackup-v1"
  );

  gespeicherteOriginaldaten = JSON.parse(backupText);

  if (
    !gespeicherteOriginaldaten ||
    typeof gespeicherteOriginaldaten !== "object" ||
    Array.isArray(gespeicherteOriginaldaten) ||
    !sicherungsSchluessel.every(key =>
      Object.prototype.hasOwnProperty.call(
        gespeicherteOriginaldaten,
        key
      ) &&
      (
        gespeicherteOriginaldaten[key] === null ||
        typeof gespeicherteOriginaldaten[key] === "string"
      )
    )
  ) {
    throw new Error("Sicherheitsbackup ist ungültig oder unvollständig.");
  }

} catch (fehler) {
  console.error(
    "🔴 Sicherheitsbackup konnte nicht sicher gelesen werden:",
    fehler
  );

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt: Sicherheitsbackup ist nicht lesbar oder ungültig.";

  return;
}

const lokaleDatenUnveraendert = sicherungsSchluessel.every(
  key =>
    aquariumIphoneTestspeicher.getItem(key) ===
    gespeicherteOriginaldaten[key]
);

if (!lokaleDatenUnveraendert) {
  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt: Lokale Daten wurden seit der Sicherung verändert.";

  console.error(
    "🔒 Cloud-Wiederherstellung wegen veränderter lokaler Daten blockiert."
  );

  return;
}

// 🔒 Letzte Kontrolle vor dem Überschreiben lokaler Daten
if (
  lokaleDatenWurdenGeaendert() &&
  !(
    konfliktUebernahmeBestaetigt === true &&
    automatischerDownload === false
  )
) {

  console.warn(
    "🔒 Cloud-Download gestoppt: Lokale Daten wurden verändert."
  );

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download gestoppt: Es liegen lokale Änderungen vor.";

  return;
}    

// 🔒 Automatischen Download unmittelbar vor der
// Wiederherstellung nochmals absichern
if (
  automatischerDownload === true &&
  !pruefeAutomatischenDownload(cloudJetzt.updated_at, true)
) {
  console.warn(
    "🔒 Automatischer Download gestoppt: Sicherheitsprüfung fehlgeschlagen."
  );

  cloudLadenStatus.textContent =
    "🛑 Automatischer Cloud-Download aus Sicherheitsgründen gestoppt.";

  return;
}

// 🔒 Automatische Wiederherstellung nur über den
// dafür vorgesehenen Aufrufweg durchführen
if (
  automatischerDownload === true &&
  typeof window.stelleCloudBackupAutomatischWiederHer !== "function"
) {
  throw new Error(
    "Automatische Cloud-Wiederherstellung nicht verfügbar."
  );
}

// 🔒 Wiederherstellung dauerhaft als begonnen markieren
if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
aquariumIphoneTestspeicher.setItem(
  CLOUD_WIEDERHERSTELLUNG_MARKER_KEY,
  "true"
);

// 🔒 Kontrollieren, ob die Kennzeichnung gespeichert wurde
if (
  aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) !== "true"
) {
  throw new Error(
    "Sicherheitskennzeichnung konnte nicht gespeichert werden."
  );
}

// 🔒 Zustand unmittelbar vor dem Wiederherstellungsversuch merken
// Der tatsächliche Schreibzustand wird in der gemeinsamen Wiederherstellung geprüft.

// 🔒 Kennzeichnen, dass die Wiederherstellung beginnt
cloudWiederherstellungGestartet = true;

const ergebnis = automatischerDownload === true
  ? window.stelleCloudBackupAutomatischWiederHer(cloudJetzt.daten)
  : window.stelleAquariumBackupWiederHer(cloudJetzt.daten);

 if (ergebnis === false) {

  // 🔒 Abbruch durch Benutzer oder Sicherheitsprüfung vor dem Schreiben.
  // Auch bei einem folgenden Fehler darf keine Rücksicherung starten.
  cloudWiederherstellungGestartet = false;

  aquariumIphoneTestspeicher.removeItem(
    CLOUD_WIEDERHERSTELLUNG_MARKER_KEY
  );

  // 🔒 Sicherstellen, dass die Kennzeichnung entfernt wurde
  if (
    aquariumIphoneTestspeicher.getItem(
      CLOUD_WIEDERHERSTELLUNG_MARKER_KEY
    ) !== null
  ) {
    throw new Error(
      "Unterbrechungskennzeichnung konnte nach Abbruch nicht entfernt werden."
    );
  }

  cloudLadenStatus.textContent =
  "🔒 Cloud-Wiederherstellung abgebrochen. " +
  "Lokale Aquarium-Daten wurden nicht überschrieben.";

  console.log(
    "ℹ️ Cloud-Wiederherstellung ohne Datenänderung abgebrochen."
  );

  return;
}

if (ergebnis === true) {

  // 🔒 Tatsächlich wiederhergestellte Aquarium-Daten überprüfen
if (!pruefeWiederhergestellteLokaleDaten(cloudJetzt.daten)) {
  throw new Error(
    "Wiederhergestellte Aquarium-Daten stimmen nicht mit dem Cloud-Backup überein."
  );
}

  // ☁️ Heruntergeladenes Backup und Cloud-Zeitstempel speichern
  const syncGespeichert = speichereBestaetigtenSyncStand(
  cloudJetzt.daten,
  cloudJetzt.updated_at
);

 if (syncGespeichert !== true) {

  // 🔒 Der äußere Fehlerzweig bewahrt Aquarium-Daten und sperrt die Synchronisierung.
  throw new Error(
    "Synchronisierungsstand konnte nach der Cloud-Wiederherstellung nicht gespeichert werden."
  );
}

// 🔒 Wiederherstellung erfolgreich abgeschlossen
if (!archiviereCloudDownloadSicherheitsbackup(downloadSicherungsText)) {
  throw new Error("Sicherheitsbackup konnte nach der Übernahme nicht sicher archiviert werden.");
}
// Unterbrechungskennzeichnung entfernen
aquariumIphoneTestspeicher.removeItem(
  CLOUD_WIEDERHERSTELLUNG_MARKER_KEY
);

// 🔒 Kontrollieren, ob die Kennzeichnung entfernt wurde
if (
  aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) !== null
) {
  throw new Error(
    "Unterbrechungskennzeichnung konnte nicht entfernt werden."
  );
}

  cloudLadenStatus.textContent =
    "✅ Aquarium-Daten erfolgreich aus der Cloud wiederhergestellt.";

  // Seite neu laden, damit die wiederhergestellten Daten angezeigt werden
  
  cloudNeuladenAusstehend = true;
  
  setTimeout(() => {
    window.location.reload();
  }, 1500);

  return;
}

// 🔒 Unbekanntes Wiederherstellungsergebnis niemals akzeptieren
throw new Error(
  "Cloud-Wiederherstellung lieferte kein eindeutiges Ergebnis."
);

} catch (fehler) {

  console.error("🔴 Fehler beim Cloud-Download:", fehler);

  if (cloudWiederherstellungGestartet === true) {

    // 🔒 Nur vergleichen, keine Aquarium-Daten zurückschreiben
let lokaleDatenSindNochOriginal = false;

try {
  lokaleDatenSindNochOriginal =
    gespeicherteOriginaldaten !== null &&
    sicherungsSchluessel.every(
      key =>
        aquariumIphoneTestspeicher.getItem(key) ===
        gespeicherteOriginaldaten[key]
    );
} catch (pruefFehler) {
  console.error(
    "🔴 Lokaler Datenvergleich fehlgeschlagen:",
    pruefFehler
  );
}

console.log(
  "🔍 Lokale Daten entsprechen noch dem Sicherheitsbackup:",
  lokaleDatenSindNochOriginal
);

      // 🔒 Uploads bei ungeklärtem Datenzustand sperren
  cloudDatenzustandUnsicher = true;

  try {
    aquariumIphoneTestspeicher.setItem(CLOUD_DATENZUSTAND_KEY, "true");
  } catch (speicherFehler) {
    console.error(
      "🔴 Sicherheitssperre konnte nicht dauerhaft gespeichert werden:",
      speicherFehler
    );
  }

  // 🔒 Unbekannte Änderungen bewahren und manuell prüfen lassen
if (!lokaleDatenSindNochOriginal) {

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download fehlgeschlagen. Lokale Daten weichen vom " +
    "Sicherheitsbackup ab oder konnten nicht geprüft werden. " +
    "Keine automatische Rücksicherung durchgeführt. Sicherheitsbackup bleibt erhalten. " +
    "Cloud-Synchronisierung gesperrt. Bitte Datenzustand prüfen.";

} else {

  cloudLadenStatus.textContent =
    "🛑 Cloud-Download fehlgeschlagen. " +
    "Lokale Aquarium-Daten entsprechen bereits dem Sicherheitsbackup; " +
    "keine Rücksicherung erforderlich. " +
    "Cloud-Synchronisierung bleibt vorsorglich gesperrt.";

}
    console.error(
      "🔒 Wiederherstellung wurde gestartet. Datenzustand muss geprüft werden."
    );

  } else {

   // 🔒 Vorhandene Unterbrechungskennzeichnung beachten
if (
  aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) === "true"
) {
  cloudDatenzustandUnsicher = true;

  // 🔒 Sicherheitssperre dauerhaft speichern
  try {
    aquariumIphoneTestspeicher.setItem(
      CLOUD_DATENZUSTAND_KEY,
      "true"
    );
  } catch (speicherFehler) {
    console.error(
      "🔴 Dauerhafte Cloud-Sicherheitssperre konnte nicht gespeichert werden:",
      speicherFehler
    );
  }
}

    cloudLadenStatus.textContent =
      "❌ Cloud-Download fehlgeschlagen: " + fehler.message;

   }

} finally {

  // Vor dem Schreiben abgebrochene Versuche brauchen keine aktive Rücksicherung.
  // Bei Fehlern niemals Backup-Einträge ungeprüft entfernen.
  if (!cloudWiederherstellungGestartet && downloadSicherungsText !== null) {
    if (!archiviereCloudDownloadSicherheitsbackup(downloadSicherungsText)) {
      cloudLadenStatus.textContent += " Sicherheitsbackup bitte behalten und Archivierung prüfen.";
    }
  }

  // 🔒 Sperre bis zum Neuladen aktiv halten
  if (!cloudNeuladenAusstehend) {
    cloudWiederherstellungLaeuft = false;
  }

}

}

// ☁️ Bisherigen Cloud-Download-Button verbinden
cloudLaden.addEventListener("click", function () {
  starteCloudDownload(false);
});

// ☁️ Automatischen Cloud-Download mit der Startprüfung verbinden
document.addEventListener(
  "aquarium-cloud-auto-download",
  function () {
    starteCloudDownload(false, true).catch(fehler => {
      console.error(
        "🔴 Automatischer Cloud-Download fehlgeschlagen:",
        fehler
      );
    });
  }
);


// 🔒 Erstverbindung prüfen – noch keine Datenübertragung
cloudErstverbindung.addEventListener("click", async function () {
  if (await window.aquariumSchreibschutz?.bereit !== true || window.aquariumSchreibschutz.darfSchreiben() !== true) return false;

  // 🔒 Keine Erstverbindung bei unsicherem Datenzustand
if (cloudDatenzustandUnsicher) {

  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gesperrt: Der lokale Datenzustand ist unsicher.";

  return;
}
  
  // 🔒 Während laufender Cloud-Vorgänge nicht prüfen
  if (
    cloudWiederherstellungLaeuft ||
    automatischerUploadLaeuft ||
    geschuetzterUploadLaeuft ||
    synchronisierungLaeuft
  ) {
    cloudErstverbindungStatus.textContent =
      "🛑 Erstverbindung gestoppt: Ein Cloud-Vorgang läuft bereits.";

    return;
  }

  // 🔒 Erstverbindung gegen andere Cloud-Vorgänge absichern
cloudWiederherstellungLaeuft = true;

// 🔒 Button während der Prüfung sperren
cloudErstverbindung.disabled = true;

cloudErstverbindungStatus.textContent =
  "🔍 Erstverbindung wird geprüft ...";

  // 🔒 Merken, ob die Erstverbindung vollständig abgeschlossen wurde
let erstverbindungErfolgreich = false;

// 🔒 Merken, ob lokale Daten bereits übernommen wurden
let erstverbindungDatenUebernommen = false;



  try {

    // 🔍 Lokale Daten und Cloud-Daten prüfen
    const ergebnis = await bereiteErstverbindungVor();

    console.log(
      "🔍 Ergebnis der Erstverbindungsprüfung:",
      ergebnis
    );

    if (!ergebnis.erlaubt) {
  cloudErstverbindungStatus.textContent =
    "🔒 " + ergebnis.grund;

  return;
}

// 🔒 Sicherheitsbackup vor der Erstverbindung anlegen
const sicherung = bereiteErstverbindungsBackupVor();

if (!sicherung.erfolgreich) {
  cloudErstverbindungStatus.textContent =
    "🛑 " + sicherung.grund;

  return;
}

// 🔒 Gespeichertes Sicherheitsbackup nochmals kontrollieren
const backupPruefung = pruefeGespeichertesErstverbindungsBackup();

if (!backupPruefung.gueltig) {
  cloudErstverbindungStatus.textContent =
    "🛑 " + backupPruefung.grund;

  return;
}

// 🔒 Wiederherstellungsfunktion muss verfügbar sein
// 🔒 Geschützte Cloud-Wiederherstellung prüfen
if (
  typeof window.stelleCloudBackupAutomatischWiederHer !== "function"
) {

  cloudErstverbindungStatus.textContent =
    "🛑 Geschützte Cloud-Wiederherstellung nicht verfügbar.";

  return;
}

// 🔒 Ausdrückliche Zustimmung zur Erstverbindung einholen
const bestaetigt = bestaetigeErstverbindung();

if (!bestaetigt) {
  cloudErstverbindungStatus.textContent =
    "☁️ Erstverbindung vom Benutzer abgebrochen.";

  return;
}

// ☁️ Cloud-Daten nach der Bestätigung erneut abrufen
const cloudJetzt = await ladeCloudSyncDaten();

// 🔒 Cloud-Daten und Zeitstempel überprüfen
if (!cloudSyncDatenSindGueltig(cloudJetzt)) {
  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Cloud-Daten sind ungültig.";

  return;
}

console.log(
  "✅ Cloud-Daten für die Erstverbindung erneut geprüft."
);

// 🔒 Cloud unmittelbar vor der Übernahme erneut kontrollieren
const cloudKontrolle = await ladeCloudSyncDaten();

if (
  !cloudSyncDatenSindGueltig(cloudKontrolle) ||
  cloudKontrolle.updated_at !== cloudJetzt.updated_at ||
  !datenSindGleich(cloudKontrolle.daten, cloudJetzt.daten)
) {


  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Cloud-Daten haben sich verändert.";

  return;
}

console.log(
  "✅ Cloud-Daten unverändert. Sicherheitsprüfung erfolgreich."
);

// 🔒 Lokale Daten mit dem Sicherheitsbackup vergleichen
if (lokaleDatenSeitBackupVeraendert(backupPruefung.backup)) {

  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Lokale Daten wurden verändert.";

  return;
}

console.log(
  "✅ Lokale Aquarium-Daten unverändert."
);

// 🔒 Erstverbindung nur ohne bestehenden Sync-Stand erlauben
if (
  hatGespeicherteSyncInformationen() ||
  cloudDatenzustandUnsicher
) {

  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Synchronisierungszustand hat sich verändert.";

  return;
}

console.log(
  "✅ Synchronisierungszustand weiterhin für Erstverbindung geeignet."
);

// ☁️ Unabhängige Kopie des geprüften Cloud-Backups erstellen
const cloudBackupFuerUebernahme =
  structuredClone(cloudKontrolle.daten);

// 🔒 Kopie nochmals auf Gültigkeit prüfen
if (!cloudBackupIstGueltig(cloudBackupFuerUebernahme)) {

  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Cloud-Backup-Kopie ist ungültig.";

  return;
}

console.log(
  "✅ Cloud-Backup für die sichere Übernahme vorbereitet."
);

// 🔒 Sicherheitsbackup vor der Übernahme erneut prüfen
const letzteBackupPruefung =
  pruefeGespeichertesErstverbindungsBackup();

if (
  !letzteBackupPruefung.gueltig ||
  lokaleDatenSeitBackupVeraendert(letzteBackupPruefung.backup)
) {

  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Lokales Sicherheitsbackup nicht mehr gültig.";

  return;
}

console.log(
  "✅ Sicherheitsbackup vor Datenübernahme erneut geprüft."
);


// 🔒 Letzte Prüfung unmittelbar vor der Datenübernahme
if (
  cloudDatenzustandUnsicher ||
  hatGespeicherteSyncInformationen() ||
  !cloudBackupIstGueltig(cloudBackupFuerUebernahme)
) {

  cloudErstverbindungStatus.textContent =
    "🛑 Erstverbindung gestoppt: Sicherheitsvoraussetzungen nicht mehr erfüllt.";

  return;
}

console.log(
  "✅ Letzte Sicherheitsprüfung vor der Cloud-Übernahme bestanden."
);

// ☁️ Geprüfte Cloud-Daten lokal wiederherstellen

// 🔒 Ab jetzt könnten lokale Daten verändert werden
if (window.aquariumSchreibschutz?.darfSchreiben() !== true) return;
erstverbindungDatenUebernommen = true;

// 🔒 Unterbrechungen auch nach einem Neustart erkennen
aquariumIphoneTestspeicher.setItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY, "true");
if (aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) !== "true") {
  throw new Error("Sicherheitskennzeichnung der Erstverbindung konnte nicht gespeichert werden.");
}

const wiederherstellungErfolgreich =
  window.stelleCloudBackupAutomatischWiederHer(
    cloudBackupFuerUebernahme
  );

// 🔒 Ein schützender Abbruch darf keine Rücksicherung auslösen
if (wiederherstellungErfolgreich === false) {
  aquariumIphoneTestspeicher.removeItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY);
  if (aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) !== null) {
    throw new Error("Unterbrechungskennzeichnung konnte nach Abbruch nicht entfernt werden.");
  }
  erstverbindungDatenUebernommen = false;
  cloudErstverbindungStatus.textContent =
    "🔒 Erstverbindung vor dem Schreiben abgebrochen. Keine Rücksicherung durchgeführt.";
  return;
}

if (wiederherstellungErfolgreich !== true) {
  throw new Error("Erstverbindung lieferte kein eindeutiges Wiederherstellungsergebnis.");
}

console.log(
  "✅ Cloud-Daten lokal wiederhergestellt. Synchronisierungsstand noch nicht bestätigt."
);

// 🔒 Tatsächlich wiederhergestellte Aquariendaten überprüfen
const lokaleDatenKorrekt =
  pruefeWiederhergestellteLokaleDaten(
    cloudBackupFuerUebernahme
  );

if (lokaleDatenKorrekt !== true) {
  throw new Error("Lokale Datenprüfung nach der Erstverbindung fehlgeschlagen.");
}

console.log(
  "✅ Alle 11 lokalen Speicherbereiche stimmen mit dem Cloud-Backup überein."
);

// 🔒 Übernommene Cloud-Daten als bestätigten Sync-Stand speichern
const syncStandGespeichert =
  speichereBestaetigtenSyncStand(
    cloudBackupFuerUebernahme,
    cloudKontrolle.updated_at
  );

// 🔒 Bei Fehler aktuelle Daten bewahren und Synchronisierung sperren
if (syncStandGespeichert !== true) {
  throw new Error("Synchronisierungsstand der Erstverbindung konnte nicht gespeichert werden.");
}

console.log(
  "✅ Cloud-Daten und bestätigter Synchronisierungsstand gespeichert."
);

// 🔒 Gespeicherten Synchronisierungsstand erneut auslesen
const gespeicherterZeitstempel = leseSyncStand();
const gespeichertesSyncBackup = leseSyncBackup();

// 🔒 Gespeicherte Daten mit der Cloud-Übernahme vergleichen
if (
  gespeicherterZeitstempel !== cloudKontrolle.updated_at ||
  !aquariumBackupsSindGleich(
    gespeichertesSyncBackup,
    cloudBackupFuerUebernahme
  )
) {

  throw new Error("Abschlussprüfung des Synchronisierungsstands der Erstverbindung fehlgeschlagen.");
}

console.log(
  "✅ Gespeicherter Synchronisierungsstand erfolgreich kontrolliert."
);

// ✅ Erstverbindung erfolgreich abgeschlossen

// 🔒 Kennzeichnung erst nach erfolgreicher Daten- und Sync-Prüfung entfernen
aquariumIphoneTestspeicher.removeItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY);
if (aquariumIphoneTestspeicher.getItem(CLOUD_WIEDERHERSTELLUNG_MARKER_KEY) !== null) {
  throw new Error("Unterbrechungskennzeichnung der Erstverbindung konnte nicht entfernt werden.");
}

cloudErstverbindungStatus.textContent =
  "✅ Cloud-Daten erfolgreich übernommen. App wird neu geladen.";

console.log(
  "✅ Erstverbindung abgeschlossen. Aquarium Tracker wird neu geladen."
);

// 🔄 App neu laden, damit alle übernommenen Daten
// auch im Arbeitsspeicher verwendet werden
window.location.reload();

// ✅ Neuladen wurde ohne unmittelbaren Fehler angestoßen
erstverbindungErfolgreich = true;

   } catch (fehler) {

  console.error(
    "🔴 Fehler bei der Erstverbindung:",
    fehler
  );

  // 🔒 Nach begonnener Datenübernahme keine
  // unkontrollierte Synchronisierung erlauben
  if (erstverbindungDatenUebernommen) {

    // 🔒 Aktuelle Aquarium-Daten und Sicherheitsbackup unverändert bewahren
    cloudDatenzustandUnsicher = true;

    try {
      aquariumIphoneTestspeicher.setItem(
        CLOUD_DATENZUSTAND_KEY,
        "true"
      );
    } catch (speicherFehler) {
      console.error(
        "🔴 Sicherheitssperre konnte nicht gespeichert werden:",
        speicherFehler
      );
    }

    cloudErstverbindungStatus.textContent =
      "🛑 Erstverbindung unterbrochen. Keine automatische Rücksicherung durchgeführt. " +
      "Sicherheitsbackup bleibt erhalten. Cloud-Synchronisierung gesperrt. Bitte Datenzustand prüfen.";
    return;
  }

  cloudErstverbindungStatus.textContent =
    "❌ Erstverbindungsprüfung fehlgeschlagen.";


  } finally {

  // 🔒 Bei erfolgreicher Erstverbindung bleibt die Sperre
// bis zum Neuladen der App aktiv.
if (!erstverbindungErfolgreich) {
  cloudWiederherstellungLaeuft = false;
}

  // 🔒 Button nur nach erfolgreicher Erstverbindung sperren
  cloudErstverbindung.disabled = erstverbindungErfolgreich;

}

});

});

// 🔒 Voraussetzungen für einen automatischen Cloud-Download
function darfAutomatischHerunterladen(
  eigenerDownloadLaeuft = false
) {

    // 🔒 Automatischer Download nur bei gültigem Sync-Stand
  if (!hatBestaetigtenSyncStand()) {
    console.warn(
      "🔒 Automatischer Download gesperrt: Kein bestätigter Synchronisierungsstand."
    );
    return false;
  }

  // Keine Übertragung während anderer Cloud-Vorgänge
  if (
  automatischerUploadLaeuft ||
  geschuetzterUploadLaeuft ||
  (
    cloudWiederherstellungLaeuft &&
    eigenerDownloadLaeuft !== true
  ) ||
  cloudDatenzustandUnsicher
) {
  return false;
}


  // Lokale Änderungen dürfen nicht überschrieben werden
  if (lokaleDatenWurdenGeaendert() !== false) {
    return false;
  }

  return true;
}

// 🔒 Cloud-Status für automatischen Download prüfen
function pruefeAutomatischenDownload(
  cloudZeitstempel,
  eigenerDownloadLaeuft = false
) {

  // Lokale Sicherheitsprüfung
  if (!darfAutomatischHerunterladen(eigenerDownloadLaeuft)) {
  return false;
}
  

  // Cloud-Zeitstempel muss gültig sein
  if (!cloudZeitstempelIstGueltig(cloudZeitstempel)) {
    return false;
  }

  // Ausschließlich neuere Cloud-Daten erlauben
  const aktion = ermittleSyncAktion(cloudZeitstempel);

  if (aktion !== "herunterladen") {
    return false;
  }

  return true;
}

// ☁️ Automatische Cloud-Prüfung beim App-Start
// 🔒 Nur prüfen – keine Daten übertragen

document.addEventListener("DOMContentLoaded", async function () {

  console.log("☁️ Automatische Cloud-Startprüfung beginnt.");

  try {

  if (await window.aquariumSchreibschutz?.bereit !== true || window.aquariumSchreibschutz.darfSchreiben() !== true) return false;

    // 🔒 Sicherheitssperre bereits beim App-Start beachten
if (cloudDatenzustandUnsicher) {

  console.warn(
    "🔴 Cloud-Startprüfung gestoppt: Datenzustand ist unsicher."
  );

  const cloudSyncStatus =
    document.getElementById("cloudSyncStatus");

  if (cloudSyncStatus) {
    cloudSyncStatus.textContent =
      "🔴 Cloud-Synchronisierung gesperrt. Lokaler Datenzustand muss geprüft werden.";
  }

  return;
}

    // 🔒 Anmeldung überprüfen
    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data?.user) {

  console.log("🔒 Cloud-Startprüfung: Nicht angemeldet.");

  const cloudSyncStatus = document.getElementById("cloudSyncStatus");

  if (cloudSyncStatus) {
    cloudSyncStatus.textContent =
      "🔒 Nicht angemeldet – Cloud-Synchronisierung nicht verfügbar.";
  }

  return;
}

    // 🔒 Bestätigten Synchronisierungsstand überprüfen
    if (!hatBestaetigtenSyncStand()) {

  console.log(
    "🔒 Cloud-Startprüfung: Noch kein bestätigter Synchronisierungsstand."
  );

  const cloudSyncStatus = document.getElementById("cloudSyncStatus");

  if (cloudSyncStatus) {
    cloudSyncStatus.textContent =
      "🟡 Noch keine Cloud-Erstverbindung – Synchronisierung nicht eingerichtet.";
  }

  return;
}

    // 🔍 Cloud-Zustand ausschließlich lesend überprüfen
    const aktion = await pruefeAutomatischeSynchronisierung();

    console.log(
      "☁️ Ergebnis der automatischen Cloud-Startprüfung:",
      aktion
    );

    // ☁️ Synchronisierungsstatus in der App anzeigen
const cloudSyncStatus = document.getElementById("cloudSyncStatus");

if (cloudSyncStatus) {

  switch (aktion) {

    case "nichts":
      cloudSyncStatus.textContent =
        "🟢 Cloud aktuell – Alle Daten synchronisiert.";
      break;

    case "hochladen":
      cloudSyncStatus.textContent =
        "🟡 Lokale Änderungen vorhanden – Cloud-Upload erforderlich.";
      break;

    case "herunterladen":

  // ☁️ Aktuellen Cloud-Zeitstempel sicher abrufen
  const cloudDaten = await ladeCloudSyncDaten();

  const cloudZeitstempel = cloudDaten?.updated_at;

  if (pruefeAutomatischenDownload(cloudZeitstempel)) {

    cloudSyncStatus.textContent =
      "🔵 Neuere Cloud-Daten vorhanden – Automatischer Download kann vorbereitet werden.";

    console.log(
      "🔒 Automatischer Cloud-Download: Lokale Sicherheitsprüfung bestanden."
    );

    // ☁️ Geschützten automatischen Cloud-Download anfordern
document.dispatchEvent(
  new Event("aquarium-cloud-auto-download")
);

  } else {

    cloudSyncStatus.textContent =
      "🟠 Neuere Cloud-Daten vorhanden – Automatischer Download aus Sicherheitsgründen gesperrt.";

    console.warn(
      "🔒 Automatischer Cloud-Download: Sicherheitsprüfung nicht bestanden."
    );

  }

  break;

    case "konflikt":
      cloudSyncStatus.textContent =
        "🔴 Synchronisierungskonflikt – Keine Daten übertragen.";
      break;

    default:
      cloudSyncStatus.textContent =
        "⚪ Cloud-Status konnte nicht sicher ermittelt werden.";

  }

}

  } catch (fehler) {

    console.error(
      "❌ Automatische Cloud-Startprüfung fehlgeschlagen:",
      fehler
    );

  }

});
