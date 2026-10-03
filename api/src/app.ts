import Fastify from "fastify";
import type { Config } from "./config.js";
import type { Db } from "./db.js";
import { MtiClient } from "./mti/client.js";
import { Payments } from "./payments.js";
import { adminRoutes } from "./routes/admin.js";
import { notifyRoutes } from "./routes/notify.js";
import { pageRoutes } from "./routes/pages.js";
import { authRoutes } from "./routes/auth.js";
import { uatRoutes } from "./routes/uat.js";
import type { MtiSimulator } from "./mti/simulator.js";
import { UatRunner } from "./uat.js";
import { WaAgent } from "./wa/agent.js";
import { WhatsAppCloud } from "./wa/cloud.js";
import { whatsappRoutes } from "./routes/whatsapp.js";

export function buildApp(deps: { cfg: Config; db: Db; fetchImpl?: typeof fetch; waFetch?: typeof fetch; aiFetch?: typeof fetch; logger?: boolean; sim?: MtiSimulator | null }) {
  const { cfg, db } = deps;
  const app = Fastify({ logger: deps.logger ?? true, bodyLimit: 1024 * 1024, trustProxy: true });

  // Simpan body mentah: tanda tangan notify dihitung dari body persis seperti yang dikirim MTI.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as any).rawBody = body as string;
    if (!body) return done(null, {});
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(Object.assign(new Error("Format JSON tidak valid"), { statusCode: 400 }), undefined);
    }
  });

  const mti = new MtiClient(cfg, db, deps.fetchImpl);
  const payments = new Payments(db, mti);

  app.get("/health", async () => ({ ok: true, mode: cfg.mti.mode }));
  pageRoutes(app, { cfg });
  authRoutes(app, { cfg, db, fetchImpl: deps.fetchImpl });
  notifyRoutes(app, { cfg, mti, payments });
  adminRoutes(app, { cfg, db, payments });
  const uat = new UatRunner(cfg, db, payments, deps.sim ?? null);
  uatRoutes(app, { cfg, db, payments, uat, sim: deps.sim ?? null });
  deps.sim?.register(app);

  const cloud = new WhatsAppCloud(cfg.wa, deps.waFetch);
  const agent = new WaAgent(cfg, db, payments, deps.aiFetch);
  const wa = whatsappRoutes(app, { cfg, db, agent, cloud });
  payments.onPaid = (order) => agent.onPaid(order, wa.kirimTeks);

  return { app, mti, payments, uat, agent };
}
