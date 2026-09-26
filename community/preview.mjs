// Static design preview. It contains no member data and cannot create posts.
const icon = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5A8.5 8.5 0 1 1 21 11.5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4"/>',
  photo: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  heart: '<path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
  share: '<path d="M14 4 21 12l-7 7v-4c-6 0-9 2-11 5 0-7 3-11 11-12z"/>'
};
const svg = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon[name]}</svg>`;

export function previewPage() {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#547132"><title>Pratinjau Komunitas · Migimo</title><link rel="icon" type="image/png" sizes="64x64" href="/assets/favicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/preview.css"></head><body>
  <div class="preview-ribbon" role="note">Pratinjau desain · konten contoh · fitur anggota belum aktif</div>
  <a class="skip" href="#feed">Lewati ke konten</a>
  <header class="topbar"><div class="topbar-inner"><a class="brand" href="/" aria-label="Beranda Migimo"><img src="/assets/migimo-logo.png" alt="Migimo"></a><nav class="topnav" aria-label="Navigasi pratinjau"><span aria-current="page">Komunitas</span><span class="app-nav" aria-disabled="true">Kirim Uang ↗</span></nav><div class="search-shell">${svg('search')}<span>Cari diskusi atau anggota</span></div><div class="user-shell">${svg('bell')}<span class="avatar" aria-hidden="true">A</span><span class="user-name">Anggota</span></div></div></header>
  <div class="layout"><aside class="side-nav" aria-label="Menu pratinjau"><div class="side-item selected">${svg('home')}<span>Beranda</span></div><div class="side-item">${svg('user')}<span>Profil</span></div><div class="side-item">${svg('chat')}<span>Diskusi saya</span></div></aside>
  <main id="feed" class="feed"><h1>Ruang cerita PMI</h1><p class="intro">Terhubung dari 86 negara penempatan hingga kampung halaman.</p>
    <section class="profile-prompt" aria-label="Lengkapi profil"><span class="prompt-icon">${svg('user')}</span><strong>Lengkapi profilmu</strong><span class="prompt-message">Pilih kategori anggota di Profil.</span><button type="button" class="outline-button" disabled>Isi Profil</button></section>
    <section class="composer" aria-label="Buat post"><div class="composer-top"><span class="avatar" aria-hidden="true">A</span><div class="composer-input">Apa yang ingin kamu bagikan?</div></div><div class="composer-bottom"><span class="photo-label">${svg('photo')} Foto</span><button type="button" class="outline-button" disabled>Posting</button></div></section>
    <div class="filters" aria-label="Filter kategori post"><span class="selected">Semua</span><span>PMI</span><span>Purna PMI</span><span>Keluarga PMI</span></div>
    <article class="post"><div class="post-author"><span class="official-avatar"><img src="/assets/favicon.png" alt=""></span><div><div class="name-row"><strong>Migimo</strong><span class="official-tag">Akun resmi</span></div><small>Contoh diskusi</small></div><span class="more" aria-hidden="true">···</span></div><h2>Apa yang paling kamu butuhkan saat mengirim uang ke keluarga di Indonesia?</h2><p>Kami ingin mendengar pengalaman dan pendapat kamu, agar Migimo bisa terus memberikan layanan yang lebih baik untuk semua PMI.</p><div class="post-actions"><span>${svg('heart')} Suka</span><span>${svg('chat')} Komentar</span><span>${svg('share')} Bagikan</span></div></article>
  </main></div>
  <nav class="mobile-nav" aria-label="Menu ponsel pratinjau"><span class="selected">${svg('home')}Beranda</span><span>${svg('search')}Cari</span><span>${svg('user')}Profil</span></nav>
  </body></html>`;
}
