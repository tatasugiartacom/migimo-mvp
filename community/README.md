# Migimo Community V1

WebApp Komunitas untuk PMI, Purna PMI, dan Keluarga PMI. Transaksi keuangan dan integrasi QRIS Cross Border berada di luar backend ini. Pengguna diarahkan ke Migimo App untuk Kirim Uang.

Staging: https://community-web-production-cf01.up.railway.app/ — branch `community-v1-foundation` pada proyek Railway `migimo-community-staging`. Nama environment Railway adalah `production`, tetapi proyek ini khusus staging.

Jalankan dari akar repo dengan Node.js 20+: `npm install`, `npm run db:migrate`, `npm start`. Tes: `npm test`.

## Konfigurasi

Pada layanan web Railway: `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MIGIMO_SESSION_SECRET` (minimal 32 karakter acak), dan `PUBLIC_ORIGIN=https://community-web-production-cf01.up.railway.app`. Google OAuth Client Web memakai redirect URI `https://community-web-production-cf01.up.railway.app/auth/google/callback`. `MIGIMO_APP_URL` opsional untuk tautan resmi App. Simpan kredensial hanya di environment.

Admin Komunitas memakai **satu login Google Migimo yang sama**, dengan izin tambahan melalui `MIGIMO_ADMIN_EMAIL`. Nilainya adalah email Google terverifikasi milik admin yang ditetapkan pada service Railway. Admin masuk melalui `/admin/login` dan diarahkan ke `/admin`; sesi lama yang dibuat sebelum fitur admin perlu login ulang agar menyimpan email terverifikasi. Jangan menaruh email admin sebagai konstanta di kode. Hanya pemilik akun Google tersebut yang boleh memperoleh akses dashboard; semua tindakan mutasi admin diperiksa lagi di server, memerlukan Origin yang sesuai, dan dicatat pada `community_moderation_actions`.

## Data

Migrasi `001_identity.sql`, `002_posts.sql`, `003_avatars.sql`, dan `004_moderation.sql` berjalan sekali dalam transaksi sebelum server dimulai. Migrasi 004 menyimpan status penangguhan anggota, laporan posting/komentar, serta jejak tindakan admin. Post dan komentar disembunyikan dengan `deleted_at` agar dapat dipulihkan. Akun yang ditangguhkan tidak dapat memakai area anggota Komunitas.

Dashboard V1 menampilkan ringkasan, daftar anggota dengan pencarian, daftar posting/komentar, serta laporan. Admin dapat menangguhkan atau memulihkan anggota, menyembunyikan atau menampilkan konten, dan menandai laporan selesai. Pengguna masuk dapat melaporkan konten anggota lain. Data transaksi dan hak akses pembayaran tidak ada dalam database ini.

`/preview/komunitas` hanya pratinjau visual statis, diberi `noindex`; `/health` untuk pemeriksaan layanan.
