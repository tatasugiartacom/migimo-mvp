import { createHash, createHmac, createSign, createVerify } from "node:crypto";

/** Minify JSON tanpa mengubah urutan key (sesuai "minify(RequestBody)" di dokumen MTI). */
export function minify(body: string | object): string {
  if (typeof body === "string") return body.trim() === "" ? "" : JSON.stringify(JSON.parse(body));
  return JSON.stringify(body);
}

export function bodyHash(body: string | object): string {
  return createHash("sha256").update(minify(body), "utf8").digest("hex").toLowerCase();
}

/**
 * Signature simetris untuk layanan (2.4.1):
 * base64(HMAC_SHA512(clientSecret, METHOD:EndpointUrl:AccessToken:lower(hex(sha256(minify(body)))):Timestamp))
 */
export function symmetricStringToSign(p: {
  method: string;
  endpointUrl: string;
  accessToken: string;
  body: string | object;
  timestamp: string;
}): string {
  return `${p.method.toUpperCase()}:${p.endpointUrl}:${p.accessToken}:${bodyHash(p.body)}:${p.timestamp}`;
}

export function symmetricSignature(clientSecret: string, stringToSign: string): string {
  return createHmac("sha512", clientSecret).update(stringToSign, "utf8").digest("base64");
}

/** Signature asimetris untuk Get Token (3.2.3): SHA256withRSA(privateKey, clientKey + "|" + timestamp), base64. */
export function tokenSignature(privateKeyPem: string, clientKey: string, timestamp: string): string {
  return createSign("RSA-SHA256").update(`${clientKey}|${timestamp}`, "utf8").sign(privateKeyPem, "base64");
}

/** stringToSign untuk QR Payment Credit Notify (3.6.4): METHOD:EndpointUrl:lower(hex(sha256(minify(body)))):Timestamp */
export function notifyStringToSign(method: string, endpointUrl: string, body: string | object, timestamp: string) {
  return `${method.toUpperCase()}:${endpointUrl}:${bodyHash(body)}:${timestamp}`;
}

export function signRsa(privateKeyPem: string, data: string): string {
  return createSign("RSA-SHA256").update(data, "utf8").sign(privateKeyPem, "base64");
}

export function verifyRsa(publicKeyPem: string, data: string, signatureB64: string): boolean {
  try {
    return createVerify("RSA-SHA256").update(data, "utf8").verify(publicKeyPem, signatureB64, "base64");
  } catch {
    return false;
  }
}

/** X-TIMESTAMP format ISO-8601 dengan zona WIB, mis. 2024-03-07T09:21:46+07:00 */
export function timestampWib(d = new Date()): string {
  const wib = new Date(d.getTime() + 7 * 3600 * 1000);
  return wib.toISOString().slice(0, 19) + "+07:00";
}
