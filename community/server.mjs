import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const logo = readFileSync(new URL('./assets/migimo-logo.png', import.meta.url));
const favicon = readFileSync(new URL('./assets/favicon.png', import.meta.url));
const airportPhoto = readFileSync(new URL('./assets/pmi-airport.webp', import.meta.url));
const css = readFileSync(new URL('./style.css', import.meta.url));
const appUrl = process.env.MIGIMO_APP_URL || '';
const port = Number(process.env.PORT || 3000);

const socials = [
  ['Facebook', 'https://www.facebook.com/migimoid', '<path d="M14.5 21v-7h2.3l.4-3h-2.7V9c0-.9.3-1.5 1.6-1.5H17V4.8c-.5-.1-1.3-.2-2.2-.2-2.4 0-4 1.5-4 4.2V11H8.5v3h2.3v7z"/>'],
  ['Instagram', 'https://www.instagram.com/migimoid/', '<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2"/>'],
  ['Threads', 'https://www.threads.com/@migimoid', '<path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/>'],
  ['YouTube', 'https://www.youtube.com/@MigimoID', '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z" fill="white"/>'],
  ['X', 'https://x.com/migimoid', '<path d="M5 4h3.4L19 20h-3.4zM19 4 5 20" fill="none" stroke="currentColor" stroke-width="2"/>']
];
const socialLinks = socials.map(([label, href, icon]) => `<a href="${href}" aria-label="${label} Migimo" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icon}</svg></a>`).join('');

function page(title, active, content) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#547132"><meta name="description" content="Migimo Community: ruang PMI, Purna PMI, dan Keluarga PMI untuk berbagi pengalaman dan membentuk masa depan kirim uang."><title>Migimo - Connecting Dreams</title><link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon.png"><link rel="stylesheet" href="/style.css"></head><body><a class="skip" href="#main">Lewati ke konten</a><header><div class="wrap nav"><a href="/" aria-label="Beranda Migimo"><img src="/assets/migimo-logo.png" alt="Migimo"></a><nav aria-label="Navigasi utama"><a href="/">Community</a><a href="/login">Masuk</a></nav><a class="nav-cta" href="/daftar">Daftar <span aria-hidden="true">↗</span></a></div></header><main id="main">${content}</main><footer><div class="wrap footer"><div class="footer-col footer-brand"><img src="/assets/migimo-logo.png" alt="Migimo"><p>Connecting Dreams.</p></div><div class="footer-col"><h2>Community</h2><p>Ruang berbagi pengalaman PMI, Purna PMI, dan Keluarga PMI.</p></div><div class="footer-col"><h2>Jelajahi</h2><a href="/">Beranda</a><a href="/login">Masuk</a><a href="/daftar">Daftar</a></div><div class="footer-col"><h2>Ikuti Migimo</h2><div class="social-links">${socialLinks}</div></div></div><div class="wrap footer-bottom"><p>Economic Sharing Remittance berbasis komunitas PMI melalui fasilitasi lembaga keuangan dan penyedia jasa pembayaran berizin.</p><small>© ${new Date().getUTCFullYear()} Migimo</small></div></footer></body></html>`;
}

const home = `<section class="hero"><div class="wrap hero-grid"><div class="hero-copy"><span class="eyebrow"><span class="dot"></span> MIGIMO COMMUNITY</span><h1>Migimo<br><em>Connecting Dreams.</em></h1><p class="lead">Tempat berkumpulnya PMI, Purna PMI, dan Keluarga PMI. Terhubung dari 86 negara penempatan hingga kampung halaman di Indonesia.</p><div class="actions"><a class="btn primary" href="/daftar">Gabung Community <span aria-hidden="true">↗</span></a></div><p class="micro">Percakapan anggota hanya dapat diakses setelah login.</p></div></div></section>`;

const login = `<section class="wrap simple"><div class="simple-card"><span class="eyebrow">MIGIMO IDENTITY</span><h1>Selamat datang di Community.</h1><p class="lead">Pendaftaran menggunakan akun Google. Saat pertama bergabung, kamu cukup mengisi nama lengkap sesuai KTP. Kategori dan lokasi dilengkapi nanti di Profil.</p><div class="notice" role="status"><strong>Login Google sedang disiapkan.</strong><p>Kami sedang menyambungkan identitas Community dengan Migimo App. Pendaftaran belum dibuka pada staging ini.</p></div><a class="back" href="/">← Kembali ke halaman pengantar</a><p class="micro">Login Google tidak memverifikasi status PMI. Tidak ada unggah KTP di Community V1.</p></div></section>`;

const signup = `<section class="wrap simple"><div class="simple-card"><span class="eyebrow">BERGABUNG DENGAN MIGIMO</span><h1>Mulai dari satu cerita.</h1><p class="lead">Daftar melalui akun Google. Pada pendaftaran pertama, kamu hanya perlu mengetik nama lengkap sesuai KTP. Email diambil dari Google; kategori dan lokasi dilengkapi nanti di Profil.</p><div class="notice" role="status"><strong>Pendaftaran sedang disiapkan.</strong><p>Identitas Community dan Migimo App sedang dihubungkan. Kamu belum dapat membuat akun melalui staging ini.</p></div><a class="back" href="/login">Sudah punya akun? Masuk →</a><p class="micro">Tidak ada unggah KTP. Login Google tidak memverifikasi status PMI.</p></div></section>`;

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
  if (path === '/assets/favicon.png' || path === '/favicon.ico') { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(favicon); return; }
  if (path === '/assets/pmi-airport.webp') { res.writeHead(200, { 'Content-Type': 'image/webp' }); res.end(airportPhoto); return; }
  if (path === '/style.css') { res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' }); res.end(css); return; }
  if (path === '/' || path === '/login' || path === '/daftar' || path === '/app') {
    const [title, active, body] = path === '/' ? ['Community', 'home', home] : path === '/login' ? ['Masuk Community', '', login] : path === '/daftar' ? ['Daftar Community', '', signup] : ['Migimo App', 'app', app()];
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
