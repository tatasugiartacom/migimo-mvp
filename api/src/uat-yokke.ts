import ExcelJS from "exceljs";
import type { Config } from "./config.js";
import type { Db } from "./db.js";
import { transactionDateWib } from "./ids.js";
import type { MtiResult } from "./mti/client.js";
import type { Order, Payments } from "./payments.js";

/**
 * UAT sesuai file test case Yokke "Test Case UAT Integrasi QR MPM & ASPI-with Refund".
 * Skenario yang ditandai NA oleh Yokke tidak dimasukkan. Hasil diisikan kembali ke file Excel asli Yokke
 * (file diunggah dari dashboard saat ekspor dan tidak disimpan di repo).
 */

export type Lembar = "ASPI" | "ONUS" | "OFFUS";
/** auto = dijalankan Migimo · bayar = butuh QR yang sudah dibayar · notify = bukti dari notify Yokke · yokke = dipicu dari sisi Yokke */
export type Mode = "auto" | "bayar" | "notify" | "yokke";

export interface KasusUat {
  id: string;
  lembar: Lembar;
  no: number;
  judul: string;
  harapan: string;
  /** Pola response code yang diharapkan (regex). */
  kode: string;
  mode: Mode;
  petunjuk?: string;
}

export const NAMA_SHEET: Record<Lembar, string> = {
  ASPI: "MPM - ASPI",
  ONUS: "MPM ON US (MTI)",
  OFFUS: "MPM OFF US (MTI)",
};

const k = (lembar: Lembar, no: number, judul: string, harapan: string, kode: string, mode: Mode, petunjuk?: string): KasusUat => ({
  id: `${lembar}-${String(no).padStart(2, "0")}`,
  lembar,
  no,
  judul,
  harapan,
  kode,
  mode,
  petunjuk,
});

const BAYAR = "Butuh QR yang sudah dibayar (Payment by Mandiri). Isi # pesanan atau biarkan kosong untuk pesanan dibayar terakhir.";
const NOTIFY = "Bukti diambil otomatis dari notify Yokke yang sudah masuk. Bisa juga isi # log dari tab Log MTI.";
const YOKKE = "Dipicu dari sisi Yokke. Setelah Yokke menjalankannya, isi # log dari tab Log MTI bila ada.";

export const KASUS_UAT: KasusUat[] = [
  k("ASPI", 1, "Access Token Invalid", "401xx01 Access Token Invalid", "^401\\d{2}01$", "auto"),
  k("ASPI", 2, "Unauthorized Signature", "401xx00 Unauthorized Signature", "^401\\d{2}00$", "auto"),
  k("ASPI", 3, "Invalid Mandatory Field", "400xx02 Invalid Mandatory Field", "^400\\d{2}02$", "auto"),
  k("ASPI", 4, "Invalid Field Format", "400xx01 Invalid Field Format", "^400\\d{2}01$", "auto"),
  k("ASPI", 5, "Cannot use the same X-EXTERNAL-ID", "409xx00 Conflict", "^409\\d{2}00$", "auto"),
  k("ASPI", 6, "Generate QR – Show QR Code", "2004700 Successful", "^2004700$", "auto"),
  k("ASPI", 7, "Generate QR – Invalid Merchant", "4044708 Invalid Merchant", "^4044708$", "auto"),
  // Catatan Yokke: "scenario ini sama dengan scenario check status sukses/inquiry" → inquiry atas transaksi yang dibayar.
  k("ASPI", 15, "Query Payment – Pending Transaction/Inquiry", "2005100 Successful", "^2005100$", "bayar", BAYAR),
  k("ASPI", 16, "Query Payment – Transaction Not Found", "4045101 Transaction Not Found", "^4045101$", "auto"),
  k("ASPI", 17, "Payment Notify – Notify Success", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("ASPI", 18, "Payment Notify – Notify Failed", "2005200 Successful", "^2005200$", "notify", NOTIFY),

  k("ONUS", 1, "QR Generation Success", "2004700 Successful", "^2004700$", "auto"),
  k("ONUS", 2, "QR Generation timeout", "5044700 Timeout", "^5044700$", "yokke", YOKKE),
  k("ONUS", 3, "Invalid MID", "4044708 Invalid Merchant", "^4044708$", "auto"),
  k("ONUS", 4, "Invalid TID", "4044717 Invalid Terminal", "^4044717$", "auto"),
  k("ONUS", 5, "Normal payment", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("ONUS", 6, "Payment Timeout", "RC 68", "^68$", "yokke", YOKKE),
  k("ONUS", 7, "Refund same day", "2007700 Successful", "^2007700$", "bayar", BAYAR),
  k("ONUS", 8, "Double refund same day", "4047704", "^4047704$", "bayar", "Dijalankan setelah ON US 7 pada pesanan yang sama."),
  k("ONUS", 9, "Refund timeout same day (issuer Alipay)", "5047700 Timeout", "^5047700$", "yokke", YOKKE),
  k("ONUS", 10, "Refund next day", "2007700 Successful", "^2007700$", "bayar", "Butuh pesanan yang dibayar kemarin atau sebelumnya (H+1)."),
  k("ONUS", 11, "Double refund next day", "4047704", "^4047704$", "bayar", "Dijalankan setelah ON US 10 pada pesanan yang sama."),
  k("ONUS", 12, "Refund timeout next day (issuer Alipay)", "5047700 Timeout", "^5047700$", "yokke", YOKKE),
  k("ONUS", 13, "Double payment with same QR", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("ONUS", 14, "Payment QR Expired", "2005200 Successful", "^2005200$", "notify", "Isi # log notify pembayaran QR expired dari tab Log MTI."),
  k("ONUS", 15, "Purchase Notify (Payment success)", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("ONUS", 16, "Purchase Notify (Payment fail QR expired)", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("ONUS", 17, "Purchase Notify timeout", "RC 68", "^68$", "yokke", YOKKE),
  k("ONUS", 18, "Check status sukses/Inquiry", "2005100 Successful", "^2005100$", "bayar", BAYAR),
  k("ONUS", 19, "Check Status Payment not Found", "4045101 Transaction Not Found", "^4045101$", "auto"),

  k("OFFUS", 1, "Normal payment (bank lain)", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("OFFUS", 2, "Double payment (bank lain)", "2005200 Successful", "^2005200$", "notify", NOTIFY),
  k("OFFUS", 3, "Payment timeout (bank lain)", "RC 68", "^68$", "yokke", YOKKE),
  k("OFFUS", 4, "Refund", "2007700 Successful", "^2007700$", "bayar", "Butuh QR yang dibayar dari bank lain (off us)."),
  k("OFFUS", 5, "Double refund", "4047704", "^4047704$", "bayar", "Dijalankan setelah OFF US 4 pada pesanan yang sama."),
  k("OFFUS", 6, "Refund timeout (issuer Alipay)", "5047700 Timeout", "^5047700$", "yokke", YOKKE),
  k("OFFUS", 7, "QR inquiry transaksi sukses / Check Status", "2005100 Successful", "^2005100$", "bayar", "Butuh QR yang dibayar dari bank lain (off us)."),
];

export type StatusUat = "pass" | "fail" | "perlu_bayar" | "perlu_yokke";

export interface HasilUat {
  id: string;
  status: StatusUat;
  responseCode: string | null;
  logIds: number[];
  orderId: number | null;
  rrn: string | null;
  waktu: string;
  catatan: string | null;
}

interface LogRow {
  id: string;
  created_at: string;
  direction: "in" | "out";
  api: string;
  method: string;
  url: string;
  request_headers: Record<string, string> | null;
  request_body: string | null;
  http_status: number | null;
  response_body: string | null;
  response_code: string | null;
  error: string | null;
  order_id: string | null;
}

class Tertunda extends Error {
  constructor(
    public status: StatusUat,
    msg: string,
  ) {
    super(msg);
  }
}

function json(text: string | null): any {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function rapi(text: string | null) {
  const j = json(text);
  return j ? JSON.stringify(j, null, 2) : (text ?? "");
}

/** Nama penerbit (issuer) dari payload notify, untuk membedakan on us (Mandiri) dan off us. */
export function penerbit(payload: any): string {
  const a = payload?.additionalInfo ?? {};
  const nama = String(a.issuerName ?? a.issuer ?? payload?.issuerName ?? "").trim();
  if (nama) return nama;
  // Yokke mengirim issuerName kosong; penerbit dikenali dari NNS di awal customerNumber (93600008 = Bank Mandiri).
  const nns = String(payload?.customerNumber ?? "").slice(0, 8);
  if (!/^\d{8}$/.test(nns)) return "";
  return nns === "93600008" ? "Bank Mandiri" : `NNS ${nns}`;
}

const onUs = (nama: string) => /mandiri|livin/i.test(nama);

export class UatYokke {
  private siap: Promise<unknown> | null = null;
  private amount = 10000;

  constructor(
    private cfg: Config,
    private db: Db,
    private payments: Payments,
  ) {}

  private migrate() {
    this.siap ??= this.db.query(`CREATE TABLE IF NOT EXISTS uat_yokke (
      id TEXT PRIMARY KEY, run_at TIMESTAMPTZ NOT NULL DEFAULT now(), result JSONB NOT NULL)`);
    return this.siap;
  }

  async results(): Promise<HasilUat[]> {
    await this.migrate();
    const { rows } = await this.db.query<{ result: HasilUat }>("SELECT result FROM uat_yokke");
    return rows.map((r) => r.result);
  }

  private async simpan(h: HasilUat) {
    await this.db.query(
      `INSERT INTO uat_yokke (id, run_at, result) VALUES ($1, now(), $2)
       ON CONFLICT (id) DO UPDATE SET run_at = now(), result = EXCLUDED.result`,
      [h.id, JSON.stringify(h)],
    );
  }

  private async hasil(id: string): Promise<HasilUat | null> {
    const { rows } = await this.db.query<{ result: HasilUat }>("SELECT result FROM uat_yokke WHERE id = $1", [id]);
    return rows[0]?.result ?? null;
  }

  private async log(id: number): Promise<LogRow | null> {
    const { rows } = await this.db.query<LogRow>("SELECT * FROM mti_logs WHERE id = $1", [id]);
    return rows[0] ?? null;
  }

  async logs(ids: number[]): Promise<LogRow[]> {
    if (!ids.length) return [];
    const { rows } = await this.db.query<LogRow>("SELECT * FROM mti_logs WHERE id = ANY($1::bigint[]) ORDER BY id", [ids]);
    return rows;
  }

  /** Pesanan dibayar untuk skenario refund/inquiry. */
  private async pesananDibayar(c: KasusUat, orderId?: number): Promise<{ order: Order; catatan: string }> {
    const hariIni = transactionDateWib();
    if (orderId) {
      const o = await this.payments.getOrder(orderId);
      if (!o) throw new Tertunda("perlu_bayar", `Pesanan #${orderId} tidak ditemukan`);
      if (o.status !== "paid") throw new Tertunda("perlu_bayar", `Pesanan #${orderId} berstatus ${o.status}, belum dibayar`);
      return { order: o, catatan: `Penerbit: ${penerbit(o.notify_payload) || "tidak terbaca"}` };
    }
    const { rows } = await this.db.query<Order>(
      "SELECT * FROM orders WHERE status = 'paid' AND merchant_id = $1 ORDER BY id DESC LIMIT 50",
      [this.cfg.mti.merchantId],
    );
    const tgl = (o: Order) => o.paid_transaction_date ?? o.transaction_date;
    const cocokTanggal = rows.filter((o) =>
      c.id === "ONUS-10" ? tgl(o) < hariIni : c.id === "ONUS-07" ? tgl(o) === hariIni : true,
    );
    if (c.lembar === "OFFUS") {
      const o = cocokTanggal.find((x) => penerbit(x.notify_payload) && !onUs(penerbit(x.notify_payload)));
      if (o) return { order: o, catatan: `Penerbit: ${penerbit(o.notify_payload)}` };
      throw new Tertunda("perlu_bayar", "Belum ada QR yang dibayar dari bank lain (off us). Minta Yokke membayar QR dari issuer selain Mandiri.");
    }
    const o = cocokTanggal.find((x) => onUs(penerbit(x.notify_payload))) ?? cocokTanggal[0];
    if (!o) {
      throw new Tertunda(
        "perlu_bayar",
        c.id === "ONUS-10"
          ? "Belum ada pesanan dibayar dari hari sebelumnya. Jalankan besok untuk pesanan yang dibayar hari ini."
          : "Belum ada QR yang dibayar hari ini. Buat QRIS, minta Yokke membayarnya (Payment by Mandiri), lalu jalankan ulang.",
      );
    }
    const nama = penerbit(o.notify_payload);
    return { order: o, catatan: `Penerbit: ${nama || "tidak terbaca, pastikan dibayar dari Mandiri (on us)"}` };
  }

  /** Notify Yokke yang cocok dengan skenario (diambil otomatis dari log masuk). */
  private async cariNotify(c: KasusUat): Promise<LogRow | null> {
    // Hanya notify untuk MID yang sedang diuji; di mode live notify simulator lama tidak pernah dipakai sebagai bukti.
    const { rows } = await this.db.query<LogRow>(
      `SELECT l.* FROM mti_logs l JOIN orders o ON o.id = l.order_id
       WHERE l.direction = 'in' AND l.api = 'notify' AND o.merchant_id = $1
         AND ($2 OR COALESCE(l.request_headers->>'x-partner-id', '') <> 'MTI-SIMULATOR')
       ORDER BY l.id DESC LIMIT 200`,
      [this.cfg.mti.merchantId, this.cfg.mti.mode === "simulator"],
    );
    // ON US 14 (Payment QR Expired) dan 16: notify gagal (status 06) dari QR yang dibayar setelah kedaluwarsa.
    const jenis = ["ASPI-18", "ONUS-14", "ONUS-16"].includes(c.id) ? "gagal" : ["ONUS-13", "OFFUS-02"].includes(c.id) ? "ganda" : "sukses";
    return (
      rows.find((l) => {
        const p = json(l.request_body);
        if (!p) return false;
        const ganda = /Pembayaran ganda/.test(l.error ?? "");
        const nama = penerbit(p);
        if (c.lembar === "ONUS" && nama && !onUs(nama)) return false;
        if (c.lembar === "OFFUS" && (!nama || onUs(nama))) return false;
        if (jenis === "ganda") return ganda;
        if (jenis === "gagal") return p.latestTransactionStatus !== "00";
        return p.latestTransactionStatus === "00" && !ganda;
      }) ?? null
    );
  }

  async run(id: string, opts: { orderId?: number; logId?: number } = {}): Promise<HasilUat> {
    await this.migrate();
    const c = KASUS_UAT.find((x) => x.id === id);
    if (!c) throw Object.assign(new Error(`Skenario ${id} tidak ada`), { statusCode: 400 });
    const s = `UATY-${c.id}`;
    const p = this.payments;
    const mid = this.cfg.mti.merchantId;
    const tid = this.cfg.mti.terminalId;
    // MID/TID salah dengan panjang sama, supaya yang diuji "tidak dikenal", bukan "format salah".
    const salah = (v: string) => (v.replace(/\d/g, "9") === v ? v.replace(/\d/g, "8") : v.replace(/\d/g, "9"));
    // MID tidak dikenal: digit terakhir diganti (MID semua angka 9 membuat server UAT Yokke tidak menjawab).
    const midSalah = mid.slice(0, -1) + ((Number(mid.slice(-1)) + 1) % 10);
    const waktu = new Date().toISOString();
    const lulus = (code: string | null) => code !== null && new RegExp(c.kode).test(code);
    const dariMti = (rs: MtiResult[], order: Order | null, catatan: string | null = null): HasilUat => {
      const last = rs[rs.length - 1];
      const code = last.responseCode ?? (last.timedOut ? "TIMEOUT" : null);
      return {
        id: c.id,
        status: lulus(code) ? "pass" : "fail",
        responseCode: code,
        logIds: rs.map((r) => r.logId),
        orderId: order ? Number(order.id) : null,
        rrn: last.body?.referenceNo ?? last.body?.originalReferenceNo ?? order?.reference_no ?? order?.partner_reference_no ?? null,
        waktu,
        catatan: catatan ?? (last.error ? `Error: ${last.error}` : (last.body?.responseMessage ?? null)),
      };
    };

    let h: HasilUat;
    try {
      if (opts.logId) {
        // Bukti dipilih manual dari tab Log MTI (notify atau skenario yang dipicu Yokke).
        const l = await this.log(opts.logId);
        if (!l) throw new Tertunda(c.mode === "yokke" ? "perlu_yokke" : "perlu_bayar", `Log #${opts.logId} tidak ditemukan`);
        const payload = json(l.request_body);
        h = {
          id: c.id,
          status: lulus(l.response_code) ? "pass" : "fail",
          responseCode: l.response_code,
          logIds: [Number(l.id)],
          orderId: l.order_id ? Number(l.order_id) : null,
          rrn: payload?.originalReferenceNo ?? json(l.response_body)?.referenceNo ?? null,
          waktu: new Date(l.created_at).toISOString(),
          catatan: `Bukti dari log #${l.id}${penerbit(payload) ? ` · Penerbit: ${penerbit(payload)}` : ""}`,
        };
      } else if (c.mode === "yokke") {
        throw new Tertunda("perlu_yokke", c.petunjuk ?? YOKKE);
      } else if (c.mode === "notify") {
        const l = await this.cariNotify(c);
        if (!l) {
          throw new Tertunda(
            "perlu_bayar",
            c.id === "ONUS-14"
              ? "Isi # log notify pembayaran QR expired dari tab Log MTI."
              : "Belum ada notify yang cocok. Buat QRIS lalu minta Yokke membayarnya; notify akan masuk otomatis.",
          );
        }
        const payload = json(l.request_body);
        h = {
          id: c.id,
          status: lulus(l.response_code) ? "pass" : "fail",
          responseCode: l.response_code,
          logIds: [Number(l.id)],
          orderId: l.order_id ? Number(l.order_id) : null,
          rrn: payload?.originalReferenceNo ?? null,
          waktu: new Date(l.created_at).toISOString(),
          catatan: `Notify log #${l.id} · status ${payload?.latestTransactionStatus ?? "-"}${penerbit(payload) ? ` · Penerbit: ${penerbit(payload)}` : ""}`,
        };
      } else {
        switch (c.id) {
          case "ASPI-01":
          case "ASPI-02":
          case "ASPI-03": {
            const tamper = ({ "ASPI-01": "token", "ASPI-02": "signature", "ASPI-03": "no-channel-id" } as const)[c.id];
            const { order, result } = await p.createQr({ amount: this.amount, scenario: s, tamper });
            h = dariMti([result], order);
            break;
          }
          case "ASPI-04": {
            const { order, result } = await p.createQr({ amount: this.amount, scenario: s, overrides: { amountValue: "10000" } });
            h = dariMti([result], order);
            break;
          }
          case "ASPI-05": {
            const first = await p.createQr({ amount: this.amount, scenario: s });
            const { order, result } = await p.createQr({
              amount: this.amount,
              scenario: s,
              overrides: { externalId: first.order.external_id },
            });
            h = dariMti([first.result, result], order, `X-EXTERNAL-ID dipakai ulang: ${first.order.external_id}`);
            break;
          }
          case "ASPI-06":
          case "ONUS-01": {
            const { order, result } = await p.createQr({ amount: this.amount, scenario: s });
            h = dariMti([result], order);
            break;
          }
          case "ASPI-07":
          case "ONUS-03":
          case "ONUS-04": {
            const overrides = c.id === "ONUS-04" ? { terminalId: salah(tid) } : { merchantId: midSalah };
            const { order, result } = await p.createQr({ amount: this.amount, scenario: s, overrides });
            h = dariMti([result], order);
            break;
          }
          case "ASPI-16":
          case "ONUS-19": {
            const gen = await p.createQr({ amount: this.amount, scenario: s });
            const inq = await p.inquiry(gen.order.id, { scenario: s, overrides: { originalReferenceNo: "000000000000" } });
            h = dariMti([gen.result, inq.result], inq.order, "Inquiry dengan Reference No salah (000000000000)");
            break;
          }
          case "ONUS-07":
          case "ONUS-10":
          case "OFFUS-04": {
            const { order, catatan } = await this.pesananDibayar(c, opts.orderId);
            const { result, order: o2 } = await p.refund(order.id, { scenario: s });
            h = dariMti([result], o2, catatan);
            break;
          }
          case "ONUS-08":
          case "ONUS-11":
          case "OFFUS-05": {
            const sebelum = { "ONUS-08": "ONUS-07", "ONUS-11": "ONUS-10", "OFFUS-05": "OFFUS-04" }[c.id]!;
            const orderId = opts.orderId ?? (await this.hasil(sebelum))?.orderId;
            const order = orderId ? await p.getOrder(orderId) : null;
            if (!order || order.status !== "refunded") {
              throw new Tertunda("perlu_bayar", `Jalankan ${sebelum.replace("-0", " ").replace("-", " ")} dulu sampai refund berhasil.`);
            }
            const { result, order: o2 } = await p.refund(order.id, { scenario: s });
            h = dariMti([result], o2, "Refund kedua untuk pesanan yang sudah di-refund");
            break;
          }
          case "ASPI-15":
          case "ONUS-18":
          case "OFFUS-07": {
            const { order, catatan } = await this.pesananDibayar(c, opts.orderId);
            const { result, order: o2 } = await p.inquiry(order.id, { scenario: s });
            const st = result.body?.latestTransactionStatus;
            h = dariMti([result], o2, `${catatan} · latestTransactionStatus=${st ?? "-"}`);
            if (h.status === "pass" && st !== "00") h.status = "fail";
            break;
          }
          default:
            throw new Error(`Skenario ${c.id} belum punya langkah otomatis`);
        }
      }
    } catch (e) {
      h = {
        id: c.id,
        status: e instanceof Tertunda ? e.status : "fail",
        responseCode: null,
        logIds: [],
        orderId: null,
        rrn: null,
        waktu,
        catatan: e instanceof Tertunda ? e.message : `Error: ${(e as Error).message}`,
      };
    }
    await this.simpan(h);
    return h;
  }
}

function waktuWib(iso: string) {
  return new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().replace("T", " ").slice(0, 19);
}

function teksLog(l: LogRow) {
  const arah = l.direction === "in" ? "MTI → Migimo" : "Migimo → MTI";
  return {
    req: [`${arah} · log #${l.id} · ${waktuWib(l.created_at)} WIB`, `${l.method} ${l.url}`, "Headers:", JSON.stringify(l.request_headers ?? {}, null, 2), "Body:", rapi(l.request_body)].join("\n"),
    res: [`HTTP ${l.http_status ?? "-"}`, rapi(l.response_body) || l.error || "", l.error && l.response_body ? `Catatan: ${l.error}` : ""].filter(Boolean).join("\n"),
  };
}

const BATAS_SEL = 32000;
const potong = (t: string) => (t.length > BATAS_SEL ? t.slice(0, BATAS_SEL) + "\n…(dipotong)" : t);

/** Isi file Excel test case Yokke (diunggah dari dashboard) dengan hasil UAT, lalu kembalikan file baru. */
export async function isiWorkbook(template: Buffer, hasil: HasilUat[], logs: Map<number, LogRow>): Promise<{ buf: Buffer; terisi: number }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(template as any);
  const byId = new Map(hasil.map((h) => [h.id, h]));
  let terisi = 0;
  for (const c of KASUS_UAT) {
    const h = byId.get(c.id);
    if (!h || (h.status !== "pass" && h.status !== "fail")) continue;
    const ws = wb.getWorksheet(NAMA_SHEET[c.lembar]);
    if (!ws) continue;
    let baris: ExcelJS.Row | null = null;
    ws.eachRow((row, n) => {
      if (!baris && n > 1 && String(row.getCell(1).value ?? "").trim() === String(c.no)) baris = row;
    });
    if (!baris) continue;
    const row = baris as ExcelJS.Row;
    const bagian = h.logIds.map((id) => logs.get(id)).filter(Boolean).map((l) => teksLog(l!));
    const status = h.status === "pass" ? "Pass" : "Fail";
    const wrap = { wrapText: true, vertical: "top" } as const;
    if (c.lembar === "ASPI") {
      // Skenario dua langkah (mis. Conflict: generate pertama lalu generate kedua) diberi label supaya request & response sejajar.
      const label = (i: number) => (bagian.length > 1 ? `LANGKAH ${i + 1}${i === bagian.length - 1 ? " (skenario uji)" : " (persiapan)"}\n` : "");
      row.getCell(5).value = potong(bagian.map((b, i) => label(i) + b.req).join("\n\n"));
      row.getCell(6).value = potong(bagian.map((b, i) => label(i) + b.res).join("\n\n"));
      row.getCell(7).value = status;
      for (const i of [5, 6, 7]) row.getCell(i).alignment = wrap;
    } else {
      const log = bagian.map((b, i) => `${bagian.length > 1 ? `LANGKAH ${i + 1}${i === bagian.length - 1 ? " (skenario uji)" : " (persiapan)"}\n` : ""}REQUEST\n${b.req}\n\nRESPONSE\n${b.res}`).join("\n\n");
      row.getCell(7).value = potong(log);
      row.getCell(8).value = waktuWib(h.waktu);
      row.getCell(9).value = h.rrn ?? "-";
      row.getCell(10).value = `${status.toUpperCase()} · ${h.responseCode ?? "-"}${h.catatan ? ` · ${h.catatan}` : ""}`;
      for (const i of [7, 8, 9, 10]) row.getCell(i).alignment = wrap;
    }
    terisi++;
  }
  wb.calcProperties.fullCalcOnLoad = true;
  return { buf: Buffer.from(await wb.xlsx.writeBuffer()), terisi };
}
