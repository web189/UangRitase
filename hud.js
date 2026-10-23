/* hud.js — efek ringan: progres gulir, hitung naik angka, muncul saat digulir.
   Tanpa library. Aman untuk Chrome 109 / Windows 7. */
(function () {
  'use strict';
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* 1. progres gulir (transform saja, 1 kali per frame) */
  var bar = document.getElementById('scrollBar'), tick = false;
  function upd() {
    tick = false;
    var d = document.documentElement, max = (d.scrollHeight - d.clientHeight) || 1;
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, (window.pageYOffset || d.scrollTop) / max)) + ')';
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
  window.addEventListener('resize', upd, { passive: true });
  upd();

  /* 2. angka statistik: hitung naik dari 0 setiap kali nilainya berubah dari data */
  function watch(id) {
    var el = document.getElementById(id); if (!el || reduce || !window.MutationObserver) return;
    var busy = false, shown = 0;
    new MutationObserver(function () {
      if (busy) return;
      var to = parseInt(el.textContent, 10);
      if (isNaN(to) || to === shown) return;
      var from = shown, t0 = null, dur = 650;
      busy = true;
      (function step(ts) {
        if (t0 === null) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(from + (to - from) * e));
        if (p < 1) requestAnimationFrame(step); else { shown = to; busy = false; }
      })(performance.now());
    }).observe(el, { childList: true, characterData: true, subtree: true });
  }
  ['stTotal', 'stAqua', 'stVit'].forEach(watch);

  /* 3. muncul saat digulir — hanya bila IntersectionObserver ada */
  if ('IntersectionObserver' in window && !reduce) {
    var items = document.querySelectorAll('.menu-section .menu-title, .menu-section .acc-item, .footer-inner');
    if (!items.length) return;
    document.documentElement.classList.add('rv-on');
    function done(n) {
      n.classList.add('rv-in');
      setTimeout(function () { n.classList.remove('rv', 'rv-in'); n.style.transitionDelay = ''; }, 800); /* lepas agar efek hover normal */
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { done(en.target); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (n, i) { n.classList.add('rv'); n.style.transitionDelay = (i % 4) * 50 + 'ms'; io.observe(n); });
    /* jaring pengaman: tampilkan semua bila ada yang tak sempat terpantau */
    setTimeout(function () { items.forEach(function (n) { if (n.classList.contains('rv')) done(n); }); }, 4000);
  }
})();

/* ===== v15: pencarian global + cahaya kursor ===== */
(function () {
  'use strict';
  var input = document.getElementById('gsInput'), clr = document.getElementById('gsClear'), info = document.getElementById('gsInfo');
  var root = document.getElementById('mainContainer');
  if (input && root) {
    var timer = null, openedBySearch = [];
    var norm = function (s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); };
    function remeasure(item) {
      var b = item.querySelector('.acc-body');
      if (b && item.classList.contains('acc-open')) requestAnimationFrame(function () { b.style.maxHeight = b.scrollHeight + 'px'; });
    }
    function run() {
      var q = norm(input.value), items = root.querySelectorAll('.acc-item'), hits = 0, cats = 0;
      clr.hidden = !q;
      [].forEach.call(items, function (item) {
        var rows = item.querySelectorAll('tbody tr.rtr'), m = 0;
        [].forEach.call(rows, function (tr) {
          var ok = !q || norm(tr.textContent).indexOf(q) !== -1;
          tr.classList.toggle('gs-hide', !ok);
          if (ok) m++;
        });
        if (!q) { item.classList.remove('gs-hide'); return; }
        item.classList.toggle('gs-hide', m === 0);
        if (m > 0) {
          hits += m; cats++;
          if (!item.classList.contains('acc-open')) {
            var head = item.querySelector('.acc-head');
            if (head) { head.click(); if (openedBySearch.indexOf(item) === -1) openedBySearch.push(item); }
          }
        }
        remeasure(item);
      });
      if (!q) {
        /* tutup kartu yang tadi dibuka otomatis oleh pencarian */
        openedBySearch.forEach(function (item) { if (item.classList.contains('acc-open')) { var h = item.querySelector('.acc-head'); if (h) h.click(); } });
        openedBySearch = [];
        info.hidden = true; return;
      }
      info.hidden = false;
      info.classList.toggle('none', hits === 0);
      info.textContent = hits ? (hits + ' rute cocok di ' + cats + ' kategori') : 'Tidak ada rute untuk "' + input.value.trim() + '"';
    }
    input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
    clr.addEventListener('click', function () { input.value = ''; run(); input.focus(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; run(); input.blur(); } });
    document.addEventListener('keydown', function (e) {
      var t = e.target, tag = t && t.tagName;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && !(t && t.isContentEditable)) {
        e.preventDefault(); input.focus(); input.select();
      }
    });
    /* data dimuat ulang dari server → terapkan lagi pencarian yang sedang aktif */
    if (window.MutationObserver) {
      var again = null;
      new MutationObserver(function () { if (!norm(input.value)) return; clearTimeout(again); again = setTimeout(run, 60); }).observe(root, { childList: true, subtree: true });
    }
  }

  /* cahaya kursor di kartu — hanya mouse */
  try {
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      var cur = null, px = 0, py = 0, raf = false;
      document.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse') return;
        var it = e.target.closest ? e.target.closest('.acc-item') : null;
        if (!it) return;
        cur = it; px = e.clientX; py = e.clientY;
        if (!raf) {
          raf = true;
          requestAnimationFrame(function () {
            raf = false; if (!cur) return;
            var r = cur.getBoundingClientRect();
            cur.classList.add('spot');
            cur.style.setProperty('--mx', (px - r.left) + 'px');
            cur.style.setProperty('--my', (py - r.top) + 'px');
          });
        }
      }, { passive: true });
    }
  } catch (e) {}
})();
