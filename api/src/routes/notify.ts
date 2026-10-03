import type { FastifyInstance } from "fastify";
import type { Config } from "../config.js";
import type { MtiClient } from "../mti/client.js";
import { notifyStringToSign, timestampWib, verifyRsa } from "../mti/signature.js";
import type { Payments } from "../payments.js";

/** 3.6 QR Payment Credit Notify: MTI memanggil endpoint ini saat pembayaran QR terjadi. */
export function notifyRoutes(app: FastifyInstance, deps: { cfg: Config; mti: MtiClient; payments: Payments }) {
  const { cfg, mti, payments } = deps;
  const path = cfg.mti.paths.notify;

  app.post(path, async (req, reply) => {
    const raw = (req as any).rawBody as string | undefined;
    const h = req.headers as Record<string, string | undefined>;
    const ts = h["x-timestamp"] ?? "";
    const sig = h["x-signature"] ?? "";
    const externalId = h["x-external-id"] ?? "";

    let verified = false;
    if (cfg.mti.mtiPublicKey && raw) {
      verified = verifyRsa(cfg.mti.mtiPublicKey, notifyStringToSign("POST", path, raw, ts), sig);
    }

    let result: { httpStatus: number; responseCode: string; responseMessage: string; orderId?: number };
    if (!verified && cfg.mti.notifyVerify === "strict") {
      result = { httpStatus: 401, responseCode: "4015200", responseMessage: "Unauthorized. Invalid Signature" };
    } else {
      result = await payments.applyNotify(req.body);
    }

    const resBody = { responseCode: result.responseCode, responseMessage: result.responseMessage };
    const resHeaders = {
      "Content-Type": "application/json",
      "X-TIMESTAMP": timestampWib(),
      "X-EXTERNAL-ID": externalId,
      "X-PARTNER-ID": h["x-partner-id"] ?? cfg.mti.partnerId,
    };

    await mti.log({
      direction: "in",
      api: "notify",
      scenario: h["x-migimo-scenario"],
      orderId: result.orderId,
      method: "POST",
      url: path,
      requestHeaders: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, String(v)])),
      requestBody: raw ?? "",
      httpStatus: result.httpStatus,
      responseHeaders: resHeaders,
      responseBody: JSON.stringify(resBody),
      responseCode: result.responseCode,
      error: verified ? null : "Tanda tangan notify tidak terverifikasi",
    });

    reply.code(result.httpStatus).headers(resHeaders).send(resBody);
  });
}
