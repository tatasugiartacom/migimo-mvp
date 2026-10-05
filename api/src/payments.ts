import type { Db } from "./db.js";
import { money, nextPartnerReferenceNo, transactionDateWib } from "./ids.js";
import type { MtiClient, MtiResult } from "./mti/client.js";

export type OrderStatus = "created" | "qr_generated" | "paid" | "failed" | "refunded" | "timeout" | "error";

export interface Order {
  id: number;
  partner_reference_no: string;
  external_id: string;
  reference_no: string | null;
  merchant_id: string;
  terminal_id: string;
  amount: string;
  fee_amount: string | null;
  status: OrderStatus;
  qr_content: string | null;
  transaction_date: string;
  approval_code: string | null;
  paid_at: string | null;
  refunded_at: string | null;
  notify_payload: any;
  /** Reference number pembayaran dari Payment Notify (dipakai Refund). */
  paid_reference_no: string | null;
  /** Tanggal pembayaran YYYYMMDD (originalTransactionDate untuk Inquiry/Refund). */
  paid_transaction_date: string | null;
  scenario: string | null;
  created_at: string;
}

/** Override untuk skenario UAT negatif (MID/TID salah, ID duplikat, panjang field salah). */
export interface Overrides {
  merchantId?: string;
  terminalId?: string;
  partnerReferenceNo?: string;
  externalId?: string;
  originalReferenceNo?: string;
  originalExternalId?: string;
  originalTransactionDate?: string;
  originalApprovalCode?: string;
  originalPartnerReferenceNo?: string;
}

export class Payments {
  /** Dipanggil sekali saat pesanan berubah menjadi dibayar (lewat notify atau inquiry). */
  onPaid?: (order: Order) => Promise<void> | void;

  /** Tandai dibayar hanya sekali (aman bila notify dan inquiry datang bersamaan), lalu panggil onPaid. */
  private async markPaid(
    orderId: number,
    p: { approvalCode: string | null; paidReferenceNo?: string | null; notifyPayload?: unknown },
  ) {
    const { rows } = await this.db.query<Order>(
      `UPDATE orders SET status = 'paid', paid_at = now(), approval_code = $2,
         notify_payload = COALESCE($3::jsonb, notify_payload),
         paid_reference_no = COALESCE($4, paid_reference_no),
         paid_transaction_date = COALESCE(paid_transaction_date, $5), updated_at = now()
       WHERE id = $1 AND status NOT IN ('paid', 'refunded') RETURNING *`,
      [
        orderId,
        p.approvalCode,
        p.notifyPayload === undefined ? null : JSON.stringify(p.notifyPayload),
        p.paidReferenceNo || null,
        transactionDateWib(),
      ],
    );
    if (rows[0] && this.onPaid) await Promise.resolve(this.onPaid(rows[0])).catch((e) => console.error("onPaid gagal", e));
  }

  constructor(
    private db: Db,
    private mti: MtiClient,
  ) {}

  async getOrder(id: number): Promise<Order | null> {
    const { rows } = await this.db.query<Order>("SELECT * FROM orders WHERE id = $1", [id]);
    return rows[0] ?? null;
  }


  /** X-EXTERNAL-ID unik per hari, jadi ambil pesanan terbaru dengan ID tersebut. */
  async findByExternalId(externalId: string): Promise<Order | null> {
    const { rows } = await this.db.query<Order>(
      "SELECT * FROM orders WHERE external_id = $1 ORDER BY id DESC LIMIT 1",
      [externalId],
    );
    return rows[0] ?? null;
  }

  async findByReferenceNo(referenceNo: string): Promise<Order | null> {
    const { rows } = await this.db.query<Order>(
      "SELECT * FROM orders WHERE reference_no = $1 OR paid_reference_no = $1 ORDER BY id DESC LIMIT 1",
      [referenceNo],
    );
    return rows[0] ?? null;
  }

  async listOrders(limit = 50): Promise<Order[]> {
    const { rows } = await this.db.query<Order>("SELECT * FROM orders ORDER BY id DESC LIMIT $1", [limit]);
    return rows;
  }

  private async setStatus(id: number, fields: Record<string, unknown>) {
    const keys = Object.keys(fields);
    const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
    await this.db.query(`UPDATE orders SET ${sets}, updated_at = now() WHERE id = $1`, [
      id,
      ...keys.map((k) => fields[k]),
    ]);
  }

  /** 3.3 QR Generation (MPM). Nominal dalam rupiah. */
  async createQr(p: {
    amount: number;
    feeAmount?: number;
    scenario?: string;
    overrides?: Overrides;
  }): Promise<{ order: Order; result: MtiResult }> {
    const o = p.overrides ?? {};
    const partnerReferenceNo = o.partnerReferenceNo ?? (await nextPartnerReferenceNo(this.db));
    const merchantId = o.merchantId ?? this.mti.merchantId;
    const terminalId = o.terminalId ?? this.mti.terminalId;
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO orders (partner_reference_no, external_id, merchant_id, terminal_id, amount, fee_amount,
         transaction_date, scenario) VALUES ($1,'',$2,$3,$4,$5,$6,$7) RETURNING id`,
      [partnerReferenceNo, merchantId, terminalId, p.amount, p.feeAmount ?? null, transactionDateWib(), p.scenario ?? null],
    );
    const orderId = Number(rows[0].id);

    const body: Record<string, unknown> = {
      merchantId,
      terminalId,
      partnerReferenceNo,
      amount: { value: money(p.amount), currency: "IDR" },
    };
    if (p.feeAmount !== undefined) body.feeAmount = { value: money(p.feeAmount), currency: "IDR" };

    const result = await this.mti.call("generate", body, {
      scenario: p.scenario,
      orderId,
      externalId: o.externalId,
    });
    const status: OrderStatus = result.ok ? "qr_generated" : result.timedOut ? "timeout" : "failed";
    await this.setStatus(orderId, {
      external_id: result.externalId ?? "",
      reference_no: result.body?.referenceNo ?? null,
      qr_content: result.body?.qrContent ?? null,
      status,
    });
    return { order: (await this.getOrder(orderId))!, result };
  }

  /** 3.4 QR Inquiry Status (MPM). Menandai pesanan dibayar bila status 00. */
  async inquiry(orderId: number, p: { scenario?: string; overrides?: Overrides } = {}) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    const o = p.overrides ?? {};
    const body = {
      // Yokke: originalReferenceNo = referenceNo QR Generate; originalTransactionDate = tanggal pembayaran.
      originalReferenceNo: o.originalReferenceNo ?? order.reference_no ?? "",
      originalExternalId: o.originalExternalId ?? order.external_id,
      serviceCode: "47",
      merchantId: o.merchantId ?? order.merchant_id,
      additionalInfo: {
        originalTransactionDate: o.originalTransactionDate ?? order.paid_transaction_date ?? order.transaction_date,
        terminalId: o.terminalId ?? order.terminal_id,
      },
    };
    const result = await this.mti.call("query", body, { scenario: p.scenario, orderId, externalId: o.externalId });
    if (result.ok && result.body?.latestTransactionStatus === "00" && order.status !== "paid" && order.status !== "refunded") {
      await this.markPaid(orderId, {
        approvalCode: result.body?.additionalInfo?.approvalCode ?? order.approval_code,
        // Respons inquiry: originalReferenceNo = reference number pembayaran.
        paidReferenceNo: result.body?.originalReferenceNo,
      });
    }
    return { order: (await this.getOrder(orderId))!, result };
  }

  /** 3.5 QR Payment Credit Refund (MPM). */
  async refund(
    orderId: number,
    p: { amount?: number; reason?: string; scenario?: string; overrides?: Overrides } = {},
  ) {
    const order = await this.getOrder(orderId);
    if (!order) throw new Error("Pesanan tidak ditemukan");
    const o = p.overrides ?? {};
    const body = {
      // Yokke: originalReferenceNo dari Payment Notify, approvalCode dari Payment Notify.
      originalReferenceNo: o.originalReferenceNo ?? order.paid_reference_no ?? order.reference_no ?? "",
      originalPartnerReferenceNo: o.originalPartnerReferenceNo ?? order.partner_reference_no,
      originalExternalId: o.originalExternalId ?? order.external_id,
      merchantId: o.merchantId ?? order.merchant_id,
      reason: p.reason ?? "Customer cancelation",
      refundAmount: { value: money(p.amount ?? Number(order.amount)), currency: "IDR" },
      additionalInfo: {
        originalTransactionDate: o.originalTransactionDate ?? order.paid_transaction_date ?? order.transaction_date,
        terminalId: o.terminalId ?? order.terminal_id,
        originalApprovalCode: o.originalApprovalCode ?? order.approval_code ?? "",
      },
    };
    const result = await this.mti.call("cancel", body, { scenario: p.scenario, orderId, externalId: o.externalId });
    if (result.ok) await this.setStatus(orderId, { status: "refunded", refunded_at: new Date() });
    return { order: (await this.getOrder(orderId))!, result };
  }

  /**
   * 3.6 QR Payment Credit Notify dari MTI. Mengembalikan kode respons yang dikirim balik ke MTI.
   * Notifikasi ganda untuk transaksi yang sudah dibayar ditolak (skenario UAT "Double credit").
   */
  async applyNotify(payload: any): Promise<{ httpStatus: number; responseCode: string; responseMessage: string; orderId?: number }> {
    const ref = String(payload?.originalReferenceNo ?? "");
    const extId = String(payload?.originalExternalId ?? payload?.originalExternalID ?? "");
    const status = String(payload?.latestTransactionStatus ?? "");
    if ((!ref && !extId) || !status || !payload?.amount?.value) {
      return { httpStatus: 400, responseCode: "4005202", responseMessage: "Invalid Mandatory Field" };
    }
    // Yokke: Payment Notify.originalExternalID = X-EXTERNAL-ID saat QR Generate. referenceNo sebagai cadangan.
    const order = (extId && (await this.findByExternalId(extId))) || (ref ? await this.findByReferenceNo(ref) : null);
    if (!order) return { httpStatus: 404, responseCode: "4045201", responseMessage: "Transaction Not Found" };

    const mid = payload?.additionalInfo?.merchantId;
    if (mid && mid !== order.merchant_id) {
      return { httpStatus: 404, responseCode: "4045208", responseMessage: "Invalid Merchant", orderId: order.id };
    }
    if (Number(payload.amount.value) !== Number(order.amount)) {
      return { httpStatus: 404, responseCode: "4045213", responseMessage: "Invalid Amount", orderId: order.id };
    }
    if (order.status === "paid" || order.status === "refunded") {
      return { httpStatus: 409, responseCode: "4095200", responseMessage: "Duplicate Notification", orderId: order.id };
    }

    if (status === "00") {
      await this.markPaid(order.id, {
        approvalCode: payload?.additionalInfo?.approvalCode ?? payload?.approvalCode ?? null,
        paidReferenceNo: ref,
        notifyPayload: payload,
      });
    } else {
      await this.setStatus(order.id, {
        status: ["06", "05", "07"].includes(status) ? "failed" : order.status,
        notify_payload: JSON.stringify(payload),
      });
    }
    return { httpStatus: 200, responseCode: "2005200", responseMessage: "Successful", orderId: order.id };
  }
}
