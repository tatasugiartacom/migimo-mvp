import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const logo = readFileSync(new URL('./assets/migimo-logo.png', import.meta.url));
const airportPhoto = readFileSync(new URL('./assets/pmi-airport.webp', import.meta.url));
const css = readFileSync(new URL('./style.css', import.meta.url));
const appUrl = process.env.MIGIMO_APP_URL || '';
const port = Number(process.env.PORT || 3000);

function page(title, active, content) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#547132"><meta name="description" content="Migimo Community: ruang PMI, Purna PMI, dan Keluarga PMI untuk berbagi pengalaman dan membentuk masa depan kirim uang."><title>${title} · Migimo</title><link rel="stylesheet" href="/style.css"></head><body><a class="skip" href="#main">Lewati ke konten</a><header><div class="wrap nav"><a href="/" aria-label="Beranda Migimo"><img src="/assets/migimo-logo.png" alt="Migimo"></a><nav aria-label="Navigasi utama"><a href="/" ${active === 'home' ? 'aria-current="page"' : ''}>Community</a><a href="/app" ${active === 'app' ? 'aria-current="page"' : ''}>Kirim Uang</a></nav><a class="nav-cta" href="/login">Masuk <span aria-hidden="true">↗</span></a></div></header><main id="main">${content}</main><footer><div class="wrap footer"><div><img src="/assets/migimo-logo.png" alt="Migimo"><p>Connecting Dreams.</p></div><div><p>Economic Sharing Remittance berbasis komunitas PMI melalui fasilitasi lembaga keuangan dan penyedia jasa pembayaran berizin.</p><small>© ${new Date().getUTCFullYear()} Migimo</small></div></div></footer></body></html>`;
}

const home = `<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><span class="eyebrow"><span class="dot"></span> MIGIMO COMMUNITY</span><h1>Migimo<br><em>Connecting Dreams.</em></h1><p class="lead">Tempat berkumpulnya PMI, Purna PMI, dan Keluarga PMI. Terhubung dari 86 negara penempatan hingga kampung halaman di Indonesia.</p><div class="actions"><a class="btn primary" href="/login">Gabung Community <span aria-hidden="true">↗</span></a><a class="btn outline" href="/app">Kirim Uang di App <span aria-hidden="true">→</span></a></div><p class="micro">Percakapan anggota hanya dapat diakses setelah login.</p></div><div class="hero-points" aria-label="Tentang Community"><div><span class="point-icon">✦</span><span>Komunitas PMI<br>di 86 negara</span></div><div><span class="point-icon orange">↗</span><span>Kirim uang<br>melalui Migimo App</span></div><div><span class="point-icon red">♡</span><span>Cerita anggota<br>membentuk solusi</span></div></div></div></section><section class="wrap section"><div class="section-head"><span class="eyebrow">CERITA YANG BERARTI</span><h2>Dari pengalaman, lahir solusi yang lebih dekat.</h2><p>Community Migimo membantu memahami kebutuhan nyata seputar kirim uang dan kehidupan PMI. Setiap cerita memberi arah pengembangan layanan yang lebih relevan.</p></div><div class="cards"><article><span>01</span><h3>Bagikan pengalaman</h3><p>Diskusikan kebutuhan, tantangan, dan hal yang penting saat mengirim uang ke keluarga.</p></article><article><span>02</span><h3>Temukan sesama anggota</h3><p>Terhubung sebagai PMI, Purna PMI, atau Keluarga PMI melalui konteks wilayah.</p></article><article><span>03</span><h3>Bantu membentuk Migimo</h3><p>Masukan anggota menjadi pembelajaran untuk memvalidasi ide Economic Sharing Remittance.</p></article></div></section><section class="privacy"><div class="wrap privacy-grid"><div><span class="eyebrow">AMAN DAN JELAS</span><h2>Ruang berbagi dengan kendali di tanganmu.</h2></div><div><p>Halaman pengantar terbuka untuk semua orang. Feed, post, komentar, reaction, dan profil anggota memerlukan login. Kategori dan wilayah dapat dilengkapi kemudian di Profil.</p><p>Lokasi perangkat hanya digunakan dengan izin dan konfirmasi. Koordinat presisi tidak ditampilkan pada profil anggota.</p></div></div></section><section class="wrap closing"><div><span class="eyebrow">CONNECTING DREAMS</span><h2>Mulai dari sebuah cerita.</h2><p>Suaramu membantu Migimo memahami cara kirim uang yang dibutuhkan PMI.</p></div><a class="btn primary" href="/login">Gabung Community ↗</a></section>`;

const login = `<section class="wrap simple"><div class="simple-card"><span class="eyebrow">MIGIMO IDENTITY</span><h1>Selamat datang di Community.</h1><p class="lead">Pendaftaran menggunakan akun Google. Saat pertama bergabung, kamu cukup mengisi nama lengkap sesuai KTP. Kategori dan lokasi dilengkapi nanti di Profil.</p><div class="notice" role="status"><strong>Login Google sedang disiapkan.</strong><p>Kami sedang menyambungkan identitas Community dengan Migimo App. Pendaftaran belum dibuka pada staging ini.</p></div><a class="back" href="/">← Kembali ke halaman pengantar</a><p class="micro">Login Google tidak memverifikasi status PMI. Tidak ada unggah KTP di Community V1.</p></div></section>`;

function escapeAttr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function app() {
  const action = appUrl ? `<a class="btn primary" href="${escapeAttr(appUrl)}" rel="noopener noreferrer">Buka Migimo App ↗</a>` : `<div class="notice" role="status"><strong>Tautan Migimo App sedang disiapkan.</strong><p>Alamat resmi buka atau unduh App akan tampil di sini setelah dikonfirmasi.</p></div>`;
  return `<section class="wrap simple app-page"><div class="simple-card"><span class="eyebrow">KIRIM UANG</span><h1>Lanjutkan di Migimo App.</h1><p class="lead">Seluruh proses kirim uang berlangsung di Migimo App melalui mitra berizin. Community adalah ruang untuk berbagi cerita dan pengalaman.</p>${action}<a class="back" href="/">← Kembali ke Community</a></div><aside><span>↗</span><h2>Satu tujuan, jalur yang tepat.</h2><p>Community membantu kami mendengar kebutuhan PMI. Transaksi tetap dilakukan di App.</p></aside></section>`;
}

export function handler(req, res) {
  const path = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store');
  if (path === '/health') { res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('ok'); return; }
  if (path === '/assets/migimo-logo.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(logo); return; }
  if (path === '/assets/pmi-airport.webp') { res.writeHead(200, { 'Content-Type': 'image/webp' }); res.end(airportPhoto); return; }
  if (path === '/style.css') { res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }); res.end(css); return; }
  if (path === '/' || path === '/login' || path === '/app') {
    const [title, active, body] = path === '/' ? ['Community', 'home', home] : path === '/login' ? ['Masuk Community', '', login] : ['Migimo App', 'app', app()];
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(page(title, active, body)); return;
  }
  if (path === '/community' || path.startsWith('/community/') || path === '/api/community' || path.startsWith('/api/community/')) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify({ error: 'login_required' })); return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Halaman tidak ditemukan');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  createServer(handler).listen(port, '0.0.0.0', () => console.log(`Migimo Community listening on ${port}`));
}
