# Satu Migimo Identity

WebApp Community dan App Flutter kelak menggunakan `migimo_members.id` yang sama. Google login mengidentifikasi anggota dengan `google_sub`, bukan mencocokkan akun berdasarkan alamat email. Email diambil dari Google dan disimpan untuk tampilan/komunikasi; nama lengkap sesuai KTP diketik anggota saat pertama daftar tanpa unggah KTP. Kategori PMI, Purna PMI, atau Keluarga PMI dan kedua lokasi dilengkapi kemudian di Profil.

`001_identity.sql` adalah rancangan awal untuk database development dan belum dijalankan. Kode App dan backend anggota yang sudah dipakai perlu ditinjau sebelum migrasi apa pun ke data produksi. Community hanya membaca identitas dan data profil yang diizinkan; sistem transaksi tetap memiliki batas akses sendiri.

Langkah implementasi berikut: konfigurasi Google OAuth, verifikasi token di backend, buat/temukan anggota berdasarkan `google_sub` dalam transaksi database, lalu terbitkan sesi Web yang aman. App Flutter akan memakai backend identitas yang sama dengan alur token sesuai platform. Belum ada login yang aktif dalam PR ini.
