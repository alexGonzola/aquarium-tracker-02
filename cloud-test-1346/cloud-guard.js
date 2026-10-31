// Zusatzschutz der Test-App. Die Datenbank-Richtlinien bleiben die Sicherheitsgrenze.
(() => {
  window.erstelleGeschuetztenCloudTestClient = function ({
    sdk, projectUrl, publishableKey, allowedUserId, storage, storageKey,
    validateBackup, fetchImpl = window.fetch.bind(window)
  }) {
    const origin = new URL(projectUrl).origin;
    let angemeldet = false;

    function tokenGehortZumTestkonto(token) {
      try {
        const teil = token.split(".")[1];
        if (!teil) return false;
        const base64 = teil.replace(/-/g, "+").replace(/_/g, "/");
        const daten = JSON.parse(atob(base64 + "=".repeat((4 - base64.length % 4) % 4)));
        // Der Server prüft die Signatur. Hier verhindern wir zusätzlich Fehlbedienung.
        return daten.sub === allowedUserId && daten.role === "authenticated";
      } catch {
        return false;
      }
    }

    async function geschuetzterFetch(input, init) {
      const request = new Request(input, { ...init, redirect: "error" });
      const url = new URL(request.url);
      if (url.origin !== origin) throw new Error("Unbekannte Cloud-Adresse gesperrt.");

      if (url.pathname.startsWith("/auth/v1/")) {
        const erlaubt = (url.pathname === "/auth/v1/token" && request.method === "POST" &&
            ["password", "refresh_token"].includes(url.searchParams.get("grant_type"))) ||
          (url.pathname === "/auth/v1/user" && request.method === "GET") ||
          (url.pathname === "/auth/v1/logout" && request.method === "POST" &&
            url.searchParams.get("scope") === "local");
        if (!erlaubt) throw new Error("Dieser Anmeldevorgang ist in der Test-App nicht erlaubt.");
        return fetchImpl(request);
      }

      const bearer = request.headers.get("Authorization") ?? "";
      if (!bearer.startsWith("Bearer ") || !tokenGehortZumTestkonto(bearer.slice(7))) {
        throw new Error("Datenzugriff gesperrt: Ausschließlich das Testkonto ist zugelassen.");
      }

      if (url.pathname === "/rest/v1/aquarium_daten" && request.method === "GET") {
        if (url.searchParams.get("user_id") !== "eq." + allowedUserId ||
            url.searchParams.getAll("user_id").length !== 1) {
          throw new Error("Tabellenabfrage ohne eindeutige Testkonto-Begrenzung gesperrt.");
        }
      } else if (url.pathname === "/rest/v1/rpc/aquarium_sicher_speichern" && request.method === "POST") {
        const daten = await request.clone().json();
        if (Object.keys(daten).length !== 2 || !validateBackup(daten.p_daten) ||
            typeof daten.p_erwarteter_zeitstempel !== "string" ||
            !Number.isFinite(Date.parse(daten.p_erwarteter_zeitstempel))) {
          throw new Error("Ungültiger Speicheraufruf gesperrt.");
        }
      } else {
        throw new Error("Dieser Datenbankzugriff ist in der Test-App nicht erlaubt.");
      }
      return fetchImpl(request);
    }

    const raw = sdk.createClient(projectUrl, publishableKey, {
      auth: {
        storage, storageKey, persistSession: true, autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: { fetch: geschuetzterFetch }
    });

    function gesperrt() {
      return { data: null, error: new Error("Bitte ausschließlich mit dem getrennten Testkonto anmelden.") };
    }

    async function getUser() {
      const result = await raw.auth.getUser();
      angemeldet = !result.error && result.data?.user?.id === allowedUserId;
      if (!angemeldet) return { data: { user: null }, error: result.error ?? gesperrt().error };
      return result;
    }

    const auth = Object.freeze({
      getUser,
      async signInWithPassword(credentials) {
        const result = await raw.auth.signInWithPassword(credentials);
        if (result.error) { angemeldet = false; return result; }
        if (result.data?.user?.id !== allowedUserId) {
          angemeldet = false;
          // Niemals alle Sitzungen eines versehentlich verwendeten Hauptkontos abmelden.
          await raw.auth.signOut({ scope: "local" });
          return { data: { user: null, session: null }, error: gesperrt().error };
        }
        angemeldet = true;
        return result;
      },
      async signOut() {
        angemeldet = false;
        return raw.auth.signOut({ scope: "local" });
      }
    });

    const client = Object.freeze({
      auth,
      from(table) {
        if (table !== "aquarium_daten") throw new Error("Unbekannte Tabelle gesperrt.");
        return Object.freeze({
          select(columns) {
            const felder = columns.split(",").map(feld => feld.trim());
            if (felder.length !== 2 || !felder.includes("daten") || !felder.includes("updated_at")) {
              throw new Error("Unbekannte Tabellenfelder gesperrt.");
            }
            return Object.freeze({
              eq(column, value) {
                if (column !== "user_id" || value !== allowedUserId) {
                  throw new Error("Abfrage eines anderen Benutzers gesperrt.");
                }
                return Object.freeze({
                  async maybeSingle() {
                    const identity = await getUser();
                    if (identity.error) return gesperrt();
                    return raw.from(table).select(columns).eq(column, value).maybeSingle();
                  }
                });
              }
            });
          }
        });
      },
      async rpc(name, args) {
        if (name !== "aquarium_sicher_speichern" || !validateBackup(args?.p_daten)) return gesperrt();
        const identity = await getUser();
        if (identity.error) return gesperrt();
        return raw.rpc(name, args);
      }
    });
    return Object.freeze({ client, status: () => ({ angemeldet, allowedUserId }) });
  };
})();
