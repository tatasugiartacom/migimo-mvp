import type { FastifyInstance } from "fastify";
import { audit, requireAdmin } from "../auth.js";
import type { Db } from "../db.js";
import type { Config } from "../config.js";
import type { MtiSimulator } from "../mti/simulator.js";
import type { Payments } from "../payments.js";
import { UAT_CASES, type UatRunner } from "../uat.js";
import { csv } from "./admin.js";

/** Menjalankan dan mengekspor skenario UAT (login Google atau header Authorization: Bearer ADMIN_TOKEN). */
export function uatRoutes(
  app: FastifyInstance,
  deps: { cfg: Config; db: Db; payments: Payments; uat: UatRunner; sim: MtiSimulator | null },
) {
  const { cfg, db, payments, uat, sim } = deps;

  app.register(async (r) => {
    r.addHook("onRequest", requireAdmin(cfg));
    r.addHook("onResponse", async (req, reply) => {
      if (req.method === "POST" && req.actor) {
        await audit(db, req.actor, req.routeOptions.url ?? req.url, { params: req.params, status: reply.statusCode }).catch((e) =>
          req.log.error(e, "Gagal mencatat audit"),
        );
      }
    });

    r.get("/admin/uat/cases", async () => UAT_CASES);

    r.get("/admin/uat/results", async () => uat.results());

    r.post("/admin/uat/run/:no", async (req) => {
      const b = (req.body ?? {}) as { orderId?: number };
      return uat.run(Number((req.params as any).no), b);
    });

    /** Cek format kredensial MTI di Railway Variables (panjang MID/TID sesuai dokumen). */
    r.get("/admin/mti/check", async () => {
      const m = cfg.mti;
      const masalah: string[] = [];
      if (!/^\S{15}$/.test(m.merchantId))
        masalah.push(`MTI_MERCHANT_ID harus 15 karakter tanpa spasi (sekarang ${m.merchantId.length} karakter).`);
      if (!/^\S{8}$/.test(m.terminalId))
        masalah.push(`MTI_TERMINAL_ID harus 8 karakter tanpa spasi (sekarang ${m.terminalId.length} karakter).`);
      if (m.mode === "live" && !m.baseUrl) masalah.push("MTI_BASE_URL belum diisi.");
      return { ok: masalah.length === 0, masalah };
    });

    r.post("/admin/uat/run-all", async () => {
      const out = [];
      for (const c of UAT_CASES) out.push(await uat.run(c.no));
      return out;
    });

    /** Kolom mengikuti sheet "Testcase" file Yokke. */
    r.get("/admin/uat/export.csv", async (_req, reply) => {
      const rows = (await uat.results()).map((x) => ({
        No: x.no,
        Case: x.group,
        "Test case": x.name,
        "Expected Result": x.expected,
        "Actual Result": x.actual,
        Status: x.status,
        "Response Code": x.responseCode,
        "Reference Number": x.referenceNo,
        ExternalId: x.externalId,
        partnerReferenceNo: x.partnerReferenceNo,
        "Transaction Time": x.transactionTime,
        "Transaction Date": x.transactionDate,
        Catatan: x.note,
      }));
      reply
        .type("text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="uat-qris-snap-mpm.csv"')
        .send(csv(rows));
    });

    /** Hanya di mode simulator: meniru nasabah membayar QR. */
    r.post("/admin/sim/pay/:orderId", async (req, reply) => {
      if (!sim) return reply.code(404).send({ error: "Hanya tersedia di mode simulator" });
      const order = await payments.getOrder(Number((req.params as any).orderId));
      if (!order?.reference_no) return reply.code(404).send({ error: "Pesanan/QR tidak ditemukan" });
      const b = (req.body ?? {}) as { status?: "00" | "06"; times?: number };
      return sim.pay(order.reference_no, b);
    });
  });
}
