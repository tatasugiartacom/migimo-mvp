# Master Roadmap Migimo Community V1

**Keputusan Product Owner:** 26 September 2026  
**Status dokumen:** rencana kerja; status implementasi dinilai dari kode dan bukti uji, bukan dari rencana ini.  
**Tujuan:** memvalidasi ide Economic Sharing Remittance (ESR) bersama PMI, Purna PMI, dan Keluarga PMI; membangun data wilayah yang kelak dapat mendukung Jaringan Agen Migimo.

## Batas produk yang dikunci

- Halaman pengantar dan halaman buka/unduh Migimo App publik. Feed, post, komentar, reaction, dan profil anggota memerlukan login.
- Pendaftaran terbuka melalui Google. Login Google membuktikan kepemilikan akun Google, **bukan** status PMI.
- Satu Migimo Identity dipakai Community WebApp dan Migimo App. Pendaftaran awal hanya nama lengkap sesuai KTP yang diketik anggota; email dari Google. Tidak ada unggah KTP.
- Kategori PMI, Purna PMI, atau Keluarga PMI; tempat tinggal kini dan asal Indonesia diisi kemudian dalam Profil. Struktur wilayah menuju desa/kelurahan atau setara. Lokasi perangkat opsional, memerlukan izin dan konfirmasi. Koordinat presisi tetap privat.
- Akun resmi Migimo memoderasi diskusi dan laporan; pengendalian aksesnya berada pada Migimo. Tidak ada pemecahan peran editor/moderator lebih rinci dalam V1.
- Kirim Uang membuka atau mengarahkan pengunduhan Migimo App. Community tidak menjalankan transaksi, fungsi agen, maupun verifikasi status PMI.

## Kondisi awal yang sudah diperiksa

Repository `tatasugiartacom/migimo-mvp` pada `main` memiliki README singkat. Draft [PR #1](https://github.com/tatasugiartacom/migimo-mvp/pull/1) pada branch `community-v1-foundation` berisi halaman publik `/` dan `/app`, aset logo, penguncian rute anggota dengan HTTP 401, tes akses sederhana, serta rancangan SQL identitas. **Login Google, database aktif, profil, feed, moderasi, dan integrasi App belum ada di PR.** Repository yang diperiksa belum memuat source Flutter App atau backend akun App. Tautan App dalam kode masih nilai sementara `https://migimo.id`.

## Urutan kerja dan kriteria selesai

| Tahap | Pekerjaan | Bukti selesai |
| --- | --- | --- |
| 0. Temukan sumber App dan audit akun | Temukan source Flutter App, backend, lingkungan staging, metode login yang sudah dipakai, tabel/ID pengguna, API akun, dan tautan buka/unduh App. Catat pemilik layanan, akses yang diperlukan, serta apakah akun App sudah memiliki pengguna. | Dokumen temuan dengan lokasi source dan keputusan migrasi/pengaitan akun; tidak ada perubahan data produksi sebelum pola identitas diputuskan. |
| 1. Fondasi Community | Tinjau PR #1, tentukan hosting, database development, konfigurasi rahasia, domain/callback Google, dan cara menjalankan lingkungan lokal/staging. Perbaiki fondasi sesuai hasil audit. | Halaman publik tampil; seluruh konten anggota tetap tertutup di server; tes akses lulus; konfigurasi staging terdokumentasi. |
| 2. Satu Migimo Identity | Rancang pemetaan aman antara akun App yang ada dan Google `sub`; jalankan migrasi hanya setelah audit. Implementasikan login Google di backend, sesi web, logout, dan pendaftaran nama lengkap. App memakai identitas anggota yang sama melalui backend yang disepakati. | Pengguna baru mendapat satu ID anggota; pengguna App yang sudah ada tidak terduplikasi; akses tanpa sesi ditolak; tidak ada unggah KTP atau pertanyaan profil saat daftar. |
| 3. Profil dan wilayah | Tambahkan kategori anggota, domisili saat ini, daerah asal Indonesia, hierarki wilayah hingga desa/kelurahan atau setara. Pisahkan data privat dari profil yang dapat dibaca anggota lain. Lokasi perangkat opsional dengan izin dan konfirmasi. | Profil dapat disimpan dan diedit; input wilayah valid; koordinat presisi tidak dikirim pada respons profil publik; penolakan izin lokasi tidak menghambat profil. |
| 4. Diskusi Community | Bangun feed, post, komentar, reaction, dan halaman profil anggota yang hanya dapat diakses setelah login. Akun resmi Migimo membuka pertanyaan validasi ESR. | Anggota yang login dapat membaca dan berpartisipasi; seluruh rute konten anggota menolak akses anonim; kasus utama diuji dari antarmuka dan API. |
| 5. Moderasi | Beri akun resmi Migimo kemampuan memulai diskusi, menerima laporan, dan menangani konten/laporan. Pastikan hanya Migimo yang dapat mengendalikan akun resmi. | Anggota dapat melapor; moderator dapat meninjau dan menindak; anggota biasa tidak dapat memakai wewenang moderator; tindakan penting tercatat. |
| 6. Pengarah App dan validasi | Pasang tautan resmi App dan perilaku buka/unduh yang sesuai perangkat. Rumuskan pertanyaan riset ESR dan ukuran pembelajaran Community. | Menu Kirim Uang berakhir di App/halaman unduh yang benar; tidak ada input atau proses transaksi di Community; hasil diskusi dapat diringkas menjadi temuan produk. |
| 7. Rilis terbatas | Uji alur penuh pada staging, privasi profil, izin lokasi, akses anonim, moderasi, dan pengaitan akun App. Rilis ke kelompok kecil, ukur temuan, perbaiki masalah, lalu putuskan perluasan. | Checklist uji dan keputusan go/no-go tercatat; layanan dipantau; temuan validasi ESR dilaporkan. |

## Ketergantungan dan keputusan yang masih terbuka

1. **Paling awal:** lokasi source Flutter App dan backend akun yang dipakai saat ini. Jika belum ada akun App, rancang ID bersama sejak awal; jika sudah ada, siapkan strategi mengaitkan akun tanpa hanya mencocokkan email.
2. Hosting/domain Community, database development, serta cara menyimpan secret Google dan URL callback.
3. Tautan resmi App/Play Store atau deep link untuk tombol Kirim Uang.
4. Dataset hierarki wilayah Indonesia dan wilayah tinggal saat ini di luar Indonesia, termasuk wilayah setara desa bila tersedia. Skema harus mendukung ketidakseragaman struktur administratif antarnegara.
5. Aturan operasional sederhana untuk laporan, penghapusan konten, dan akun resmi Migimo.
6. Pertanyaan validasi ESR dan ukuran hasil yang akan dipakai Product Owner sebelum rilis terbatas.

## Prioritas langsung

**Mulai Tahap 0:** periksa source Flutter App dan sistem akun yang sudah ada; tulis temuan dan pilih rancangan identitas bersama. Sampai temuan itu ada, draft SQL identitas di PR #1 tetap rancangan dan tidak dijalankan pada data produksi. Setelah itu, lanjutkan Tahap 1 dan 2 secara berurutan.
