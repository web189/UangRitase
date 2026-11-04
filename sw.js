/* ============================================================
   Service Worker — UangRitase v17  ("Offline-first + auto update")

   Cara kerja:
   1) PASANG   : seluruh file aplikasi (HTML, CSS, JS, ikon) + Font Awesome,
                 font Google, dan modul Firebase disimpan di perangkat.
                 Setelah itu aplikasi bisa dibuka TANPA internet.
   2) BUKA     : halaman & file muncul instan dari simpanan perangkat
                 (stale-while-revalidate).
   3) UPDATE   : di latar belakang, begitu ada internet, setiap file
                 dicek ke server (ETag / Last-Modified). Kalau ada yang
                 berubah, simpanan diganti dan halaman diberi tahu
                 ("Versi baru siap") — tanpa perlu hapus cache manual.
   4) DATA     : data harga (Firebase) TIDAK dicegat di sini. Salinan terakhirnya
                 disimpan oleh app.js di perangkat untuk mode offline.

   Mengubah BUILD di bawah memaksa pemasangan ulang seluruh simpanan
   (opsional — file yang berubah sudah terdeteksi otomatis).
   Kompatibel Chrome/Edge di Windows 7 (sampai v109).
   ============================================================ */
'use strict';

var BUILD = '2026-11-04.17.1';
var SHELL = 'ur-shell-' + BUILD;      /* file milik situs (diganti tiap BUILD)      */
var CDN   = 'ur-cdn-v1';              /* pustaka luar berversi (awet antar BUILD)    */

var SCOPE_URL  = new URL('./', self.location).href;
var SCOPE_PATH = new URL('./', self.location).pathname;
var OFFLINE_URL = new URL('offline.html', self.location).href;

/* File inti yang disimpan saat pemasangan (relatif terhadap sw.js) */
var PRECACHE = [
  './', 'offline.html', 'manifest.json', 'style-v17.css',
  'app.js', 'hud.js', 'pwa.js', 'notif-trading.min.js',
  'favicon.png', 'img/logo1.png', 'img/logo2.png',
  'img/icon-192-v3.png', 'img/icon-512-v3.png',
  'img/icon-192-maskable-v3.png', 'img/icon-512-maskable-v3.png',
  'img/apple-touch-icon-v3.png'
];

/* Pustaka luar yang disimpan di muka supaya kunjungan pertama pun siap offline */
var FA_CSS    = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css';
var FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap';
var FB_BASE   = 'https://www.gstatic.com/firebasejs/11.0.0/';
var FB_MODULES = [FB_BASE + 'firebase-app.js', FB_BASE + 'firebase-database.js', FB_BASE + 'firebase-auth.js'];

/* ---------- util ---------- */
function broadcast(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    list.forEach(function (c) { try { c.postMessage(msg); } catch (e) {} });
  });
}
function okRes(res) { return res && res.status === 200 && (res.type === 'basic' || res.type === 'cors'); }

/* apakah salinan di server berbeda dari yang tersimpan? */
function changed(oldRes, newRes) {
  if (!oldRes || !newRes) return false;
  var a = oldRes.headers.get('etag'), b = newRes.headers.get('etag');
  if (a && b) return a !== b;
  a = oldRes.headers.get('last-modified'); b = newRes.headers.get('last-modified');
  if (a && b) return a !== b;
  a = oldRes.headers.get('content-length'); b = newRes.headers.get('content-length');
  return !!(a && b && a !== b);
}

/* beberapa file berubah sekaligus → satu kabar saja */
var pendingNotify = null, changedList = [];
function noteChanged(url) {
  changedList.push(url);
  if (pendingNotify) return;
  pendingNotify = setTimeout(function () {
    var list = changedList; changedList = []; pendingNotify = null;
    broadcast({ type: 'CONTENT_UPDATED', files: list.length, build: BUILD });
  }, 1800);
}

/* ---------- penyimpanan pustaka luar di muka ---------- */
function fetchCors(url) { return fetch(new Request(url, { mode: 'cors', credentials: 'omit' })); }

function putIfMissing(cache, url) {
  return cache.match(url).then(function (hit) {
    if (hit) return hit;
    return fetchCors(url).then(function (res) { if (okRes(res)) { cache.put(url, res.clone()); } return res; });
  });
}

function cacheCss(cache, cssUrl, onlyLatin) {
  return cache.match(cssUrl).then(function (hit) { return hit || fetchCors(cssUrl).then(function (r) { if (okRes(r)) cache.put(cssUrl, r.clone()); return r; }); })
    .then(function (res) { return res.clone().text(); })
    .then(function (css) {
      var urls = [], m, re;
      if (onlyLatin) {   /* Google Fonts: ambil blok "latin" saja (cukup untuk bahasa Indonesia) */
        re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{[^}]*?url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
        while ((m = re.exec(css))) { if (m[1] === 'latin') urls.push(m[2]); }
      } else {           /* Font Awesome: hanya woff2 */
        re = /url\(\s*['"]?([^'")]+\.woff2[^'")]*)['"]?\s*\)/g;
        while ((m = re.exec(css))) { urls.push(new URL(m[1], cssUrl).href); }
      }
      return Promise.all(urls.map(function (u) { return putIfMissing(cache, u).catch(function () {}); }));
    });
}

function cacheModuleGraph(cache, url, seen, depth) {
  if (seen[url] || depth > 4) return Promise.resolve();
  seen[url] = 1;
  return cache.match(url).then(function (hit) { return hit || fetchCors(url).then(function (r) { if (okRes(r)) cache.put(url, r.clone()); return r; }); })
    .then(function (res) { return res.clone().text(); })
    .then(function (js) {
      var deps = [], re = /(?:\bfrom|\bimport)\s*["']([^"']+\.js)["']/g, m;
      while ((m = re.exec(js))) {
        var u; try { u = new URL(m[1], url); } catch (e) { continue; }
        if (u.hostname === 'www.gstatic.com') deps.push(u.href);
      }
      return Promise.all(deps.map(function (d) { return cacheModuleGraph(cache, d, seen, depth + 1).catch(function () {}); }));
    });
}

function precacheCdn() {
  return caches.open(CDN).then(function (cache) {
    var jobs = [cacheCss(cache, FA_CSS, false), cacheCss(cache, FONTS_CSS, true)];
    var seen = {};
    FB_MODULES.forEach(function (u) { jobs.push(cacheModuleGraph(cache, u, seen, 0)); });
    return Promise.all(jobs.map(function (p) { return p.catch(function () {}); }));
  });
}

/* ---------- siklus hidup ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      /* satu-satu: kalau 1 file gagal, pemasangan tidak ikut batal */
      return Promise.all(PRECACHE.map(function (u) {
        return cache.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return precacheCdn().catch(function () {}); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        var old = k.indexOf('uang-ritase-') === 0 ||
                  (k.indexOf('ur-shell-') === 0 && k !== SHELL) ||
                  (k.indexOf('ur-cdn-') === 0 && k !== CDN);
        if (old) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
      .then(function () { return caches.open(SHELL); })
      .then(function (c) { return c.match(SCOPE_URL); })
      .then(function (idx) { return broadcast({ type: 'SW_ACTIVE', build: BUILD, offlineReady: !!idx }); })
  );
});

self.addEventListener('message', function (event) {
  var d = event.data || {};
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  if (d.type === 'GET_VERSION' && event.source) event.source.postMessage({ type: 'VERSION', build: BUILD });
});

/* ---------- strategi ambil ---------- */

/* Tampil dari simpanan, cek server di latar; bila berubah → simpan & kabari halaman */
function revalidate(cache, key, request, cached) {
  return fetch(request).then(function (res) {
    if (okRes(res)) {
      if (cached && changed(cached, res)) noteChanged(key.url || key);
      return cache.put(key, res.clone()).then(function () { return res; });
    }
    return res;
  });
}

function handleNavigate(event) {
  var req = event.request, url = new URL(req.url);
  var isIndex = url.pathname === SCOPE_PATH || url.pathname === SCOPE_PATH + 'index.html';
  return caches.open(SHELL).then(function (cache) {
    var key = isIndex ? SCOPE_URL : req;
    return cache.match(key).then(function (cached) {
      var fresh = revalidate(cache, key, new Request(isIndex ? SCOPE_URL : req.url, { cache: 'no-cache', credentials: 'same-origin' }), cached);
      if (cached) { event.waitUntil(fresh.catch(function () {})); return cached; }
      return fresh.catch(function () {
        return cache.match(SCOPE_URL).then(function (idx) {
          return idx || cache.match(OFFLINE_URL).then(function (off) {
            return off || new Response('Tidak ada koneksi internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
          });
        });
      });
    });
  });
}

function handleAsset(event) {
  var req = event.request;
  return caches.open(SHELL).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var fresh = revalidate(cache, req, new Request(req, { cache: 'no-cache' }), cached);
      if (cached) { event.waitUntil(fresh.catch(function () {})); return cached; }
      return fresh.catch(function () { return cache.match(req, { ignoreSearch: true }).then(function (l) { return l || Response.error(); }); });
    });
  });
}

function isCdn(url) {
  var h = url.hostname;
  if (h === 'cdnjs.cloudflare.com' || h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com') return true;
  return h === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
}

/* pustaka luar berversi: simpanan dulu; CSS Google Font: simpanan + cek ulang */
function handleCdn(event) {
  var req = event.request, url = new URL(req.url);
  var swr = url.hostname === 'fonts.googleapis.com';
  return caches.open(CDN).then(function (cache) {
    return cache.match(req.url).then(function (cached) {
      function get() {
        return fetchCors(req.url).then(function (res) {
          if (okRes(res)) cache.put(req.url, res.clone());
          return res;
        });
      }
      if (cached) { if (swr) event.waitUntil(get().catch(function () {})); return cached; }
      return get();
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;          /* audio/video: biarkan */
  var url; try { url = new URL(req.url); } catch (e) { return; }

  if (url.origin === self.location.origin) {
    if (/\/sw\.js$/.test(url.pathname)) return;
    event.respondWith(req.mode === 'navigate' ? handleNavigate(event) : handleAsset(event));
    return;
  }
  if (isCdn(url)) { event.respondWith(handleCdn(event)); return; }
  /* selain itu (Firebase Realtime DB, Auth, audio, dsb.) → tidak dicegat sama sekali */
});
