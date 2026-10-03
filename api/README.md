# migimo-api

Backend Migimo untuk integrasi **QRIS SNAP MPM (Person to Merchant)** dengan PT Mitra Transaksi Indonesia (Yokke),
sesuai *QR Payment API Documentation v1.0.11*. Berjalan di Railway (Singapura) dengan Postgres.

## Mode

- `MTI_MODE=simulator` (bawaan): klien MTI memanggil simulator bawaan di `/sim/...`. Untuk pengembangan dan latihan UAT.
- `MTI_MODE=live`: memanggil API Yokke di `MTI_BASE_URL`.

## Variabel lingkungan

| Variabel | Isi |
|---|---|
| `DATABASE_URL` | Postgres (Railway: `${{Postgres.DATABASE_URL}}`) |
| `ADMIN_TOKEN` | Token untuk endpoint `/admin/*` |
| `DASHBOARD_HOST` | Host dashboard admin, mis. `raksa.migimo.id` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client Google untuk login dashboard (redirect: `https://raksa.migimo.id/auth/google/callback`) |
| `ADMIN_EMAILS` | Email yang boleh masuk dashboard, dipisah koma |
| `SESSION_SECRET` | (Opsional) kunci cookie sesi; bawaan diturunkan dari `ADMIN_TOKEN` |
| `MTI_MODE` | `simulator` atau `live` |
| `MTI_BASE_URL` | Base URL API Yokke (live) |
| `MTI_CLIENT_KEY` | Consumer Key dari portal Yokke (`X-CLIENT-KEY`) |
| `MTI_CLIENT_SECRET` | Consumer Secret dari portal Yokke (HMAC-SHA512) |
| `MTI_PARTNER_ID` | Token Requestor ID (`X-PARTNER-ID`) |
| `MTI_MERCHANT_ID` | MID, 15 digit |
| `MTI_TERMINAL_ID` | TID, 8 digit |
| `MTI_CHANNEL_ID` | `CHANNEL-ID` (konfirmasi ke Yokke) |
| `MTI_PRIVATE_KEY` | Kunci privat RSA Migimo (PEM atau base64) untuk Get Token |
| `MTI_PUBLIC_KEY` | Kunci publik MTI untuk verifikasi notify |
| `MTI_NOTIFY_VERIFY` | `strict` (bawaan) atau `log` |
| `MTI_TIMEOUT_MS` | Batas waktu panggilan ke MTI (bawaan 30000) |
| `ANTHROPIC_API_KEY` | Kunci API Claude untuk bot WhatsApp (kosong = bot hanya membalas "tim akan membalas") |
| `ANTHROPIC_MODEL` | Model Claude (bawaan `claude-sonnet-5-5`) |
| `WA_PHONE_NUMBER_ID` | Phone number ID dari Meta App → WhatsApp → API Setup |
| `WA_ACCESS_TOKEN` | Token permanen System User (Meta Business Settings) dengan izin `whatsapp_business_messaging` |
| `WA_APP_SECRET` | App Secret aplikasi Meta (verifikasi `X-Hub-Signature-256` webhook) |
| `WA_VERIFY_TOKEN` | Teks bebas, diisi sama di Meta → WhatsApp → Configuration → Verify token |
| `WA_MAX_RUPIAH` | Batas total QRIS per transaksi dari bot (bawaan 10000000) |

## Endpoint

- `GET /`: halaman "Migimo API: aktif".
- Dashboard admin di browser (login Google untuk email di `ADMIN_EMAILS`; `ADMIN_TOKEN` sebagai login teknis): pesanan, QRIS, UAT, log. Tampil di `/` pada host `DASHBOARD_HOST` (https://raksa.migimo.id); `/dashboard` di host lain dialihkan ke sana.
- `POST /qr/qr-mpm-notify`: QR Payment Credit Notify dari MTI (diverifikasi RSA).
- `GET /health`
- Admin (header `Authorization: Bearer <ADMIN_TOKEN>`):
  - `POST /admin/qr` `{ amount, feeAmount? }`: generate QRIS
  - `GET /admin/orders`, `GET /admin/orders/:id`, `GET /admin/orders/:id/qr.png`
  - `POST /admin/orders/:id/inquiry`, `POST /admin/orders/:id/refund`
  - `GET /admin/logs`, `GET /admin/logs.csv`: log lengkap request/response (untuk sheet "Log" UAT)
  - `GET /admin/uat/cases`, `POST /admin/uat/run/:no`, `POST /admin/uat/run-all`, `GET /admin/uat/results`, `GET /admin/uat/export.csv`
  - `GET /admin/keys/public`: kunci publik Migimo untuk didaftarkan ke Yokke
  - `POST /admin/sim/pay/:orderId` (simulator saja): meniru pembayaran

## WhatsApp AI

Pengguna chat ke nomor WhatsApp Migimo → Meta mengirim webhook ke `POST /wa/webhook` → Claude membalas dengan alat:
`hitung_kiriman` (kurs ilustrasi sama dengan migimo.id), `buat_qris_pembayaran` (membuat QRIS lewat MTI dan mengirim gambarnya, hanya setelah pengguna konfirmasi),
`cek_status_kiriman`, dan `hubungkan_tim` (bot berhenti, tim membalas dari dashboard). Saat QRIS dibayar, pengguna otomatis dikabari.
Penyaluran ke rekening/e-wallet penerima masih manual: tim menandai "Sudah disalurkan" di tab WhatsApp dashboard, lalu pengguna dikabari.

Pasang di Meta: Callback URL `https://api.migimo.id/wa/webhook`, Verify token = `WA_VERIFY_TOKEN`, subscribe field `messages`.

- `GET /wa/webhook` (verifikasi Meta), `POST /wa/webhook` (pesan masuk, wajib tanda tangan App Secret)
- Admin: `GET /admin/wa/status`, `GET /admin/wa/contacts`, `GET /admin/wa/contacts/:waId/messages`,
  `POST /admin/wa/contacts/:waId/send` `{ text }`, `POST /admin/wa/contacts/:waId/handoff` `{ on }`,
  `GET /admin/wa/transfers`, `POST /admin/wa/transfers/:id/dikirim`, `POST /admin/wa/uji` `{ pesan }`, `POST /admin/wa/uji/reset`

## Pengembangan

```bash
cd api
npm install
npm test        # butuh Postgres; atur TEST_DATABASE_URL dan TEST_WA_DATABASE_URL
npm run dev
```
