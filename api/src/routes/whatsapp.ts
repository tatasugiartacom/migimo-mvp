import type { FastifyInstance } from "fastify";
import { audit, requireAdmin } from "../auth.js";
import type { Config } from "../config.js";
import type { Db } from "../db.js";
import type { Outbox, WaAgent } from "../wa/agent.js";
import { verifyMetaSignature, type WhatsAppCloud } from "../wa/cloud.js";

/** Ambil teks dari berbagai jenis pesan WhatsApp. */
function teksPesan(m: any): string {
  if (m.type === "text") return String(m.text?.body ?? "");
  if (m.type === "button") return String(m.button?.text ?? "");
  if (m.type === "interactive") return String(m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "");
  return `[Pengguna mengirim pesan jenis "${m.type}" yang tidak bisa dibaca bot. Minta dikirim dalam bentuk teks.]`;
}

export function whatsappRoutes(app: FastifyInstance, deps: { cfg: Config; db: Db; agent: WaAgent; cloud: WhatsAppCloud }) {
  const { cfg, db, agent, cloud } = deps;

  const outboxFor = (waId: string): Outbox => ({
    text: async (body) => {
      await cloud.sendText(waId, body);
    },
    image: async (png, caption) => {
      await cloud.sendImage(waId, png, caption);
    },
  });

  // Verifikasi webhook saat didaftarkan di Meta App → WhatsApp → Configuration.
  app.get("/wa/webhook", async (req, reply) => {
    const q = req.query as Record<string, string>;
    if (q["hub.mode"] === "subscribe" && cfg.wa.verifyToken && q["hub.verify_token"] === cfg.wa.verifyToken) {
      return reply.type("text/plain").send(q["hub.challenge"] ?? "");
    }
    return reply.code(403).send({ error: "Token verifikasi tidak cocok" });
  });

  app.post("/wa/webhook", async (req, reply) => {
    const raw = (req as any).rawBody as string | undefined;
    if (!verifyMetaSignature(cfg.wa.appSecret, raw ?? "", req.headers["x-hub-signature-256"] as string | undefined)) {
      return reply.code(401).send({ error: "Tanda tangan tidak valid" });
    }
    // Balas 200 secepatnya; Meta mengulang kiriman bila lambat. Pesan diproses di latar belakang.
    reply.code(200).send({ ok: true });

    const body = req.body as any;
    for (const entry of body?.entry ?? []) {
      for (const ch of entry?.changes ?? []) {
        const v = ch?.value ?? {};
        if (cfg.wa.phoneNumberId && v.metadata?.phone_number_id && v.metadata.phone_number_id !== cfg.wa.phoneNumberId) continue;
        const names = new Map<string, string>((v.contacts ?? []).map((c: any) => [String(c.wa_id), c.profile?.name]));
        for (const m of v.messages ?? []) {
          const waId = String(m.from ?? "");
          if (!/^\d{6,20}$/.test(waId)) continue;
          cloud.markRead(String(m.id)).catch(() => {});
          agent
            .handle({ waId, name: names.get(waId) ?? null, text: teksPesan(m).slice(0, 4000), waMessageId: String(m.id), outbox: outboxFor(waId) })
            .catch((e) => req.log.error(e, "Gagal memproses pesan WhatsApp"));
        }
      }
    }
  });

  // ---------- Admin ----------
  app.register(async (r) => {
    r.addHook("onRequest", requireAdmin(cfg));
    r.addHook("onResponse", async (req, reply) => {
      if (req.method === "POST" && req.actor) {
        await audit(db, req.actor, req.routeOptions.url ?? req.url, { params: req.params, body: req.body, status: reply.statusCode }).catch(
          (e) => req.log.error(e, "Gagal mencatat audit"),
        );
      }
    });

    r.get("/admin/wa/status", async () => ({
      whatsapp: cloud.configured,
      webhookAman: !!cfg.wa.appSecret && !!cfg.wa.verifyToken,
      ai: agent.aiReady,
      model: cfg.ai.model,
    }));

    r.get("/admin/wa/contacts", async () => {
      const { rows } = await db.query(
        `SELECT c.*, (SELECT count(*) FROM wa_transfers t WHERE t.wa_id = c.wa_id) AS kiriman
         FROM wa_contacts c ORDER BY last_message_at DESC LIMIT 200`,
      );
      return rows;
    });

    r.get("/admin/wa/contacts/:waId/messages", async (req) => {
      const { rows } = await db.query(
        "SELECT id, role, content, created_at FROM wa_messages WHERE wa_id = $1 ORDER BY id DESC LIMIT 200",
        [(req.params as any).waId],
      );
      return rows.reverse();
    });

    r.post("/admin/wa/contacts/:waId/send", async (req, reply) => {
      const waId = (req.params as any).waId as string;
      const text = String((req.body as any)?.text ?? "").trim();
      if (!text) return reply.code(400).send({ error: "Pesan kosong" });
      if (!waId.startsWith("uji:")) await cloud.sendText(waId, text);
      await agent.simpan(waId, "team", [{ type: "text", text }]);
      return { ok: true };
    });

    r.post("/admin/wa/contacts/:waId/handoff", async (req) => {
      const on = !!(req.body as any)?.on;
      await db.query("UPDATE wa_contacts SET handoff = $2 WHERE wa_id = $1", [(req.params as any).waId, on]);
      return { ok: true, handoff: on };
    });

    r.get("/admin/wa/transfers", async () => {
      const { rows } = await db.query(
        `SELECT t.*, c.name AS nama_pengirim, o.status AS status_qris, o.reference_no
         FROM wa_transfers t JOIN wa_contacts c ON c.wa_id = t.wa_id JOIN orders o ON o.id = t.order_id
         ORDER BY t.id DESC LIMIT 200`,
      );
      return rows;
    });

    r.post("/admin/wa/transfers/:id/dikirim", async (req, reply) => {
      const t = await agent.tandaiTerkirim(Number((req.params as any).id), req.actor ?? "admin", kirimTeks);
      return t ?? reply.code(409).send({ error: "Kiriman tidak ditemukan atau belum dibayar" });
    });

    // Uji coba bot dari dashboard tanpa WhatsApp. Percakapan disimpan dengan ID "uji:<pengguna>".
    r.post("/admin/wa/uji", async (req, reply) => {
      const text = String((req.body as any)?.pesan ?? "").trim();
      if (!text) return reply.code(400).send({ error: "Pesan kosong" });
      const waId = "uji:" + (req.actor ?? "admin");
      const keluar: { type: "text" | "image"; text?: string; caption?: string; dataUrl?: string }[] = [];
      await agent.handle({
        waId,
        name: "Uji coba",
        text,
        outbox: {
          text: async (t) => void keluar.push({ type: "text", text: t }),
          image: async (png, caption) => void keluar.push({ type: "image", caption, dataUrl: "data:image/png;base64," + png.toString("base64") }),
        },
      });
      return { waId, keluar };
    });

    r.post("/admin/wa/uji/reset", async (req) => {
      const waId = "uji:" + (req.actor ?? "admin");
      await db.query("DELETE FROM wa_messages WHERE wa_id = $1", [waId]);
      await db.query("UPDATE wa_contacts SET handoff = false WHERE wa_id = $1", [waId]);
      return { ok: true };
    });
  });

  async function kirimTeks(waId: string, text: string) {
    if (waId.startsWith("uji:") || !cloud.configured) return;
    await cloud.sendText(waId, text).catch((e) => app.log.error(e, "Gagal mengirim WhatsApp"));
  }

  return { kirimTeks };
}
