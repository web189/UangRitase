/* ============================================================
   pwa.js — mendaftarkan service worker + tombol "Pasang Aplikasi"
   (mirip WhatsApp Web: bisa dipasang jadi aplikasi di komputer).
   Dipasang lewat:  <script src="pwa.js" data-app-name="..." data-accent="#..." defer></script>
   ============================================================ */
(function () {
  'use strict';

  var tag = document.querySelector('script[src*="pwa.js"]');
  var APP_NAME = (tag && tag.getAttribute('data-app-name')) || document.title || 'Aplikasi';
  var ACCENT = (tag && tag.getAttribute('data-accent')) || '#2f7dff';
  var KEY = 'pwaInstallDismissed:' + location.pathname;
  var SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

  /* ---- 1. Service worker ---- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (err) {
        if (window.console) console.warn('[PWA] service worker gagal didaftarkan:', err);
      });
    });
  }

  /* ---- 2. Tombol pasang ---- */
  var deferred = null;
  var bar = null;

  function isStandalone() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
             window.navigator.standalone === true;
    } catch (e) { return false; }
  }
  function snoozed() {
    try { var t = parseInt(localStorage.getItem(KEY) || '0', 10); return t && (Date.now() - t) < SNOOZE_MS; }
    catch (e) { return false; }
  }
  function snooze() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }
  function textOn(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return '#fff';
    var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#06121f' : '#ffffff';
  }
  function hide() { if (bar && bar.parentNode) bar.parentNode.removeChild(bar); bar = null; }

  function show() {
    if (bar || !deferred || isStandalone() || snoozed()) return;
    /* hanya tampil di layar lebar (komputer); di HP browser sudah punya menu sendiri */
    if (window.matchMedia && !window.matchMedia('(min-width: 800px)').matches) return;

    bar = document.createElement('div');
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Pasang aplikasi');
    bar.style.cssText = 'position:fixed;left:18px;bottom:18px;z-index:2147483000;display:flex;align-items:center;gap:12px;' +
      'max-width:420px;padding:12px 14px;border-radius:14px;background:rgba(12,17,30,.96);color:#eef3ff;' +
      'font:13px/1.35 "Segoe UI",Arial,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.12)';

    var msg = document.createElement('div');
    msg.style.cssText = 'flex:1;min-width:0';
    var b = document.createElement('strong');
    b.style.cssText = 'display:block;font-size:13.5px';
    b.textContent = 'Pasang ' + APP_NAME;
    var s = document.createElement('span');
    s.style.cssText = 'opacity:.75;font-size:12px';
    s.textContent = 'Buka langsung dari desktop, tanpa browser.';
    msg.appendChild(b); msg.appendChild(s);

    var ok = document.createElement('button');
    ok.type = 'button'; ok.textContent = 'Pasang';
    ok.style.cssText = 'border:0;border-radius:9px;padding:8px 16px;font:600 13px "Segoe UI",Arial,sans-serif;cursor:pointer;' +
      'background:' + ACCENT + ';color:' + textOn(ACCENT);
    ok.onclick = function () { window.pwaInstall(); };

    var no = document.createElement('button');
    no.type = 'button'; no.textContent = '\u00d7'; no.setAttribute('aria-label', 'Tutup');
    no.style.cssText = 'border:0;background:transparent;color:#9fb0d0;font-size:20px;line-height:1;cursor:pointer;padding:2px 6px';
    no.onclick = function () { snooze(); hide(); };

    bar.appendChild(msg); bar.appendChild(ok); bar.appendChild(no);
    document.body.appendChild(bar);
  }

  /* bisa dipanggil dari tombol buatan sendiri di situs: onclick="pwaInstall()" */
  window.pwaInstall = function () {
    if (!deferred) return false;
    var p = deferred; deferred = null; hide();
    p.prompt();
    if (p.userChoice && p.userChoice.then) p.userChoice.then(function (c) { if (c && c.outcome !== 'accepted') snooze(); });
    return true;
  };

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    window.dispatchEvent(new CustomEvent('pwa-installable'));
    if (document.readyState === 'complete') setTimeout(show, 2500);
    else window.addEventListener('load', function () { setTimeout(show, 2500); });
  });
  window.addEventListener('appinstalled', function () { deferred = null; hide(); });
})();
