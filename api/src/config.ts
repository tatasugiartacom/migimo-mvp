import { createHmac } from "node:crypto";

/** Semua konfigurasi dibaca dari environment variable (Railway → Variables). */

function pem(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const s = v.trim();
  if (s.includes("-----BEGIN")) return s.replace(/\\n/g, "\n");
  // Boleh juga disimpan dalam bentuk base64 satu baris.
  return Buffer.from(s, "base64").toString("utf8");
}

export type Config = ReturnType<typeof loadConfig>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env) {
  const mode = (env.MTI_MODE ?? "simulator") as "simulator" | "live";
  if (mode !== "simulator" && mode !== "live") throw new Error("MTI_MODE harus 'simulator' atau 'live'");

  return {
    port: Number(env.PORT ?? 8080),
    databaseUrl: env.DATABASE_URL ?? "",
    adminToken: env.ADMIN_TOKEN ?? "",
    publicBaseUrl: (env.PUBLIC_BASE_URL ?? "").replace(/\/$/, ""),
    /** Host khusus dashboard admin, mis. raksa.migimo.id. Kosong = dashboard di /dashboard pada host mana pun. */
    dashboardHost: (env.DASHBOARD_HOST ?? "").toLowerCase(),
    auth: {
      googleClientId: env.GOOGLE_CLIENT_ID ?? "",
      googleClientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      /** Email yang boleh masuk dashboard, dipisah koma. */
      adminEmails: (env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
      /** Kunci tanda tangan cookie sesi. Bawaan: diturunkan dari ADMIN_TOKEN. */
      sessionSecret:
        env.SESSION_SECRET ??
        (env.ADMIN_TOKEN ? createHmac("sha256", env.ADMIN_TOKEN).update("migimo-session-v1").digest("hex") : ""),
    },
    mti: {
      mode,
      baseUrl: (env.MTI_BASE_URL ?? "").replace(/\/$/, ""),
      clientKey: env.MTI_CLIENT_KEY ?? "",
      clientSecret: env.MTI_CLIENT_SECRET ?? "",
      partnerId: env.MTI_PARTNER_ID ?? "",
      merchantId: env.MTI_MERCHANT_ID ?? "",
      terminalId: env.MTI_TERMINAL_ID ?? "",
      channelId: env.MTI_CHANNEL_ID ?? "02",
      /** Kunci privat Migimo untuk tanda tangan Get Token. */
      privateKey: pem(env.MTI_PRIVATE_KEY),
      /** Kunci publik MTI untuk memverifikasi QR Payment Credit Notify. */
      mtiPublicKey: pem(env.MTI_PUBLIC_KEY),
      /** strict: tolak notify tanpa tanda tangan valid. log: terima tapi tandai tidak terverifikasi. */
      notifyVerify: (env.MTI_NOTIFY_VERIFY ?? "strict") as "strict" | "log",
      timeoutMs: Number(env.MTI_TIMEOUT_MS ?? 30000),
      paths: {
        token: env.MTI_PATH_TOKEN ?? "/qr/v2.0/access-token/b2b",
        generate: env.MTI_PATH_GENERATE ?? "/v2.0/qr/qr-mpm-generate",
        query: env.MTI_PATH_QUERY ?? "/v2.0/qr/qr-mpm-query",
        cancel: env.MTI_PATH_CANCEL ?? "/v2.0/qr/qr-mpm-cancel",
        notify: env.MTI_PATH_NOTIFY ?? "/qr/qr-mpm-notify",
      },
    },
  };
}
