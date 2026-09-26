# Audit awal Migimo App untuk satu Migimo Identity

Tanggal: 26 September 2026. Status: **belum cukup untuk memutuskan migrasi atau mengaktifkan Google login Community**.

## Bukti yang sudah diperiksa

- Repository yang dapat diakses pada akun GitHub `tatasugiartacom`: `kupas-foundation` dan `migimo-mvp`. Source Flutter App dan backend akun Migimo tidak ditemukan di `migimo-mvp`; branch utama hanya README dan branch Community berisi WebApp.
- Situs resmi menyediakan halaman unduh App: https://migimo.id/unduh-aplikasi. Staging Community mengarahkan menu Kirim Uang ke halaman resmi ini melalui `MIGIMO_APP_URL`.
- Listing Google Play bernama Migimo pada `com.migimoapps.online` ada, tetapi keterkaitannya dengan source Flutter App yang hendak diintegrasikan, pemilik backend, dan model akun saat ini belum dapat diverifikasi hanya dari listing publik. Jangan menganggap listing tersebut sebagai bukti bahwa Google login atau ID anggota bersama sudah tersedia.

## Yang perlu diperiksa pada source App

1. Lokasi folder source Flutter (`pubspec.yaml`, `lib/`, `android/`) dan apakah repository lain milik developer.
2. Backend/API yang dipakai App, lingkungan staging/produksi, dan penyimpanan ID pengguna/anggota.
3. Alur login atau pendaftaran yang sudah berjalan, termasuk apakah Google sign-in pernah dipakai dan apakah ada pengguna produksi.
4. Metode mengaitkan akun App lama ke Google `sub` tanpa mengandalkan kesamaan alamat email saja.
5. Tautan buka App/deep link dan paket Play Store yang benar untuk versi App yang akan dipakai.

## Gerbang keputusan

Sebelum menjalankan rancangan `db/001_identity.sql`, mengaktifkan pendaftaran Google, atau menulis data anggota, dokumentasikan hasil pemeriksaan di atas dan tetapkan pemilik ID anggota yang sama untuk WebApp dan Flutter App. Seluruh rute anggota tetap HTTP 401 sampai autentikasi dan integrasi identitas siap.
