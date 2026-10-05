import ExcelJS from "exceljs";
import type { Db } from "./db.js";
import type { MtiSimulator } from "./mti/simulator.js";
import type { Payments } from "./payments.js";

/** 4 skenario dokumen "SIT-QR MPM SNAP- API Test Review-Standard ver. 1.2" dari Yokke. */
export const SIT_CASES = [
  { no: 1, api: "generate", direction: "out", group: "QR Generation", name: "Regular Generate with  Amount", expected: "Success", code: "2004700" },
  { no: 2, api: "query", direction: "out", group: "QR Inquiry Status", name: "Regular Inquiry Status Transaction", expected: "Success", code: "2005100" },
  { no: 3, api: "cancel", direction: "out", group: "QR Payment Credit Refund", name: "Reguler Payment Refund", expected: "Success", code: "2007700" },
  { no: 4, api: "notify", direction: "in", group: "QR Payment Credit Notify", name: "Payment Notify  ( MTI to Client )", expected: "Success", code: "2005200" },
] as const;

export interface SitRow {
  no: number;
  group: string;
  name: string;
  expected: string;
  actual: string;
  responseCode: string;
  externalId: string;
  transactionTime: string;
  transactionDate: string;
  evidence: string;
  status: "PASS" | "FAIL" | "BELUM";
  logId: number | null;
}

function wib(t: Date) {
  const s = new Date(t.getTime() + 7 * 3600_000).toISOString();
  return { date: s.slice(0, 10), time: s.slice(11, 19) };
}

function pretty(text: string | null) {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function header(h: Record<string, string> | null, name: string) {
  if (!h) return "";
  const k = Object.keys(h).find((x) => x.toLowerCase() === name.toLowerCase());
  return k ? String(h[k]) : "";
}

/** Susun 4 baris SIT dari log satu pesanan (pilih log berhasil terbaru untuk tiap API). */
export async function sitRows(db: Db, orderId: number): Promise<SitRow[]> {
  const { rows: logs } = await db.query<any>("SELECT * FROM mti_logs WHERE order_id = $1 ORDER BY id DESC", [orderId]);
  return SIT_CASES.map((c) => {
    const mine = logs.filter((l) => l.api === c.api && l.direction === c.direction);
    const l = mine.find((x) => x.response_code === c.code) ?? mine[0];
    if (!l) {
      return {
        no: c.no, group: c.group, name: c.name, expected: c.expected, actual: "", responseCode: "",
        externalId: "", transactionTime: "", transactionDate: "", evidence: "", status: "BELUM", logId: null,
      };
    }
    const t = wib(new Date(l.created_at));
    let msg = "";
    try {
      msg = JSON.parse(l.response_body ?? "{}").responseMessage ?? "";
    } catch {}
    const pass = l.response_code === c.code;
    const evidence = [
      "REQUEST",
      `${l.method} ${l.url}`,
      "Headers:",
      JSON.stringify(l.request_headers ?? {}, null, 2),
      "Body:",
      pretty(l.request_body),
      "",
      `RESPONSE (HTTP ${l.http_status ?? "-"})`,
      pretty(l.response_body) || l.error || "",
    ].join("\n");
    return {
      no: c.no,
      group: c.group,
      name: c.name,
      expected: c.expected,
      actual: pass ? "Success" : `Failed${msg ? ` (${msg})` : ""}`,
      responseCode: l.response_code ?? (l.error ? "ERROR" : ""),
      externalId: header(l.request_headers, "X-EXTERNAL-ID"),
      transactionTime: t.time,
      transactionDate: t.date,
      evidence,
      status: pass ? "PASS" : "FAIL",
      logId: Number(l.id),
    };
  });
}

/** Pesanan terbaru yang sudah lengkap (refund berhasil), atau terbaru yang punya log generate. */
export async function latestSitOrder(db: Db): Promise<number | null> {
  const { rows } = await db.query<{ order_id: string }>(
    `SELECT order_id FROM mti_logs WHERE order_id IS NOT NULL AND api = 'cancel' AND response_code = '2007700'
     ORDER BY id DESC LIMIT 1`,
  );
  if (rows[0]) return Number(rows[0].order_id);
  const r2 = await db.query<{ order_id: string }>(
    "SELECT order_id FROM mti_logs WHERE order_id IS NOT NULL AND api = 'generate' ORDER BY id DESC LIMIT 1",
  );
  return r2.rows[0] ? Number(r2.rows[0].order_id) : null;
}

/** File Excel dengan kolom sama seperti sheet "SIT-Open API" dari Yokke. */
export async function sitWorkbook(rows: SitRow[], orderId: number): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Migimo";
  const ws = wb.addWorksheet("SIT-Open API");
  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Case", key: "group", width: 24 },
    { header: "Test case", key: "name", width: 34 },
    { header: "Expected Result", key: "expected", width: 15 },
    { header: "Actual Result", key: "actual", width: 18 },
    { header: "Response Code", key: "responseCode", width: 15 },
    { header: "External ID", key: "externalId", width: 18 },
    { header: "Transaction Time", key: "transactionTime", width: 16 },
    { header: "Transaction Date", key: "transactionDate", width: 16 },
    { header: "Evidence - Request & Response Body ( LOG )", key: "evidence", width: 90 },
    { header: "Status", key: "status", width: 10 },
  ];
  for (const r of rows) {
    ws.addRow({ ...r, status: r.status === "BELUM" ? "" : r.status });
  }
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E4DC" } };
  ws.eachRow((row) => {
    row.alignment = { vertical: "top", wrapText: true };
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin" }, left: { style: "thin" }, bottom: { style: "thin" }, right: { style: "thin" },
      };
    });
  });
  // Response code ditulis sebagai teks agar tidak berubah jadi angka.
  ws.getColumn("responseCode").numFmt = "@";
  ws.getColumn("externalId").numFmt = "@";
  const info = wb.addWorksheet("Info");
  info.addRow(["Merchant", "Migimo (PT Niaga Teknologi Indonesia)"]);
  info.addRow(["Pesanan", `#${orderId}`]);
  info.addRow(["Dibuat", new Date().toISOString()]);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/**
 * Jalankan alur SIT: Generate → (simulator: bayar) → Inquiry → Refund.
 * Di mode live, pembayaran dilakukan di sandbox Yokke; Refund dijalankan setelah notify masuk.
 */
export async function runSit(payments: Payments, sim: MtiSimulator | null, amount = 10000) {
  const steps: { step: string; responseCode: string | null; ok: boolean }[] = [];
  const gen = await payments.createQr({ amount, scenario: "SIT" });
  steps.push({ step: "generate", responseCode: gen.result.responseCode, ok: gen.result.ok });
  const orderId = Number(gen.order.id);
  if (!gen.result.ok) return { orderId, steps, menunggu: null };
  if (sim) {
    await sim.pay(gen.order.reference_no!, { scenario: "SIT" });
  }
  const inq = await payments.inquiry(orderId, { scenario: "SIT" });
  steps.push({ step: "inquiry", responseCode: inq.result.responseCode, ok: inq.result.ok });
  if (inq.order.status !== "paid") {
    return { orderId, steps, menunggu: "Bayar QR pesanan ini di sandbox Yokke. Setelah notify masuk, klik Refund pada pesanan ini." };
  }
  const ref = await payments.refund(orderId, { scenario: "SIT" });
  steps.push({ step: "refund", responseCode: ref.result.responseCode, ok: ref.result.ok });
  return { orderId, steps, menunggu: null };
}
