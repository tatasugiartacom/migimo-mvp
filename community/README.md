# Migimo Community V1 — fondasi awal

Community digunakan untuk memvalidasi ide Economic Sharing Remittance. Jaringan Agen Migimo dan transaksi keuangan berada di luar Community V1.

Jalankan dengan Node.js 20+: `npm start` dari folder ini. Verifikasi: `npm test`.

Staging: https://community-web-production-cf01.up.railway.app/ — deploy dari branch `community-v1-foundation` pada proyek Railway `migimo-community-staging`. Lingkungan Railway bernama `production` secara default, tetapi proyek dan branch ini khusus staging.

Saat ini tersedia halaman pengantar publik (`/`), halaman masuk dengan status integrasi (`/login`), dan halaman pengarah App (`/app`). `MIGIMO_APP_URL` menentukan tujuan tombol App. Jika belum diatur, halaman menampilkan status tautan yang belum tersedia tanpa mengirim pengunjung ke URL sementara. Semua rute `/community` dan `/api/community/*` mengembalikan HTTP 401 dari server. `/health` tersedia untuk pemeriksaan layanan.

Ini fondasi development, belum sistem login. Jangan memasukkan data anggota atau menerbitkan ke production. Integrasi Google login harus mengikuti satu Migimo Identity setelah sistem akun App yang ada diperiksa. Feed, profil, lokasi, post, dan moderasi belum diimplementasikan.
