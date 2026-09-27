const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2z"/>',
  chat: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5A8.5 8.5 0 1 1 21 11.5Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9ZM10 21h4"/>',
  heart: '<path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>',
  share: '<path d="M14 4 21 12l-7 7v-4c-6 0-9 2-11 5 0-7 3-11 11-12z"/>'
};
const svg = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const initial = name => escapeHtml(Array.from(name || 'A')[0]?.toLocaleUpperCase('id') || 'A');
const avatar = (name, id, hasAvatar, extraClass = '') => `<span class="avatar${extraClass ? ` ${extraClass}` : ''}" aria-hidden="true">${hasAvatar && id ? `<img src="/community/avatar/${encodeURIComponent(id)}" alt="">` : initial(name)}</span>`;
const categories = { PMI: 'PMI', PURNA_PMI: 'Purna PMI', KELUARGA_PMI: 'Keluarga PMI' };
const dateLabel = value => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(value));

function layout(member, selected, content) {
  const name = escapeHtml(member.name);
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#547132"><title>Komunitas · Migimo</title><link rel="icon" type="image/png" href="/assets/favicon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/preview.css"></head><body class="member-page"><a class="skip" href="#feed">Lewati ke konten</a>
  <header class="topbar"><div class="topbar-inner"><a class="brand" href="/community" aria-label="Beranda Migimo"><img src="/assets/migimo-logo.png" alt="Migimo"></a><nav class="topnav" aria-label="Navigasi utama"><a class="current" href="/community" aria-current="page">Komunitas</a><a href="/app">Kirim Uang ↗</a></nav><div class="search-shell">${svg('search')}<span>Cari diskusi atau anggota</span></div><div class="user-shell">${svg('bell')}${avatar(member.name, member.id, member.has_avatar)}<span class="user-name">${name}</span></div></div></header>
  <div class="layout"><aside class="side-nav" aria-label="Menu anggota"><a class="side-item ${selected === 'home' ? 'selected' : ''}" href="/community">${svg('home')}<span>Beranda</span></a><a class="side-item ${selected === 'profile' ? 'selected' : ''}" href="/community/profil">${svg('user')}<span>Profil</span></a><a class="side-item" href="/community#diskusi">${svg('chat')}<span>Diskusi</span></a><form action="/auth/logout" method="post"><button class="side-item logout" type="submit">Keluar</button></form></aside>
  <main id="feed" class="feed">${content}</main></div><nav class="mobile-nav" aria-label="Menu ponsel"><a class="${selected === 'home' ? 'selected' : ''}" href="/community">${svg('home')}Beranda</a><a href="/community#diskusi">${svg('chat')}Diskusi</a><a class="${selected === 'profile' ? 'selected' : ''}" href="/community/profil">${svg('user')}Profil</a></nav></body></html>`;
}

function card(post, detail = false) {
  const id = encodeURIComponent(post.id);
  const author = escapeHtml(post.author_name);
  const category = categories[post.author_category] ? `<span class="official-tag">${categories[post.author_category]}</span>` : '';
  const body = escapeHtml(post.body).replaceAll('\n', '<br>');
  return `<article class="post" id="post-${id}"><div class="post-author">${avatar(post.author_name, post.author_id, post.author_has_avatar)}<div><div class="name-row"><strong>${author}</strong>${category}</div><small>${dateLabel(post.created_at)}</small></div></div><p class="post-body">${body}</p><div class="post-actions"><form method="post" action="/api/community/posts/${id}/reaction"><button class="text-action ${post.liked ? 'liked' : ''}" type="submit" aria-label="${post.liked ? 'Batal suka' : 'Suka'}">${svg('heart')} Suka${post.reactions ? ` · ${post.reactions}` : ''}</button></form><a href="/community/post/${id}">${svg('chat')} Komentar${post.comments ? ` · ${post.comments}` : ''}</a><a href="/community/post/${id}">${svg('share')} Bagikan</a></div></article>`;
}

export function memberHome(member, posts, category = null) {
  const filters = [[null, 'Semua'], ...Object.entries(categories)].map(([key, label]) => `<a href="/community${key ? `?kategori=${key}` : ''}" ${key === category ? 'class="selected" aria-current="page"' : ''}>${label}</a>`).join('');
  const prompt = member.category ? '' : `<section class="profile-prompt" aria-label="Lengkapi profil"><span class="prompt-icon">${svg('user')}</span><strong>Lengkapi profilmu</strong><span class="prompt-message">Pilih kategori anggota di Profil.</span><a class="outline-button" href="/community/profil">Isi Profil</a></section>`;
  const composer = `<form class="composer" action="/api/community/posts" method="post"><div class="composer-top">${avatar(member.name, member.id, member.has_avatar)}<label class="visually-hidden" for="post-body">Apa yang ingin kamu bagikan?</label><textarea id="post-body" name="body" maxlength="3000" required placeholder="Apa yang ingin kamu bagikan?"></textarea></div><div class="composer-bottom"><span class="photo-label" aria-label="Foto akan tersedia pada tahap berikutnya">Foto</span><button type="submit" class="outline-button">Posting</button></div></form>`;
  const content = `<h1>Ruang cerita PMI</h1><p class="intro">Terhubung dari 86 negara penempatan hingga kampung halaman.</p>${prompt}${composer}<nav class="filters" aria-label="Filter kategori post">${filters}</nav><div id="diskusi">${posts.length ? posts.map(post => card(post)).join('') : '<p class="empty-feed">Belum ada diskusi. Mulai percakapan pertama.</p>'}</div>`;
  return layout(member, 'home', content);
}

export function memberProfile(member, feedback = '') {
  const options = Object.entries(categories).map(([value, label]) => `<option value="${value}" ${member.category === value ? 'selected' : ''}>${label}</option>`).join('');
  const message = feedback ? `<p class="avatar-feedback" role="status">${escapeHtml(feedback)}</p>` : '';
  const content = `<h1>Profil</h1><p class="intro">Lengkapi identitas komunitasmu.</p><section class="profile-card"><div class="profile-photo">${avatar(member.name, member.id, member.has_avatar, 'avatar-large')}<div><strong>Foto profil</strong><form action="/api/community/avatar" method="post" enctype="multipart/form-data"><label class="visually-hidden" for="avatar-file">Pilih foto profil</label><input id="avatar-file" name="photo" type="file" accept="image/jpeg,image/png,image/webp" required><button class="outline-button" type="submit">Unggah foto</button></form><small>JPG, PNG, atau WebP · maksimal 1 MB. Foto dapat diganti kapan saja.</small></div></div>${message}<p><strong>Nama lengkap sesuai KTP</strong><br>${escapeHtml(member.name)}</p><form action="/api/community/profil" method="post"><label for="member-category">Kategori anggota</label><select id="member-category" name="category" required><option value="" ${!member.category ? 'selected' : ''} disabled>Pilih kategori</option>${options}</select><button class="outline-button" type="submit">Simpan</button></form><p class="profile-hint">Pilihan kategori berasal dari keterangan anggota sendiri, bukan verifikasi status PMI.</p></section>`;
  return layout(member, 'profile', content);
}

export function memberDiscussion(member, post, comments) {
  const id = encodeURIComponent(post.id);
  const replies = comments.map(comment => `<div class="reply"><div class="reply-author">${avatar(comment.author_name, comment.author_id, comment.author_has_avatar)}<div><strong>${escapeHtml(comment.author_name)}</strong><small>${dateLabel(comment.created_at)}</small></div></div><p>${escapeHtml(comment.body).replaceAll('\n', '<br>')}</p></div>`).join('');
  const content = `<a class="back-link" href="/community">← Kembali ke Komunitas</a><h1>Diskusi</h1>${card(post, true)}<section class="replies"><h2>Komentar</h2>${replies || '<p>Belum ada komentar.</p>'}<form method="post" action="/api/community/posts/${id}/comments"><label for="comment">Tulis komentar</label><textarea id="comment" name="body" maxlength="1000" required></textarea><button class="outline-button" type="submit">Kirim komentar</button></form></section>`;
  return layout(member, 'home', content);
}
