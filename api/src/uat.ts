import type { Config } from "./config.js";
import type { Db } from "./db.js";
import type { MtiResult } from "./mti/client.js";
import type { MtiSimulator } from "./mti/simulator.js";
import type { Order, Payments } from "./payments.js";

/** 38 skenario dari file test case Yokke "QRIS SNAP MPM" (sheet Testcase). */
export const UAT_CASES: { no: number; group: string; name: string; expected: string }[] = [
  { no: 1, group: "QR Generation", name: "Regular Generate without Fee Amount", expected: "Success" },
  { no: 2, group: "QR Generation", name: "Regular Generate with Fee Amount", expected: "Success" },
  { no: 3, group: "QR Generation", name: "Regular Generate with Zero Transaction Amount", expected: "Failed" },
  { no: 4, group: "QR Generation", name: "Invalid Merchant ID", expected: "Failed" },
  { no: 5, group: "QR Generation", name: "Invalid Terminal ID", expected: "Failed" },
  { no: 6, group: "QR Generation", name: "Duplicate partnerReferenceNo", expected: "Failed" },
  { no: 7, group: "QR Generation", name: "Duplicate externalId", expected: "Failed" },
  { no: 8, group: "QR Generation", name: "Invalid memberBank", expected: "Failed" },
  { no: 9, group: "QR Generation", name: "Timeout Response from Host MTI", expected: "Failed" },
  { no: 10, group: "QR Inquiry Status", name: "Regular Inquiry Status Transaction Not Paid", expected: "Failed" },
  { no: 11, group: "QR Inquiry Status", name: "Regular Inquiry Status Transaction Paid", expected: "Success" },
  { no: 12, group: "QR Inquiry Status", name: "Invalid Merchant ID", expected: "Failed" },
  { no: 13, group: "QR Inquiry Status", name: "Invalid Terminal ID", expected: "Failed" },
  { no: 14, group: "QR Inquiry Status", name: "Invalid originalReferenceNo", expected: "Failed" },
  { no: 15, group: "QR Inquiry Status", name: "Invalid originalExternalId", expected: "Failed" },
  { no: 16, group: "QR Inquiry Status", name: "Invalid originalTransactionDate", expected: "Failed" },
  { no: 17, group: "QR Inquiry Status", name: "Invalid memberBank", expected: "Failed" },
  { no: 18, group: "QR Refund", name: "Regular refund", expected: "Success" },
  { no: 19, group: "QR Refund", name: "Duplicate refund", expected: "Failed" },
  { no: 20, group: "QR Refund", name: "Invalid Merchant ID", expected: "Failed" },
  { no: 21, group: "QR Refund", name: "Invalid Terminal ID", expected: "Failed" },
  { no: 22, group: "QR Refund", name: "Invalid originalReferenceNo", expected: "Failed" },
  { no: 23, group: "QR Refund", name: "Invalid originalExternalId", expected: "Failed" },
  { no: 24, group: "QR Refund", name: "Invalid originalTransactionDate", expected: "Failed" },
  { no: 25, group: "QR Refund", name: "Invalid originalApprovalCode", expected: "Failed" },
  { no: 26, group: "QR Refund", name: "Invalid memberBank", expected: "Failed" },
  { no: 27, group: "QR Credit", name: "Reguler credit", expected: "Success" },
  { no: 28, group: "QR Credit", name: "Reguler purchase notify", expected: "Success" },
  { no: 29, group: "QR Credit", name: "Double credit", expected: "Failed" },
  { no: 30, group: "QR Credit", name: "Purchase notify", expected: "Notify sent, but trx failed" },
  { no: 31, group: "Variable Test", name: "Regular Generate externalId < 15", expected: "Failed" },
  { no: 32, group: "Variable Test", name: "Regular Generate externalId > 15", expected: "Failed" },
  { no: 33, group: "Variable Test", name: "Regular Generate partnerReferenceNo < 20", expected: "Failed" },
  { no: 34, group: "Variable Test", name: "Regular Generate partnerReferenceNo > 20", expected: "Failed" },
  { no: 35, group: "Variable Test", name: "Regular Generate merchantID > 15", expected: "Failed" },
  { no: 36, group: "Variable Test", name: "Regular Generate merchantID < 15", expected: "Failed" },
  { no: 37, group: "Variable Test", name: "Regular Generate terminalID > 8", expected: "Failed" },
  { no: 38, group: "Variable Test", name: "Regular Generate terminalID < 8", expected: "Failed" },
];

export type UatStatus = "pass" | "fail" | "needs_payment" | "needs_clarification" | "manual";

export interface UatResult {
  no: number;
  group: string;
  name: string;
  expected: string;
  actual: string;
  status: UatStatus;
  responseCode: string | null;
  referenceNo: string | null;
  externalId: string | null;
  partnerReferenceNo: string | null;
  transactionTime: string | null;
  transactionDate: string | null;
  orderId: number | null;
  note: string | null;
}

class NeedsPayment extends Error {}

export class UatRunner {
  constructor(
    private cfg: Config,
    private db: Db,
    private payments: Payments,
    private sim: MtiSimulator | null,
  ) {}

  async migrate() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS uat_results (
      no INT PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL DEFAULT now(), result JSONB NOT NULL)`);
  }

  private amount = 10000;

  /** Pesanan yang sudah dibayar. Simulator: dibayar otomatis. Live: pakai orderId atau pesanan dibayar terakhir. */
  private async paidOrder(scenario: string, orderId?: number): Promise<Order> {
    if (orderId) {
      const o = await this.payments.getOrder(orderId);
      if (o?.status === "paid") return o;
      throw new NeedsPayment(`Pesanan #${orderId} belum berstatus dibayar`);
    }
    if (this.sim) {
      const { order, result } = await this.payments.createQr({ amount: this.amount, scenario });
      if (!result.ok || !order.reference_no) {
        throw new Error(
          `QR untuk transaksi dibayar gagal dibuat (${result.responseCode ?? result.error ?? "tanpa kode"}${result.body?.responseMessage ? ": " + result.body.responseMessage : ""})`,
        );
      }
      await this.sim.pay(order.reference_no, { scenario });
      return (await this.payments.getOrder(order.id))!;
    }
    const { rows } = await this.db.query<Order>(
      "SELECT * FROM orders WHERE status = 'paid' AND merchant_id = $1 ORDER BY id DESC LIMIT 1",
      [this.cfg.mti.merchantId],
    );
    if (rows[0]) return rows[0];
    throw new NeedsPayment("Belum ada transaksi dibayar. Buat QR (skenario 1), minta Yokke membayarnya, lalu jalankan ulang.");
  }

  private fill(no: number, r: MtiResult | null, order: Order | null, actual: string, note: string | null = null): UatResult {
    const c = UAT_CASES.find((x) => x.no === no)!;
    const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString();
    return {
      ...c,
      actual,
      status: actual === c.expected ? "pass" : "fail",
      responseCode: r?.responseCode ?? (r?.timedOut ? "TIMEOUT" : null),
      referenceNo: r?.body?.referenceNo ?? r?.body?.originalReferenceNo ?? order?.reference_no ?? null,
      externalId: r?.externalId ?? order?.external_id ?? null,
      partnerReferenceNo: order?.partner_reference_no ?? null,
      transactionTime: now.slice(11, 19),
      transactionDate: now.slice(0, 10),
      orderId: order?.id ?? null,
      note,
    };
  }

  private special(no: number, status: UatStatus, note: string): UatResult {
    const c = UAT_CASES.find((x) => x.no === no)!;
    return {
      ...c,
      actual: "-",
      status,
      responseCode: null,
      referenceNo: null,
      externalId: null,
      partnerReferenceNo: null,
      transactionTime: null,
      transactionDate: null,
      orderId: null,
      note,
    };
  }

  async run(no: number, opts: { orderId?: number } = {}): Promise<UatResult> {
    const s = `UAT-${String(no).padStart(2, "0")}`;
    const ok = (r: MtiResult) => (r.ok ? "Success" : "Failed");
    const p = this.payments;
    const mid = this.cfg.mti.merchantId;
    const tid = this.cfg.mti.terminalId;
    // MID/TID salah tapi panjangnya sama, supaya yang diuji "tidak dikenal" (40447xx08/17), bukan "format salah".
    const badMid = mid.replace(/\d/g, "9") === mid ? mid.replace(/\d/g, "8") : mid.replace(/\d/g, "9");
    const badTid = tid.replace(/\d/g, "9") === tid ? tid.replace(/\d/g, "8") : tid.replace(/\d/g, "9");
    let res: UatResult;
    try {
      switch (no) {
        case 1: {
          const { order, result } = await p.createQr({ amount: this.amount, scenario: s });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 2: {
          const { order, result } = await p.createQr({ amount: this.amount, feeAmount: 1000, scenario: s });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 3: {
          const { order, result } = await p.createQr({ amount: 0, scenario: s });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 4:
        case 5: {
          const overrides = no === 4 ? { merchantId: badMid } : { terminalId: badTid };
          const { order, result } = await p.createQr({ amount: this.amount, scenario: s, overrides });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 6: {
          const first = await p.createQr({ amount: this.amount, scenario: s });
          const { order, result } = await p.createQr({
            amount: this.amount,
            scenario: s,
            overrides: { partnerReferenceNo: first.order.partner_reference_no },
          });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 7: {
          const first = await p.createQr({ amount: this.amount, scenario: s });
          const { order, result } = await p.createQr({
            amount: this.amount,
            scenario: s,
            overrides: { externalId: first.order.external_id },
          });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 8:
        case 17:
        case 26:
          res = this.special(no, "needs_clarification", "Yokke: nilai memberBank = '008'. Posisi field belum ada di dokumen API maupun Postman; tidak termasuk dokumen SIT.");
          break;
        case 9: {
          if (!this.sim) {
            res = this.special(no, "manual", "Timeout dari host MTI tidak bisa dipicu dari sisi Migimo. Koordinasikan dengan Yokke.");
            break;
          }
          const { order, result } = await p.createQr({ amount: 99999, scenario: s });
          res = this.fill(no, result, order, result.timedOut ? "Failed" : ok(result), result.timedOut ? "Klien Migimo timeout; status pesanan 'timeout', bisa dicek ulang via inquiry." : null);
          break;
        }
        case 10: {
          const { order } = await p.createQr({ amount: this.amount, scenario: s });
          const { result, order: o2 } = await p.inquiry(order.id, { scenario: s });
          const paid = result.ok && result.body?.latestTransactionStatus === "00";
          res = this.fill(no, result, o2, paid ? "Success" : "Failed", `latestTransactionStatus=${result.body?.latestTransactionStatus ?? "-"}`);
          break;
        }
        case 11: {
          const order = await this.paidOrder(s, opts.orderId);
          const { result, order: o2 } = await p.inquiry(order.id, { scenario: s });
          const paid = result.ok && result.body?.latestTransactionStatus === "00";
          res = this.fill(no, result, o2, paid ? "Success" : "Failed", `latestTransactionStatus=${result.body?.latestTransactionStatus ?? "-"}`);
          break;
        }
        case 12:
        case 13:
        case 14:
        case 15:
        case 16: {
          const { order } = await p.createQr({ amount: this.amount, scenario: s });
          const overrides = {
            12: { merchantId: badMid },
            13: { terminalId: badTid },
            14: { originalReferenceNo: "000000000000" },
            15: { originalExternalId: "000000000000000" },
            16: { originalTransactionDate: "20200101" },
          }[no];
          const { result, order: o2 } = await p.inquiry(order.id, { scenario: s, overrides });
          res = this.fill(no, result, o2, ok(result));
          break;
        }
        case 18:
        case 19: {
          const order = await this.paidOrder(s, opts.orderId);
          let r = (await p.refund(order.id, { scenario: s })).result;
          if (no === 19) r = (await p.refund(order.id, { scenario: s })).result;
          res = this.fill(no, r, (await p.getOrder(order.id))!, ok(r));
          break;
        }
        case 20:
        case 21:
        case 22:
        case 23:
        case 24:
        case 25: {
          const order = await this.paidOrder(s, opts.orderId);
          const overrides = {
            20: { merchantId: badMid },
            21: { terminalId: badTid },
            22: { originalReferenceNo: "000000000000" },
            23: { originalExternalId: "000000000000000" },
            24: { originalTransactionDate: "20200101" },
            25: { originalApprovalCode: "000000" },
          }[no];
          const { result } = await p.refund(order.id, { scenario: s, overrides });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        case 27:
        case 28:
        case 29:
        case 30: {
          if (!this.sim) {
            res = this.special(no, "needs_payment", "Skenario notify dijalankan oleh Yokke (bayar QR di sandbox). Hasilnya terlihat di log 'notify'.");
            break;
          }
          const { order, result } = await p.createQr({ amount: this.amount, scenario: s });
          const notif = await this.sim.pay(order.reference_no!, {
            scenario: s,
            status: no === 30 ? "06" : "00",
            times: no === 29 ? 2 : 1,
          });
          const last = notif[notif.length - 1];
          const o2 = (await p.getOrder(order.id))!;
          const actual =
            no === 30
              ? last.body?.responseCode === "2005200" && o2.status === "failed"
                ? "Notify sent, but trx failed"
                : "Failed"
              : last.body?.responseCode === "2005200"
                ? "Success"
                : "Failed";
          res = this.fill(no, { ...result, responseCode: last.body?.responseCode ?? null }, o2, actual, `HTTP notify: ${notif.map((n) => n.httpStatus).join(", ")}`);
          break;
        }
        case 31:
        case 32:
        case 33:
        case 34:
        case 35:
        case 36:
        case 37:
        case 38: {
          const overrides = {
            31: { externalId: "12345678901234" },
            32: { externalId: "1234567890123456" },
            33: { partnerReferenceNo: "1234567890123456789" },
            34: { partnerReferenceNo: "123456789012345678901" },
            35: { merchantId: mid + "0" },
            36: { merchantId: mid.slice(0, -1) },
            37: { terminalId: tid + "0" },
            38: { terminalId: tid.slice(0, -1) },
          }[no];
          const { order, result } = await p.createQr({ amount: this.amount, scenario: s, overrides });
          res = this.fill(no, result, order, ok(result));
          break;
        }
        default:
          throw Object.assign(new Error("Nomor skenario 1–38"), { statusCode: 400 });
      }
    } catch (e) {
      // Satu skenario yang error tidak boleh menghentikan "Jalankan semua": catat sebagai tidak lulus.
      if (e instanceof NeedsPayment) res = this.special(no, "needs_payment", e.message);
      else res = this.special(no, "fail", `Error: ${(e as Error).message}`);
    }
    await this.db.query(
      `INSERT INTO uat_results (no, run_at, result) VALUES ($1, now(), $2)
       ON CONFLICT (no) DO UPDATE SET run_at = now(), result = EXCLUDED.result`,
      [no, JSON.stringify(res)],
    );
    return res;
  }

  async results(): Promise<UatResult[]> {
    const { rows } = await this.db.query<{ result: UatResult }>("SELECT result FROM uat_results ORDER BY no");
    return rows.map((r) => r.result);
  }
}
