import { createPublicKey, generateKeyPairSync } from "node:crypto";
import type { Config } from "./config.js";
import { MtiSimulator } from "./mti/simulator.js";

export function keypair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
}

/** Mode simulator: klien MTI memanggil simulator di server yang sama. */
export function setupSimulator(cfg: Config, port: number) {
  const m = cfg.mti;
  m.clientKey ||= "sim-client-key";
  m.clientSecret ||= "sim-client-secret";
  m.partnerId ||= "MIGIMO-SIM";
  m.merchantId ||= "000071000000001";
  m.terminalId ||= "73000001";
  m.privateKey ||= keypair().privateKey;
  const simKeys = keypair();
  m.mtiPublicKey = simKeys.publicKey;
  m.baseUrl = `http://127.0.0.1:${port}/sim`;
  m.timeoutMs = Math.min(m.timeoutMs, 3000);
  return new MtiSimulator({
    clientKey: m.clientKey,
    clientSecret: m.clientSecret,
    merchantId: m.merchantId,
    terminalId: m.terminalId,
    migimoPublicKey: createPublicKey(m.privateKey).export({ type: "spki", format: "pem" }) as string,
    simPrivateKey: simKeys.privateKey,
    notifyUrl: `http://127.0.0.1:${port}${m.paths.notify}`,
    notifyPath: m.paths.notify,
    timeoutAmount: "99999.00",
    timeoutDelayMs: m.timeoutMs + 1500,
  });
}

