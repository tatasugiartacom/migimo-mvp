# Migimo Community V1 — fondasi awal

Community digunakan untuk memvalidasi ide Economic Sharing Remittance. Jaringan Agen Migimo dan transaksi keuangan berada di luar Community V1.

Jalankan dengan Node.js 20+: `npm start` dari folder ini. Verifikasi: `npm test`.

Saat ini tersedia halaman pengantar publik (`/`) dan halaman pengarah App (`/app`). `MIGIMO_APP_URL` menentukan tujuan tombol App; nilai awal `https://migimo.id` hanya sementara hingga tautan App yang benar dikonfirmasi. Semua rute `/community` dan `/api/community/*` mengembalikan HTTP 401 dari server.

Ini fondasi development, belum sistem login. Jangan memasukkan data anggota atau menerbitkan ke production. Integrasi Google login harus mengikuti satu Migimo Identity setelah sistem akun App yang ada diperiksa. Feed, profil, lokasi, post, dan moderasi belum diimplementasikan.
