import type { Config } from "../config.js";
import type { Db } from "../db.js";
import { nextExternalId } from "../ids.js";
import { minify, symmetricSignature, symmetricStringToSign, timestampWib, tokenSignature } from "./signature.js";

export type MtiApi = "token" | "generate" | "query" | "cancel";

export interface MtiResult<T = any> {
  ok: boolean;
  httpStatus: number | null;
  responseCode: string | null;
  body: T | null;
  externalId: string | null;
  timedOut: boolean;
  error: string | null;
  logId: number;
}

export interface CallOpts {
  scenario?: string;
  orderId?: number;
  /** Override X-EXTERNAL-ID (untuk skenario UAT duplikat/panjang salah). */
  externalId?: string;
}

const SUCCESS: Record<MtiApi, string> = {
  token: "2007300",
  generate: "2004700",
  query: "2005100",
  cancel: "2007700",
};

function redactHeaders(h: Record<string, string>) {
  const out = { ...h };
  if (out.Authorization) out.Authorization = out.Authorization.slice(0, 20) + "…";
  return out;
}

export class MtiClient {
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private cfg: Config,
    private db: Db,
    private fetchImpl: typeof fetch = fetch,
  ) {}

  get merchantId() {
    return this.cfg.mti.merchantId;
  }
  get terminalId() {
    return this.cfg.mti.terminalId;
  }

  async log(entry: {
    direction: "in" | "out";
    api: string;
    scenario?: string;
    orderId?: number;
    method: string;
    url: string;
    requestHeaders?: Record<string, string>;
    requestBody?: string;
    httpStatus?: number | null;
    responseHeaders?: Record<string, string>;
    responseBody?: string;
    responseCode?: string | null;
    durationMs?: number;
    error?: string | null;
  }): Promise<number> {
    const { rows } = await this.db.query<{ id: string }>(
      `INSERT INTO mti_logs (direction, api, scenario, order_id, method, url, request_headers, request_body,
         http_status, response_headers, response_body, response_code, duration_ms, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
      [
        entry.direction,
        entry.api,
        entry.scenario ?? null,
        entry.orderId ?? null,
        entry.method,
        entry.url,
        entry.requestHeaders ? JSON.stringify(entry.requestHeaders) : null,
        entry.requestBody ?? null,
        entry.httpStatus ?? null,
        entry.responseHeaders ? JSON.stringify(entry.responseHeaders) : null,
        entry.responseBody ?? null,
        entry.responseCode ?? null,
        entry.durationMs ?? null,
        entry.error ?? null,
      ],
    );
    return Number(rows[0].id);
  }

  private async send(
    api: MtiApi,
    path: string,
    headers: Record<string, string>,
    body: string,
    opts: CallOpts,
    externalId: string | null,
  ): Promise<MtiResult> {
    const url = this.cfg.mti.baseUrl + path;
    const started = Date.now();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.cfg.mti.timeoutMs);
    let httpStatus: number | null = null;
    let text = "";
    let resHeaders: Record<string, string> = {};
    let error: string | null = null;
    let timedOut = false;
    try {
      const res = await this.fetchImpl(url, { method: "POST", headers, body, signal: ctrl.signal });
      httpStatus = res.status;
      text = await res.text();
      resHeaders = Object.fromEntries(res.headers.entries());
    } catch (e: any) {
      timedOut = e?.name === "AbortError";
      error = timedOut ? `Timeout setelah ${this.cfg.mti.timeoutMs} ms` : String(e?.message ?? e);
    } finally {
      clearTimeout(timer);
    }
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    const responseCode = parsed?.responseCode ?? null;
    const logId = await this.log({
      direction: "out",
      api,
      scenario: opts.scenario,
      orderId: opts.orderId,
      method: "POST",
      url,
      requestHeaders: redactHeaders(headers),
      requestBody: body,
      httpStatus,
      responseHeaders: resHeaders,
      responseBody: text,
      responseCode,
      durationMs: Date.now() - started,
      error,
    });
    return {
      ok: responseCode === SUCCESS[api],
      httpStatus,
      responseCode,
      body: parsed,
      externalId,
      timedOut,
      error,
      logId,
    };
  }

  /** 3.2 Get Authentication Token (token di-cache sampai 60 detik sebelum kedaluwarsa). */
  async getToken(opts: CallOpts = {}): Promise<string> {
    if (this.token && Date.now() < this.token.expiresAt - 60_000) return this.token.value;
    const { clientKey, privateKey } = this.cfg.mti;
    if (!clientKey || !privateKey) throw new Error("MTI_CLIENT_KEY dan MTI_PRIVATE_KEY wajib diisi");
    const ts = timestampWib();
    const headers = {
      "Content-Type": "application/json",
      "X-TIMESTAMP": ts,
      "X-CLIENT-KEY": clientKey,
      "X-SIGNATURE": tokenSignature(privateKey, clientKey, ts),
    };
    const body = minify({ grantType: "client_credentials" });
    const r = await this.send("token", this.cfg.mti.paths.token, headers, body, opts, null);
    if (!r.ok || !r.body?.accessToken) {
      throw new Error(`Gagal mendapatkan token MTI (${r.responseCode ?? r.httpStatus ?? r.error})`);
    }
    const ttl = Number(r.body.expiresIn ?? 900) * 1000;
    this.token = { value: r.body.accessToken, expiresAt: Date.now() + ttl };
    return this.token.value;
  }

  /** Panggilan layanan bertanda tangan HMAC (generate/query/cancel). */
  async call(api: Exclude<MtiApi, "token">, bodyObj: object, opts: CallOpts = {}): Promise<MtiResult> {
    const token = await this.getToken({ scenario: opts.scenario });
    const path = this.cfg.mti.paths[api];
    const ts = timestampWib();
    const body = minify(bodyObj);
    const externalId = opts.externalId ?? (await nextExternalId(this.db));
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-TIMESTAMP": ts,
      "X-SIGNATURE": symmetricSignature(
        this.cfg.mti.clientSecret,
        symmetricStringToSign({ method: "POST", endpointUrl: path, accessToken: token, body, timestamp: ts }),
      ),
      "X-EXTERNAL-ID": externalId,
      "X-PARTNER-ID": this.cfg.mti.partnerId,
      "CHANNEL-ID": this.cfg.mti.channelId,
    };
    return this.send(api, path, headers, body, opts, externalId);
  }

  /** Paksa minta token baru (mis. setelah 401). */
  resetToken() {
    this.token = null;
  }
}
