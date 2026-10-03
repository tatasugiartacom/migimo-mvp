import Image from "next/image";
import { Bendera } from "@/components/Bendera";
import {
  IkonBawah,
  IkonCentang,
  IkonFacebook,
  IkonHadiah,
  IkonInstagram,
  IkonOrang,
  IkonPanah,
  IkonPanahBesar,
  IkonThreads,
  IkonWhatsApp,
  IkonX,
  IkonYouTube,
  TandaMigimo,
} from "@/components/Ikon";
import { Kalkulator } from "@/components/Kalkulator";
import { NEGARA, NOMOR_WA, linkWhatsApp } from "@/lib/negara";

const WA = linkWhatsApp("Halo Migimo, saya mau kirim uang.");
const waProps = { href: WA, target: "_blank", rel: "noopener noreferrer" } as const;

const wadah = "mx-auto max-w-[1180px] px-6";
const tombolGelap =
  "self-start rounded-full bg-hijau-tua px-7 py-4 text-[17px] font-bold text-white no-underline hover:bg-[#2A441D] hover:text-white";
const judulBento =
  "m-0 text-[clamp(34px,3.8vw,52px)] leading-[1.04] font-extrabold tracking-[-0.03em]";

export default function Beranda() {
  return (
    <div className="bg-white text-teks">
      {/* Banner oranye */}
      <a
        href="#kirim"
        className="flex items-center justify-center gap-2.5 bg-oranye px-5 py-3 text-center text-[15px] font-bold text-teks no-underline hover:text-teks"
      >
        <IkonHadiah />
        Bagi hasil di setiap kiriman
        <IkonPanah />
      </a>

      {/* Navbar (sticky) */}
      <div className="sticky top-0 z-50 border-b border-garis/70 bg-white shadow-[0_1px_12px_rgba(20,32,14,0.06)]">
        <header className={`${wadah} flex items-center justify-between gap-4 py-3.5`}>
          <a href="/" aria-label="Migimo beranda" className="flex shrink-0">
            <LogoMigimo priority />
          </a>
          <nav className="flex items-center gap-x-7">
            {[
              ["Kirim uang", "#negara"],
              ["Kurs hari ini", "#kirim"],
              ["Tentang Migimo", "#cerita"],
            ].map(([teks, href]) => (
              <a
                key={teks}
                href={href}
                className="hidden items-center gap-1.5 py-2.5 text-base font-medium text-teks no-underline hover:text-hijau lg:flex"
              >
                {teks}
                <IkonBawah />
              </a>
            ))}
            <a
              {...waProps}
              className="flex items-center gap-2.5 rounded-full bg-hijau px-6 py-3.5 text-base font-bold whitespace-nowrap text-white no-underline hover:bg-[#3A5221] hover:text-white max-sm:px-5 max-sm:py-3"
            >
              <IkonWhatsApp size={20} />
              Mulai kirim
            </a>
          </nav>
        </header>
      </div>

      {/* Hero dua kolom + kalkulator */}
      <section
        id="kirim"
        className={`${wadah} flex scroll-mt-24 flex-wrap items-center justify-between gap-14 pt-14 pb-[88px]`}
      >
        <div className="flex grow shrink basis-[480px] flex-col gap-7 max-sm:basis-full">
          <div className="flex items-center gap-[18px]">
            <div className="flex size-[72px] items-center justify-center rounded-full bg-[#25D366] text-white">
              <IkonWhatsApp size={40} />
            </div>
            <span className="text-teks">
              <IkonPanahBesar />
            </span>
            <Bendera kode="ID" size={72} />
          </div>
          <h1 className="m-0 text-[clamp(44px,6vw,76px)] leading-[1.02] font-extrabold tracking-[-0.035em]">
            Semudah chat. Untungnya dibagi.
          </h1>
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {[
              "Tidak perlu aplikasi, cukup WhatsApp",
              "Bayar dengan QRIS Cross Border",
              "Separuh keuntungan kiriman kembali ke kamu",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3.5 text-xl">
                <IkonCentang />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <Kalkulator />
      </section>

      {/* Chip 6 negara */}
      <section className={`${wadah} pb-24`}>
        <ul className="m-0 flex list-none flex-wrap justify-center gap-3 p-0">
          {NEGARA.map((n) => (
            <li
              key={n.kode}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-2xl border border-garis px-5 py-3 text-base font-medium"
            >
              <Bendera kode={n.kode} size={26} />
              Kirim dari {n.nama}
            </li>
          ))}
        </ul>
      </section>

      {/* Panel Economic Sharing */}
      <section className={`${wadah} pb-6`}>
        <div className="flex flex-col items-center gap-[22px] rounded-[40px] bg-panel px-10 py-[88px] text-center max-sm:px-5 max-sm:py-16">
          <div className="text-[17px] font-bold text-[#B5401A]">Economic Sharing</div>
          <h2 className="m-0 max-w-[880px] text-[clamp(36px,5vw,64px)] leading-[1.05] font-extrabold tracking-[-0.03em]">
            Dengan Migimo, untung kirimanmu kembali ke kamu
          </h2>
          <p className="m-0 max-w-[640px] text-xl leading-normal text-abu">
            Setiap kiriman menghasilkan keuntungan dari kurs dan biaya kirim. Biasanya semua diambil penyedia. Di
            Migimo, separuhnya untukmu.
          </p>
          <div className="mt-6 grid w-full max-w-[820px] grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            <div className="flex flex-col gap-[18px] rounded-[28px] bg-white p-[30px] text-left">
              <div className="text-lg font-bold text-[#5C6356]">Biasanya</div>
              <div className="flex h-[52px] items-center rounded-[14px] bg-[#C9C5BA] px-[18px] text-[15px] font-bold text-teks">
                100% untuk penyedia
              </div>
              <div className="text-[15px] text-[#5C6356]">Pengirim tidak dapat apa-apa.</div>
            </div>
            <div className="flex flex-col gap-[18px] rounded-[28px] border-2 border-hijau bg-white p-[30px] text-left">
              <div className="text-lg font-bold text-hijau">Di Migimo</div>
              <div className="flex h-[52px] gap-1">
                <div className="flex flex-1 items-center rounded-l-[14px] bg-oranye px-4 text-[15px] font-extrabold">
                  Kamu 50%
                </div>
                <div className="flex flex-1 items-center rounded-r-[14px] bg-hijau px-4 text-[15px] font-bold text-white">
                  Migimo 50%
                </div>
              </div>
              <div className="text-[15px] text-[#5C6356]">Contoh: kirim ¥50.000, kamu dapat Rp50.000 + ¥1.000.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Kartu cerita pendiri */}
      <section id="cerita" className={`${wadah} flex scroll-mt-24 flex-wrap gap-6 pb-6`}>
        <div className="flex min-h-[520px] grow-[3] shrink basis-[520px] flex-col items-center justify-center gap-3.5 rounded-[40px] bg-hijau-tua p-8 text-center text-[#C9D6BC] max-sm:min-h-[360px] max-sm:basis-full">
          <IkonOrang />
          <div className="text-base font-semibold">[Foto Tata Sugiarta]</div>
        </div>
        <div className="box-border flex min-h-[520px] grow-[2] shrink basis-[380px] flex-col justify-center gap-[22px] rounded-[40px] bg-[#EEF3E8] px-12 py-14 max-sm:min-h-0 max-sm:basis-full max-sm:px-7">
          <h2 className="m-0 text-[clamp(36px,4.4vw,56px)] leading-[1.05] font-extrabold tracking-[-0.03em]">
            Dibuat oleh mantan PMI Jepang
          </h2>
          <p className="m-0 text-[19px] leading-[1.55] text-[#3A4234]">
            Tata Sugiarta bekerja di Jepang pada 2014–2017. Setiap bulan ia mengirim gaji ke rumah, dan keuntungan
            kiriman itu tidak pernah kembali ke pengirimnya. Migimo dibuat untuk mengubah itu.
          </p>
          <a {...waProps} className={tombolGelap}>
            Mulai kirim
          </a>
        </div>
      </section>

      {/* Bento 4 kartu */}
      <section className={`${wadah} flex flex-wrap gap-6 pb-6`}>
        <div className="box-border flex min-h-[440px] grow-[2] shrink basis-[420px] flex-col justify-center gap-[18px] rounded-[40px] border border-garis bg-white px-12 py-14 max-sm:min-h-0 max-sm:basis-full max-sm:px-7">
          <div className="text-base font-bold text-hijau">Mudah</div>
          <h3 className={judulBento}>Rincian jelas sebelum bayar</h3>
          <p className="m-0 text-[19px] leading-normal text-abu">
            Kurs, biaya, dan bagi hasilmu tampil di chat sebelum kamu membayar.
          </p>
          <a
            href="#kirim"
            className="self-start rounded-full bg-[#EEEBE4] px-[26px] py-[15px] text-[17px] font-bold text-teks no-underline hover:bg-[#E3DFD5] hover:text-teks"
          >
            Mulai kirim
          </a>
        </div>

        <div className="box-border flex min-h-[440px] grow-[3] shrink basis-[520px] flex-wrap gap-7 overflow-hidden rounded-[40px] bg-hijau px-12 pt-14 text-white max-sm:basis-full max-sm:px-7">
          <div className="flex grow shrink basis-[260px] flex-col justify-center gap-[18px] pb-14">
            <div className="text-base font-bold text-[#D9E6CF]">Mudah</div>
            <h3 className={judulBento}>Semua lewat WhatsApp</h3>
            <p className="m-0 text-[19px] leading-normal text-[#E4EDDB]">
              Secepat kirim pesan. Tidak perlu antre, tidak perlu aplikasi baru.
            </p>
            <a
              {...waProps}
              className="self-start rounded-full bg-hijau-tua px-[26px] py-[15px] text-[17px] font-bold text-white no-underline hover:bg-[#2A441D] hover:text-white"
            >
              Kirim lewat WhatsApp
            </a>
          </div>
          <div
            aria-hidden="true"
            className="box-border shrink-0 grow-0 basis-[240px] self-end rounded-t-[40px] bg-teks px-2.5 pt-2.5 max-sm:mx-auto"
          >
            <div className="flex flex-col overflow-hidden rounded-t-[32px] bg-[#F2F1EC]">
              <div className="flex items-center gap-2 bg-white px-3.5 pt-4 pb-3">
                <div className="flex size-[30px] items-center justify-center rounded-full border border-[#ECECF0]">
                  <TandaMigimo width={20} height={11} />
                </div>
                <span className="text-[13px] font-bold text-teks">Migimo</span>
              </div>
              <div className="flex flex-col gap-2 px-2.5 pt-3 pb-5 text-xs text-teks">
                <div className="self-start rounded-[4px_14px_14px_14px] bg-white px-2.5 py-2">
                  Mau kirim berapa hari ini?
                </div>
                <div className="self-end rounded-[14px_4px_14px_14px] bg-[#DDEBD1] px-2.5 py-2">¥50.000 ke Ibu</div>
                <div className="flex flex-col gap-1.5 rounded-[14px] bg-white p-2.5">
                  <div className="flex justify-between">
                    <span>Ibu terima</span>
                    <b>Rp5.700.000</b>
                  </div>
                  <div className="flex justify-between rounded-lg bg-[#FEF1DD] px-2 py-1.5">
                    <span>Bagi hasil</span>
                    <b>Rp50.000 + ¥1.000</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="box-border flex min-h-[440px] grow-[3] shrink basis-[520px] flex-wrap items-center gap-7 rounded-[40px] bg-hijau-tua px-12 py-14 text-white max-sm:min-h-0 max-sm:basis-full max-sm:px-7">
          <div className="flex grow shrink basis-[280px] flex-col gap-[18px]">
            <div className="text-base font-bold text-oranye">Economic Sharing</div>
            <h3 className={judulBento}>Separuh untungnya untukmu</h3>
            <p className="m-0 text-[19px] leading-normal text-[#C9D6BC]">
              Bagi hasil di setiap kiriman, bukan cuma yang pertama.
            </p>
            <a
              {...waProps}
              className="self-start rounded-full bg-white px-[26px] py-[15px] text-[17px] font-bold text-teks no-underline hover:bg-panel hover:text-teks"
            >
              Mulai kirim
            </a>
          </div>
          <div className="flex size-[200px] shrink-0 flex-col items-center justify-center rounded-full bg-oranye text-teks">
            <span className="text-[64px] leading-none font-extrabold tracking-[-0.04em]">50%</span>
            <span className="text-[15px] font-bold">untuk kamu</span>
          </div>
        </div>

        <div className="box-border flex min-h-[440px] grow-[2] shrink basis-[420px] flex-col justify-center gap-[18px] rounded-[40px] bg-[#FEF1DD] px-12 py-14 max-sm:min-h-0 max-sm:basis-full max-sm:px-7">
          <div className="text-base font-bold text-[#B5401A]">Economic Sharing</div>
          <h3 className={judulBento}>Bayar pakai QRIS Cross Border</h3>
          <p className="m-0 text-[19px] leading-normal text-[#4A3A22]">
            Tersedia dari Jepang, Malaysia, Singapura, Thailand, Korea Selatan, dan Tiongkok.
          </p>
          <a {...waProps} className={tombolGelap}>
            Mulai kirim
          </a>
        </div>
      </section>

      {/* Panel 3 langkah + grid 6 negara */}
      <section id="negara" className={`${wadah} scroll-mt-24 pb-6`}>
        <div className="flex flex-col gap-[72px] rounded-[40px] bg-panel px-12 py-[88px] max-sm:px-5 max-sm:py-16">
          <div className="flex flex-wrap items-start gap-10">
            <div className="flex grow shrink basis-[380px] flex-col gap-8 max-sm:basis-full">
              <h2 className="m-0 text-[clamp(36px,4.6vw,60px)] leading-[1.04] font-extrabold tracking-[-0.03em]">
                Kirim uang ke Indonesia dalam 3 langkah
              </h2>
              <a {...waProps} className={tombolGelap}>
                Mulai kirim
              </a>
            </div>
            <ol className="m-0 flex grow-[1.3] shrink basis-[460px] list-none flex-col gap-4 p-0 max-sm:basis-full">
              {[
                ["Chat Migimo di WhatsApp", "Tidak perlu unduh aplikasi. Cukup simpan nomor Migimo dan mulai chat."],
                [
                  "Isi nominal dan penerima",
                  "Tulis berapa yang mau dikirim dan untuk siapa. Kurs, biaya, dan bagi hasilmu langsung tampil.",
                ],
                [
                  "Bayar dengan QRIS, selesai",
                  "Keluarga menerima kiriman di Indonesia. Bagi hasilmu tercatat di akun Migimo.",
                ],
              ].map(([judul, isi], i) => (
                <li key={judul} className="flex flex-col gap-3.5 rounded-[32px] bg-white px-9 pt-9 pb-10 max-sm:px-6">
                  <div className="text-[56px] leading-none font-extrabold tracking-[-0.03em]">{i + 1}</div>
                  <div className="text-[26px] font-bold tracking-[-0.01em]">{judul}</div>
                  <div className="text-lg leading-[1.55] text-[#5C6356]">{isi}</div>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4">
            {NEGARA.map((n) => (
              <a
                key={n.kode}
                href="#kirim"
                className="box-border flex min-h-[210px] flex-col justify-between gap-5 rounded-[32px] bg-[#E6E2D8] px-[30px] py-7 text-teks no-underline transition-colors hover:bg-[#DCD7CA] hover:text-teks"
              >
                <span className="flex size-[60px] overflow-hidden rounded-full">
                  <Bendera kode={n.kode} size={60} />
                </span>
                <span className="text-[28px] leading-[1.1] font-extrabold tracking-[-0.02em]">Kirim dari {n.nama}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Panel penutup hijau tua + footer */}
      <footer className={`${wadah} pb-10`}>
        <div className="flex flex-col gap-14 overflow-hidden rounded-[40px] bg-hijau-tua px-12 pt-24 pb-12 text-white max-sm:px-6 max-sm:pt-16">
          <div className="flex flex-col items-center gap-10 text-center">
            <div className="font-caveat text-[clamp(44px,6.4vw,92px)] leading-[1.1] font-bold">
              Berangkat Migran,
              <br />
              Pulang Juragan.
            </div>
            <a
              {...waProps}
              className="rounded-full bg-oranye px-8 py-[18px] text-lg font-extrabold text-teks no-underline hover:bg-[#E89214] hover:text-teks"
            >
              Mulai kirim
            </a>
          </div>

          <div className="flex flex-wrap gap-10 border-t border-[#3F5531] pt-12">
            <div className="flex grow shrink basis-[260px] flex-col items-start gap-5">
              <a href="/" aria-label="Migimo beranda" className="flex rounded-xl bg-white px-4 py-3">
                <LogoMigimo />
              </a>
              <p className="m-0 max-w-[300px] text-[15px] leading-relaxed text-[#C9D6BC]">
                Kirim uang ke Indonesia lewat WhatsApp, dengan bagi hasil di setiap kiriman.
              </p>
              <div className="flex flex-col gap-2 text-[15px] text-[#C9D6BC]">
                <a {...waProps} className="text-[#C9D6BC] no-underline hover:text-white">
                  WhatsApp: {formatNomor(NOMOR_WA)}
                </a>
                <span>Email: [EMAIL_LAYANAN_PELANGGAN]</span>
                <span>Jam layanan: [JAM_LAYANAN]</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {SOSIAL.map(([nama, href, ikon]) => (
                  <a
                    key={nama}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Migimo di ${nama}`}
                    className="flex size-11 items-center justify-center rounded-xl border border-[#3F5531] text-white hover:border-[#C9D6BC] hover:text-white"
                  >
                    {ikon}
                  </a>
                ))}
              </div>
            </div>
            <div className="grid grow-[3] shrink basis-[640px] grid-cols-[repeat(auto-fit,minmax(min(170px,100%),1fr))] gap-8 max-sm:basis-full">
              <KolomFooter
                judul="Layanan"
                tautan={[
                  ["Kirim uang lewat WhatsApp", WA],
                  ["Kalkulator kurs", "#kirim"],
                  ["Negara asal", "#negara"],
                  ["Cara kirim", "#negara"],
                  ["Bagi hasil (Economic Sharing)", "#kirim"],
                ]}
              />
              <KolomFooter
                judul="Perusahaan"
                tautan={[
                  ["Tentang kami", "#cerita"],
                  ["Kontak", WA],
                ]}
              />
              <KolomFooter
                judul="Bantuan"
                tautan={[
                  ["Pusat bantuan", WA],
                  ["Pertanyaan umum (FAQ)", "#"],
                  ["Layanan pengaduan", "#"],
                  ["Tips keamanan", "#"],
                ]}
              />
              <KolomFooter
                judul="Legal"
                tautan={[
                  ["Syarat dan ketentuan", "#"],
                  ["Kebijakan privasi", "#"],
                  ["Kebijakan APU-PPT", "#"],
                  ["Kebijakan pengaduan konsumen", "#"],
                ]}
              />
            </div>
          </div>

          <div className="grid gap-6 border-t border-[#3F5531] pt-10 text-[13px] leading-[1.6] text-[#A9B99B] md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <div className="text-sm font-bold text-white">Layanan pengaduan konsumen</div>
              <div>PT Niaga Teknologi Indonesia</div>
              <div>[ALAMAT_KANTOR]</div>
              <div>Email: [EMAIL_PENGADUAN] · WhatsApp: {formatNomor(NOMOR_WA)}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="text-sm font-bold text-white">Keamanan akun</div>
              <div>
                Migimo tidak pernah meminta PIN, OTP, atau kata sandi kamu. Pastikan kamu hanya bertransaksi lewat nomor
                WhatsApp resmi Migimo yang tercantum di halaman ini.
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-[860px] flex-col gap-1.5 text-center text-[13px] leading-[1.6] text-[#A9B99B]">
            <div>
              Migimo dikelola oleh PT Niaga Teknologi Indonesia sebagai penyedia platform. Transaksi pembayaran diproses
              oleh [mitra pembayaran berizin Bank Indonesia]. Kurs dan bagi hasil di halaman ini adalah ilustrasi.
            </div>
            <div>© 2026 PT Niaga Teknologi Indonesia</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const SOSIAL: [string, string, React.ReactNode][] = [
  ["Instagram", "https://www.instagram.com/migimoid/", <IkonInstagram key="ig" />],
  ["Facebook", "https://www.facebook.com/migimoid", <IkonFacebook key="fb" />],
  ["Threads", "https://www.threads.com/@migimoid", <IkonThreads key="th" />],
  ["X", "https://x.com/Migimoid", <IkonX key="x" />],
  ["YouTube", "https://www.youtube.com/@MigimoID", <IkonYouTube key="yt" />],
];

function formatNomor(n: string) {
  // 6281284323000 -> +62 812-8432-3000
  const lokal = n.replace(/^62/, "");
  return `+62 ${lokal.slice(0, 3)}-${lokal.slice(3, 7)}-${lokal.slice(7)}`;
}

function LogoMigimo({ priority = false }: { priority?: boolean }) {
  return (
    <Image
      src="/logo-migimo.png"
      alt="Migimo"
      width={1200}
      height={270}
      priority={priority}
      className="block h-[30px] w-auto"
    />
  );
}

function KolomFooter({ judul, tautan }: { judul: string; tautan: [string, string][] }) {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-lg font-bold text-white">{judul}</div>
      {tautan.map(([teks, href]) => (
        <a
          key={teks}
          href={href}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="text-[15px] text-[#C9D6BC] no-underline hover:text-white"
        >
          {teks}
        </a>
      ))}
    </div>
  );
}
