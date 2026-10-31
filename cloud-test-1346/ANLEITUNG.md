# Aquarium Tracker – echter Cloud-Test mit getrenntem Testkonto

Diese Version wurde für den neuen Ordner `cloud-test-1346/` im Projekt `aquarium-tracker-02` vorbereitet. Sie ersetzt weder die Haupt-App noch die vorherige Testversion mit nachgebildeter Cloud.

Vorgesehene Adresse nach gesonderter Veröffentlichungsfreigabe:

`https://alexgonzola.github.io/aquarium-tracker-02/cloud-test-1346/`

## Welche Anmeldung verwenden?

Ausschließlich das neu angelegte Testkonto mit der UID:

`43a1cf85-2238-4c6f-9eae-51510ebedfd0`

Das Passwort ist nicht im Paket enthalten. Es bleibt beim Nutzer und wird nur im Anmeldeformular eingegeben. Die Testversion besitzt einen eigenen Anmeldespeicher. Eine andere Benutzerkennung wird vor Datenzugriffen blockiert; beim versehentlichen Anmelden wird nur die neu entstandene, getrennte Sitzung abgemeldet.

## Erster Test nach Veröffentlichung

1. Zuerst am PC in Chrome öffnen. Oben muss „ECHTER CLOUD-TEST – ausschließlich Testkonto“ stehen.
2. Vor der Anmeldung wird lokal kein Messwert und noch kein bestätigter Cloudstand erwartet. Noch keine Messwerte eingeben.
3. Mit den Zugangsdaten des getrennten Testkontos anmelden.
4. Die erste Übernahme wird anschließend im Chat begleitet. Nicht eigenständig die Haupt-App oder andere Konten verbinden.

Der Nutzer hat bereits ausschließlich für dieses Testkonto einen künstlichen Cloud-Datensatz mit einem KH-Wert von 8 angelegt. Die erste Übernahme erfolgt über die vorhandene Erstverbindungsfunktion; sie soll keinen Cloud-Upload auslösen.

## Weitere geplante Prüfungen

Nach der ersten Übernahme richten wir dieselbe Testversion mit demselben Testkonto auf dem iPhone ein. Danach prüfen wir schrittweise PC → Cloud → iPhone, iPhone → Cloud → PC und einen kontrollierten Konflikt. Vor dem eigentlichen Start werden die bisherigen Testdaten nur nach gesonderter Absprache zurückgesetzt.

Es gibt in dieser Version keine nachgebildete Cloud, keine automatische Testanmeldung und keinen Schalter zum Löschen oder Zurücksetzen echter Cloud-Daten. Die bisherigen Schaltflächen aus dem künstlichen iPhone-Test sind nicht enthalten.

## Technische Trennung

- Eigener lokaler Datenbereich: `aquarium-cloud-test-1346:`.
- Eigener Auth-Storage-Key: `aquarium-cloud-test-1346-auth-v1`, ebenfalls im getrennten Datenbereich.
- Eigene Fenstersperre und eigene Service-Worker-Caches.
- Nur die vorgesehene Supabase-Adresse, die erforderlichen Anmelde-Endpunkte, benutzergebundene Tabellen-Lesezugriffe und `aquarium_sicher_speichern` sind im Test-Client vorgesehen.
- Vor Datenzugriffen wird das Benutzerkennzeichen auch im verwendeten Zugriffstoken geprüft. Die echte Signaturprüfung und Zugriffsberechtigung übernimmt weiterhin Supabase mit den Datenbank-Richtlinien.
- Keine geheimen Schlüssel, kein Passwort im Quellcode. Der vorhandene veröffentlichbare Projektschlüssel ist für die Browser-Anwendung bestimmt.
- Supabase JavaScript SDK 2.118.0 liegt lokal im Paket und wird für die Offline-Dateien mitgespeichert. Die Paket-Prüfsumme wurde vor dem Entpacken mit den npm-Metadaten abgeglichen. Lizenz: `SUPABASE-LICENSE.txt`.

## Prüfstand und Grenzen

Die Syntax und zusätzlichen Zugriffssperren wurden lokal geprüft. Mit der tatsächlichen SDK-Datei und vollständig nachgebildeten HTTP-Antworten wurden außerdem Anmeldung, Erstverbindung, Sitzungswiederherstellung, Upload, Download samt Archivbackup sowie Konflikte einschließlich Neuladen geprüft. Stellvertretende Hauptkonto-Daten und die Hauptanmeldung blieben erhalten.

Es wurde noch keine echte Cloud-Anmeldung oder Übertragung durch diese Version ausgeführt. Die Veröffentlichung und die praktischen Cloud-Prüfungen werden im Chat abgestimmt. Die bereits geprüften Datenbank-Richtlinien bleiben die verbindliche Sicherheitsgrenze; die zusätzlichen Client-Prüfungen schützen normale Testabläufe vor versehentlicher Kontoverwechslung.
