/*!
 * sky.js — Animasi langit ringan: matahari terbit/tenggelam, bulan & bintang malam,
 * awan siang (tebal) & awan malam (tipis), semua mengikuti zona waktu WIB (Asia/Jakarta).
 * Tidak pakai canvas per-frame: posisi & warna dihitung sekali tiap 45 detik,
 * pergerakan halus diserahkan ke CSS transition/animation (hemat CPU & baterai).
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var isLite = document.documentElement.classList.contains("lite-mode");

  function $(id) { return document.getElementById(id); }

  // ---- Waktu WIB (Asia/Jakarta), independen dari timezone perangkat pengunjung ----
  function getWIB() {
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
      });
      var obj = {};
      fmt.formatToParts(new Date()).forEach(function (p) { obj[p.type] = p.value; });
      var h = parseInt(obj.hour, 10) % 24;
      return h + parseInt(obj.minute, 10) / 60 + parseInt(obj.second, 10) / 3600;
    } catch (e) {
      // Fallback kasar: asumsikan UTC+7 dari waktu lokal UTC
      var d = new Date();
      var utcH = d.getUTCHours() + d.getUTCMinutes() / 60;
      return (utcH + 7) % 24;
    }
  }

  // ---- Palet gradien langit per jam (keyframe warna, di-interpolasi halus) ----
  var STOPS = [
    { t: 0,     c: ["#03060f", "#070b1c", "#0b1330", "#111c3d", "#152648"] }, // tengah malam
    { t: 4.5,   c: ["#03060f", "#080c1e", "#0d1636", "#17203f", "#241f3a"] }, // dini hari
    { t: 5.75,  c: ["#0e1030", "#302050", "#8a3f6b", "#e2703f", "#ffbf6b"] }, // matahari terbit
    { t: 7,     c: ["#1c5fa8", "#2f86c9", "#57ade0", "#8fd0ec", "#c9ecf7"] }, // pagi
    { t: 12,    c: ["#1670c2", "#2f96da", "#5fc0ea", "#9adcf2", "#dcf3fa"] }, // siang terang
    { t: 17,    c: ["#1c4a8a", "#3c5f9e", "#a15f8a", "#e2854f", "#ffcf8a"] }, // sore
    { t: 18.25, c: ["#170f30", "#3a1f52", "#9a3f68", "#e2643f", "#ffb15f"] }, // matahari tenggelam
    { t: 19.25, c: ["#080a20", "#0e1436", "#17203f", "#1c2540", "#2a2440"] }, // senja ke malam
    { t: 24,    c: ["#03060f", "#070b1c", "#0b1330", "#111c3d", "#152648"] }  // loop balik tengah malam
  ];

  function hexToRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function lerp(a, b, r) { return Math.round(a + (b - a) * r); }

  function skyGradientAt(t) {
    var i = 0;
    while (i < STOPS.length - 1 && t > STOPS[i + 1].t) i++;
    var a = STOPS[i], b = STOPS[Math.min(i + 1, STOPS.length - 1)];
    var span = b.t - a.t || 1;
    var r = Math.max(0, Math.min(1, (t - a.t) / span));
    var colors = a.c.map(function (hexA, idx) {
      var rgbA = hexToRgb(hexA), rgbB = hexToRgb(b.c[idx]);
      var rr = lerp(rgbA[0], rgbB[0], r), gg = lerp(rgbA[1], rgbB[1], r), bb = lerp(rgbA[2], rgbB[2], r);
      return "rgb(" + rr + "," + gg + "," + bb + ")";
    });
    return "linear-gradient(180deg," + colors[0] + " 0%," + colors[1] + " 25%," + colors[2] + " 52%," + colors[3] + " 78%," + colors[4] + " 100%)";
  }

  // ---- Jam terbit/tenggelam (rata-rata Indonesia, dekat khatulistiwa jadi cukup stabil) ----
  var SUNRISE = 5.75;   // 05:45
  var SUNSET = 17.85;   // 17:51

  function arcPosition(p) {
    // p: 0..1 progres lintasan (dari horizon -> puncak -> horizon)
    var x = 6 + p * 88;
    var y = 90 - Math.sin(p * Math.PI) * 72;
    var edgeFade = Math.min(1, Math.sin(p * Math.PI) * 6); // muncul/hilang lembut di horizon
    return { x: x, y: y, o: edgeFade };
  }

  var sunEl = $("sunEl"), moonEl = $("moonEl");
  var starsSmall = $("starsSmall"), starsBig = $("starsBig");
  var skyGradient = $("skyGradient"), cloudsWrap = $("cloudsWrap");

  function update() {
    var t = getWIB();
    if (skyGradient) skyGradient.style.background = skyGradientAt(t);

    var isDay = t >= SUNRISE && t < SUNSET;

    if (sunEl) {
      if (isDay) {
        var pSun = (t - SUNRISE) / (SUNSET - SUNRISE);
        var posSun = arcPosition(pSun);
        sunEl.style.left = posSun.x + "%";
        sunEl.style.top = posSun.y + "%";
        sunEl.style.opacity = posSun.o;
      } else {
        sunEl.style.opacity = 0;
      }
    }

    if (moonEl) {
      if (!isDay) {
        var nightLen = (24 - SUNSET) + SUNRISE;
        var elapsed = t >= SUNSET ? (t - SUNSET) : ((24 - SUNSET) + t);
        var pMoon = Math.max(0, Math.min(1, elapsed / nightLen));
        var posMoon = arcPosition(pMoon);
        moonEl.style.left = posMoon.x + "%";
        moonEl.style.top = posMoon.y + "%";
        moonEl.style.opacity = posMoon.o;
      } else {
        moonEl.style.opacity = 0;
      }
    }

    if (starsSmall) starsSmall.classList.toggle("show", !isDay);
    if (starsBig) starsBig.classList.toggle("show", !isDay);

    if (cloudsWrap) {
      cloudsWrap.classList.toggle("clouds-day", isDay);
      cloudsWrap.classList.toggle("clouds-night", !isDay);
    }
  }

  // ---- Bintang: teknik box-shadow multi-titik, hanya 2 elemen DOM, nyaris tanpa biaya ----
  function initStars() {
    if (!starsSmall || !starsBig) return;
    function scatter(count) {
      var arr = [];
      for (var i = 0; i < count; i++) {
        arr.push((Math.random() * 100).toFixed(2) + "vw " + (Math.random() * 62).toFixed(2) + "vh #fff");
      }
      return arr.join(",");
    }
    starsSmall.style.boxShadow = scatter(70);
    starsBig.style.boxShadow = scatter(16);
  }

  // ---- Awan: dibuat sekali, lalu murni digerakkan CSS (tidak ada loop JS) ----
  function initClouds() {
    if (!cloudsWrap) return;
    var n = window.innerWidth < 640 ? 4 : 6;
    for (var i = 0; i < n; i++) {
      var c = document.createElement("div");
      c.className = "cloud";
      var w = 90 + Math.random() * 110;
      var h = w * 0.32;
      c.style.width = w + "px";
      c.style.height = h + "px";
      c.style.top = (4 + Math.random() * 34) + "%";
      var dur = 70 + Math.random() * 90;
      c.style.animationDuration = dur + "s";
      c.style.animationDelay = "-" + (Math.random() * dur).toFixed(1) + "s";
      cloudsWrap.appendChild(c);
    }
  }

  function start() {
    if (isLite) return; // mode ringan: langit statis dari CSS, tanpa elemen bergerak
    initStars();
    initClouds();
    update();
    if (!reduceMotion) {
      setInterval(update, 45000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
