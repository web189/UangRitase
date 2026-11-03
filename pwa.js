/* ============================================================
   pwa.js — UangRitase v17
   1) Mendaftarkan service worker (offline + update otomatis)
   2) Lencana Online / Offline + waktu sinkron terakhir
   3) Tombol "Pasang Aplikasi" (hero, app bar, dock HP) + panduan
   4) Banner "Versi baru siap" + muat ulang otomatis saat aman
   Tanpa library, ES5 — aman untuk Chrome/Edge di Windows 7.
   ============================================================ */
(function () {
  'use strict';

  var tag = document.querySelector('script[src*="pwa.js"]');
  var APP_NAME = (tag && tag.getAttribute('data-app-name')) || document.title || 'Aplikasi';
  var root = document.documentElement;
  var BOOT = Date.now();
  var SNOOZE_KEY = 'pwaInstallDismissed:' + location.pathname;
  var SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function toast(msg, type, ms) { if (window.urToast) window.urToast(msg, type || 'info', ms || 3200); }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function hhmm(t) { var d = new Date(t); return pad(d.getHours()) + '.' + pad(d.getMinutes()); }

  /* ───────────────────────── 1. status koneksi ───────────────────────── */
  var chip = $('connChip'), txt = $('connTxt'), sub = $('syncTime');
  var st = { online: navigator.onLine !== false, server: null, failed: false, kind: '', t: 0 };

  function paintConn() {
    if (!chip) return;
    var cls, label = '', extra = '';
    if (!st.online) {
      cls = 'is-offline'; label = 'Offline · data tersimpan';
      if (st.kind === 'default') label = 'Offline · data bawaan';
      extra = st.t ? 'sinkron ' + hhmm(st.t) : '';
    } else if (st.server === true) {
      cls = 'is-online'; label = 'Online'; extra = st.t ? 'sinkron ' + hhmm(st.t) : '';
    } else if (st.failed) {
      cls = 'is-offline'; label = 'Server belum terjangkau'; extra = st.t ? 'data ' + hhmm(st.t) : '';
    } else {
      cls = 'is-sync'; label = st.kind === 'cache' ? 'Memperbarui…' : 'Menyambung…';
    }
    chip.className = 'conn ' + cls;
    if (txt) txt.textContent = label;
    if (sub) sub.textContent = extra ? '· ' + extra : '';
    root.classList.toggle('is-offline', !st.online);
  }
  window.addEventListener('ur:conn', function (e) {
    var d = e.detail || {};
    st.server = !!d.server; st.failed = !!d.failed && !d.server;
    paintConn();
  });
  window.addEventListener('ur:data', function (e) {
    var d = e.detail || {};
    st.kind = d.kind || ''; if (d.t) st.t = d.t;
    if (d.kind === 'server') { st.server = true; st.failed = false; }
    paintConn();
  });
  window.addEventListener('offline', function () {
    st.online = false; paintConn();
    toast('Anda offline. Data terakhir tetap bisa dilihat.', 'warn', 3600);
  });
  window.addEventListener('online', function () {
    st.online = true; st.server = null; paintConn();
    toast('Kembali online. Memeriksa data & pembaruan…', 'success', 2800);
    checkForUpdate(true);
  });
  paintConn();

  /* ───────────────────────── 2. service worker + update ───────────────────────── */
  var reg = null, refreshing = false, updateReady = false, lastCheck = 0;
  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

  /* cek cepat ke server untuk file-file utama (balasan 304 = hampir gratis).
     Service worker membandingkan versinya dan mengabari bila ada yang baru. */
  var WATCH = ['./', 'app.js', 'style-v17.css', 'hud.js', 'pwa.js'];
  function checkForUpdate(force) {
    var now = Date.now();
    if (!force && now - lastCheck < 60000) return;
    if (st.online === false) return;
    lastCheck = now;
    try { if (reg && reg.update) reg.update().catch(function () {}); } catch (e) {}
    WATCH.forEach(function (u) { try { fetch(u, { credentials: 'same-origin' }).catch(function () {}); } catch (e) {} });
  }

  function isBusy() {
    if (document.querySelector('.modal-overlay.modal-open')) return true;
    var a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value);
  }
  function applyUpdate() {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  }

  var bar = $('updBar'), msgEl = $('updMsg'), goBtn = $('updBtn'), xBtn = $('updX'), barAction = null;
  function showBar(message, label, action) {
    if (!bar) return;
    msgEl.textContent = message; goBtn.textContent = label; barAction = action;
    bar.hidden = false;
    setTimeout(function () { bar.classList.add('show'); }, 20);
  }
  function hideBar() {
    if (!bar) return;
    bar.classList.remove('show');
    setTimeout(function () { bar.hidden = true; }, 300);
    barAction = null;
  }
  if (goBtn) goBtn.addEventListener('click', function () { var a = barAction; hideBar(); if (a) a(); });
  if (xBtn) xBtn.addEventListener('click', function () { if (barAction === offerInstall) snooze(); hideBar(); });

  function newVersion() {
    if (updateReady) return;
    updateReady = true;
    /* baru saja dibuka & belum ada yang diketik → langsung muat ulang, tanpa terasa */
    if (Date.now() - BOOT < 8000 && !isBusy()) { applyUpdate(); return; }
    showBar('Versi baru siap dipakai', 'Perbarui', applyUpdate);
    /* aplikasi disembunyikan / ditinggal → muat ulang diam-diam */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && updateReady && !isBusy()) applyUpdate();
    });
  }

  function onSwMessage(e) {
    var d = e.data || {};
    if (d.type === 'CONTENT_UPDATED') newVersion();
    if (d.type === 'SW_ACTIVE') {
      if (d.offlineReady) {
        root.classList.add('offline-ready');
        if (!lsGet('ur_offline_ok')) { lsSet('ur_offline_ok', '1'); toast('Siap dipakai offline ✓ — data tersimpan di perangkat.', 'success', 4200); }
      }
      showVersion(d.build);
    }
    if (d.type === 'VERSION') showVersion(d.build);
  }

  function showVersion(b) {
    if (!b) return;
    var inner = document.querySelector('.footer-inner'); if (!inner) return;
    var v = inner.querySelector('.ver');
    if (!v) { v = document.createElement('small'); v.className = 'ver'; inner.appendChild(v); }
    v.textContent = 'Versi ' + b + (root.classList.contains('offline-ready') ? ' · siap offline' : '');
  }

  if ('serviceWorker' in navigator && secure) {
    try {
      navigator.serviceWorker.addEventListener('message', onSwMessage);
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        /* pemasangan pertama (belum ada pengendali sebelumnya) → bukan pembaruan */
        if (!hadController) { hadController = true; return; }
        newVersion();
      });
      navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (r) {
        reg = r;
        if (navigator.serviceWorker.controller) {
          try { navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }); } catch (e) {}
          root.classList.add('offline-ready');
        }
        setTimeout(function () { checkForUpdate(true); }, 3000);
      }).catch(function (err) { if (window.console) console.warn('[PWA] service worker gagal didaftarkan:', err); });
    } catch (e) {}
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') checkForUpdate(false); });
    setInterval(function () { if (document.visibilityState === 'visible') checkForUpdate(false); }, 20 * 60 * 1000);
  }

  /* ───────────────────────── 3. pasang aplikasi ───────────────────────── */
  var deferred = null, guideOpen = false;

  function isStandalone() {
    try {
      return (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
              window.matchMedia('(display-mode: minimal-ui)').matches ||
              window.matchMedia('(display-mode: window-controls-overlay)').matches)) ||
             window.navigator.standalone === true;
    } catch (e) { return false; }
  }
  function snoozed() { var t = parseInt(lsGet(SNOOZE_KEY) || '0', 10); return !!t && (Date.now() - t) < SNOOZE_MS; }
  function snooze() { lsSet(SNOOZE_KEY, String(Date.now())); }
  function markInstalled() { root.classList.add('is-installed'); root.classList.remove('can-install'); }
  if (isStandalone()) markInstalled();

  window.pwaInstall = function () {
    if (!deferred) return false;
    var p = deferred; deferred = null; root.classList.remove('can-install');
    p.prompt();
    if (p.userChoice && p.userChoice.then) p.userChoice.then(function (c) {
      if (c && c.outcome === 'accepted') toast('Memasang aplikasi…', 'success', 3000);
      else snooze();
    });
    return true;
  };

  function offerInstall() { window.pwaInstall(); }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    root.classList.add('can-install');
    try { window.dispatchEvent(new CustomEvent('pwa-installable')); } catch (x) {}
    /* di komputer: tawarkan sekali (tidak mengganggu di HP, ada dock) */
    setTimeout(function () {
      if (deferred && !snoozed() && !isStandalone() && !updateReady && bar && bar.hidden &&
          window.matchMedia && window.matchMedia('(min-width: 800px)').matches) {
        showBar('Pasang ' + APP_NAME + ' — bisa offline & lebih cepat', 'Pasang', offerInstall);
      }
    }, 7000);
  });
  window.addEventListener('appinstalled', function () {
    deferred = null; markInstalled();
    if (barAction === offerInstall) hideBar();
    toast('Aplikasi berhasil dipasang ✓', 'success', 3600);
  });

  function guide() {
    if (guideOpen) return;
    guideOpen = true;
    var ua = navigator.userAgent || '';
    var isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var wide = window.matchMedia && window.matchMedia('(min-width: 800px)').matches;
    var tabs = {
      a: ['Ketuk menu <b>⋮</b> (tiga titik) di pojok kanan atas browser.',
          'Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.',
          'Ketuk <b>Instal</b>. Ikon UangRitase muncul di layar HP.'],
      i: ['Buka halaman ini di <b>Safari</b>.',
          'Ketuk tombol <b>Bagikan</b> (kotak dengan panah ke atas).',
          'Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.'],
      d: ['Gunakan <b>Chrome</b> atau <b>Edge</b> (Windows 7 didukung sampai Chrome/Edge 109).',
          'Klik ikon <b>Instal</b> di ujung kanan kolom alamat, atau menu <b>⋮</b> → <b>Instal UangRitase</b>.',
          'Klik <b>Instal</b>. Aplikasi terbuka di jendela sendiri dan ikonnya ada di desktop.']
    };
    var g = document.createElement('div');
    g.className = 'pwa-guide';
    g.innerHTML = '<div class="pwa-sheet" role="dialog" aria-label="Cara memasang aplikasi">' +
      '<h3><span class="pg-ic"><svg class="sv"><use href="#i-install"/></svg></span>Pasang ' + APP_NAME + '</h3>' +
      '<p class="sub">Browser belum menampilkan jendela pasang otomatis. Ikuti langkah singkat ini:</p>' +
      '<div class="pwa-benefits"><span>Bisa offline</span><span>Update otomatis</span><span>Buka lebih cepat</span><span>Gratis</span></div>' +
      '<div class="pwa-tabs"><button type="button" data-t="a">Android</button><button type="button" data-t="i">iPhone</button><button type="button" data-t="d">Komputer</button></div>' +
      '<div class="pwa-body"></div><button class="pwa-close" type="button">Mengerti</button></div>';
    document.body.appendChild(g);
    var body = g.querySelector('.pwa-body');
    function tab(t) {
      body.innerHTML = '<ol>' + tabs[t].map(function (x) { return '<li><span>' + x + '</span></li>'; }).join('') + '</ol>';
      [].forEach.call(g.querySelectorAll('.pwa-tabs button'), function (b) { b.classList.toggle('on', b.getAttribute('data-t') === t); });
    }
    tab(isIOS ? 'i' : (wide ? 'd' : 'a'));
    [].forEach.call(g.querySelectorAll('.pwa-tabs button'), function (b) { b.onclick = function () { tab(b.getAttribute('data-t')); }; });
    function close() { guideOpen = false; g.classList.remove('show'); setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g); }, 280); }
    g.querySelector('.pwa-close').onclick = close;
    g.addEventListener('click', function (e) { if (e.target === g) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
    requestAnimationFrame(function () { requestAnimationFrame(function () { g.classList.add('show'); }); });
  }

  function bindInstall() {
    var btns = document.querySelectorAll('.js-install');
    [].forEach.call(btns, function (b) {
      b.addEventListener('click', function () { if (!window.pwaInstall()) guide(); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindInstall); else bindInstall();
})();
