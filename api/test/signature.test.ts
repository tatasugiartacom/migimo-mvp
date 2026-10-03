import { test } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import {
  bodyHash,
  minify,
  notifyStringToSign,
  signRsa,
  symmetricSignature,
  symmetricStringToSign,
  tokenSignature,
  verifyRsa,
  timestampWib,
} from "../src/mti/signature.ts";

// Contoh dari dokumen MTI QR Payment v1.0.11 bagian 2.4.1
const contohBody =
  '{"partnerReferenceNo":"22111029000000003108","amount":{"value":"10000.00","currency":"IDR"},"feeAmount":{"value":"0.00","currency":"IDR"},"merchantId":"000071000247508","terminalId":"73003514"}';

test("hash body sama dengan contoh dokumen MTI", () => {
  assert.equal(bodyHash(contohBody), "56698e3d920273e0c18478cf04c0711bfc9cd4f6642f0dd95e3dfd99b15fabf0");
});

test("minify mempertahankan urutan key dan membuang spasi", () => {
  assert.equal(minify('{ "b": 1,\n "a": { "x": "y" } }'), '{"b":1,"a":{"x":"y"}}');
});

test("format stringToSign dan base64 HMAC-SHA512", () => {
  const s = symmetricStringToSign({
    method: "post",
    endpointUrl: "/v2.0/qr/qr-mpm-generate",
    accessToken: "TOKEN",
    body: contohBody,
    timestamp: "2024-03-07T09:21:46+07:00",
  });
  assert.equal(
    s,
    "POST:/v2.0/qr/qr-mpm-generate:TOKEN:56698e3d920273e0c18478cf04c0711bfc9cd4f6642f0dd95e3dfd99b15fabf0:2024-03-07T09:21:46+07:00",
  );
  const sig = symmetricSignature("secret", s);
  assert.equal(Buffer.from(sig, "base64").length, 64);
});

test("dokumen: base64 dari HMAC hex contoh cocok dengan nilai Base64 contoh", () => {
  // Memastikan output yang diharapkan MTI adalah base64 dari byte mentah HMAC, bukan base64 dari string hex.
  const hex =
    "3fa385ca2381b9ceee725fb6dca7eb279beec956acc8d4e80d05a9ceabe17c0ee22e84f1f76cd933822d8b35b462bd85638d213f78efb6be5ff3406da3372983";
  assert.equal(
    Buffer.from(hex, "hex").toString("base64"),
    "P6OFyiOBuc7ucl+23KfrJ5vuyVasyNToDQWpzqvhfA7iLoTx92zZM4ItizW0Yr2FY40hP3jvtr5f80Btozcpgw==",
  );
});

test("RSA: tanda tangan token dan notify bisa diverifikasi dengan kunci publik", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
    publicKeyEncoding: { type: "spki", format: "pem" },
  });
  const ts = "2022-01-10T07:05:00+07:00";
  const sig = tokenSignature(privateKey, "client-key", ts);
  assert.ok(verifyRsa(publicKey, `client-key|${ts}`, sig));
  const data = notifyStringToSign("POST", "/qr/qr-mpm-notify", { a: 1 }, ts);
  assert.ok(verifyRsa(publicKey, data, signRsa(privateKey, data)));
  assert.ok(!verifyRsa(publicKey, data + "x", signRsa(privateKey, data)));
});

test("timestamp WIB", () => {
  assert.equal(timestampWib(new Date("2024-03-07T02:21:46.123Z")), "2024-03-07T09:21:46+07:00");
});

// Uji HMAC lengkap memakai contoh token + secret dari dokumen MTI (dokumen rahasia, jadi nilainya
// tidak disimpan di repo). Set MTI_DOC_TOKEN_FILE dan MTI_DOC_SECRET untuk menjalankannya.
test("HMAC lengkap identik dengan contoh dokumen MTI", { skip: !process.env.MTI_DOC_TOKEN_FILE }, async () => {
  const { readFileSync } = await import("node:fs");
  const token = readFileSync(process.env.MTI_DOC_TOKEN_FILE!, "utf8").trim();
  const s = symmetricStringToSign({
    method: "POST",
    endpointUrl: "/v2.0/qr/qr-mpm-generate",
    accessToken: token,
    body: contohBody,
    timestamp: "2024-03-07T09:21:46+07:00",
  });
  assert.equal(
    symmetricSignature(process.env.MTI_DOC_SECRET!, s),
    "P6OFyiOBuc7ucl+23KfrJ5vuyVasyNToDQWpzqvhfA7iLoTx92zZM4ItizW0Yr2FY40hP3jvtr5f80Btozcpgw==",
  );
});
