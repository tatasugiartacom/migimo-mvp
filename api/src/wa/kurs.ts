/** Kurs ilustrasi dan rumus biaya, sama dengan kalkulator di migimo.id (lib/negara.ts). */

export type KodeNegara = "JP" | "MY" | "SG" | "TH" | "KR" | "CN";

export const NEGARA: Record<KodeNegara, { nama: string; mataUang: string; simbol: string; kurs: number }> = {
  JP: { nama: "Jepang", mataUang: "JPY", simbol: "¥", kurs: 114 },
  MY: { nama: "Malaysia", mataUang: "MYR", simbol: "RM", kurs: 3800 },
  SG: { nama: "Singapura", mataUang: "SGD", simbol: "S$", kurs: 12700 },
  TH: { nama: "Thailand", mataUang: "THB", simbol: "฿", kurs: 500 },
  KR: { nama: "Korea Selatan", mataUang: "KRW", simbol: "₩", kurs: 12 },
  CN: { nama: "Tiongkok", mataUang: "CNY", simbol: "¥", kurs: 2300 },
};

/** Biaya kirim tetap dalam rupiah. */
export const BIAYA_RUPIAH = 228000;
/** Bagi hasil kurs: Rp50.000 per Rp5.700.000 diterima. */
export const RASIO_BAGI_HASIL = 50000 / 5700000;

export function rupiah(n: number) {
  return Math.round(n).toLocaleString("id-ID");
}

export interface Hitungan {
  negara: KodeNegara;
  namaNegara: string;
  mataUang: string;
  kurs: number;
  kirim: number;
  terimaRupiah: number;
  biayaAsal: number;
  biayaRupiah: number;
  totalAsal: number;
  /** Nominal QRIS yang dibayar (rupiah) = diterima keluarga + biaya. */
  totalRupiah: number;
  bagiHasilRupiah: number;
  bagiHasilAsal: number;
}

/** Hitung dari nominal kirim (mata uang asal) atau dari nominal yang diterima (rupiah). */
export function hitung(kode: KodeNegara, p: { kirim?: number; terima?: number }): Hitungan {
  const n = NEGARA[kode];
  if (!n) throw new Error("Negara tidak dilayani");
  const kirim = p.kirim !== undefined ? Math.round(p.kirim) : Math.round((p.terima ?? 0) / n.kurs);
  const terimaRupiah = p.kirim !== undefined ? kirim * n.kurs : Math.round(p.terima ?? 0);
  const biayaAsal = Math.round(BIAYA_RUPIAH / n.kurs);
  return {
    negara: kode,
    namaNegara: n.nama,
    mataUang: n.mataUang,
    kurs: n.kurs,
    kirim,
    terimaRupiah,
    biayaAsal,
    biayaRupiah: BIAYA_RUPIAH,
    totalAsal: kirim + biayaAsal,
    totalRupiah: terimaRupiah + BIAYA_RUPIAH,
    bagiHasilRupiah: Math.round(terimaRupiah * RASIO_BAGI_HASIL),
    bagiHasilAsal: Math.round(biayaAsal / 2),
  };
}
