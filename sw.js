/* ==========================================================================
   SERVICE WORKER — uangritase  (offline-first + update otomatis, ala E-Book)
   --------------------------------------------------------------------------
   • File kode (html/css/js/json): jaringan dulu (maks. 3500 dtk) -> bila gagal pakai simpanan.
     Jadi file yang diubah di GitHub otomatis terpakai, tanpa hapus cache.
   • Gambar, font: simpanan dulu (hemat kuota & cepat).
   • VERSION dibuat otomatis dari isi semua file (build) -> berubah = pembaruan terpasang.
   • Firebase / situs lain TIDAK disentuh (data tetap langsung ke server).
   ES5 — aman untuk Chrome 109 / Windows 7.
   ========================================================================== */
var VERSION = "de4a739ada";
var APP = "uangritase";
var SHELL = APP + "-shell-" + VERSION;
var MEDIA = APP + "-media-v1";
var TIMEOUT = 3500;
var CORE = ["./index.html","./app.css","./app.js","./favicon.png","./fonts/dm-sans-latin-wght-normal.woff2","./fonts/fa-brands.woff2","./fonts/fa-solid.woff2","./fonts/sora-latin-wght-normal.woff2","./img/icon-192-v3.png","./img/logo1.png","./img/logo2.png","./manifest.json","./ur.js","./vendor/fb-auth.js","./vendor/fb-core.js","./vendor/fb-db.js"];          /* wajib ada, kalau gagal pembaruan dibatalkan (versi lama tetap utuh) */
var OPTIONAL = ["./img/apple-touch-icon-v3.png"];  /* dicoba, boleh gagal */
var LATER = [];        /* diunduh pelan-pelan setelah halaman jalan */
var BYPASS = [];      /* bagian situs lain di bawah folder yang sama */

function fresh(u) { return fetch(new Request(u, { cache: "reload" })); }

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      var req = Promise.all(CORE.map(function (u) {
        return fresh(u).then(function (res) {
          if (!res || !res.ok) throw new Error("gagal " + u);
          return cache.put(u, res);
        });
      }));
      var opt = Promise.all(OPTIONAL.map(function (u) {
        return fresh(u).then(function (res) { if (res && res.ok) return cache.put(u, res); }).catch(function () {});
      }));
      return Promise.all([req, opt]);
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf(APP + "-") === 0 && k !== SHELL && k !== MEDIA;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function broadcast(msg) {
  return self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then(function (list) {
    list.forEach(function (c) { c.postMessage(msg); });
  });
}

self.addEventListener("message", function (event) {
  var d = event.data || {};
  if (d.type === "SKIP_WAITING") { self.skipWaiting(); return; }
  if (d.type === "CACHE_ALL") {
    event.waitUntil(caches.open(MEDIA).then(function (cache) {
      var done = 0, total = LATER.length;
      return Promise.all(LATER.map(function (u) {
        return cache.match(u).then(function (hit) {
          if (hit) return;
          return fresh(u).then(function (res) { if (res && res.ok) return cache.put(u, res); }).catch(function () {});
        }).then(function () { done++; });
      })).then(function () { return broadcast({ type: "CACHE_DONE", version: VERSION, total: total }); });
    }));
  }
});

function isCode(url) { return /\.(?:html|css|js|json)$/i.test(url.pathname) || /\/$/.test(url.pathname); }
function isBypass(url) { for (var i = 0; i < BYPASS.length; i++) if (url.pathname.indexOf(BYPASS[i]) !== -1) return true; return false; }

function offlinePage() {
  return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title>' +
    '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#030a17;color:#eaf3ff;font-family:Segoe UI,Arial,sans-serif;text-align:center;padding:24px">' +
    '<div><h2 style="margin:0 0 8px">Sedang offline</h2><p style="margin:0 0 18px;opacity:.75">Halaman ini belum tersimpan. Buka sekali saat online, setelah itu bisa dibuka tanpa internet.</p>' +
    '<button onclick="location.reload()" style="padding:11px 24px;border:0;border-radius:12px;background:#0a84c6;color:#fff;font-weight:700;font-size:15px;cursor:pointer">Coba lagi</button></div>',
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

function networkFirst(key, ms) {
  return caches.open(SHELL).then(function (cache) {
    return new Promise(function (resolve) {
      var settled = false, timer = null;
      function useCache() {
        return cache.match(key, { ignoreSearch: true }).then(function (hit) {
          if (hit && !settled) { settled = true; resolve(hit); }
          return hit;
        });
      }
      timer = setTimeout(useCache, ms);
      fetch(key, { cache: "no-cache" }).then(function (res) {
        clearTimeout(timer);
        if (res && res.ok) {
          cache.put(key, res.clone());
          if (!settled) { settled = true; resolve(res); }
        } else {
          useCache().then(function (hit) { if (!hit && !settled) { settled = true; resolve(res); } });
        }
      }).catch(function () {
        clearTimeout(timer);
        useCache().then(function (hit) { if (!hit && !settled) { settled = true; resolve(offlinePage()); } });
      });
    });
  });
}

function cacheFirst(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(MEDIA).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;
  if (req.headers.has("range")) return;
  var url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;
  if (isBypass(url) || /\/sw\.js$/.test(url.pathname)) return;

  if (req.mode === "navigate") { event.respondWith(networkFirst("./index.html", TIMEOUT)); return; }
  if (isCode(url)) {
    var scope = new URL(self.registration.scope).pathname;
    var rel = "./" + url.pathname.substring(scope.length);
    if (rel === "./") rel = "./index.html";
    event.respondWith(networkFirst(rel, TIMEOUT));
    return;
  }
  event.respondWith(cacheFirst(req));
});
