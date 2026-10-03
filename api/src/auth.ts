import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { Config } from "./config.js";
import type { Db } from "./db.js";

/**
 * Autentikasi dashboard admin:
 * - Login Google (OAuth 2.0 / OpenID Connect) + daftar email yang diizinkan (ADMIN_EMAILS) → cookie sesi bertanda tangan.
 * - ADMIN_TOKEN (header Authorization: Bearer) tetap diterima untuk akses teknis/darurat.
 */

export const SESSION_COOKIE = "migimo_sess";
const SESSION_TTL_MS = 12 * 3600 * 1000;
/** Header wajib untuk permintaan POST berbasis cookie (perlindungan CSRF). */
export const CSRF_HEADER = "x-migimo-dashboard";

declare module "fastify" {
  interface FastifyRequest {
    actor?: string;
  }
}

function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

export function signSession(secret: string, email: string, now = Date.now()) {
  const payload = b64url(JSON.stringify({ e: email, x: now + SESSION_TTL_MS }));
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(secret: string, value: string | undefined, now = Date.now()): string | null {
  if (!secret || !value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return null;
  const want = createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof p.e !== "string" || typeof p.x !== "number" || p.x < now) return null;
    return p.e;
  } catch {
    return null;
  }
}

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function cookie(name: string, value: string, maxAgeSec: number, secure: boolean) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure ? "; Secure" : ""}`;
}

export function randomState() {
  return randomBytes(24).toString("base64url");
}

function tokenOk(cfg: Config, req: FastifyRequest) {
  if (!cfg.adminToken) return false;
  const given = Buffer.from(String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(cfg.adminToken);
  return given.length === want.length && timingSafeEqual(given, want);
}

/** Email dari cookie sesi, bila masih berlaku dan masih ada di daftar izin. */
export function sessionEmail(cfg: Config, req: FastifyRequest): string | null {
  const email = verifySession(cfg.auth.sessionSecret, parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  return email && cfg.auth.adminEmails.includes(email) ? email : null;
}

/** Hook onRequest untuk semua endpoint /admin/*. */
export function requireAdmin(cfg: Config) {
  return async (req: FastifyRequest, _reply: FastifyReply) => {
    if (tokenOk(cfg, req)) {
      req.actor = "ADMIN_TOKEN";
      return;
    }
    const email = sessionEmail(cfg, req);
    if (!email) throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    if (req.method !== "GET" && req.headers[CSRF_HEADER] !== "1") {
      throw Object.assign(new Error("Permintaan ditolak (CSRF)"), { statusCode: 403 });
    }
    req.actor = email;
  };
}

/** Catat aksi admin yang mengubah data (POST). */
export async function audit(db: Db, actor: string, action: string, detail: unknown) {
  await db.query("INSERT INTO admin_audit (actor, action, detail) VALUES ($1, $2, $3)", [
    actor,
    action,
    JSON.stringify(detail ?? null),
  ]);
}

export async function migrateAuth(db: Db) {
  await db.query(`CREATE TABLE IF NOT EXISTS admin_audit (
    id BIGSERIAL PRIMARY KEY,
    at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail JSONB
  )`);
}

/** Ambil payload id_token. Token diterima langsung dari endpoint token Google lewat HTTPS (OIDC Core 3.1.3.7). */
export function decodeIdToken(idToken: string): Record<string, any> | null {
  const part = idToken.split(".")[1];
  if (!part) return null;
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
