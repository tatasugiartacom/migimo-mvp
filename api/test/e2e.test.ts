import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { createDb, migrate, type Db } from "../src/db.ts";
import { setupSimulator } from "../src/sim-setup.ts";
import { UAT_CASES } from "../src/uat.ts";

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
  await db.query("DROP TABLE IF EXISTS mti_logs, uat_results, orders CASCADE; DROP SEQUENCE IF EXISTS mti_external_id_seq, mti_partner_ref_seq");
  await migrate(db);
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
