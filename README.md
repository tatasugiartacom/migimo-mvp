# migimo-mvp
Migimo Economic Sharing Remittance — Japan Pilot MVP

Halaman beranda Migimo: Next.js (App Router) + Tailwind CSS v4, font Plus Jakarta Sans.

## Jalankan lokal

```bash
npm install
npm run dev
```

## Deploy ke Railway

Website (service `web`) dan backend (service `migimo-api`, folder `api/`) berjalan di proyek Railway `migimo-web`,
region Singapura. Perintah build/start, health check, dan watch paths diatur di Settings tiap service
(website: `npm run build` → `npm run start`, yang mendengarkan variabel `PORT` dari Railway).
Setelah deploy, buka Settings › Networking › Generate Domain untuk mendapatkan URL publik.

## Struktur

- `app/page.tsx` — seluruh section beranda
- `components/Kalkulator.tsx` — kalkulator kirim uang (client component)
- `lib/negara.ts` — daftar negara, kurs ilustrasi, rumus biaya, dan nomor WhatsApp

Nomor WhatsApp Migimo diatur di `lib/negara.ts` (`NOMOR_WA`). Placeholder dalam kurung siku yang tersisa perlu diganti sebelum rilis.
