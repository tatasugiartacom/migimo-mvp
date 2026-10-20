"use client";

import { useEffect, useState } from "react";
import { Bendera } from "./Bendera";
import { IkonWhatsApp } from "./Ikon";
import {
  BIAYA_RUPIAH,
  NEGARA,
  RASIO_BAGI_HASIL,
  linkWhatsApp,
  rupiah,
  type KodeNegara,
} from "@/lib/negara";

const MAKS_KIRIM = 100_000_000;
const MAKS_TERIMA = 1_000_000_000_000;

function angka(teks: string) {
  return parseInt(teks.replace(/\D/g, ""), 10) || 0;
}

/** Mengetik `teks` huruf demi huruf, berhenti sejenak, menghapus, lalu mengulang. */
function useKetikan(teks: string, aktif: boolean) {
  const [n, setN] = useState(0);
  const [hapus, setHapus] = useState(false);
  const [diam, setDiam] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setDiam(m.matches);
    const ubah = () => setDiam(m.matches);
    m.addEventListener("change", ubah);
    return () => m.removeEventListener("change", ubah);
  }, []);

  useEffect(() => {
    setN(0);
    setHapus(false);
  }, [teks, aktif]);

  useEffect(() => {
    if (!aktif || diam) return;
    const penuh = n === teks.length;
    const jeda = hapus ? (n === 0 ? 500 : 45) : penuh ? 1600 : n === 0 ? 400 : 110;
    const t = setTimeout(() => {
      if (!hapus && penuh) setHapus(true);
      else if (hapus && n === 0) setHapus(false);
      else setN((x) => x + (hapus ? -1 : 1));
    }, jeda);
    return () => clearTimeout(t);
  }, [n, hapus, aktif, diam, teks]);

  return diam ? teks : teks.slice(0, n);
}

export function Kalkulator() {
  const [kode, setKode] = useState<KodeNegara>("JP");
  // Kolom yang terakhir diketik jadi sumber; kolom lainnya dihitung dari kurs.
  const [sumber, setSumber] = useState<"kirim" | "terima">("kirim");
  // 0 = belum diisi: kolom menampilkan contoh nominal yang "diketik" untuk mengajak pengunjung mengisi.
  const [kirimInput, setKirimInput] = useState(0);
  const [fokus, setFokus] = useState(false);
  const [fokusTerima, setFokusTerima] = useState(false);
  const [terimaInput, setTerimaInput] = useState(0);
  const [cara, setCara] = useState("Rekening bank");

  const n = NEGARA.find((x) => x.kode === kode) ?? NEGARA[0];
  const kosong = sumber === "kirim" && kirimInput === 0;
  const contoh = useKetikan(rupiah(n.nominalAwal), kosong && !fokus);
  // Contoh nominal diterima baru tampil setelah contoh nominal kirim selesai "diketik": sebab lalu akibat.
  const contohTerimaTampil = fokus || contoh === rupiah(n.nominalAwal);
  // Selama kosong, rincian memakai contoh nominal agar kartu tetap menunjukkan gambaran hasilnya.
  const kirim = sumber === "kirim" ? kirimInput || n.nominalAwal : Math.round(terimaInput / n.kurs);
  const terima = sumber === "terima" ? terimaInput : kirim * n.kurs;

  const biaya = Math.round(BIAYA_RUPIAH / n.kurs);
  const total = kirim > 0 ? kirim + biaya : 0;
  const bagiRupiah = terima * RASIO_BAGI_HASIL;
  const bagiAsal = biaya / 2;

  const pesan = [
    "Halo Migimo, saya mau kirim uang.",
    "",
    `Negara asal: ${n.nama}`,
    `Nominal kirim: ${n.simbol}${rupiah(kirim)} (${n.mataUang})`,
    `Diterima keluarga: Rp${rupiah(terima)}`,
    `Diterima lewat: ${cara}`,
    `Kurs ilustrasi: 1 ${n.mataUang} = Rp${rupiah(n.kurs)}`,
    `Biaya kirim: ${n.simbol}${rupiah(biaya)}`,
    `Total bayar: ${n.simbol}${rupiah(total)}`,
    `Bagi hasil untuk saya: Rp${rupiah(bagiRupiah)} + ${n.simbol}${rupiah(bagiAsal)}`,
  ].join("\n");

  const kotak = "rounded-[16px] border border-[#E1DED6] px-5 py-3.5 flex flex-col gap-1";
  const label = "text-[15px] font-medium text-abu";
  const input =
    "min-w-0 grow h-10 border-none bg-transparent font-[inherit] text-[26px] font-semibold text-teks outline-none";

  return (
    <div className="w-full min-w-0 basis-[500px] shrink grow-0 rounded-[24px] border border-garis bg-white p-7 flex flex-col gap-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.05)] max-[1040px]:grow">
      <label htmlFor="asal" className={label}>
        Negara asal
      </label>
      <div className="flex items-center gap-3 h-[60px] rounded-full border border-[#E1DED6] px-5 focus-within:border-hijau">
        <Bendera kode={kode} size={26} />
        <select
          id="asal"
          value={kode}
          onChange={(e) => {
            const baru = NEGARA.find((x) => x.kode === e.target.value) ?? NEGARA[0];
            setKode(baru.kode);
            setSumber("kirim");
            setKirimInput(0);
          }}
          className="min-w-0 grow h-14 border-none bg-transparent font-[inherit] text-[19px] font-medium text-teks outline-none cursor-pointer"
        >
          {NEGARA.map((x) => (
            <option key={x.kode} value={x.kode}>
              Kirim dari {x.nama}
            </option>
          ))}
        </select>
      </div>

      <div className={`${kotak} focus-within:border-hijau`}>
        <label htmlFor="nominal" className={label}>
          Berapa yang mau kamu kirim?
        </label>
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 grow flex">
            <input
              id="nominal"
              inputMode="numeric"
              autoComplete="off"
              placeholder={kosong && fokus ? rupiah(n.nominalAwal) : undefined}
              aria-description={kosong ? `Contoh: ${rupiah(n.nominalAwal)} ${n.mataUang}` : undefined}
              value={kosong ? "" : rupiah(kirim)}
              onFocus={() => setFokus(true)}
              onBlur={() => setFokus(false)}
              onChange={(e) => {
                setSumber("kirim");
                setKirimInput(Math.min(angka(e.target.value), MAKS_KIRIM));
              }}
              className={`${input} placeholder:text-[#B7B3A8]`}
            />
            {kosong && !fokus && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[26px] font-semibold text-[#9A968B]"
              >
                {contoh}
                <span className="kursor-ketik" />
              </span>
            )}
          </div>
          <span className="flex items-center gap-2 text-[17px] font-semibold">
            <Bendera kode={kode} size={22} />
            {n.mataUang}
          </span>
        </div>
      </div>

      <div className={`${kotak} focus-within:border-hijau`}>
        <label htmlFor="terima" className={label}>
          Berapa yang diterima keluarga?
        </label>
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 grow flex">
            <input
              id="terima"
              inputMode="numeric"
              autoComplete="off"
              aria-description={kosong ? `Contoh: Rp${rupiah(terima)}` : undefined}
              value={kosong ? "" : rupiah(terima)}
              onFocus={() => setFokusTerima(true)}
              onBlur={() => setFokusTerima(false)}
              onChange={(e) => {
                setSumber("terima");
                setTerimaInput(Math.min(angka(e.target.value), MAKS_TERIMA));
              }}
              className={input}
            />
            {kosong && !fokusTerima && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-[26px] font-semibold text-[#9A968B] transition-opacity duration-300 ${
                  contohTerimaTampil ? "opacity-100" : "opacity-0"
                }`}
              >
                {rupiah(terima)}
              </span>
            )}
          </div>
          <span className="flex items-center gap-2 text-[17px] font-semibold">
            <Bendera kode="ID" size={22} />
            IDR
          </span>
        </div>
      </div>

      <div className="rounded-[16px] border border-[#E1DED6] px-5 py-3.5 flex flex-col gap-0.5 focus-within:border-hijau">
        <label htmlFor="cara" className={label}>
          Diterima lewat
        </label>
        <select
          id="cara"
          value={cara}
          onChange={(e) => setCara(e.target.value)}
          className="h-10 border-none bg-transparent p-0 font-[inherit] text-[22px] font-semibold text-teks outline-none cursor-pointer"
        >
          <option>Rekening bank</option>
          <option>E-wallet</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-2.5 rounded-xl bg-oranye px-3.5 py-2.5 text-[15px] font-semibold">
        <span>Kurs ilustrasi</span>
        <span>
          1 {n.mataUang} = Rp{rupiah(n.kurs)}
        </span>
      </div>

      <div className="rounded-[14px] bg-panel px-4 py-3.5 flex flex-col gap-2.5 text-[15px]">
        <div className="flex justify-between">
          <span className="text-abu">Biaya kirim</span>
          <span className="font-medium">
            {n.simbol}
            {rupiah(biaya)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-abu">Total bayar</span>
          <span className="font-medium">
            {n.simbol}
            {rupiah(total)}
          </span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-[#E1DED6] pt-2.5">
          <span className="font-semibold">Bagi hasil untukmu</span>
          <span className="font-semibold text-hijau">
            Rp{rupiah(bagiRupiah)} + {n.simbol}
            {rupiah(bagiAsal)}
          </span>
        </div>
      </div>

      <a
        href={linkWhatsApp(pesan)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-[60px] items-center justify-center gap-2.5 rounded-full bg-hijau-tua text-lg font-medium text-white no-underline hover:bg-[#2A441D] hover:text-white"
      >
        <IkonWhatsApp size={22} />
        Lanjut di WhatsApp
      </a>
      <p className="m-0 text-center text-[13px] leading-normal text-[#5C6356]">
        Kurs dan bagi hasil bersifat ilustrasi. Kurs berubah sepanjang hari; angka final tampil di chat sebelum
        kamu bayar.
      </p>
    </div>
  );
}
