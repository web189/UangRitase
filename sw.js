/* ============================================================
   Service Worker — UangRitase v18  ("Offline-first + auto update atomik")

   Yang baru di v18 (dibanding v17):
   • UPDATE ATOMIK  : semua file inti diunduh dulu, dibandingkan, baru diganti
                      SEKALIGUS. Tidak pernah ada campuran file lama + baru,
                      dan kalau sinyal putus di tengah jalan, simpanan lama
                      tetap utuh.
   • DAFTAR OTOMATIS: file yang dipanggil index.html (src/href relatif) ikut
                      disimpan & dipantau otomatis, tanpa edit daftar manual.
   • SELF-HEAL      : file yang gagal tersimpan dicoba lagi otomatis; status
                      "siap offline" hanya dilaporkan bila SEMUA file ada.
   • SAAT TERHUBUNG : Background Sync ('ur-update') memeriksa pembaruan begitu
                      internet kembali — walau tab sudah ditutup (Chrome/Edge
                      Android & desktop). Periodic Sync memeriksa berkala.
   • PERBANDINGAN   : ETag sama → lewati; ETag beda → cocokkan isi (hash) agar
                      tidak ada "update palsu".
   • PESAN          : CHECK_UPDATE, GET_STATUS, REPAIR, SKIP_WAITING.

   Data harga (Firebase) TIDAK dicegat; salinan terakhirnya disimpan app.js.
   Kompatibel Chrome/Edge di Windows 7 (sampai v109) — ES5.
   ============================================================ */
'use strict';

var BUILD = '2026-11-04.18.0';
var SHELL = 'ur-shell-' + BUILD;      /* file milik situs (diganti tiap BUILD)   */
var CDN   = 'ur-cdn-v1';              /* pustaka luar berversi (awet)            */
var META  = 'ur-meta-v1';             /* catatan kecil: kapan cek / update       */

var SCOPE_URL   = new URL('./', self.location).href;
var SCOPE_PATH  = new URL('./', self.location).pathname;
var OFFLINE_URL = new URL('offline.html', self.location).href;
var META_URL    = new URL('__ur-meta.json', self.location).href;

/* File inti (relatif terhadap sw.js). index.html menambah sendiri secara otomatis. */
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

var MIN_GAP = 25 * 1000;   /* jarak minimal antar pemeriksaan otomatis */

/* ---------- util ---------- */
function abs(u) { return u === './' ? SCOPE_URL : new URL(u, self.location).href; }
function okRes(res) { return res && res.status === 200 && (res.type === 'basic' || res.type === 'cors'); }
function broadcast(msg) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    list.forEach(function (c) { try { c.postMessage(msg); } catch (e) {} });
  });
}
function fetchFresh(url) { return fetch(new Request(url, { cache: 'no-cache', credentials: 'same-origin' })); }
function fetchCors(url) { return fetch(new Request(url, { mode: 'cors', credentials: 'omit' })); }

/* sidik isi file (SHA-1, cadangan FNV-1a bila crypto.subtle tidak ada) */
function hexOf(buf) {
  var a = new Uint8Array(buf), s = '', i;
  for (i = 0; i < a.length; i++) s += (a[i] < 16 ? '0' : '') + a[i].toString(16);
  return s;
}
function fingerprint(buf) {
  if (self.crypto && self.crypto.subtle && self.crypto.subtle.digest) {
    return self.crypto.subtle.digest('SHA-1', buf).then(hexOf);
  }
  var a = new Uint8Array(buf), h = 2166136261, i;
  for (i = 0; i < a.length; i++) { h ^= a[i]; h = (h * 16777619) >>> 0; }
  return Promise.resolve(a.length + ':' + h);
}
function sameBody(a, b) {
  return Promise.all([a.clone().arrayBuffer(), b.clone().arrayBuffer()]).then(function (p) {
    if (p[0].byteLength !== p[1].byteLength) return false;
    return Promise.all([fingerprint(p[0]), fingerprint(p[1])]).then(function (h) { return h[0] === h[1]; });
  });
}
/* ETag sama → pasti sama; beda/tak ada → periksa isinya */
function isSame(oldRes, newRes) {
  var a = oldRes.headers.get('etag'), b = newRes.headers.get('etag');
  if (a && b && a === b) return Promise.resolve(true);
  return sameBody(oldRes, newRes);
}

/* ---------- catatan meta ---------- */
function metaRead() {
  return caches.open(META).then(function (c) { return c.match(META_URL); })
    .then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
}
function metaWrite(patch) {
  return metaRead().then(function (m) {
    for (var k in patch) m[k] = patch[k];
    return caches.open(META).then(function (c) {
      return c.put(META_URL, new Response(JSON.stringify(m), { headers: { 'Content-Type': 'application/json' } }));
    });
  }).catch(function () {});
}

/* ---------- daftar file: PRECACHE + file lokal yang dipanggil index.html ---------- */
function discoverFromHtml(html) {
  var out = [], re = /\b(?:src|href)\s*=\s*["']([^"'#?:]+?)["']/gi, m;
  while ((m = re.exec(html))) {
    var p = m[1];
    if (!p || p.charAt(0) === '/' || /^(?:data|mailto|tel|javascript|blob)/i.test(p)) continue;
    if (!/\.(?:js|css|png|jpe?g|webp|svg|ico|json|woff2?)$/i.test(p)) continue;
    out.push(p);
  }
  return out;
}
function fileList() {
  var set = {}, list = [];
  function add(u) { var a = abs(u); if (!set[a]) { set[a] = 1; list.push(a); } }
  PRECACHE.forEach(add);
  return caches.open(SHELL).then(function (c) { return c.match(SCOPE_URL); }).then(function (idx) {
    return idx ? idx.clone().text().then(function (t) { discoverFromHtml(t).forEach(add); }) : null;
  }).catch(function () {}).then(function () { return list; });
}

/* ---------- penyimpanan pustaka luar di muka ---------- */
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
      if (onlyLatin) {   /* Google Fonts: blok "latin" saja (cukup untuk bahasa Indonesia) */
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
function cdnReady() {
  return caches.open(CDN).then(function (c) {
    return Promise.all([FA_CSS, FONTS_CSS].concat(FB_MODULES).map(function (u) { return c.match(u); }));
  }).then(function (r) { return r.every(Boolean); }).catch(function () { return false; });
}

/* ---------- simpan file inti (dengan laporan kemajuan) ---------- */
function storeAll(progress) {
  return fileList().then(function (list) {
    return caches.open(SHELL).then(function (cache) {
      var done = 0, total = list.length;
      return Promise.all(list.map(function (u) {
        return cache.match(u).then(function (hit) {
          if (hit) return;
          return fetchFresh(u).then(function (res) { if (okRes(res)) return cache.put(u, res); }).catch(function () {});
        }).then(function () { done++; if (progress) progress(done, total); });
      }));
    });
  });
}

/* ---------- status & perbaikan ---------- */
function getStatus() {
  return Promise.all([fileList(), caches.open(SHELL), metaRead(), cdnReady()]).then(function (p) {
    var list = p[0], cache = p[1], meta = p[2], cdn = p[3];
    return Promise.all(list.map(function (u) { return cache.match(u).then(function (r) { return r ? r.clone().blob().then(function (b) { return b.size; }) : -1; }); }))
      .then(function (sizes) {
        var missing = [], bytes = 0;
        sizes.forEach(function (s, i) { if (s < 0) missing.push(list[i].replace(SCOPE_URL, './')); else bytes += s; });
        return {
          type: 'STATUS', build: BUILD, total: list.length, cached: list.length - missing.length, missing: missing,
          bytes: bytes, ready: missing.length === 0, cdnReady: cdn,
          lastCheck: meta.lastCheck || 0, lastUpdate: meta.lastUpdate || 0
        };
      });
  });
}

/* ---------- PEMERIKSAAN UPDATE ATOMIK ---------- */
var checking = null, lastRun = 0;

function runCheck() {
  return fileList().then(function (list) {
    return caches.open(SHELL).then(function (cache) {
      /* 1) unduh SEMUA dulu. Gagal jaringan di salah satu → batal total (simpanan tetap utuh). */
      return Promise.all(list.map(function (u) {
        return fetchFresh(u).then(function (res) {
          if (res.status === 404 || res.status === 410) return { u: u, skip: true };
          if (!okRes(res)) throw new Error('bad ' + res.status);
          return cache.match(u).then(function (old) { return { u: u, res: res, old: old }; });
        });
      })).then(function (items) {
        /* 2) bandingkan */
        return Promise.all(items.map(function (it) {
          if (it.skip) return null;
          if (!it.old) { it.kind = 'new'; return it; }
          return isSame(it.old, it.res).then(function (same) { it.kind = same ? 'same' : 'changed'; return it; });
        })).then(function (all) {
          var todo = all.filter(function (it) { return it && it.kind !== 'same'; });
          var changedN = todo.filter(function (it) { return it.kind === 'changed'; }).length;
          /* 3) ganti sekaligus */
          return Promise.all(todo.map(function (it) { return cache.put(it.u, it.res.clone()); })).then(function () {
            shellKeys = null;
            /* index.html baru mungkin memanggil file baru → simpan sekarang, sebelum pembaruan diumumkan */
            return changedN > 0 ? storeAll().catch(function () {}).then(function () { return changedN; }) : changedN;
          });
        });
      });
    });
  });
}

function checkForUpdate(opts) {
  opts = opts || {};
  var now = Date.now();
  if (checking) return checking;
  if (!opts.force && now - lastRun < MIN_GAP) return Promise.resolve({ status: 'skipped' });
  lastRun = now;
  checking = runCheck().then(function (changedN) {
    var t = Date.now(), patch = { lastCheck: t };
    if (changedN > 0) patch.lastUpdate = t;
    return metaWrite(patch).then(function () {
      if (changedN > 0) broadcast({ type: 'CONTENT_UPDATED', files: changedN, build: BUILD });
      return { status: changedN > 0 ? 'updated' : 'current', files: changedN, t: t };
    });
  }).catch(function () {
    return { status: 'offline', t: Date.now() };
  }).then(function (r) { checking = null; return r; });
  return checking;
}

function repair() {
  return Promise.all([caches.delete(SHELL), caches.delete(CDN)]).then(function () {
    return Promise.all([storeAll(), precacheCdn().catch(function () {})]);
  }).then(function () { return metaWrite({ lastCheck: Date.now() }); }).then(getStatus);
}

/* ---------- siklus hidup ---------- */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL).then(function (cache) {
      /* index.html dulu → dari situ daftar file lain ditemukan otomatis */
      return fetchFresh(SCOPE_URL).then(function (res) { if (okRes(res)) return cache.put(SCOPE_URL, res); }).catch(function () {});
    }).then(function () {
      return storeAll(function (d, t) { if (d === t || d % 4 === 0) broadcast({ type: 'SW_PROGRESS', done: d, total: t }); });
    }).then(function () { return precacheCdn().catch(function () {}); })
      .then(function () { return metaWrite({ lastCheck: Date.now(), lastUpdate: Date.now() }); })
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
      .then(function () { return storeAll().catch(function () {}); })   /* self-heal */
      .then(getStatus)
      .then(function (s) { return broadcast({ type: 'SW_ACTIVE', build: BUILD, offlineReady: s.ready, status: s }); })
  );
});

self.addEventListener('message', function (event) {
  var d = event.data || {}, src = event.source;
  function reply(m) { if (src) { try { src.postMessage(m); } catch (e) {} } }
  if (d.type === 'SKIP_WAITING') self.skipWaiting();
  else if (d.type === 'GET_VERSION') reply({ type: 'VERSION', build: BUILD });
  else if (d.type === 'GET_STATUS') event.waitUntil(storeAll().catch(function () {}).then(getStatus).then(reply));
  else if (d.type === 'CHECK_UPDATE') {
    event.waitUntil(checkForUpdate({ force: !!d.force }).then(function (r) {
      return getStatus().then(function (s) { r.type = 'CHECK_RESULT'; r.manual = !!d.manual; r.statusInfo = s; reply(r); });
    }));
  }
  else if (d.type === 'REPAIR') event.waitUntil(repair().then(function (s) { s.repaired = true; reply(s); }));
});

/* Internet kembali (tab boleh tertutup): periksa pembaruan. Gagal → browser mencoba lagi. */
self.addEventListener('sync', function (event) {
  if (event.tag !== 'ur-update') return;
  event.waitUntil(checkForUpdate({ force: true }).then(function (r) { if (r.status === 'offline') throw new Error('masih offline'); }));
});
self.addEventListener('periodicsync', function (event) {
  if (event.tag === 'ur-periodic') event.waitUntil(checkForUpdate({ force: true }));
});

/* ---------- strategi ambil ---------- */
var shellKeys = null;   /* himpunan URL inti — disegarkan tiap pemeriksaan */
function refreshKeys() { return fileList().then(function (l) { shellKeys = {}; l.forEach(function (u) { shellKeys[u] = 1; }); }); }

/* Navigasi: tampil dari simpanan seketika; pembaruan diurus pemeriksaan atomik */
function handleNavigate(event) {
  var req = event.request, url = new URL(req.url);
  var isIndex = url.pathname === SCOPE_PATH || url.pathname === SCOPE_PATH + 'index.html';
  return caches.open(SHELL).then(function (cache) {
    var key = isIndex ? SCOPE_URL : req;
    return cache.match(key, { ignoreSearch: true }).then(function (cached) {
      if (cached) { event.waitUntil(checkForUpdate().catch(function () {})); return cached; }
      return fetchFresh(isIndex ? SCOPE_URL : req.url).then(function (res) {
        if (okRes(res)) cache.put(key, res.clone());
        return res;
      }).catch(function () {
        return cache.match(SCOPE_URL).then(function (idx) {
          return idx || cache.match(OFFLINE_URL).then(function (off) {
            return off || new Response('Tidak ada koneksi internet.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
          });
        });
      });
    });
  });
}

/* Aset: file inti → simpanan dulu (konsisten dengan HTML); lainnya → simpanan + cek diam-diam */
function handleAsset(event) {
  var req = event.request;
  return (shellKeys ? Promise.resolve() : refreshKeys().catch(function () {})).then(function () { return caches.open(SHELL); }).then(function (cache) {
    return cache.match(req).then(function (cached) {
      var core = shellKeys && shellKeys[req.url.split('#')[0]];
      if (cached && core) return cached;
      var fresh = fetch(new Request(req, { cache: 'no-cache' })).then(function (res) {
        if (okRes(res)) return cache.put(req, res.clone()).then(function () { return res; });
        return res;
      });
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
    if (/\/sw\.js$/.test(url.pathname) || /__ur-meta\.json$/.test(url.pathname)) return;
    event.respondWith(req.mode === 'navigate' ? handleNavigate(event) : handleAsset(event));
    return;
  }
  if (isCdn(url)) { event.respondWith(handleCdn(event)); return; }
  /* selain itu (Firebase Realtime DB, Auth, audio, dsb.) → tidak dicegat sama sekali */
});
