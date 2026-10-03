import type { Db } from "./db.js";

function wibParts(d = new Date()) {
  const w = new Date(d.getTime() + 7 * 3600 * 1000).toISOString();
  return {
    yyyymmdd: w.slice(0, 10).replace(/-/g, ""),
    hhmmss: w.slice(11, 19).replace(/:/g, ""),
  };
}

/** Tanggal transaksi WIB, format YYYYMMDD (dipakai originalTransactionDate). */
export function transactionDateWib(d = new Date()) {
  return wibParts(d).yyyymmdd;
}

/** X-EXTERNAL-ID: tepat 15 digit, unik per hari → YYMMDD + 9 digit urutan. */
export async function nextExternalId(db: Db, d = new Date()) {
  const { rows } = await db.query<{ n: string }>("SELECT nextval('mti_external_id_seq') AS n");
  const seq = (BigInt(rows[0].n) % 1_000_000_000n).toString().padStart(9, "0");
  return wibParts(d).yyyymmdd.slice(2) + seq;
}

/** partnerReferenceNo: tepat 20 digit → YYYYMMDDHHMMSS + 6 digit urutan. */
export async function nextPartnerReferenceNo(db: Db, d = new Date()) {
  const { rows } = await db.query<{ n: string }>("SELECT nextval('mti_partner_ref_seq') AS n");
  const seq = (BigInt(rows[0].n) % 1_000_000n).toString().padStart(6, "0");
  const p = wibParts(d);
  return p.yyyymmdd + p.hhmmss + seq;
}

/** Format nominal MTI: string dengan 2 desimal, mis. "100000.00". */
export function money(n: number | string) {
  return Number(n).toFixed(2);
}
