# Satu Migimo Identity

WebApp Community dan App Flutter kelak menggunakan `migimo_members.id` yang sama. Google login mengidentifikasi anggota dengan `google_sub`, bukan mencocokkan akun berdasarkan alamat email. Email diambil dari Google dan disimpan untuk tampilan/komunikasi; nama lengkap sesuai KTP diketik anggota saat pertama daftar tanpa unggah KTP. Kategori PMI, Purna PMI, atau Keluarga PMI dan kedua lokasi dilengkapi kemudian di Profil.

`001_identity.sql` adalah rancangan awal untuk database development dan belum dijalankan. Pemilik produk telah memastikan bahwa kode App Flutter dan backend akun yang dipakai belum ada di repository lain; bangun kedua klien dari awal di atas identitas bersama ini. Community hanya membaca identitas dan data profil yang diizinkan; sistem transaksi tetap memiliki batas akses sendiri.

Alur Google OAuth Web, verifikasi ID token di backend, buat/temukan anggota berdasarkan `google_sub`, dan sesi Web telah dikodekan. Alur ini baru aktif jika PostgreSQL development dan kredensial Google dikonfigurasi. App Flutter kelak memakai backend identitas yang sama dengan alur token sesuai platform; belum ada kode Flutter dalam proyek ini.
