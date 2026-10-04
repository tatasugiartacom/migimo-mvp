import type { FastifyInstance, FastifyReply } from "fastify";
import type { Config } from "../config.js";
import { DASHBOARD_JS } from "./dashboard-js.js";
import { FAVICON_ICO, ICON_PNG } from "../icons.js";

const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

const BASE_CSS = `
:root{--hijau:#4E6B2E;--hijau-tua:#1F3315;--oranye:#F39F1E;--teks:#14200E;--panel:#F3F1EC;--abu:#5C6356;--garis:#E7E4DC;--merah:#B42318;--biru:#1D4ED8}
*{box-sizing:border-box}
body{margin:0;background:#FAFAF7;color:var(--teks);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif}
a{color:var(--hijau)}
button,input,select{font:inherit}
`;

function landingHtml(mode: string, dashHost: string) {
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/icon.png" type="image/png"><link rel="apple-touch-icon" href="/icon.png">
<title>Migimo API</title><style>${BASE_CSS}
main{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;background:#16A34A;margin-right:8px;vertical-align:middle}
h1{margin:0;font-size:28px;font-weight:600;letter-spacing:-.02em}
p{margin:0;color:var(--abu)}
.mode{display:inline-block;padding:4px 12px;border-radius:999px;background:var(--panel);font-size:13px;font-weight:600}
</style></head><body><main>
<h1><span class="dot" aria-hidden="true"></span>Migimo API: aktif</h1>
<p>Layanan pembayaran QRIS Migimo®.</p>
<span class="mode">Mode MTI: ${mode === "live" ? "live" : "simulator"}</span>
<p><a href="${dashHost ? `https://${dashHost}/` : "/dashboard"}">Dashboard admin</a></p>
</main></body></html>`;
}

const DASHBOARD_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/icon.png" type="image/png"><link rel="apple-touch-icon" href="/icon.png">
<title>Raksa · Dashboard Migimo</title><style>${BASE_CSS}
header{background:#fff;border-bottom:1px solid var(--garis);position:sticky;top:0;z-index:5}
.bar{max-width:1200px;margin:0 auto;padding:12px 20px;display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.bar h1{font-size:17px;margin:0;font-weight:600;margin-right:auto}
.pill{padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:var(--panel)}
.pill.live{background:#FEF3C7;color:#92400E}.pill.sim{background:#DCFCE7;color:#166534}
nav{max-width:1200px;margin:0 auto;padding:0 20px;display:flex;gap:4px;overflow-x:auto}
nav button{border:0;background:none;padding:10px 14px;border-bottom:2px solid transparent;cursor:pointer;color:var(--abu);font-weight:500;white-space:nowrap}
nav button[aria-selected=true]{color:var(--teks);border-color:var(--hijau)}
main{max-width:1200px;margin:0 auto;padding:20px}
.card{background:#fff;border:1px solid var(--garis);border-radius:14px;padding:16px;margin-bottom:16px}
.row{display:flex;flex-wrap:wrap;gap:10px;align-items:end}
label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--abu);font-weight:500}
input,select{border:1px solid var(--garis);border-radius:10px;padding:9px 12px;min-width:0;background:#fff;color:var(--teks)}
.btn{border:0;border-radius:999px;padding:9px 16px;cursor:pointer;font-weight:600;background:var(--hijau-tua);color:#fff;min-height:40px}
.btn.sec{background:var(--panel);color:var(--teks)}
.btn.sm{padding:6px 12px;min-height:32px;font-size:13px}
.btn:disabled{opacity:.5;cursor:wait}
.tbl{width:100%;overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--garis);vertical-align:top}
th{font-size:12px;color:var(--abu);font-weight:600;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
td.num{font-variant-numeric:tabular-nums;white-space:nowrap}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px}
.b{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.b-ok{background:#DCFCE7;color:#166534}.b-bad{background:#FEE2E2;color:#991B1B}.b-wait{background:#FEF3C7;color:#92400E}.b-info{background:#E0E7FF;color:#3730A3}.b-mut{background:var(--panel);color:var(--abu)}
.muted{color:var(--abu);font-size:13px}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:var(--teks);color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;max-width:90vw;display:none;z-index:20}
#login{max-width:420px;margin:12vh auto}
#login h2{margin:0 0 6px;font-size:20px}
dialog{border:0;border-radius:16px;padding:0;max-width:min(760px,94vw);width:100%}
dialog::backdrop{background:rgba(20,32,14,.45)}
.dlg{padding:18px}.dlg h3{margin:0 0 10px}
pre{background:var(--panel);border-radius:10px;padding:10px;overflow:auto;max-height:280px;font-size:12px;white-space:pre-wrap;word-break:break-all}
.qr{display:block;width:240px;height:240px;margin:8px 0;image-rendering:pixelated;border:1px solid var(--garis);border-radius:10px}
.sum{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
[hidden]{display:none!important}
.chat{display:flex;flex-direction:column;gap:8px;max-height:460px;overflow-y:auto;padding:4px 2px}
.bub{max-width:80%;padding:8px 12px;border-radius:14px;white-space:pre-wrap;word-break:break-word;font-size:14px}
.bub.u{align-self:flex-end;background:#DCF8C6}.bub.a{align-self:flex-start;background:var(--panel)}.bub.t{align-self:flex-start;background:#E0E7FF}
.bub.s{align-self:center;background:none;color:var(--abu);font-size:12px;padding:2px}
.bub img{display:block;width:220px;max-width:100%;border-radius:8px;margin-bottom:6px;background:#fff}
</style></head><body>
<section id="login" class="card" hidden>
  <h2>Dashboard Migimo · Raksa</h2>
  <p class="muted">Masuk dengan akun Google yang terdaftar sebagai admin Migimo.</p>
  <p id="loginErr" class="muted" style="color:var(--merah)"></p>
  <a id="googleBtn" class="btn" href="/auth/google" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;margin-top:6px" hidden>
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
    Masuk dengan Google
  </a>
  <details style="margin-top:18px">
    <summary class="muted" style="cursor:pointer">Login teknis (ADMIN_TOKEN)</summary>
    <form id="loginForm" class="row" style="margin-top:10px">
      <label style="flex:1">ADMIN_TOKEN<input id="tokenInput" type="password" autocomplete="off" required></label>
      <button class="btn sec" type="submit">Masuk</button>
    </form>
  </details>
</section>
<div id="app" hidden>
<header>
  <div class="bar"><h1>Migimo · Raksa</h1><span id="modePill" class="pill">…</span><span id="whoami" class="muted"></span><button id="logout" class="btn sec sm">Keluar</button></div>
  <nav role="tablist">
    <button role="tab" data-tab="orders" aria-selected="true">Pesanan</button>
    <button role="tab" data-tab="uat" aria-selected="false">UAT (38 skenario)</button>
    <button role="tab" data-tab="logs" aria-selected="false">Log MTI</button>
    <button role="tab" data-tab="wa" aria-selected="false">WhatsApp</button>
    <button role="tab" data-tab="audit" aria-selected="false">Aktivitas</button>
  </nav>
</header>
<main>
  <section data-panel="orders">
    <div class="card">
      <form id="qrForm" class="row">
        <label>Nominal (Rp)<input id="qrAmount" type="number" min="0" step="1" value="10000" required></label>
        <label>Biaya (Rp, opsional)<input id="qrFee" type="number" min="0" step="1"></label>
        <button class="btn" type="submit">Buat QRIS</button>
        <button class="btn sec" type="button" id="refreshOrders">Muat ulang</button>
      </form>
    </div>
    <div class="card tbl"><table><thead><tr><th>#</th><th>Waktu (WIB)</th><th>Nominal</th><th>Status</th><th>Reference No</th><th>Skenario</th><th>Aksi</th></tr></thead><tbody id="ordersBody"></tbody></table></div>
  </section>
  <section data-panel="uat" hidden>
    <div class="card">
      <div class="sum" id="uatSum"></div>
      <div class="row">
        <button class="btn" id="runAll">Jalankan semua</button>
        <button class="btn sec" id="dlUat">Unduh hasil (CSV)</button>
        <button class="btn sec" id="dlLogs">Unduh log lengkap (CSV)</button>
      </div>
      <p class="muted" id="uatNote"></p>
      <div id="mtiCheck" class="muted" style="color:var(--merah)" hidden></div>
    </div>
    <div class="card tbl"><table><thead><tr><th>No</th><th>Kelompok</th><th>Skenario</th><th>Diharapkan</th><th>Hasil</th><th>Response Code</th><th>Catatan</th><th></th></tr></thead><tbody id="uatBody"></tbody></table></div>
  </section>
  <section data-panel="logs" hidden>
    <div class="card row"><label>Filter skenario<input id="logFilter" placeholder="mis. UAT-01"></label><button class="btn sec" id="refreshLogs">Muat</button></div>
    <div class="card tbl"><table><thead><tr><th>#</th><th>Waktu (WIB)</th><th>Arah</th><th>API</th><th>HTTP</th><th>Response Code</th><th>Skenario</th><th>Durasi</th><th></th></tr></thead><tbody id="logsBody"></tbody></table></div>
  </section>
  <section data-panel="wa" hidden>
    <div class="card"><div class="sum" id="waStatus"></div><p class="muted" style="margin:0">Kiriman yang sudah dibayar perlu disalurkan manual ke penerima, lalu tandai "Sudah disalurkan" agar pengirim dikabari.</p></div>
    <div class="card tbl"><div class="row" style="justify-content:space-between;margin-bottom:8px"><strong>Kiriman</strong><button class="btn sec sm" id="refreshWa">Muat ulang</button></div>
      <table><thead><tr><th>#</th><th>Waktu (WIB)</th><th>Pengirim</th><th>Penerima</th><th>Diterima</th><th>Total QRIS</th><th>Status</th><th></th></tr></thead><tbody id="waTransfers"></tbody></table></div>
    <div class="card tbl"><strong>Percakapan</strong>
      <table><thead><tr><th>Nomor</th><th>Nama</th><th>Pesan terakhir</th><th>Kiriman</th><th>Status</th><th></th></tr></thead><tbody id="waContacts"></tbody></table></div>
    <div class="card"><div class="row" style="justify-content:space-between"><strong>Uji coba bot</strong><button class="btn sec sm" id="ujiReset">Mulai ulang</button></div>
      <p class="muted">Ngobrol dengan bot di sini tanpa WhatsApp. QRIS yang dibuat tercatat sebagai pesanan sungguhan (mode MTI saat ini).</p>
      <div id="ujiLog" class="chat"></div>
      <form id="ujiForm" class="row" style="margin-top:10px"><label style="flex:1">Pesan<input id="ujiInput" autocomplete="off" placeholder="mis. Halo, mau kirim 50.000 yen ke ibu"></label><button class="btn" type="submit">Kirim</button></form>
    </div>
  </section>
  <section data-panel="audit" hidden>
    <div class="card row"><button class="btn sec" id="refreshAudit">Muat ulang</button><span class="muted">Siapa melakukan apa di dashboard ini.</span></div>
    <div class="card tbl"><table><thead><tr><th>#</th><th>Waktu (WIB)</th><th>Pengguna</th><th>Aksi</th><th>Detail</th></tr></thead><tbody id="auditBody"></tbody></table></div>
  </section>
</main>
</div>
<dialog id="dlg"><div class="dlg"><div id="dlgBody"></div><div class="row" style="margin-top:12px"><button class="btn sec" id="dlgClose">Tutup</button></div></div></dialog>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
<script src="/dashboard.js"></script>
</body></html>`;

/** Halaman depan api.migimo.id dan dashboard admin (data diambil lewat /admin/* dengan ADMIN_TOKEN). */
export function pageRoutes(app: FastifyInstance, deps: { cfg: Config }) {
  const dashHost = deps.cfg.dashboardHost;
  const isDashHost = (hostname: string) => !!dashHost && hostname.toLowerCase() === dashHost;
  const sendDashboard = (reply: FastifyReply) =>
    reply.headers(SECURITY_HEADERS).type("text/html; charset=utf-8").send(DASHBOARD_HTML);

  app.get("/", async (req, reply) => {
    if (isDashHost(req.hostname)) return sendDashboard(reply);
    reply.headers(SECURITY_HEADERS).type("text/html; charset=utf-8").send(landingHtml(deps.cfg.mti.mode, dashHost));
  });
  app.get("/dashboard", async (req, reply) => {
    // Dashboard punya alamat sendiri (mis. raksa.migimo.id); alamat lama dialihkan ke sana.
    if (dashHost && !isDashHost(req.hostname)) return reply.redirect(`https://${dashHost}/`, 301);
    return sendDashboard(reply);
  });
  const ICON_CACHE = "public, max-age=86400";
  app.get("/favicon.ico", async (_req, reply) => {
    reply.header("Cache-Control", ICON_CACHE).type("image/x-icon").send(FAVICON_ICO);
  });
  app.get("/icon.png", async (_req, reply) => {
    reply.header("Cache-Control", ICON_CACHE).type("image/png").send(ICON_PNG);
  });
  app.get("/dashboard.js", async (_req, reply) => {
    reply.headers(SECURITY_HEADERS).type("application/javascript; charset=utf-8").send(DASHBOARD_JS);
  });
}
