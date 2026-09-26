import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const appUrl = process.env.MIGIMO_APP_URL || 'https://migimo.id';
const port = Number(process.env.PORT || 3000);
const logo = readFileSync(new URL('./assets/migimo-logo.png', import.meta.url));

function page(title, content) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Migimo</title><style>body{margin:0;font:16px system-ui,-apple-system,sans-serif;color:#293423;background:#fff}header,main,footer{max-width:960px;margin:auto;padding:24px}header{display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #eee}header img{width:170px;height:auto}header span{color:#547132}main{padding-top:72px;padding-bottom:100px}h1{font-size:clamp(36px,6vw,64px);line-height:1.08;letter-spacing:-.04em;max-width:780px}p{font-size:19px;line-height:1.6;max-width:650px;color:#46533b}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:32px}a.button{display:inline-block;padding:15px 22px;border-radius:12px;background:#547132;color:#fff;text-decoration:none;font-weight:700}a.secondary{background:#fff4df;color:#405927;border:1px solid #f49d1b}a.button:focus-visible{outline:3px solid #e6081e;outline-offset:3px}footer{font-size:14px;color:#61705a;border-top:1px solid #eee}@media(max-width:600px){main{padding-top:36px;padding-bottom:60px}header img{width:135px}}</style></head><body><header><img src="/assets/migimo-logo.png" alt="Migimo"><span>Connecting Dreams</span></header><main>${content}</main><footer>Economic Sharing Remittance berbasis komunitas PMI melalui fasilitasi lembaga keuangan dan penyedia jasa pembayaran berizin.</footer></body></html>`;
}

export function handler(req, res) {
  const path = new URL(req.url, 'http://localhost').pathname;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (path === '/assets/migimo-logo.png') {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(logo);
    return;
  }
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page('Community', '<h1>Suara PMI membantu membentuk masa depan kirim uang.</h1><p>Bergabung dalam Community Migimo untuk berbagi pengalaman dan membantu menguji ide Economic Sharing Remittance.</p><div class="actions"><a class="button" href="/community">Masuk Community</a><a class="button secondary" href="/app">Kirim Uang di App</a></div>'));
    return;
  }
  if (path === '/app') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page('Migimo App', `<h1>Kirim uang melalui Migimo App.</h1><p>Transaksi dilakukan di App. Community tidak memproses pengiriman uang.</p><div class="actions"><a class="button" href="${escapeAttr(appUrl)}">Buka atau unduh Migimo App</a></div>`));
    return;
  }
  if (path === '/community' || path.startsWith('/community/') || path.startsWith('/api/community/')) {
    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'login_required' }));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Halaman tidak ditemukan');
}

function escapeAttr(value) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  createServer(handler).listen(port, () => console.log(`Migimo Community listening on ${port}`));
}
