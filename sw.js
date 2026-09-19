/* ============================================================
   Service Worker — UangRitase
   Fungsi:
   1) Memenuhi syarat PWA supaya bisa di-"Install" seperti WhatsApp Web
      (Chrome/Edge di Windows 7 s.d. versi 109 juga mendukung).
   2) Tetap bisa dibuka walau internet putus (tampilan terakhir dipakai).
   3) TIDAK menyentuh data Firebase/API — semua tetap langsung ke server,
      jadi data realtime tidak pernah "basi".
   Strategi:
   - Halaman, JS, CSS, JSON milik situs sendiri : jaringan dulu, cache = cadangan
     (jadi update dari GitHub selalu langsung terbaca).
   - Gambar & font milik situs                   : cache dulu, diperbarui di latar.
   - Pustaka CDN (Font Awesome, Firebase SDK, Google Fonts): cache dulu.
   ============================================================ */
'use strict';

var CACHE_VERSION = '2026-09-20.1';
var APP_CACHE = 'uang-ritase-app-' + CACHE_VERSION;
var CDN_CACHE = 'uang-ritase-cdn-' + CACHE_VERSION;

/* File inti yang di-cache saat pemasangan (relatif terhadap lokasi sw.js) */
var PRECACHE = [
  "./",
  "favicon.png",
  "manifest.json",
  "img/icon-192.png",
  "img/apple-touch-icon.png",
  "style.css",
  "img/logo1.png",
  "img/logo2.png",
  "app.js",
  "notif-trading.min.js",
  "pwa.js",
  "img/icon-512.png",
  "img/icon-192-maskable.png",
  "img/icon-512-maskable.png"
];

/* Bagian situs lain di bawah folder yang sama — TIDAK boleh disentuh service worker ini */
var BYPASS_PATHS = [];

var NETWORK_TIMEOUT_MS = 4500;
var INDEX_URL = new URL('./', self.location).href;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(APP_CACHE).then(function (cache) {
      /* add satu-satu: kalau ada 1 file gagal, pemasangan tidak ikut batal */
      return Promise.all(PRECACHE.map(function (u) {
        return cache.add(new Request(u, { cache: 'reload' })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        var mine = k.indexOf('uang-ritase-') === 0;
        if (mine && k !== APP_CACHE && k !== CDN_CACHE) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isCdn(url) {
  if (url.hostname === 'cdnjs.cloudflare.com') return true;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return true;
  if (url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0) return true;
  return false;
}

function fetchWithTimeout(req, ms) {
  if (!ms) return fetch(req);
  return new Promise(function (resolve, reject) {
    var done = false;
    var t = setTimeout(function () { if (!done) { done = true; reject(new Error('timeout')); } }, ms);
    fetch(req).then(function (res) {
      if (!done) { done = true; clearTimeout(t); resolve(res); }
    }, function (err) {
      if (!done) { done = true; clearTimeout(t); reject(err); }
    });
  });
}

function offlineResponse() {
  var html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Tidak ada koneksi</title><body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;' +
    'background:#0b1220;color:#e8eefc;font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:24px">' +
    '<div><h2 style="margin:0 0 8px">Tidak ada koneksi internet</h2>' +
    '<p style="margin:0 0 18px;opacity:.75">Halaman ini belum tersimpan untuk mode offline.<br>Periksa internet lalu coba lagi.</p>' +
    '<button onclick="location.reload()" style="padding:10px 22px;border:0;border-radius:8px;background:#2f7dff;color:#fff;font-size:15px;cursor:pointer">Coba lagi</button></div>';
  return new Response(html, { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function networkFirst(event, isNav) {
  var req = event.request;
  return caches.open(APP_CACHE).then(function (cache) {
    return cache.match(req).then(function (cached) {
      return fetchWithTimeout(req, cached ? NETWORK_TIMEOUT_MS : 0).then(function (res) {
        if (res && res.status === 200 && res.type === 'basic') {
          event.waitUntil(cache.put(req, res.clone()).catch(function () {}));
        }
        return res;
      }).catch(function () {
        if (cached) return cached;
        return cache.match(req, { ignoreSearch: true }).then(function (loose) {
          if (loose) return loose;
          if (isNav) {
            return cache.match(INDEX_URL).then(function (idx) {
              return idx || cache.match(INDEX_URL + 'index.html').then(function (i2) { return i2 || offlineResponse(); });
            });
          }
          return Response.error();
        });
      });
    });
  });
}

function staleWhileRevalidate(event, cacheName) {
  var req = event.request;
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          event.waitUntil(cache.put(req, res.clone()).catch(function () {}));
        }
        return res;
      }).catch(function () { return cached || Response.error(); });
      return cached || net;
    });
  });
}

function cacheFirst(event, cacheName) {
  var req = event.request;
  return caches.open(cacheName).then(function (cache) {
    return cache.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          event.waitUntil(cache.put(req, res.clone()).catch(function () {}));
        }
        return res;
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (req.headers.has('range')) return;            /* audio/video streaming: biarkan */

  var url;
  try { url = new URL(req.url); } catch (e) { return; }

  if (url.origin === self.location.origin) {
    for (var i = 0; i < BYPASS_PATHS.length; i++) {
      if (url.pathname.indexOf(BYPASS_PATHS[i]) !== -1) return;
    }
    if (/\/sw\.js$/.test(url.pathname)) return;

    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(event, true));
    } else if (req.destination === 'image' || req.destination === 'font') {
      event.respondWith(staleWhileRevalidate(event, APP_CACHE));
    } else {
      event.respondWith(networkFirst(event, false));
    }
    return;
  }

  if (isCdn(url)) {
    if (url.hostname === 'fonts.googleapis.com') event.respondWith(staleWhileRevalidate(event, CDN_CACHE));
    else event.respondWith(cacheFirst(event, CDN_CACHE));
  }
  /* selain itu (Firestore, Realtime DB, Auth, dsb.) → tidak dicegat sama sekali */
});
