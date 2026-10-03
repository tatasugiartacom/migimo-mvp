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
    var opt = { method: body === undefined ? "GET" : "POST", headers: { Authorization: "Bearer " + token } };
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
  function download(path, name) {
    fetch(path, { headers: { Authorization: "Bearer " + token } })
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
  function showApp() { $("login").hidden = true; $("app").hidden = false; init(); }
  function logout(msg) {
    token = ""; try { sessionStorage.removeItem(KEY); } catch (e) {}
    $("app").hidden = true; $("login").hidden = false; $("loginErr").textContent = msg || "";
  }
  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    token = $("tokenInput").value.trim();
    api("/admin/orders?limit=1").then(function () {
      try { sessionStorage.setItem(KEY, token); } catch (e2) {}
      $("tokenInput").value = ""; showApp();
    }).catch(function (err) { if (err.message !== "Unauthorized") $("loginErr").textContent = err.message; });
  });
  $("logout").addEventListener("click", function () { logout(); });

  // ---------- Tab ----------
  var tabs = document.querySelectorAll("[role=tab]");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.setAttribute("aria-selected", String(x === t)); });
      document.querySelectorAll("[data-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== t.getAttribute("data-tab"); });
      if (t.getAttribute("data-tab") === "orders") loadOrders();
      if (t.getAttribute("data-tab") === "uat") loadUat();
      if (t.getAttribute("data-tab") === "logs") loadLogs();
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
        fetch("/admin/orders/" + id + "/qr.png", { headers: { Authorization: "Bearer " + token } })
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

  // ---------- Mulai ----------
  function init() {
    fetch("/health").then(function (r) { return r.json(); }).then(function (h) {
      simMode = h.mode !== "live";
      var p = $("modePill"); p.textContent = "Mode MTI: " + (simMode ? "simulator" : "live"); p.className = "pill " + (simMode ? "sim" : "live");
      loadOrders();
    });
  }
  if (token) showApp(); else logout();
})();
`;
