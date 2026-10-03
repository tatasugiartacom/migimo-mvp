import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  audit,
  cookie,
  CSRF_HEADER,
  decodeIdToken,
  randomState,
  SESSION_COOKIE,
  sessionEmail,
  signSession,
  parseCookies,
} from "../auth.js";
import type { Config } from "../config.js";
import type { Db } from "../db.js";

const STATE_COOKIE = "migimo_oauth_state";

/** Login Google untuk dashboard admin (OAuth 2.0 Authorization Code). */
export function authRoutes(app: FastifyInstance, deps: { cfg: Config; db: Db; fetchImpl?: typeof fetch }) {
  const { cfg, db } = deps;
  const doFetch = deps.fetchImpl ?? fetch;
  const googleOn = () => !!(cfg.auth.googleClientId && cfg.auth.googleClientSecret && cfg.auth.sessionSecret);

  const origin = (req: FastifyRequest) =>
    cfg.dashboardHost ? `https://${cfg.dashboardHost}` : `${req.protocol}://${req.host}`;
  const secure = (req: FastifyRequest) => !!cfg.dashboardHost || req.protocol === "https";

  app.get("/auth/me", async (req, reply) => {
    const email = sessionEmail(cfg, req);
    if (!email) return reply.code(401).send({ google: googleOn() });
    return { email, google: googleOn() };
  });

  app.get("/auth/google", async (req, reply) => {
    if (!googleOn()) return reply.code(503).type("text/plain; charset=utf-8").send("Login Google belum dikonfigurasi.");
    const state = randomState();
    const params = new URLSearchParams({
      client_id: cfg.auth.googleClientId,
      redirect_uri: `${origin(req)}/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      state,
      prompt: "select_account",
    });
    reply
      .header("Set-Cookie", cookie(STATE_COOKIE, state, 600, secure(req)))
      .redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
  });

  app.get("/auth/google/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string; error?: string };
    const clearState = cookie(STATE_COOKIE, "", 0, secure(req));
    const fail = (why: string) => reply.header("Set-Cookie", clearState).redirect(`/?login=${why}`, 302);

    if (!googleOn()) return fail("belum_dikonfigurasi");
    if (q.error || !q.code) return fail("dibatalkan");
    const expected = parseCookies(req.headers.cookie)[STATE_COOKIE];
    if (!expected || expected !== q.state) return fail("sesi_kedaluwarsa");

    let idToken: string | undefined;
    try {
      const res = await doFetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: q.code,
          client_id: cfg.auth.googleClientId,
          client_secret: cfg.auth.googleClientSecret,
          redirect_uri: `${origin(req)}/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      const data: any = await res.json().catch(() => null);
      idToken = data?.id_token;
      if (!res.ok || !idToken) {
        req.log.warn({ status: res.status, error: data?.error }, "Pertukaran kode Google gagal");
        return fail("gagal");
      }
    } catch (e) {
      req.log.error(e, "Tidak bisa menghubungi Google");
      return fail("gagal");
    }

    const p = decodeIdToken(idToken);
    const email = String(p?.email ?? "").toLowerCase();
    const valid =
      p &&
      p.aud === cfg.auth.googleClientId &&
      (p.iss === "https://accounts.google.com" || p.iss === "accounts.google.com") &&
      Number(p.exp) * 1000 > Date.now() &&
      p.email_verified === true &&
      email;
    if (!valid) return fail("gagal");

    if (!cfg.auth.adminEmails.includes(email)) {
      await audit(db, email, "login_ditolak", { alasan: "email tidak ada di ADMIN_EMAILS" });
      return fail("ditolak");
    }
    await audit(db, email, "login", null);
    reply
      .header("Set-Cookie", [clearState, cookie(SESSION_COOKIE, signSession(cfg.auth.sessionSecret, email), 12 * 3600, secure(req))])
      .redirect("/", 302);
  });

  app.post("/auth/logout", async (req, reply) => {
    if (req.headers[CSRF_HEADER] !== "1") return reply.code(403).send({ error: "Permintaan ditolak (CSRF)" });
    const email = sessionEmail(cfg, req);
    if (email) await audit(db, email, "logout", null);
    reply.header("Set-Cookie", cookie(SESSION_COOKIE, "", 0, secure(req))).send({ ok: true });
  });
}
