import { createPublicKey, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import QRCode from "qrcode";
import type { Config } from "../config.js";
import type { Db } from "../db.js";
import type { Overrides, Payments } from "../payments.js";

function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

/** API internal tim Migimo untuk menjalankan dan memantau transaksi UAT. Wajib header Authorization: Bearer ADMIN_TOKEN. */
export function adminRoutes(app: FastifyInstance, deps: { cfg: Config; db: Db; payments: Payments }) {
  const { cfg, db, payments } = deps;

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

    r.get("/admin/keys/public", async (_req, reply) => {
      if (!cfg.mti.privateKey) return reply.code(404).send({ error: "MTI_PRIVATE_KEY belum diatur" });
      const pub = createPublicKey(cfg.mti.privateKey).export({ type: "spki", format: "pem" });
      reply.type("text/plain").send(pub);
    });

    r.get("/admin/orders", async (req) => {
      const limit = Math.min(Number((req.query as any).limit ?? 50), 500);
      return payments.listOrders(limit);
    });

    r.get("/admin/orders/:id", async (req, reply) => {
      const o = await payments.getOrder(Number((req.params as any).id));
      return o ?? reply.code(404).send({ error: "Pesanan tidak ditemukan" });
    });

    r.get("/admin/orders/:id/qr.png", async (req, reply) => {
      const o = await payments.getOrder(Number((req.params as any).id));
      if (!o?.qr_content) return reply.code(404).send({ error: "QR belum tersedia" });
      reply.type("image/png").send(await QRCode.toBuffer(o.qr_content, { width: 480, margin: 2 }));
    });

    r.post("/admin/qr", async (req) => {
      const b = (req.body ?? {}) as { amount: number; feeAmount?: number; scenario?: string; overrides?: Overrides };
      return payments.createQr(b);
    });

    r.post("/admin/orders/:id/inquiry", async (req) => {
      const b = (req.body ?? {}) as { scenario?: string; overrides?: Overrides };
      return payments.inquiry(Number((req.params as any).id), b);
    });

    r.post("/admin/orders/:id/refund", async (req) => {
      const b = (req.body ?? {}) as { amount?: number; reason?: string; scenario?: string; overrides?: Overrides };
      return payments.refund(Number((req.params as any).id), b);
    });

    r.get("/admin/logs", async (req) => {
      const q = req.query as { scenario?: string; limit?: string };
      const limit = Math.min(Number(q.limit ?? 100), 1000);
      const { rows } = q.scenario
        ? await db.query("SELECT * FROM mti_logs WHERE scenario = $1 ORDER BY id LIMIT $2", [q.scenario, limit])
        : await db.query("SELECT * FROM mti_logs ORDER BY id DESC LIMIT $1", [limit]);
      return rows;
    });

    r.get("/admin/logs.csv", async (_req, reply) => {
      const { rows } = await db.query("SELECT * FROM mti_logs ORDER BY id");
      reply.type("text/csv; charset=utf-8").header("Content-Disposition", 'attachment; filename="mti-logs.csv"').send(csv(rows));
    });
  });
}

export { csv };
