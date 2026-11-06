import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { buildApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { createDb, migrate, type Db } from "../src/db.ts";
import { migrateAuth } from "../src/auth.ts";
import { setupSimulator } from "../src/sim-setup.ts";
import { KASUS_UAT, NAMA_SHEET } from "../src/uat-yokke.ts";
import { migrateWa } from "../src/wa/db.ts";

const DB_URL = process.env.TEST_DATABASE_URL_UYK ?? "postgresql://postgres@127.0.0.1:54329/migimo_test_uyk";
const PORT = 43000 + Math.floor(Math.random() * 1000);
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
const run = async (id: string, body: object = {}) => (await api(`/admin/uat-yokke/run/${id}`, body)).json();

before(async () => {
  db = createDb(DB_URL);
  await db.query(
    "DROP TABLE IF EXISTS wa_transfers, wa_messages, wa_contacts, mti_logs, uat_results, uat_yokke, orders, admin_audit CASCADE; DROP SEQUENCE IF EXISTS mti_external_id_seq, mti_partner_ref_seq",
  );
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

test("daftar 37 skenario dokumen Yokke, tanpa skenario NA", async () => {
  const d = await (await api("/admin/uat-yokke")).json();
  assert.equal(d.kasus.length, 37);
  assert.equal(d.kasus.filter((c: any) => c.lembar === "ASPI").length, 11);
  assert.equal(d.kasus.filter((c: any) => c.lembar === "ONUS").length, 19);
  assert.equal(d.kasus.filter((c: any) => c.lembar === "OFFUS").length, 7);
  assert.ok(!d.kasus.some((c: any) => c.lembar === "ASPI" && c.no >= 8 && c.no <= 14), "Decode/Redirect/OTT/H2H = NA");
});

test("skenario otomatis lulus terhadap simulator (kode SNAP sesuai dokumen)", async () => {
  const r = await (await api("/admin/uat-yokke/run-auto", {})).json();
  const byId = Object.fromEntries(r.map((x: any) => [x.id, x]));
  const harap: Record<string, RegExp> = {
    "ASPI-01": /^401\d{2}01$/,
    "ASPI-02": /^401\d{2}00$/,
    "ASPI-03": /^400\d{2}02$/,
    "ASPI-04": /^400\d{2}01$/,
    "ASPI-05": /^409\d{2}00$/,
    "ASPI-06": /^2004700$/,
    "ASPI-07": /^4044708$/,
    "ASPI-16": /^4045101$/,
    "ONUS-01": /^2004700$/,
    "ONUS-03": /^4044708$/,
    "ONUS-04": /^4044717$/,
    "ONUS-19": /^4045101$/,
  };
  for (const [id, re] of Object.entries(harap)) {
    assert.equal(byId[id].status, "pass", `${id}: ${byId[id].responseCode} ${byId[id].catatan}`);
    assert.match(byId[id].responseCode, re, id);
    assert.ok(byId[id].logIds.length > 0, `${id} punya bukti log`);
  }
  // Belum ada pembayaran: skenario notify menunggu, bukan lulus palsu.
  assert.equal(byId["ASPI-17"].status, "perlu_bayar");
});

test("pembayaran on us: notify, refund same day, refund ganda, inquiry", async () => {
  const gen = await (await api("/admin/qr", { amount: 10000 })).json();
  await api(`/admin/sim/pay/${gen.order.id}`, { issuerName: "Bank Mandiri" });

  for (const id of ["ASPI-17", "ONUS-05", "ONUS-15"]) {
    const h = await run(id);
    assert.equal(h.status, "pass", `${id}: ${h.catatan}`);
    assert.equal(h.responseCode, "2005200");
  }
  // Double payment pada QR yang sama dijawab 2005200 (dokumen Yokke), status pesanan tidak berubah.
  await api(`/admin/sim/pay/${gen.order.id}`, { issuerName: "Bank Mandiri" });
  const ganda = await run("ONUS-13");
  assert.equal(ganda.status, "pass", ganda.catatan);
  const { rows } = await db.query("SELECT error FROM mti_logs WHERE id = $1", [ganda.logIds[0]]);
  assert.match(rows[0].error, /Pembayaran ganda/);

  const aspi15 = await run("ASPI-15");
  assert.equal(aspi15.status, "pass", aspi15.catatan);
  assert.equal(aspi15.responseCode, "2005100");

  const inq = await run("ONUS-18");
  assert.equal(inq.status, "pass", inq.catatan);
  assert.match(inq.catatan, /Penerbit: Bank Mandiri/);

  const ref = await run("ONUS-07");
  assert.equal(ref.status, "pass", ref.catatan);
  assert.equal(ref.responseCode, "2007700");
  assert.equal(ref.orderId, Number(gen.order.id));

  // Spec v1.1_v3: Generate membawa additionalInfo.memberBank; Inquiry & Refund lewat /v3.0 dengan memberBank;
  // nominal refund memakai field "amount" (bukan refundAmount).
  const req = async (id: number) => {
    const { rows } = await db.query("SELECT url, request_body FROM mti_logs WHERE id = $1", [id]);
    return { url: rows[0].url as string, body: JSON.parse(rows[0].request_body) };
  };
  const { rows: gl } = await db.query(
    "SELECT id FROM mti_logs WHERE api = 'generate' AND order_id = $1 ORDER BY id LIMIT 1",
    [gen.order.id],
  );
  const g = await req(Number(gl[0].id));
  assert.match(g.url, /\/v2\.0\/qr\/qr-mpm-generate$/);
  assert.deepEqual(g.body.additionalInfo, { memberBank: "008" });
  const q = await req(inq.logIds[inq.logIds.length - 1]);
  assert.match(q.url, /\/v3\.0\/qr\/qr-mpm-query$/);
  assert.equal(q.body.additionalInfo.memberBank, "008");
  const c = await req(ref.logIds[ref.logIds.length - 1]);
  assert.match(c.url, /\/v3\.0\/qr\/qr-mpm-cancel$/);
  assert.deepEqual(c.body.amount, { value: "10000.00", currency: "IDR" });
  assert.equal(c.body.refundAmount, undefined);
  assert.equal(c.body.reason, "Customer cancelation");
  assert.equal(c.body.additionalInfo.memberBank, "008");
  assert.ok(c.body.additionalInfo.originalApprovalCode);

  const dobel = await run("ONUS-08");
  assert.equal(dobel.status, "pass", dobel.catatan);
  assert.equal(dobel.responseCode, "4047704");

  // Refund H+1 butuh pesanan dari hari sebelumnya.
  assert.equal((await run("ONUS-10")).status, "perlu_bayar");
});

test("notify gagal, off us, dan skenario yang dipicu Yokke", async () => {
  const gagal = await (await api("/admin/qr", { amount: 10000 })).json();
  // Format Yokke asli: issuerName kosong, penerbit dikenali dari NNS customerNumber (93600008 = Mandiri).
  await api(`/admin/sim/pay/${gagal.order.id}`, { status: "06" });
  const nf = await run("ONUS-16");
  assert.equal(nf.status, "pass", nf.catatan);
  assert.match(nf.catatan, /status 06/);
  assert.match(nf.catatan, /Penerbit: Bank Mandiri/);
  const exp = await run("ONUS-14");
  assert.equal(exp.status, "pass", exp.catatan);
  assert.match(exp.catatan, /status 06/, "ON US 14 memakai notify gagal (QR expired), bukan notify sukses");
  assert.equal((await db.query("SELECT status FROM orders WHERE id = $1", [gagal.order.id])).rows[0].status, "failed");

  // Off us: belum ada pembayaran dari bank lain → menunggu.
  assert.equal((await run("OFFUS-04")).status, "perlu_bayar");
  const off = await (await api("/admin/qr", { amount: 10000 })).json();
  await api(`/admin/sim/pay/${off.order.id}`, { issuerName: "BCA" });
  assert.equal((await run("OFFUS-01")).status, "pass");
  assert.equal((await run("OFFUS-07")).status, "pass");
  const r4 = await run("OFFUS-04");
  assert.equal(r4.status, "pass", r4.catatan);
  assert.equal(r4.orderId, Number(off.order.id));
  assert.equal((await run("OFFUS-05")).responseCode, "4047704");

  const y = await run("ONUS-02");
  assert.equal(y.status, "perlu_yokke");
  // Log dipilih manual: dinilai dari response code-nya (bukan timeout → tidak lulus).
  const manual = await run("ONUS-02", { logId: r4.logIds[0] });
  assert.equal(manual.status, "fail");
});

test("Excel Yokke terisi di kolom yang benar, rumus ringkasan tetap", async () => {
  const wb = new ExcelJS.Workbook();
  const aspi = wb.addWorksheet(NAMA_SHEET.ASPI);
  aspi.getCell("A3").value = "No";
  for (let i = 1; i <= 18; i++) aspi.getCell(`A${3 + i}`).value = i;
  aspi.getCell("J30").value = { formula: 'COUNTIF(G:G,"Pass")' } as any;
  for (const l of ["ONUS", "OFFUS"] as const) {
    const ws = wb.addWorksheet(NAMA_SHEET[l]);
    ws.getCell("A1").value = "No";
    for (let i = 1; i <= 23; i++) ws.getCell(`A${1 + i}`).value = i;
  }
  const file = Buffer.from(await wb.xlsx.writeBuffer()).toString("base64");

  const r = await api("/admin/uat-yokke/export", { file });
  assert.equal(r.status, 200);
  assert.ok(Number(r.headers.get("x-terisi")) >= 20);
  const out = new ExcelJS.Workbook();
  await out.xlsx.load(Buffer.from(await r.arrayBuffer()) as any);

  const a = out.getWorksheet(NAMA_SHEET.ASPI)!;
  const row6 = a.getRow(9); // ASPI No 6 = Show QR Code
  assert.match(String(row6.getCell(5).value), /qr-mpm-generate/);
  assert.match(String(row6.getCell(6).value), /2004700/);
  assert.equal(row6.getCell(7).value, "Pass");
  assert.equal(a.getRow(11).getCell(7).value, null, "baris NA (No 8) tidak disentuh");
  const row5 = a.getRow(8); // ASPI No 5 = Conflict, dua langkah
  assert.match(String(row5.getCell(6).value), /^LANGKAH 1 \(persiapan\)[\s\S]*LANGKAH 2 \(skenario uji\)[\s\S]*409/);
  assert.ok((a.getCell("J30").value as any).formula, "rumus ringkasan dipertahankan");

  const on = out.getWorksheet(NAMA_SHEET.ONUS)!;
  const r7 = on.getRow(8); // ON US No 7 = refund same day
  assert.match(String(r7.getCell(7).value), /REQUEST[\s\S]*qr-mpm-cancel[\s\S]*RESPONSE[\s\S]*2007700/);
  assert.match(String(r7.getCell(8).value), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  assert.match(String(r7.getCell(10).value), /^PASS · 2007700/);
  assert.equal(on.getRow(7).getCell(7).value, null, "ON US 6 (payment timeout, menunggu Yokke) dibiarkan kosong");

  const bad = await api("/admin/uat-yokke/export", { file: Buffer.from("bukan excel").toString("base64") });
  assert.equal(bad.status, 400);
});

test("API UAT Yokke wajib login", async () => {
  assert.equal((await fetch(base + "/admin/uat-yokke")).status, 401);
  assert.equal(KASUS_UAT.length, 37);
});
