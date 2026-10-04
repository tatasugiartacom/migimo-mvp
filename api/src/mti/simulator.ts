import { randomBytes, randomInt } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { minify, notifyStringToSign, signRsa, symmetricSignature, symmetricStringToSign, timestampWib, verifyRsa } from "./signature.js";

/**
 * Simulator MTI QR Payment (SNAP MPM) untuk pengujian lokal dan lingkungan "simulator".
 * Meniru endpoint, validasi, dan pola kode respons dokumen v1.0.11. BUKAN pengganti UAT di sandbox Yokke.
 */
export interface SimOptions {
  clientKey: string;
  clientSecret: string;
  merchantId: string;
  terminalId: string;
  /** Kunci publik Migimo untuk verifikasi tanda tangan Get Token. */
  migimoPublicKey: string;
  /** Kunci privat simulator untuk menandatangani notify. */
  simPrivateKey: string;
  /** URL lengkap endpoint notify Migimo. */
  notifyUrl: string;
  notifyPath: string;
  /** Nominal ajaib yang membuat simulator sengaja lambat (skenario timeout). */
  timeoutAmount?: string;
  timeoutDelayMs?: number;
}

interface Trx {
  referenceNo: string;
  partnerReferenceNo: string;
  externalId: string;
  amount: string;
  feeAmount?: string;
  merchantId: string;
  terminalId: string;
  date: string;
  status: "03" | "00" | "04" | "06";
  approvalCode?: string;
}

const DESC: Record<string, string> = { "00": "Success", "03": "Pending", "04": "Refunded", "06": "Failed", "07": "Not found" };

function digits(n: number) {
  let s = String(randomInt(1, 10));
  while (s.length < n) s += String(randomInt(0, 10));
  return s;
}

function wibDate() {
  return timestampWib().slice(0, 10).replace(/-/g, "");
}

export class MtiSimulator {
  private tokens = new Map<string, number>();
  private externalIds = new Set<string>();
  private partnerRefs = new Set<string>();
  readonly trx = new Map<string, Trx>();

  constructor(private o: SimOptions) {}

  private err(http: number, svc: string, kase: string, msg: string) {
    return { http, body: { responseCode: `${http}${svc}${kase}`, responseMessage: msg } };
  }

  /** Validasi header bersama untuk generate/query/cancel. */
  private checkService(svc: string, path: string, headers: Record<string, any>, raw: string) {
    const auth = String(headers.authorization ?? "");
    const token = auth.replace(/^Bearer\s+/i, "");
    const exp = this.tokens.get(token);
    if (!exp || exp < Date.now()) return this.err(401, svc, "01", "Invalid Token (B2B)");
    const ts = String(headers["x-timestamp"] ?? "");
    const want = symmetricSignature(
      this.o.clientSecret,
      symmetricStringToSign({ method: "POST", endpointUrl: path, accessToken: token, body: raw, timestamp: ts }),
    );
    if (headers["x-signature"] !== want) return this.err(401, svc, "00", "Unauthorized. Signature");
    const ext = String(headers["x-external-id"] ?? "");
    if (!/^\d{15}$/.test(ext)) return this.err(400, svc, "01", "Invalid Field Format X-EXTERNAL-ID");
    const key = wibDate() + ext;
    if (this.externalIds.has(key)) return this.err(409, svc, "00", "Conflict. Duplicate X-EXTERNAL-ID");
    this.externalIds.add(key);
    return null;
  }

  register(app: FastifyInstance, prefix = "/sim") {
    app.post(`${prefix}/qr/v2.0/access-token/b2b`, async (req, reply) => {
      const h = req.headers as Record<string, any>;
      const ts = String(h["x-timestamp"] ?? "");
      if (h["x-client-key"] !== this.o.clientKey) {
        return reply.code(401).send({ responseCode: "4017300", responseMessage: "Unauthorized. Unknown client" });
      }
      if (!verifyRsa(this.o.migimoPublicKey, `${this.o.clientKey}|${ts}`, String(h["x-signature"] ?? ""))) {
        return reply.code(401).send({ responseCode: "4017300", responseMessage: "Unauthorized. Signature" });
      }
      const token = randomBytes(24).toString("base64url");
      this.tokens.set(token, Date.now() + 900_000);
      reply
        .headers({ "X-TIMESTAMP": timestampWib(), "X-CLIENT-KEY": this.o.clientKey })
        .send({ responseCode: "2007300", responseMessage: "Successful", accessToken: token, tokenType: "Bearer", expiresIn: "900" });
    });

    app.post(`${prefix}/v2.0/qr/qr-mpm-generate`, async (req, reply) => {
      const raw = (req as any).rawBody as string;
      const b = req.body as any;
      const e =
        this.checkService("47", "/v2.0/qr/qr-mpm-generate", req.headers, raw) ??
        this.validateGenerate(b);
      if (e) return reply.code(e.http).send(e.body);
      if (this.o.timeoutAmount && b.amount.value === this.o.timeoutAmount) {
        await new Promise((r) => setTimeout(r, this.o.timeoutDelayMs ?? 35_000));
        return reply.code(504).send({ responseCode: "5044700", responseMessage: "Timeout Transaction" });
      }
      this.partnerRefs.add(b.partnerReferenceNo);
      const referenceNo = digits(12);
      this.trx.set(referenceNo, {
        referenceNo,
        partnerReferenceNo: b.partnerReferenceNo,
        externalId: String(req.headers["x-external-id"]),
        amount: b.amount.value,
        feeAmount: b.feeAmount?.value,
        merchantId: b.merchantId,
        terminalId: b.terminalId,
        date: wibDate(),
        status: "03",
      });
      reply.send({
        responseCode: "2004700",
        responseMessage: "Successful",
        referenceNo,
        partnerReferenceNo: b.partnerReferenceNo,
        terminalId: b.terminalId,
        qrContent: fakeQris(b.amount.value, b.merchantId),
        additionalInfo: { merchantId: b.merchantId },
      });
    });

    app.post(`${prefix}/v2.0/qr/qr-mpm-query`, async (req, reply) => {
      const raw = (req as any).rawBody as string;
      const b = req.body as any;
      const e = this.checkService("51", "/v2.0/qr/qr-mpm-query", req.headers, raw) ?? this.findTrx("51", b);
      if ("http" in e) return reply.code(e.http).send(e.body);
      const t = e.trx;
      reply.send({
        responseCode: "2005100",
        responseMessage: "Successful",
        originalReferenceNo: t.referenceNo,
        originalExternalId: t.externalId,
        serviceCode: "51",
        latestTransactionStatus: t.status,
        transactionStatusDesc: DESC[t.status],
        terminalId: t.terminalId,
        amount: { value: t.amount, currency: "IDR" },
        ...(t.feeAmount ? { feeAmount: { value: t.feeAmount, currency: "IDR" } } : {}),
        additionalInfo: {
          merchantId: t.merchantId,
          ...(t.approvalCode ? { approvalCode: t.approvalCode, bankCode: "008", issuerName: "SIMULATOR" } : {}),
        },
      });
    });

    app.post(`${prefix}/v2.0/qr/qr-mpm-cancel`, async (req, reply) => {
      const raw = (req as any).rawBody as string;
      const b = req.body as any;
      const e = this.checkService("77", "/v2.0/qr/qr-mpm-cancel", req.headers, raw) ?? this.findTrx("77", b);
      if ("http" in e) return reply.code(e.http).send(e.body);
      const t = e.trx;
      if (b.originalPartnerReferenceNo !== t.partnerReferenceNo) {
        const x = this.err(404, "77", "18", "Inconsistent Request");
        return reply.code(x.http).send(x.body);
      }
      if (t.status === "04") {
        const x = this.err(404, "77", "04", "Transaction Cancelled");
        return reply.code(x.http).send(x.body);
      }
      if (t.status !== "00") {
        const x = this.err(404, "77", "00", "Invalid Transaction");
        return reply.code(x.http).send(x.body);
      }
      if (b.additionalInfo?.originalApprovalCode !== t.approvalCode) {
        const x = this.err(404, "77", "18", "Inconsistent Request. Approval code");
        return reply.code(x.http).send(x.body);
      }
      if (Number(b.refundAmount?.value) !== Number(t.amount)) {
        const x = this.err(404, "77", "13", "Invalid Amount");
        return reply.code(x.http).send(x.body);
      }
      t.status = "04";
      reply.send({
        responseCode: "2007700",
        responseMessage: "Successful",
        referenceNo: t.referenceNo,
        cancelTime: timestampWib(),
        additionalInfo: { approvalCode: t.approvalCode },
      });
    });
  }

  private validateGenerate(b: any) {
    if (!b || typeof b !== "object") return this.err(400, "47", "00", "Bad Request");
    // Panjang MID/TID mengikuti kredensial yang diterbitkan Yokke (bisa berbeda dari contoh di dokumen API).
    for (const [f, len] of [
      ["partnerReferenceNo", 20],
      ["merchantId", this.o.merchantId.length],
      ["terminalId", this.o.terminalId.length],
    ] as const) {
      if (typeof b[f] !== "string" || b[f].length !== len) return this.err(400, "47", "01", `Invalid Field Format ${f}`);
    }
    if (this.partnerRefs.has(b.partnerReferenceNo)) return this.err(409, "47", "01", "Duplicate partnerReferenceNo");
    if (b.merchantId !== this.o.merchantId) return this.err(404, "47", "08", "Invalid Merchant");
    if (b.terminalId !== this.o.terminalId) return this.err(404, "47", "17", "Terminal Invalid");
    if (!b.amount || !(Number(b.amount.value) > 0)) return this.err(404, "47", "13", "Invalid Amount");
    return null;
  }

  private findTrx(svc: string, b: any): { trx: Trx } | { http: number; body: any } {
    if (b?.merchantId !== this.o.merchantId) return this.err(404, svc, "08", "Invalid Merchant");
    if (b?.additionalInfo?.terminalId !== this.o.terminalId) return this.err(404, svc, "17", "Terminal Invalid");
    const t = this.trx.get(String(b?.originalReferenceNo ?? ""));
    if (!t) return this.err(404, svc, "01", "Transaction Not Found");
    if (b.originalExternalId !== t.externalId) return this.err(404, svc, "18", "Inconsistent Request. originalExternalId");
    if (b.additionalInfo?.originalTransactionDate !== t.date) {
      return this.err(404, svc, "18", "Inconsistent Request. originalTransactionDate");
    }
    return { trx: t };
  }

  /**
   * Meniru nasabah membayar QR, lalu MTI mengirim QR Payment Credit Notify ke Migimo.
   * status "00" = berhasil, "06" = gagal. times = 2 untuk skenario "Double credit".
   */
  async pay(referenceNo: string, opts: { status?: "00" | "06"; times?: number; scenario?: string } = {}) {
    const t = this.trx.get(referenceNo);
    if (!t) throw new Error("Transaksi simulator tidak ditemukan");
    const status = opts.status ?? "00";
    if (status === "00") {
      t.status = "00";
      t.approvalCode = t.approvalCode ?? String(randomInt(100000, 999999));
    } else {
      t.status = "06";
    }
    const results: { httpStatus: number; body: any }[] = [];
    for (let i = 0; i < (opts.times ?? 1); i++) {
      const body = minify({
        originalReferenceNo: t.referenceNo,
        latestTransactionStatus: status,
        transactionStatusDesc: DESC[status],
        customerNumber: "1234123412341234",
        destinationNumber: "1234123412341234",
        amount: { value: t.amount, currency: "IDR" },
        bankCode: "008",
        additionalInfo: {
          merchantId: t.merchantId,
          terminalId: t.terminalId,
          ...(t.approvalCode ? { approvalCode: t.approvalCode } : {}),
          customerName: "Customer Pay",
          issuerName: "SIMULATOR",
          issuerReferenceID: digits(14),
        },
      });
      const ts = timestampWib();
      const res = await fetch(this.o.notifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-TIMESTAMP": ts,
          "X-SIGNATURE": signRsa(this.o.simPrivateKey, notifyStringToSign("POST", this.o.notifyPath, body, ts)),
          "X-EXTERNAL-ID": digits(15),
          "X-PARTNER-ID": "MTI-SIMULATOR",
          "CHANNEL-ID": "95",
          ...(opts.scenario ? { "X-MIGIMO-SCENARIO": opts.scenario } : {}),
        },
        body,
      });
      results.push({ httpStatus: res.status, body: await res.json().catch(() => null) });
    }
    return results;
  }
}

/** QRIS tiruan berformat EMVCo (dengan CRC16 yang valid) untuk ditampilkan di simulator. */
export function fakeQris(amount: string, merchantId: string) {
  const tlv = (id: string, v: string) => id + String(v.length).padStart(2, "0") + v;
  const body =
    tlv("00", "01") +
    tlv("01", "12") +
    tlv("26", tlv("00", "ID.CO.MIGIMO.SIMULATOR") + tlv("02", merchantId)) +
    tlv("52", "4829") +
    tlv("53", "360") +
    tlv("54", String(Number(amount))) +
    tlv("58", "ID") +
    tlv("59", "MIGIMO SIMULATOR") +
    tlv("60", "JAKARTA") +
    "6304";
  let crc = 0xffff;
  for (const ch of Buffer.from(body, "utf8")) {
    crc ^= ch << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return body + crc.toString(16).toUpperCase().padStart(4, "0");
}
