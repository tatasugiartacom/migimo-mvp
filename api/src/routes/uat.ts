import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Config } from "../config.js";
import type { MtiSimulator } from "../mti/simulator.js";
import type { Payments } from "../payments.js";
import { UAT_CASES, type UatRunner } from "../uat.js";
import { csv } from "./admin.js";

/** Menjalankan dan mengekspor skenario UAT (header Authorization: Bearer ADMIN_TOKEN). */
export function uatRoutes(
  app: FastifyInstance,
  deps: { cfg: Config; payments: Payments; uat: UatRunner; sim: MtiSimulator | null },
) {
  const { cfg, payments, uat, sim } = deps;

  const guard = async (req: FastifyRequest) => {
    if (!cfg.adminToken) throw Object.assign(new Error("ADMIN_TOKEN belum diatur"), { statusCode: 503 });
    const given = Buffer.from(String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, ""));
    const want = Buffer.from(cfg.adminToken);
    if (given.length !== want.length || !timingSafeEqual(given, want)) {
      throw Object.assign(new Error("Unauthorized"), { statusCode: 401 });
    }
  };

  app.register(async (r) => {
    r.addHook("onRequest", guard);

    r.get("/admin/uat/cases", async () => UAT_CASES);

    r.get("/admin/uat/results", async () => uat.results());

    r.post("/admin/uat/run/:no", async (req) => {
      const b = (req.body ?? {}) as { orderId?: number };
      return uat.run(Number((req.params as any).no), b);
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
