# Migimo Community V1 — fondasi awal

Community digunakan untuk memvalidasi ide Economic Sharing Remittance. Jaringan Agen Migimo dan transaksi keuangan berada di luar Community V1.

Jalankan dengan Node.js 20+: `npm start` dari folder ini. Verifikasi: `npm test`.

Staging: https://community-web-production-cf01.up.railway.app/ — deploy dari branch `community-v1-foundation` pada proyek Railway `migimo-community-staging`. Lingkungan Railway bernama `production` secara default, tetapi proyek dan branch ini khusus staging.

Saat ini tersedia halaman pengantar publik (`/`), halaman masuk dan daftar dengan status integrasi (`/login`, `/daftar`), serta halaman pengarah App (`/app`). `MIGIMO_APP_URL` menentukan tujuan tombol App. Jika belum diatur, halaman menampilkan status tautan yang belum tersedia tanpa mengirim pengunjung ke URL sementara.

`/preview/komunitas` adalah pratinjau visual statis di staging, berisi satu diskusi contoh dan tombol tanpa fungsi. Rute ini tidak memuat data anggota, tidak menerima post, diberi `noindex`, dan tidak ditautkan dari navigasi publik. Semua rute produk `/community` dan `/api/community/*` tetap mengembalikan HTTP 401 sampai autentikasi dan database development dikonfigurasi. `/health` tersedia untuk pemeriksaan layanan.

Keputusan pemilik produk: tidak ada kode App Flutter atau sistem akun Migimo lain dalam repository lain yang perlu diperiksa. WebApp dan App dibangun dari awal dengan satu Migimo Identity.

Kode tahap berikutnya telah disiapkan untuk login Google OIDC, pendaftaran nama lengkap sesuai KTP, sesi Web dengan cookie HttpOnly, profil kategori anggota, post teks, komentar, dan suka. Halaman anggota memakai rancangan yang sama dengan pratinjau. **Fitur ini belum aktif di staging:** tidak ada database dan kredensial Google yang terpasang. Tanpa konfigurasi, tombol Google tetap nonaktif dan seluruh rute anggota tetap HTTP 401. Jangan mengisi data anggota sebelum database development siap.

Aktivasi development:

1. Siapkan PostgreSQL development yang persisten; jalankan `db/001_identity.sql`, lalu `db/002_posts.sql` pada database baru. Jangan menjalankan migrasi pada database transaksi.
2. Buat Google OAuth Client tipe Web dengan redirect URI tepat `https://community-web-production-cf01.up.railway.app/auth/google/callback`.
3. Atur `DATABASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `MIGIMO_SESSION_SECRET` (minimal 32 karakter acak), dan `PUBLIC_ORIGIN=https://community-web-production-cf01.up.railway.app` pada service staging. Simpan secret hanya di environment, bukan di Git.
4. Jalankan tes alur login dan pendaftaran di staging sebelum memakai data anggota. Profil lokasi hingga desa/kelurahan, unggahan foto, pelaporan, moderasi, dan integrasi Flutter adalah tahap lanjutan. Transaksi tetap di Migimo App.
