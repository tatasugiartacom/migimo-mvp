"use client";

import { useState } from "react";
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

export function Kalkulator() {
  const [kode, setKode] = useState<KodeNegara>("JP");
  // Kolom yang terakhir diketik jadi sumber; kolom lainnya dihitung dari kurs.
  const [sumber, setSumber] = useState<"kirim" | "terima">("kirim");
  const [kirimInput, setKirimInput] = useState(NEGARA[0].nominalAwal);
  const [terimaInput, setTerimaInput] = useState(0);
  const [cara, setCara] = useState("Rekening bank");

  const n = NEGARA.find((x) => x.kode === kode) ?? NEGARA[0];
  const kirim = sumber === "kirim" ? kirimInput : Math.round(terimaInput / n.kurs);
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

  const kotak = "rounded-[22px] border border-[#E1DED6] px-5 py-3.5 flex flex-col gap-1";
  const label = "text-[15px] font-semibold text-abu";
  const input =
    "min-w-0 grow h-10 border-none bg-transparent font-[inherit] text-[26px] font-bold text-teks outline-none";

  return (
    <div className="w-full basis-[460px] shrink grow-0 rounded-[36px] border border-garis bg-white p-7 flex flex-col gap-3.5 shadow-[0_24px_60px_rgba(20,32,14,0.08)] max-[1040px]:grow">
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
            setKirimInput(baru.nominalAwal);
          }}
          className="min-w-0 grow h-14 border-none bg-transparent font-[inherit] text-[19px] font-semibold text-teks outline-none cursor-pointer"
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
          <input
            id="nominal"
            inputMode="numeric"
            autoComplete="off"
            value={rupiah(kirim)}
            onChange={(e) => {
              setSumber("kirim");
              setKirimInput(Math.min(angka(e.target.value), MAKS_KIRIM));
            }}
            className={input}
          />
          <span className="flex items-center gap-2 text-[17px] font-bold">
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
          <input
            id="terima"
            inputMode="numeric"
            autoComplete="off"
            value={rupiah(terima)}
            onChange={(e) => {
              setSumber("terima");
              setTerimaInput(Math.min(angka(e.target.value), MAKS_TERIMA));
            }}
            className={input}
          />
          <span className="flex items-center gap-2 text-[17px] font-bold">
            <Bendera kode="ID" size={22} />
            IDR
          </span>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#E1DED6] px-5 py-3.5 flex flex-col gap-0.5 focus-within:border-hijau">
        <label htmlFor="cara" className={label}>
          Diterima lewat
        </label>
        <select
          id="cara"
          value={cara}
          onChange={(e) => setCara(e.target.value)}
          className="h-10 border-none bg-transparent p-0 font-[inherit] text-[22px] font-bold text-teks outline-none cursor-pointer"
        >
          <option>Rekening bank</option>
          <option>E-wallet</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-2.5 rounded-xl bg-oranye px-3.5 py-2.5 text-[15px] font-bold">
        <span>Kurs ilustrasi</span>
        <span>
          1 {n.mataUang} = Rp{rupiah(n.kurs)}
        </span>
      </div>

      <div className="rounded-[18px] bg-panel px-4 py-3.5 flex flex-col gap-2.5 text-[15px]">
        <div className="flex justify-between">
          <span className="text-abu">Biaya kirim</span>
          <span className="font-semibold">
            {n.simbol}
            {rupiah(biaya)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-abu">Total bayar</span>
          <span className="font-semibold">
            {n.simbol}
            {rupiah(total)}
          </span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-t border-[#E1DED6] pt-2.5">
          <span className="font-bold">Bagi hasil untukmu</span>
          <span className="font-extrabold text-hijau">
            Rp{rupiah(bagiRupiah)} + {n.simbol}
            {rupiah(bagiAsal)}
          </span>
        </div>
      </div>

      <a
        href={linkWhatsApp(pesan)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-[60px] items-center justify-center gap-2.5 rounded-full bg-hijau-tua text-lg font-bold text-white no-underline hover:bg-[#2A441D] hover:text-white"
      >
        <IkonWhatsApp size={22} />
        Lanjut di WhatsApp
      </a>
      <p className="m-0 text-center text-[13px] leading-normal text-[#5C6356]">
        Kurs berubah sepanjang hari. Angka final tampil di chat sebelum kamu bayar.
      </p>
    </div>
  );
}
