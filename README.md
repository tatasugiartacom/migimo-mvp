# migimo-mvp
Migimo Economic Sharing Remittance — Japan Pilot MVP

Halaman beranda Migimo: Next.js (App Router) + Tailwind CSS v4, font Plus Jakarta Sans.

## Jalankan lokal

```bash
npm install
npm run dev
```

## Deploy ke Vercel

Import repo ini di Vercel; framework terdeteksi otomatis sebagai Next.js, tanpa konfigurasi tambahan.

## Struktur

- `app/page.tsx` — seluruh section beranda
- `components/Kalkulator.tsx` — kalkulator kirim uang (client component)
- `lib/negara.ts` — daftar negara, kurs ilustrasi, rumus biaya, dan nomor WhatsApp

Placeholder dalam kurung siku (mis. `[NOMOR_MIGIMO]` di `lib/negara.ts`) perlu diganti sebelum rilis.
