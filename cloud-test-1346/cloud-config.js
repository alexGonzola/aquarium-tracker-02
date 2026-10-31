// Ausschließlich öffentliche Konfiguration. Kein Passwort und kein geheimer Schlüssel.
(() => {
  window.aquariumCloudTest = window.erstelleGeschuetztenCloudTestClient({
    sdk: window.supabase,
    projectUrl: "https://yjmjafgycofdzkhppqml.supabase.co",
    publishableKey: "sb_publishable_58u0dT6frKgistq3iqew0Q_Vo7ymosC",
    allowedUserId: "43a1cf85-2238-4c6f-9eae-51510ebedfd0",
    storage: window.aquariumCloudTestspeicher,
    storageKey: "aquarium-cloud-test-1346-auth-v1",
    validateBackup: backup => window.pruefeAquariumBackup?.(backup) === true
  });
})();
