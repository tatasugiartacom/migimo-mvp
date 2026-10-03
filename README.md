# migimo-mvp
Migimo Economic Sharing Remittance — Japan Pilot MVP

Halaman beranda Migimo: Next.js (App Router) + Tailwind CSS v4, font Plus Jakarta Sans.

## Jalankan lokal

```bash
npm install
npm run dev
```

## Deploy ke Railway

Buat service baru dari repo GitHub ini di Railway. Pengaturan build dan start ada di `railway.json`
(`npm run build`, lalu `npm run start` yang mendengarkan variabel `PORT` dari Railway).
Setelah deploy, buka Settings › Networking › Generate Domain untuk mendapatkan URL publik.

## Struktur

- `app/page.tsx` — seluruh section beranda
- `components/Kalkulator.tsx` — kalkulator kirim uang (client component)
- `lib/negara.ts` — daftar negara, kurs ilustrasi, rumus biaya, dan nomor WhatsApp

Nomor WhatsApp Migimo diatur di `lib/negara.ts` (`NOMOR_WA`). Placeholder dalam kurung siku yang tersisa perlu diganti sebelum rilis.
