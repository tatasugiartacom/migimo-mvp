import { createHmac, timingSafeEqual } from "node:crypto";
import type { Config } from "../config.js";

/** Klien WhatsApp Cloud API (Meta). Dokumentasi: developers.facebook.com/docs/whatsapp/cloud-api */
export class WhatsAppCloud {
  constructor(
    private cfg: Config["wa"],
    private fetchImpl: typeof fetch = fetch,
  ) {}

  get configured() {
    return !!(this.cfg.phoneNumberId && this.cfg.accessToken);
  }

  private url(p: string) {
    return `${this.cfg.graphBaseUrl}/${this.cfg.graphVersion}/${p}`;
  }

  private async post(p: string, body: BodyInit, json: boolean) {
    const r = await this.fetchImpl(this.url(p), {
      method: "POST",
      headers: { Authorization: `Bearer ${this.cfg.accessToken}`, ...(json ? { "Content-Type": "application/json" } : {}) },
      body,
    });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`WhatsApp API ${r.status}: ${data?.error?.message ?? "gagal"}`);
    return data;
  }

  private send(msg: Record<string, unknown>) {
    return this.post(
      `${this.cfg.phoneNumberId}/messages`,
      JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", ...msg }),
      true,
    );
  }

  async sendText(to: string, text: string): Promise<string | undefined> {
    const d = await this.send({ to, type: "text", text: { body: text, preview_url: false } });
    return d?.messages?.[0]?.id;
  }

  /** Unggah gambar PNG ke Meta, lalu kirim sebagai pesan gambar. */
  async sendImage(to: string, png: Buffer, caption?: string): Promise<string | undefined> {
    const form = new FormData();
    form.append("messaging_product", "whatsapp");
    form.append("type", "image/png");
    form.append("file", new Blob([new Uint8Array(png)], { type: "image/png" }), "qris.png");
    const media = await this.post(`${this.cfg.phoneNumberId}/media`, form, false);
    const d = await this.send({ to, type: "image", image: { id: media.id, ...(caption ? { caption } : {}) } });
    return d?.messages?.[0]?.id;
  }

  async markRead(messageId: string) {
    await this.post(
      `${this.cfg.phoneNumberId}/messages`,
      JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: messageId }),
      true,
    ).catch(() => {});
  }
}

/** Verifikasi header X-Hub-Signature-256 dari Meta (HMAC-SHA256 body mentah dengan App Secret). */
export function verifyMetaSignature(appSecret: string, rawBody: string, header: string | undefined) {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex"));
  const got = Buffer.from(header.slice(7));
  return expected.length === got.length && timingSafeEqual(expected, got);
}
