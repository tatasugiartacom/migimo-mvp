import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { buildApp } from "../src/app.ts";
import { loadConfig } from "../src/config.ts";
import { createDb, migrate, type Db } from "../src/db.ts";
import { migrateAuth } from "../src/auth.ts";
import { setupSimulator } from "../src/sim-setup.ts";
import { migrateWa } from "../src/wa/db.ts";
import { susunRiwayat } from "../src/wa/agent.ts";
import { hitung } from "../src/wa/kurs.ts";

const DB_URL = process.env.TEST_WA_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:54329/migimo_test_wa";
const PORT = 43000 + Math.floor(Math.random() * 1000);
const ADMIN = "test-admin-token";
const APP_SECRET = "rahasia-meta";
const base = `http://127.0.0.1:${PORT}`;

let db: Db;
let close: () => Promise<void>;

// ---------- WhatsApp Graph API palsu ----------
const graph: { path: string; body: any }[] = [];
const waFetch: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  const body = init?.body instanceof FormData ? "form" : JSON.parse(String(init?.body ?? "{}"));
  graph.push({ path: url.pathname, body });
  if (url.pathname.endsWith("/media")) return Response.json({ id: "media-1" });
  return Response.json({ messages: [{ id: "wamid.keluar" + graph.length }] });
};
const terkirim = () => graph.filter((g) => g.path.endsWith("/messages") && g.body.type);

// ---------- Claude palsu: memilih alat berdasarkan pesan terakhir ----------
const aiCalls: any[] = [];
let toolSeq = 0;
const aiFetch: typeof fetch = async (_input, init) => {
  const req = JSON.parse(String(init?.body));
  aiCalls.push(req);
  const last = req.messages[req.messages.length - 1];
  const reply = (content: any[], stop: string) =>
    Response.json({
      id: "msg_" + aiCalls.length,
      type: "message",
      role: "assistant",
      model: req.model,
      content,
      stop_reason: stop,
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 10 },
    });
  const tr = last.content.find((b: any) => b.type === "tool_result");
  if (tr) return reply([{ type: "text", text: "Hasil: " + tr.content }], "end_turn");
  const text = last.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join(" ");
  const tool = (name: string, input: any) =>
    reply([{ type: "text", text: "Sebentar ya Kak." }, { type: "tool_use", id: "toolu_" + ++toolSeq, name, input }], "tool_use");
  if (/^YA/i.test(text))
    return tool("buat_qris_pembayaran", {
      negara: "JP",
      nominal_kirim: 50000,
      penerima: { nama: "Siti Aminah", metode: "BRI", nomor: "0123 4567 8901" },
    });
  if (/status/i.test(text)) return tool("cek_status_kiriman", {});
  if (/komplain/i.test(text)) return tool("hubungkan_tim", { alasan: "komplain" });
  if (/yen/i.test(text)) return tool("hitung_kiriman", { negara: "JP", nominal_kirim: 50000 });
  return reply([{ type: "text", text: "Halo Kak, mau kirim dari negara mana?" }], "end_turn");
};

const admin = (path: string, body?: unknown) =>
  fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${ADMIN}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let msgSeq = 0;
function webhook(from: string, text: string, id = "wamid.masuk" + ++msgSeq, secret = APP_SECRET) {
  const raw = JSON.stringify({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "PNID" },
              contacts: [{ wa_id: from, profile: { name: "Budi" } }],
              messages: [{ from, id, type: "text", text: { body: text } }],
            },
          },
        ],
      },
    ],
  });
  const sig = "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  return fetch(base + "/wa/webhook", { method: "POST", headers: { "Content-Type": "application/json", "X-Hub-Signature-256": sig }, body: raw });
}

async function tunggu<T>(fn: () => T | Promise<T>, ms = 4000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("Waktu tunggu habis");
    await new Promise((r) => setTimeout(r, 25));
  }
}

before(async () => {
  db = createDb(DB_URL);
  await db.query(
    "DROP TABLE IF EXISTS wa_transfers, wa_messages, wa_contacts, mti_logs, uat_results, orders, admin_audit CASCADE; DROP SEQUENCE IF EXISTS mti_external_id_seq, mti_partner_ref_seq",
  );
  await migrate(db);
  await migrateAuth(db);
  await migrateWa(db);
  const cfg = loadConfig({
    MTI_MODE: "simulator",
    ADMIN_TOKEN: ADMIN,
    DATABASE_URL: DB_URL,
    MTI_TIMEOUT_MS: "1000",
    WA_PHONE_NUMBER_ID: "PNID",
    WA_ACCESS_TOKEN: "wa-token",
    WA_APP_SECRET: APP_SECRET,
    WA_VERIFY_TOKEN: "verif-123",
    ANTHROPIC_API_KEY: "sk-ant-test",
  } as any);
  const sim = setupSimulator(cfg, PORT);
  const { app, uat } = buildApp({ cfg, db, sim, logger: false, waFetch, aiFetch });
  await uat.migrate();
  await app.listen({ port: PORT, host: "127.0.0.1" });
  close = async () => {
    await app.close();
    await db.end();
  };
});

after(async () => close?.());

test("hitung sama dengan kalkulator situs", () => {
  const h = hitung("JP", { kirim: 50000 });
  assert.equal(h.terimaRupiah, 5_700_000);
  assert.equal(h.biayaAsal, 2000);
  assert.equal(h.totalAsal, 52000);
  assert.equal(h.totalRupiah, 5_928_000);
  assert.equal(h.bagiHasilRupiah, 50000);
  assert.equal(h.bagiHasilAsal, 1000);
  assert.equal(hitung("MY", { terima: 3_800_000 }).kirim, 1000);
});

test("susunRiwayat membuang tool_use tanpa hasil dan menggabung peran sama", () => {
  const m = susunRiwayat([
    { role: "assistant", content: [{ type: "text", text: "sisa" }] },
    { role: "user", content: [{ type: "text", text: "halo" }] },
    { role: "user", content: [{ type: "text", text: "lagi" }] },
    { role: "assistant", content: [{ type: "text", text: "cek" }, { type: "tool_use", id: "t1", name: "x", input: {} }] },
    { role: "team", content: [{ type: "text", text: "dari tim" }] },
  ]);
  assert.equal(m.length, 2);
  assert.equal(m[0].role, "user");
  assert.equal(m[0].content.length, 2);
  assert.ok(m[1].content.every((b) => b.type !== "tool_use"));
  assert.match(m[1].content[1].text, /Balasan tim Migimo/);
});

test("verifikasi webhook Meta", async () => {
  const ok = await fetch(base + "/wa/webhook?hub.mode=subscribe&hub.verify_token=verif-123&hub.challenge=4242");
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "4242");
  const bad = await fetch(base + "/wa/webhook?hub.mode=subscribe&hub.verify_token=salah&hub.challenge=1");
  assert.equal(bad.status, 403);
});

test("webhook dengan tanda tangan salah ditolak", async () => {
  const r = await webhook("628111", "halo", undefined, "bukan-rahasia");
  assert.equal(r.status, 401);
});

test("alur lengkap: hitung → QRIS → dibayar → disalurkan", async () => {
  const wa = "819012345678";
  const n0 = terkirim().length;
  assert.equal((await webhook(wa, "Mau kirim 50000 yen")).status, 200);
  const balasan = await tunggu(() => terkirim().slice(n0).find((g) => /Hasil:/.test(g.body.text?.body ?? "")));
  assert.match(balasan.body.text.body, /5700000/);
  assert.equal(balasan.body.to, wa);
  assert.ok(graph.some((g) => g.body.status === "read"), "pesan masuk ditandai dibaca");

  // Prompt sistem di-cache dan alat dikirim ke Claude.
  const req = aiCalls[aiCalls.length - 1];
  assert.equal(req.system[0].cache_control.type, "ephemeral");
  assert.deepEqual(req.tools.map((t: any) => t.name), ["hitung_kiriman", "buat_qris_pembayaran", "cek_status_kiriman", "hubungkan_tim"]);

  const n1 = terkirim().length;
  await webhook(wa, "YA");
  const gambar = await tunggu(() => terkirim().slice(n1).find((g) => g.body.type === "image"));
  assert.equal(gambar.body.image.id, "media-1");
  assert.match(gambar.body.image.caption, /Rp5\.928\.000/);
  assert.match(gambar.body.image.caption, /•••8901/);

  const { rows } = await db.query("SELECT * FROM wa_transfers WHERE wa_id = $1", [wa]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "menunggu_bayar");
  assert.equal(Number(rows[0].total_rupiah), 5_928_000);
  assert.equal(rows[0].penerima.nomor, "012345678901");

  // Bayar lewat simulator → notify → pengguna dikabari.
  const n2 = terkirim().length;
  const pay = await (await admin(`/admin/sim/pay/${rows[0].order_id}`, {})).json();
  assert.equal(pay[0].body.responseCode, "2005200");
  const lunas = await tunggu(() => terkirim().slice(n2).find((g) => /sudah kami terima/.test(g.body.text?.body ?? "")));
  assert.equal(lunas.body.to, wa);

  // Notifikasi ganda tidak mengirim pesan dua kali.
  await admin(`/admin/orders/${rows[0].order_id}/inquiry`, {});
  assert.equal(terkirim().slice(n2).filter((g) => /sudah kami terima/.test(g.body.text?.body ?? "")).length, 1);

  const tr = await (await admin("/admin/wa/transfers")).json();
  assert.equal(tr[0].status, "dibayar");

  const n3 = terkirim().length;
  const done = await admin(`/admin/wa/transfers/${rows[0].id}/dikirim`, {});
  assert.equal(done.status, 200);
  assert.ok(terkirim().slice(n3).some((g) => /sudah kami salurkan/.test(g.body.text?.body ?? "")));
  assert.equal((await admin(`/admin/wa/transfers/${rows[0].id}/dikirim`, {})).status, 409);

  // Status kiriman bisa ditanyakan.
  const n4 = terkirim().length;
  await webhook(wa, "cek status");
  const st = await tunggu(() => terkirim().slice(n4).find((g) => /Hasil:/.test(g.body.text?.body ?? "")));
  assert.match(st.body.text.body, /dikirim/);
});

test("pesan yang sama dari Meta diproses sekali", async () => {
  const before = aiCalls.length;
  await webhook("628222", "halo", "wamid.sama");
  await webhook("628222", "halo", "wamid.sama");
  await tunggu(async () => (await db.query("SELECT 1 FROM wa_messages WHERE wa_id = '628222' AND role = 'assistant'")).rowCount);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(aiCalls.length - before, 1);
});

test("diteruskan ke tim: bot berhenti membalas sampai diaktifkan lagi", async () => {
  const wa = "628333";
  await webhook(wa, "saya mau komplain");
  await tunggu(async () => (await db.query("SELECT handoff FROM wa_contacts WHERE wa_id = $1", [wa])).rows[0]?.handoff);
  await tunggu(() => terkirim().some((g) => g.body.to === wa && /Hasil:/.test(g.body.text?.body ?? "")));

  const before = aiCalls.length;
  await webhook(wa, "halo?");
  await tunggu(async () => (await db.query("SELECT 1 FROM wa_messages WHERE wa_id = $1 AND content->0->>'text' = 'halo?'", [wa])).rowCount);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal(aiCalls.length, before);

  const n = terkirim().length;
  assert.equal((await admin(`/admin/wa/contacts/${wa}/send`, { text: "Halo, dari tim Migimo" })).status, 200);
  assert.equal(terkirim().slice(n)[0].body.text.body, "Halo, dari tim Migimo");

  await admin(`/admin/wa/contacts/${wa}/handoff`, { on: false });
  await webhook(wa, "terima kasih");
  await tunggu(() => aiCalls.length > before);
  const last = aiCalls[aiCalls.length - 1];
  assert.ok(JSON.stringify(last.messages).includes("[Balasan tim Migimo] Halo, dari tim Migimo"));
});

test("uji coba bot dari dashboard tanpa WhatsApp", async () => {
  const n = graph.length;
  const r = await (await admin("/admin/wa/uji", { pesan: "Mau kirim 50000 yen" })).json();
  assert.equal(r.waId, "uji:ADMIN_TOKEN");
  assert.ok(r.keluar.some((k: any) => /Hasil:/.test(k.text ?? "")));
  const q = await (await admin("/admin/wa/uji", { pesan: "YA" })).json();
  assert.ok(q.keluar.some((k: any) => k.type === "image" && k.dataUrl.startsWith("data:image/png;base64,")));
  assert.equal(graph.length, n, "tidak ada yang dikirim ke WhatsApp");
  await admin("/admin/wa/uji/reset", {});
  const m = await (await admin(`/admin/wa/contacts/${encodeURIComponent(r.waId)}/messages`)).json();
  assert.equal(m.length, 0);

  const st = await (await admin("/admin/wa/status")).json();
  assert.deepEqual(st, { whatsapp: true, webhookAman: true, ai: true, model: "claude-sonnet-5-5" });
});

test("API admin WhatsApp wajib login", async () => {
  assert.equal((await fetch(base + "/admin/wa/contacts")).status, 401);
  assert.equal((await fetch(base + "/admin/wa/uji", { method: "POST" })).status, 401);
});
