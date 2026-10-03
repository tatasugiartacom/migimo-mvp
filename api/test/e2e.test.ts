import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { createDb, migrate, type Db } from "../src/db.ts";
import { migrateAuth } from "../src/auth.ts";
import { setupSimulator } from "../src/sim-setup.ts";
import { UAT_CASES } from "../src/uat.ts";
import { migrateWa } from "../src/wa/db.ts";

const DB_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54329/migimo_test";
const PORT = 41000 + Math.floor(Math.random() * 1000);
const ADMIN = "test-admin-token";

let db: Db;
let close: () => Promise<void>;
const base = `http://127.0.0.1:${PORT}`;
const api = (path: string, body?: unknown) =>
  fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${ADMIN}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

before(async () => {
  db = createDb(DB_URL);
  await db.query("DROP TABLE IF EXISTS wa_transfers, wa_messages, wa_contacts, mti_logs, uat_results, orders, admin_audit CASCADE; DROP SEQUENCE IF EXISTS mti_external_id_seq, mti_partner_ref_seq");
  await migrate(db);
  await migrateAuth(db);
  await migrateWa(db);
  const cfg = loadConfig({ MTI_MODE: "simulator", ADMIN_TOKEN: ADMIN, DATABASE_URL: DB_URL, MTI_TIMEOUT_MS: "1000" } as any);
  const sim = setupSimulator(cfg, PORT);
  const { app, uat } = buildApp({ cfg, db, sim, logger: false });
  await uat.migrate();
  await app.listen({ port: PORT, host: "127.0.0.1" });
  close = async () => {
    await app.close();
    await db.end();
  };
});

after(async () => close?.());

test("admin API menolak tanpa token", async () => {
  const r = await fetch(base + "/admin/orders");
  assert.equal(r.status, 401);
});

test("alur lengkap: generate QR → bayar → notify → inquiry → refund", async () => {
  const gen = await (await api("/admin/qr", { amount: 150000 })).json();
  assert.equal(gen.result.responseCode, "2004700");
  assert.equal(gen.order.status, "qr_generated");
  assert.match(gen.order.external_id, /^\d{15}$/);
  assert.match(gen.order.partner_reference_no, /^\d{20}$/);
  assert.match(gen.order.qr_content, /^000201/);

  const png = await api(`/admin/orders/${gen.order.id}/qr.png`);
  assert.equal(png.headers.get("content-type"), "image/png");

  const paid = await (await api(`/admin/sim/pay/${gen.order.id}`, {})).json();
  assert.equal(paid[0].body.responseCode, "2005200");

  const inq = await (await api(`/admin/orders/${gen.order.id}/inquiry`, {})).json();
  assert.equal(inq.result.body.latestTransactionStatus, "00");
  assert.equal(inq.order.status, "paid");
  assert.ok(inq.order.approval_code);

  const ref = await (await api(`/admin/orders/${gen.order.id}/refund`, {})).json();
  assert.equal(ref.result.responseCode, "2007700");
  assert.equal(ref.order.status, "refunded");

  const logs = await (await api(`/admin/logs?limit=50`)).json();
  assert.ok(logs.some((l: any) => l.api === "notify" && l.direction === "in"));
  assert.ok(logs.every((l: any) => !String(l.request_headers?.Authorization ?? "").includes(".") || l.request_headers.Authorization.endsWith("…")));
});

test("notify dengan tanda tangan palsu ditolak", async () => {
  const r = await fetch(base + "/qr/qr-mpm-notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-TIMESTAMP": "2024-01-01T00:00:00+07:00", "X-SIGNATURE": "palsu" },
    body: JSON.stringify({ originalReferenceNo: "1", latestTransactionStatus: "00", amount: { value: "1.00", currency: "IDR" } }),
  });
  assert.equal(r.status, 401);
  assert.equal((await r.json()).responseCode, "4015200");
});

test("38 skenario UAT terhadap simulator", async () => {
  const results = await (await api("/admin/uat/run-all", {})).json();
  assert.equal(results.length, 38);
  const notPass = results.filter((r: any) => r.status !== "pass");
  // Skenario memberBank (8, 17, 26) menunggu klarifikasi Yokke; sisanya harus lulus.
  assert.deepEqual(
    notPass.map((r: any) => `${r.no}:${r.status}`),
    ["8:needs_clarification", "17:needs_clarification", "26:needs_clarification"],
    JSON.stringify(notPass.filter((r: any) => r.status === "fail"), null, 1),
  );
  const csv = await (await api("/admin/uat/export.csv")).text();
  assert.equal(csv.split("\n").length, 39);
  assert.equal(UAT_CASES.length, 38);
});

test("dashboard di host khusus, alamat lama dialihkan", async () => {
  const { buildApp: build } = await import("../src/app.ts");
  const cfg2 = loadConfig({ MTI_MODE: "simulator", ADMIN_TOKEN: ADMIN, DASHBOARD_HOST: "raksa.migimo.id" } as any);
  const { app } = build({ cfg: cfg2, db, logger: false });
  const dash = await app.inject({ method: "GET", url: "/", headers: { host: "raksa.migimo.id" } });
  assert.match(dash.body, /Raksa · Dashboard Migimo/);
  const land = await app.inject({ method: "GET", url: "/", headers: { host: "api.migimo.id" } });
  assert.match(land.body, /Migimo API: aktif/);
  assert.match(land.body, /https:\/\/raksa\.migimo\.id\//);
  const old = await app.inject({ method: "GET", url: "/dashboard", headers: { host: "api.migimo.id" } });
  assert.equal(old.statusCode, 301);
  assert.equal(old.headers.location, "https://raksa.migimo.id/");
  await app.close();
});

test("login Google: email terdaftar masuk, lainnya ditolak, CSRF dan audit", async () => {
  const { buildApp: build } = await import("../src/app.ts");
  const idToken = (email: string) =>
    "x." + Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: "cid", email, email_verified: true, exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url") + ".sig";
  let nextEmail = "";
  const fakeFetch = (async (url: any, init: any) => {
    assert.equal(String(url), "https://oauth2.googleapis.com/token");
    const body = new URLSearchParams(String(init.body));
    assert.equal(body.get("redirect_uri"), "https://raksa.migimo.id/auth/google/callback");
    assert.equal(body.get("client_secret"), "csecret");
    return new Response(JSON.stringify({ id_token: idToken(nextEmail) }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const cfg2 = loadConfig({
    MTI_MODE: "simulator", ADMIN_TOKEN: ADMIN, DASHBOARD_HOST: "raksa.migimo.id",
    GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret", ADMIN_EMAILS: "Admin@Migimo.id, tim@migimo.id",
  } as any);
  const { app } = build({ cfg: cfg2, db, logger: false, fetchImpl: fakeFetch });
  const host = { host: "raksa.migimo.id" };

  const me0 = await app.inject({ method: "GET", url: "/auth/me", headers: host });
  assert.equal(me0.statusCode, 401);
  assert.equal(me0.json().google, true);

  const start = await app.inject({ method: "GET", url: "/auth/google", headers: host });
  assert.equal(start.statusCode, 302);
  const loc = new URL(String(start.headers.location));
  assert.equal(loc.origin + loc.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
  assert.equal(loc.searchParams.get("redirect_uri"), "https://raksa.migimo.id/auth/google/callback");
  const state = loc.searchParams.get("state")!;
  const stateCookie = String(start.headers["set-cookie"]).split(";")[0];

  // state salah ditolak
  const bad = await app.inject({ method: "GET", url: "/auth/google/callback?code=c&state=salah", headers: { ...host, cookie: stateCookie } });
  assert.equal(bad.headers.location, "/?login=sesi_kedaluwarsa");

  // email tidak terdaftar ditolak
  nextEmail = "orang@lain.com";
  const denied = await app.inject({ method: "GET", url: `/auth/google/callback?code=c&state=${state}`, headers: { ...host, cookie: stateCookie } });
  assert.equal(denied.headers.location, "/?login=ditolak");

  // email terdaftar (huruf besar/kecil tidak berpengaruh) masuk
  nextEmail = "admin@migimo.id";
  const ok = await app.inject({ method: "GET", url: `/auth/google/callback?code=c&state=${state}`, headers: { ...host, cookie: stateCookie } });
  assert.equal(ok.headers.location, "/");
  const sess = ([] as string[]).concat(ok.headers["set-cookie"] as any).find((c) => c.startsWith("migimo_sess="))!;
  assert.match(sess, /HttpOnly/);
  assert.match(sess, /Secure/);
  const cookieHdr = sess.split(";")[0];

  const me = await app.inject({ method: "GET", url: "/auth/me", headers: { ...host, cookie: cookieHdr } });
  assert.equal(me.json().email, "admin@migimo.id");

  const list = await app.inject({ method: "GET", url: "/admin/orders", headers: { ...host, cookie: cookieHdr } });
  assert.equal(list.statusCode, 200);

  // POST dengan cookie tanpa header CSRF ditolak
  const noCsrf = await app.inject({ method: "POST", url: "/admin/qr", headers: { ...host, cookie: cookieHdr, "content-type": "application/json" }, payload: { amount: 1000 } });
  assert.equal(noCsrf.statusCode, 403);

  const withCsrf = await app.inject({
    method: "POST", url: "/admin/uat/run/8",
    headers: { ...host, cookie: cookieHdr, "x-migimo-dashboard": "1", "content-type": "application/json" }, payload: {},
  });
  assert.equal(withCsrf.statusCode, 200);

  // cookie palsu ditolak
  const forged = await app.inject({ method: "GET", url: "/admin/orders", headers: { ...host, cookie: cookieHdr.slice(0, -3) + "abc" } });
  assert.equal(forged.statusCode, 401);

  const audit = (await app.inject({ method: "GET", url: "/admin/audit", headers: { ...host, cookie: cookieHdr } })).json();
  assert.ok(audit.some((a: any) => a.actor === "admin@migimo.id" && a.action === "login"));
  assert.ok(audit.some((a: any) => a.actor === "orang@lain.com" && a.action === "login_ditolak"));
  assert.ok(audit.some((a: any) => a.actor === "admin@migimo.id" && a.action === "/admin/uat/run/:no"));
  await app.close();
});
