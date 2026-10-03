export type KodeNegara = "JP" | "MY" | "SG" | "TH" | "KR" | "CN";

export type Negara = {
  kode: KodeNegara;
  nama: string;
  mataUang: string;
  simbol: string;
  /** Kurs ilustrasi: Rp per 1 unit mata uang asal */
  kurs: number;
  /** Nominal awal saat negara dipilih */
  nominalAwal: number;
  namaKurs: string;
};

export const NEGARA: Negara[] = [
  { kode: "JP", nama: "Jepang", mataUang: "JPY", simbol: "¥", kurs: 114, nominalAwal: 50000, namaKurs: "Yen" },
  { kode: "MY", nama: "Malaysia", mataUang: "MYR", simbol: "RM", kurs: 3800, nominalAwal: 1500, namaKurs: "Ringgit" },
  { kode: "SG", nama: "Singapura", mataUang: "SGD", simbol: "S$", kurs: 12700, nominalAwal: 500, namaKurs: "Dolar Singapura" },
  { kode: "TH", nama: "Thailand", mataUang: "THB", simbol: "฿", kurs: 500, nominalAwal: 12000, namaKurs: "Baht" },
  { kode: "KR", nama: "Korea Selatan", mataUang: "KRW", simbol: "₩", kurs: 12, nominalAwal: 500000, namaKurs: "Won" },
  { kode: "CN", nama: "Tiongkok", mataUang: "CNY", simbol: "¥", kurs: 2300, nominalAwal: 2500, namaKurs: "Yuan" },
];

export const NOMOR_WA = "[NOMOR_MIGIMO]";

export function linkWhatsApp(pesan?: string) {
  const dasar = `https://wa.me/${NOMOR_WA}`;
  return pesan ? `${dasar}?text=${encodeURIComponent(pesan)}` : dasar;
}

/** Biaya kirim tetap dalam rupiah, dikonversi ke mata uang asal */
export const BIAYA_RUPIAH = 228000;
/** Rasio bagi hasil kurs: Rp50.000 per Rp5.700.000 diterima */
export const RASIO_BAGI_HASIL = 50000 / 5700000;

export function rupiah(n: number) {
  return Math.round(n).toLocaleString("id-ID");
}
