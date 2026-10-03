// Skrip dashboard admin (vanilla JS, tanpa library). Disajikan di /dashboard.js.
// Catatan: jangan pakai backtick atau "${" di dalam skrip ini karena dibungkus template string.
export const DASHBOARD_JS = String.raw`
(function () {
  "use strict";
  var KEY = "migimo_admin_token";
  var token = "";
  try { token = sessionStorage.getItem(KEY) || ""; } catch (e) {}
  var simMode = false;
  var $ = function (id) { return document.getElementById(id); };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function rupiah(v) { return v == null ? "-" : "Rp" + Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }); }
  function wib(t) {
    if (!t) return "-";
    return new Date(t).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }
  function toast(msg, ms) {
    var t = $("toast"); t.textContent = msg; t.style.display = "block";
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.style.display = "none"; }, ms || 3500);
  }

  function api(path, body) {
    var opt = { method: body === undefined ? "GET" : "POST", headers: authHeaders(), credentials: "same-origin" };
    if (body !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(body); }
    return fetch(path, opt).then(function (r) {
      if (r.status === 401) { logout("Token salah atau kedaluwarsa."); throw new Error("Unauthorized"); }
      var ct = r.headers.get("content-type") || "";
      var p = ct.indexOf("json") >= 0 ? r.json() : r.text();
      return p.then(function (d) {
        if (!r.ok) throw new Error((d && (d.error || d.message)) || ("HTTP " + r.status));
        return d;
      });
    });
  }
  function authHeaders() {
    var h = { "X-Migimo-Dashboard": "1" };
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }
  function download(path, name) {
    fetch(path, { headers: authHeaders(), credentials: "same-origin" })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.blob(); })
      .then(function (b) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name;
        document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      })
      .catch(function (e) { toast("Gagal mengunduh: " + e.message); });
  }

  function badge(status) {
    var m = {
      paid: ["b-ok", "Dibayar"], qr_generated: ["b-info", "QR dibuat"], created: ["b-mut", "Dibuat"],
      failed: ["b-bad", "Gagal"], refunded: ["b-wait", "Refund"], timeout: ["b-wait", "Timeout"], error: ["b-bad", "Error"],
      pass: ["b-ok", "Lulus"], fail: ["b-bad", "Tidak lulus"], needs_payment: ["b-wait", "Perlu pembayaran"],
      needs_clarification: ["b-wait", "Menunggu klarifikasi"], manual: ["b-mut", "Manual"]
    }[status] || ["b-mut", status || "-"];
    return '<span class="b ' + m[0] + '">' + esc(m[1]) + "</span>";
  }

  function busy(btn, on) { if (btn) { btn.disabled = on; } }

  // ---------- Login ----------
  var googleOn = false;
  function showApp(who) { $("login").hidden = true; $("app").hidden = false; $("whoami").textContent = who || ""; init(); }
  function logout(msg) {
    token = ""; try { sessionStorage.removeItem(KEY); } catch (e) {}
    $("app").hidden = true; $("login").hidden = false; $("loginErr").textContent = msg || "";
    $("googleBtn").hidden = !googleOn;
  }
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    token = $("tokenInput").value.trim();
    api("/admin/orders?limit=1").then(function () {
      try { sessionStorage.setItem(KEY, token); } catch (e2) {}
      $("tokenInput").value = ""; showApp("ADMIN_TOKEN");
    }).catch(function (err) { if (err.message !== "Unauthorized") $("loginErr").textContent = err.message; });
  });
  $("logout").addEventListener("click", function () {
    fetch("/auth/logout", { method: "POST", headers: { "X-Migimo-Dashboard": "1" }, credentials: "same-origin" })
      .catch(function () {}).then(function () { logout("Anda sudah keluar."); });
  });
  var LOGIN_MSG = {
    ditolak: "Email ini belum terdaftar sebagai admin Migimo.",
    gagal: "Login Google gagal. Coba lagi.",
    dibatalkan: "Login dibatalkan.",
    sesi_kedaluwarsa: "Sesi login kedaluwarsa. Coba lagi.",
    belum_dikonfigurasi: "Login Google belum dikonfigurasi."
  };

  // ---------- Tab ----------
  var tabs = document.querySelectorAll("[role=tab]");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.setAttribute("aria-selected", String(x === t)); });
      document.querySelectorAll("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
      if (t.getAttribute("data-tab") === "orders") loadOrders();
      if (t.getAttribute("data-tab") === "uat") loadUat();
      if (t.getAttribute("data-tab") === "logs") loadLogs();
      if (t.getAttribute("data-tab") === "audit") loadAudit();
      if (t.getAttribute("data-tab") === "wa") loadWa();
    });
  });

  // ---------- Dialog ----------
  function openDialog(html) { $("dlgBody").innerHTML = html; $("dlg").showModal(); }
  $("dlgClose").addEventListener("click", function () { $("dlg").close(); });

  // ---------- Pesanan ----------
  function loadOrders() {
    return api("/admin/orders?limit=100").then(function (rows) {
      $("ordersBody").innerHTML = rows.length ? rows.map(function (o) {
        var acts = '<button class="btn sec sm" data-act="detail" data-id="' + esc(o.id) + '">Detail</button> ';
        if (o.reference_no) acts += '<button class="btn sec sm" data-act="inquiry" data-id="' + esc(o.id) + '">Cek status</button> ';
        if (o.status === "paid") acts += '<button class="btn sec sm" data-act="refund" data-id="' + esc(o.id) + '">Refund</button> ';
        if (simMode && o.status === "qr_generated") acts += '<button class="btn sm" data-act="pay" data-id="' + esc(o.id) + '">Bayar (simulasi)</button>';
        return "<tr><td class=num>" + esc(o.id) + "</td><td class=num>" + esc(wib(o.created_at)) + "</td><td class=num>" + esc(rupiah(o.amount)) +
          (o.fee_amount ? '<div class="muted">biaya ' + esc(rupiah(o.fee_amount)) + "</div>" : "") +
          "</td><td>" + badge(o.status) + '</td><td class="mono">' + esc(o.reference_no || "-") + "</td><td>" + esc(o.scenario || "-") + "</td><td>" + acts + "</td></tr>";
      }).join("") : '<tr><td colspan="7" class="muted">Belum ada pesanan.</td></tr>';
    }).catch(function (e) { if (e.message !== "Unauthorized") toast(e.message); });
  }

  $("ordersBody").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]"); if (!b) return;
    var id = b.getAttribute("data-id"), act = b.getAttribute("data-act");
    busy(b, true);
    var done = function () { busy(b, false); };
    if (act === "detail") return showOrder(id).then(done, done);
    if (act === "inquiry") return api("/admin/orders/" + id + "/inquiry", {}).then(function (r) {
      toast("Status: " + (r.result.body && r.result.body.transactionStatusDesc || r.result.responseCode || r.result.error)); return loadOrders();
    }).catch(function (er) { toast(er.message); }).then(done);
    if (act === "refund") {
      if (!confirm("Refund pesanan #" + id + "?")) return done();
      return api("/admin/orders/" + id + "/refund", {}).then(function (r) {
        toast(r.result.ok ? "Refund berhasil" : "Refund gagal: " + (r.result.body && r.result.body.responseMessage || r.result.responseCode)); return loadOrders();
      }).catch(function (er) { toast(er.message); }).then(done);
    }
    if (act === "pay") return api("/admin/sim/pay/" + id, {}).then(function (r) {
      toast("Notifikasi pembayaran: " + (r[0] && r[0].body && r[0].body.responseCode)); return loadOrders();
    }).catch(function (er) { toast(er.message); }).then(done);
  });

  function showOrder(id) {
    return api("/admin/orders/" + id).then(function (o) {
      var html = "<h3>Pesanan #" + esc(o.id) + " " + badge(o.status) + "</h3>" +
        "<table>" +
        [["Nominal", rupiah(o.amount)], ["Biaya", o.fee_amount ? rupiah(o.fee_amount) : "-"], ["partnerReferenceNo", o.partner_reference_no],
         ["X-EXTERNAL-ID", o.external_id], ["Reference No", o.reference_no], ["Merchant / Terminal", o.merchant_id + " / " + o.terminal_id],
         ["Tanggal transaksi", o.transaction_date], ["Approval code", o.approval_code], ["Dibayar", wib(o.paid_at)], ["Refund", wib(o.refunded_at)]]
          .map(function (r) { return "<tr><th>" + esc(r[0]) + '</th><td class="mono">' + esc(r[1] || "-") + "</td></tr>"; }).join("") +
        "</table>" + (o.qr_content ? '<img class="qr" id="qrImg" alt="QRIS pesanan ' + esc(o.id) + '"><pre>' + esc(o.qr_content) + "</pre>" : "");
      openDialog(html);
      if (o.qr_content) {
        fetch("/admin/orders/" + id + "/qr.png", { headers: authHeaders(), credentials: "same-origin" })
          .then(function (r) { return r.blob(); }).then(function (bl) { var img = $("qrImg"); if (img) img.src = URL.createObjectURL(bl); });
      }
    }).catch(function (e) { toast(e.message); });
  }

  $("qrForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var btn = e.submitter; busy(btn, true);
    var body = { amount: Number($("qrAmount").value) };
    if ($("qrFee").value !== "") body.feeAmount = Number($("qrFee").value);
    api("/admin/qr", body).then(function (r) {
      toast(r.result.ok ? "QRIS dibuat (Ref " + r.order.reference_no + ")" : "Gagal: " + (r.result.body && r.result.body.responseMessage || r.result.responseCode || r.result.error), 5000);
      return loadOrders();
    }).catch(function (er) { toast(er.message); }).then(function () { busy(btn, false); });
  });
  $("refreshOrders").addEventListener("click", loadOrders);

  // ---------- UAT ----------
  var cases = [];
  function loadUat() {
    return Promise.all([cases.length ? cases : api("/admin/uat/cases"), api("/admin/uat/results")]).then(function (res) {
      cases = res[0];
      var byNo = {}; res[1].forEach(function (r) { byNo[r.no] = r; });
      var count = { pass: 0, fail: 0, other: 0, none: 0 };
      $("uatBody").innerHTML = cases.map(function (c) {
        var r = byNo[c.no];
        if (!r) count.none++; else if (r.status === "pass") count.pass++; else if (r.status === "fail") count.fail++; else count.other++;
        var extra = r && r.status === "needs_payment" && !simMode
          ? ' <input class="sm" style="width:90px" placeholder="# pesanan" data-order-for="' + c.no + '" inputmode="numeric">' : "";
        return "<tr><td class=num>" + c.no + "</td><td>" + esc(c.group) + "</td><td>" + esc(c.name) + "</td><td>" + esc(c.expected) + "</td><td>" +
          (r ? badge(r.status) + '<div class="muted">' + esc(r.actual) + "</div>" : '<span class="muted">Belum dijalankan</span>') +
          '</td><td class="mono">' + esc(r && r.responseCode || "-") + '</td><td class="muted">' + esc(r && r.note || "") +
          '</td><td style="white-space:nowrap"><button class="btn sec sm" data-run="' + c.no + '">Jalankan</button>' + extra + "</td></tr>";
      }).join("");
      $("uatSum").innerHTML = '<span class="b b-ok">Lulus ' + count.pass + '</span><span class="b b-bad">Tidak lulus ' + count.fail +
        '</span><span class="b b-wait">Perlu tindakan ' + count.other + '</span><span class="b b-mut">Belum dijalankan ' + count.none + "</span>";
      $("uatNote").textContent = simMode
        ? "Mode simulator: hasil ini latihan terhadap simulator, bukan UAT resmi Yokke."
        : "Mode live: skenario pembayaran (11, 18–30) butuh transaksi yang sudah dibayar di sandbox Yokke.";
    }).catch(function (e) { if (e.message !== "Unauthorized") toast(e.message); });
  }
  $("uatBody").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-run]"); if (!b) return;
    var no = b.getAttribute("data-run");
    var inp = document.querySelector('[data-order-for="' + no + '"]');
    var body = inp && inp.value ? { orderId: Number(inp.value) } : {};
    busy(b, true); b.textContent = "Berjalan…";
    api("/admin/uat/run/" + no, body).then(function (r) { toast("Skenario " + no + ": " + r.status); return loadUat(); })
      .catch(function (er) { toast(er.message); }).then(function () { b.textContent = "Jalankan"; busy(b, false); });
  });
  $("runAll").addEventListener("click", function () {
    var b = $("runAll");
    if (!simMode && !confirm("Jalankan ke-38 skenario terhadap sandbox Yokke?")) return;
    busy(b, true); b.textContent = "Berjalan… (bisa beberapa menit)";
    api("/admin/uat/run-all", {}).then(function () { toast("Selesai menjalankan 38 skenario"); return loadUat(); })
      .catch(function (er) { toast(er.message); }).then(function () { b.textContent = "Jalankan semua"; busy(b, false); });
  });
  $("dlUat").addEventListener("click", function () { download("/admin/uat/export.csv", "uat-qris-snap-mpm.csv"); });
  $("dlLogs").addEventListener("click", function () { download("/admin/logs.csv", "mti-logs.csv"); });

  // ---------- Log ----------
  var logRows = [];
  function loadLogs() {
    var f = $("logFilter").value.trim();
    return api("/admin/logs?limit=200" + (f ? "&scenario=" + encodeURIComponent(f) : "")).then(function (rows) {
      logRows = rows;
      $("logsBody").innerHTML = rows.length ? rows.map(function (l, i) {
        return "<tr><td class=num>" + esc(l.id) + "</td><td class=num>" + esc(wib(l.created_at)) + "</td><td>" + (l.direction === "in" ? "MTI → Migimo" : "Migimo → MTI") +
          "</td><td>" + esc(l.api) + "</td><td class=num>" + esc(l.http_status == null ? "-" : l.http_status) + '</td><td class="mono">' + esc(l.response_code || (l.error ? "error" : "-")) +
          "</td><td>" + esc(l.scenario || "-") + "</td><td class=num>" + esc(l.duration_ms == null ? "-" : l.duration_ms + " ms") +
          '</td><td><button class="btn sec sm" data-log="' + i + '">Lihat</button></td></tr>';
      }).join("") : '<tr><td colspan="9" class="muted">Belum ada log.</td></tr>';
    }).catch(function (e) { if (e.message !== "Unauthorized") toast(e.message); });
  }
  function pretty(s) { try { return JSON.stringify(JSON.parse(s), null, 2); } catch (e) { return s || ""; } }
  $("logsBody").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-log]"); if (!b) return;
    var l = logRows[Number(b.getAttribute("data-log"))];
    openDialog("<h3>Log #" + esc(l.id) + " · " + esc(l.api) + "</h3><p class=mono>" + esc(l.method + " " + l.url) + "</p>" +
      (l.error ? '<p style="color:var(--merah)">' + esc(l.error) + "</p>" : "") +
      "<h4>Request headers</h4><pre>" + esc(JSON.stringify(l.request_headers, null, 2)) + "</pre>" +
      "<h4>Request body</h4><pre>" + esc(pretty(l.request_body)) + "</pre>" +
      "<h4>Response (HTTP " + esc(l.http_status) + ")</h4><pre>" + esc(pretty(l.response_body)) + "</pre>");
  });
  $("refreshLogs").addEventListener("click", loadLogs);

  // ---------- Aktivitas ----------
  var ACT = {
    "/admin/qr": "Buat QRIS", "/admin/orders/:id/inquiry": "Cek status", "/admin/orders/:id/refund": "Refund",
    "/admin/uat/run/:no": "Jalankan skenario UAT", "/admin/uat/run-all": "Jalankan semua UAT",
    "/admin/sim/pay/:orderId": "Bayar (simulasi)", "/admin/wa/transfers/:id/dikirim": "Tandai kiriman disalurkan",
    "/admin/wa/contacts/:waId/send": "Balas WhatsApp", "/admin/wa/contacts/:waId/handoff": "Ubah status bot",
    "/admin/wa/uji": "Uji coba bot", "/admin/wa/uji/reset": "Mulai ulang uji bot", login: "Masuk", logout: "Keluar", login_ditolak: "Login ditolak"
  };
  function loadAudit() {
    return api("/admin/audit?limit=200").then(function (rows) {
      $("auditBody").innerHTML = rows.length ? rows.map(function (a) {
        var d = a.detail || {};
        var info = [];
        if (d.params && Object.keys(d.params).length) info.push(JSON.stringify(d.params));
        if (d.body && d.body.amount != null) info.push("nominal " + rupiah(d.body.amount));
        if (d.status) info.push("HTTP " + d.status);
        if (d.alasan) info.push(d.alasan);
        return "<tr><td class=num>" + esc(a.id) + "</td><td class=num>" + esc(wib(a.at)) + "</td><td>" + esc(a.actor) +
          "</td><td>" + esc(ACT[a.action] || a.action) + '</td><td class="muted">' + esc(info.join(" · ")) + "</td></tr>";
      }).join("") : '<tr><td colspan="5" class="muted">Belum ada aktivitas.</td></tr>';
    }).catch(function (e) { if (e.message !== "Unauthorized") toast(e.message); });
  }
  $("refreshAudit").addEventListener("click", loadAudit);

  // ---------- WhatsApp ----------
  var WA_ST = {
    menunggu_bayar: ["b-info", "Menunggu bayar"], dibayar: ["b-wait", "Dibayar, perlu disalurkan"],
    dikirim: ["b-ok", "Disalurkan"], batal: ["b-mut", "Batal"]
  };
  function waBadge(s) { var m = WA_ST[s] || ["b-mut", s]; return '<span class="b ' + m[0] + '">' + esc(m[1]) + "</span>"; }
  function onOff(ok, label) { return '<span class="b ' + (ok ? "b-ok" : "b-bad") + '">' + esc(label) + ": " + (ok ? "siap" : "belum diatur") + "</span>"; }
  function teksBlok(content) {
    return (content || []).filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("\n");
  }
  function loadWa() {
    api("/admin/wa/status").then(function (s) {
      $("waStatus").innerHTML = onOff(s.whatsapp, "WhatsApp Cloud API") + onOff(s.webhookAman, "Webhook") + onOff(s.ai, "AI (" + s.model + ")");
    }).catch(function () {});
    api("/admin/wa/transfers").then(function (rows) {
      $("waTransfers").innerHTML = rows.length ? rows.map(function (t) {
        var p = t.penerima || {};
        var act = t.status === "dibayar" ? '<button class="btn sm" data-salur="' + esc(t.id) + '">Sudah disalurkan</button>' : "";
        return "<tr><td class=num>" + esc(t.id) + "</td><td class=num>" + esc(wib(t.created_at)) + "</td><td>" + esc(t.nama_pengirim || "-") +
          '<div class="muted mono">' + esc(t.wa_id) + "</div></td><td>" + esc(p.nama) + '<div class="muted mono">' + esc(p.metode + " " + p.nomor) +
          "</div></td><td class=num>" + esc(rupiah(t.terima_rupiah)) + '<div class="muted">' + esc(t.mata_uang + " " + Number(t.kirim).toLocaleString("id-ID")) +
          "</div></td><td class=num>" + esc(rupiah(t.total_rupiah)) + '<div class="muted">pesanan #' + esc(t.order_id) + "</div></td><td>" + waBadge(t.status) +
          (t.disbursed_by ? '<div class="muted">' + esc(t.disbursed_by) + "</div>" : "") + "</td><td>" + act + "</td></tr>";
      }).join("") : '<tr><td colspan="8" class="muted">Belum ada kiriman lewat WhatsApp.</td></tr>';
    }).catch(function (e) { if (e.message !== "Unauthorized") toast(e.message); });
    api("/admin/wa/contacts").then(function (rows) {
      $("waContacts").innerHTML = rows.length ? rows.map(function (c) {
        return '<tr><td class="mono">' + esc(c.wa_id) + "</td><td>" + esc(c.name || "-") + "</td><td class=num>" + esc(wib(c.last_message_at)) +
          "</td><td class=num>" + esc(c.kiriman) + "</td><td>" + (c.handoff ? '<span class="b b-wait">Ditangani tim</span>' : '<span class="b b-ok">Bot aktif</span>') +
          '</td><td><button class="btn sec sm" data-chat="' + esc(c.wa_id) + '" data-handoff="' + (c.handoff ? 1 : 0) + '">Buka</button></td></tr>';
      }).join("") : '<tr><td colspan="6" class="muted">Belum ada percakapan.</td></tr>';
    }).catch(function () {});
  }
  $("refreshWa").addEventListener("click", loadWa);
  $("waTransfers").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-salur]"); if (!b) return;
    var id = b.getAttribute("data-salur");
    if (!confirm("Dana kiriman #" + id + " sudah benar-benar ditransfer ke penerima? Pengirim akan dikabari lewat WhatsApp.")) return;
    busy(b, true);
    api("/admin/wa/transfers/" + id + "/dikirim", {}).then(function () { toast("Kiriman #" + id + " ditandai disalurkan"); loadWa(); })
      .catch(function (er) { toast(er.message); busy(b, false); });
  });

  function bubbles(msgs) {
    return msgs.map(function (m) {
      var t = teksBlok(m.content);
      if (!t) {
        var tools = (m.content || []).filter(function (b) { return b.type === "tool_use"; }).map(function (b) { return b.name; });
        return tools.length ? '<div class="bub s">alat: ' + esc(tools.join(", ")) + "</div>" : "";
      }
      var cls = m.role === "user" ? "u" : m.role === "team" ? "t" : "a";
      return '<div class="bub ' + cls + '">' + (m.role === "team" ? "<strong>Tim:</strong> " : "") + esc(t) + "</div>";
    }).join("");
  }
  var chatId = null;
  function openChat(waId, handoff) {
    chatId = waId;
    api("/admin/wa/contacts/" + encodeURIComponent(waId) + "/messages").then(function (msgs) {
      openDialog("<h3>Percakapan " + esc(waId) + "</h3>" +
        '<div class="row" style="margin-bottom:8px"><button class="btn sec sm" id="hoBtn" data-on="' + (handoff ? 0 : 1) + '">' +
        (handoff ? "Aktifkan bot lagi" : "Ambil alih (matikan bot)") + "</button></div>" +
        '<div class="chat" id="chatLog">' + bubbles(msgs) + "</div>" +
        '<form id="replyForm" class="row" style="margin-top:10px"><label style="flex:1">Balas sebagai tim<input id="replyInput" autocomplete="off" required></label><button class="btn" type="submit">Kirim</button></form>' +
        '<p class="muted">WhatsApp hanya mengizinkan balasan bebas dalam 24 jam sejak pesan terakhir pengguna.</p>');
      var log = $("chatLog"); log.scrollTop = log.scrollHeight;
      $("hoBtn").addEventListener("click", function () {
        var on = this.getAttribute("data-on") === "1";
        api("/admin/wa/contacts/" + encodeURIComponent(chatId) + "/handoff", { on: on }).then(function () {
          toast(on ? "Bot dimatikan untuk percakapan ini" : "Bot aktif lagi"); $("dlg").close(); loadWa();
        }).catch(function (er) { toast(er.message); });
      });
      $("replyForm").addEventListener("submit", function (ev) {
        ev.preventDefault();
        var txt = $("replyInput").value.trim(); if (!txt) return;
        var btn = ev.submitter; busy(btn, true);
        api("/admin/wa/contacts/" + encodeURIComponent(chatId) + "/send", { text: txt }).then(function () {
          $("replyInput").value = ""; return openChat(chatId, handoff);
        }).catch(function (er) { toast(er.message); busy(btn, false); });
      });
    }).catch(function (e) { toast(e.message); });
  }
  $("waContacts").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-chat]"); if (!b) return;
    openChat(b.getAttribute("data-chat"), b.getAttribute("data-handoff") === "1");
  });

  function ujiAdd(cls, html) {
    var d = document.createElement("div"); d.className = "bub " + cls; d.innerHTML = html;
    var log = $("ujiLog"); log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  $("ujiForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var txt = $("ujiInput").value.trim(); if (!txt) return;
    var btn = e.submitter; busy(btn, true);
    $("ujiInput").value = ""; ujiAdd("u", esc(txt)); ujiAdd("s", "mengetik…");
    api("/admin/wa/uji", { pesan: txt }).then(function (r) {
      var log = $("ujiLog"); log.removeChild(log.lastChild);
      if (!r.keluar.length) ujiAdd("s", "(tidak ada balasan)");
      r.keluar.forEach(function (k) {
        if (k.type === "image") ujiAdd("a", '<img alt="QRIS" src="' + esc(k.dataUrl) + '">' + esc(k.caption || ""));
        else ujiAdd("a", esc(k.text));
      });
      loadWa();
    }).catch(function (er) { var log = $("ujiLog"); log.removeChild(log.lastChild); ujiAdd("s", esc("Gagal: " + er.message)); })
      .then(function () { busy(btn, false); $("ujiInput").focus(); });
  });
  $("ujiReset").addEventListener("click", function () {
    api("/admin/wa/uji/reset", {}).then(function () { $("ujiLog").innerHTML = ""; toast("Percakapan uji dimulai ulang"); })
      .catch(function (er) { toast(er.message); });
  });

  // ---------- Mulai ----------
  function init() {
    fetch("/health").then(function (r) { return r.json(); }).then(function (h) {
      simMode = h.mode !== "live";
      var p = $("modePill"); p.textContent = "Mode MTI: " + (simMode ? "simulator" : "live"); p.className = "pill " + (simMode ? "sim" : "live");
      loadOrders();
    });
  }
  var qs = new URLSearchParams(location.search);
  var loginMsg = LOGIN_MSG[qs.get("login")] || "";
  if (qs.has("login")) history.replaceState(null, "", location.pathname);
  fetch("/auth/me", { credentials: "same-origin" }).then(function (r) {
    return r.json().then(function (d) { return { ok: r.ok, d: d }; });
  }).then(function (res) {
    googleOn = !!res.d.google;
    if (res.ok) return showApp(res.d.email);
    if (token) return showApp("ADMIN_TOKEN");
    logout(loginMsg);
  }).catch(function () { if (token) showApp("ADMIN_TOKEN"); else logout(loginMsg); });
})();
`;
