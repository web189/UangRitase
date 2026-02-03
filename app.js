/* =========================
   GLOBAL STATE
========================= */
let isAdmin = localStorage.getItem("admin") === "true";

const data = {
  spsAqua: [
    ["CRG", "All SKU", 652000], ["CTR", "All SKU", 532000], ["MKS", "All SKU", 767000],
    ["CHR", "All SKU", 612000], ["KEDEP", "All SKU", 656500], ["CJR > 1120", "AQ 1500 ML", 943000],
    ["CJR > 1440", "AQ 600 ML", 943000], ["CJR > 840", "AQ 1500 ML", 749000],
    ["CJR > 960", "AQ 600 ML", 749000], ["CJR > 2340", "AQ 330 ML", 943000],
    ["CJR > 980", "AQ 1500 ML", 823000], ["CJR > 1820", "AQ 330 ML", 1167000],
    ["DEPO JONGGOL", "All SKU", 714000]
  ],
  galonAqua: [
    ["TBP", "432", 605000], ["TBP", "528", 622000], ["TBP", "720", 794000],
    ["TBP", "960", 809000], ["TBP", "1008", 820000], ["MKS", "432", 679000],
    ["MKS", "528", 696000], ["MKS", "960 LASAH", 859000], ["MKS", "960 JUGRACK", 821000],
    ["MKS", "1008", 870000], ["MKS", "720", 844000], ["CHG", "960 JUGRACK", 633000],
    ["CRG", "960 JUGRACK", 652000]
  ],
  spsVit: [
    ["TMP", "VT 200 ML", 642000], ["TMP", "VT 550 ML", 607000],
    ["TMP", "VT MOSKA 220", 642000], ["TMP", "VT 1500 ML", 630000],
    ["GIT", "VT 330 ML", 2163000]
  ],
  galonVit: [
    ["BTA", "528", 463000], ["BTA", "768", 574000], ["BTA", "960", 501000],
    ["SSS", "528", 457000], ["SSS", "768", 568000]
  ]
};

// Load saved data
const saved = localStorage.getItem("ritaseData");
if (saved) Object.assign(data, JSON.parse(saved));

/* =========================
   CORE FUNCTIONS
========================= */
function formatRupiah(n) {
  return "Rp " + n.toLocaleString("id-ID");
}

function render(target, rows) {
  const container = document.getElementById(target);
  if (!container) return;

  let html = `<table>
    <thead><tr><th>Pabrik</th><th>Muatan</th><th>Uang</th></tr></thead>
    <tbody>`;

  rows.forEach((r, i) => {
    html += `
      <tr>
        <td>${r[0]}</td>
        <td>${r[1]}</td>
        <td class="uang" data-target="${target}" data-index="${i}">
          ${formatRupiah(r[2])}
        </td>
      </tr>`;
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function renderAll() {
  render("sps-aqua", data.spsAqua);
  render("galon-aqua", data.galonAqua);
  render("sps-vit", data.spsVit);
  render("galon-vit", data.galonVit);
  if (isAdmin) attachEditEvents();
}

/* =========================
   EDIT ADMIN
========================= */
function attachEditEvents() {
  document.querySelectorAll(".uang").forEach(cell => {
    cell.style.cursor = "pointer";
    cell.style.color = "#fbbf24";
    cell.onclick = () => {
      const t = cell.dataset.target.replace(/-([a-z])/g, g => g[1].toUpperCase());
      const i = cell.dataset.index;
      const currentVal = data[t][i][2];
      const v = prompt(`Edit Harga (Saat ini: ${currentVal})`, currentVal);
      if (v && !isNaN(v)) {
        data[t][i][2] = parseInt(v);
        localStorage.setItem("ritaseData", JSON.stringify(data));
        renderAll();
      }
    };
  });
}

/* =========================
   CLOCK
========================= */
setInterval(() => {
  const d = new Date();
  const el = document.getElementById("datetime");
  if (el) {
    el.innerText =
      d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" }) + " WIB";
  }
}, 1000);

/* =========================
   VISITOR COUNTER
========================= */
let count = localStorage.getItem("visCount") || 1540;
count = parseInt(count) + 1;
localStorage.setItem("visCount", count);
const visitorEl = document.getElementById("visitorNumber");
if (visitorEl) visitorEl.innerText = count;

/* =========================
   MUSIC PLAYER
========================= */
const playlist = [
  { title: "coming soon 01", src: "video/music1.mp3" },
  { title: "coming soon 02", src: "video/music2.mp3" }
];

let trackIndex = 0;
const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const musicTitle = document.getElementById("musicTitle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function loadTrack(i) {
  if (!audio) return;
  trackIndex = (i + playlist.length) % playlist.length;
  audio.src = playlist[trackIndex].src;
  audio.play();
  playBtn.innerText = "⏸";
  musicTitle.innerText = "🎵 " + playlist[trackIndex].title;
  musicTitle.classList.add("playing");
}

if (prevBtn) prevBtn.addEventListener("click", () => loadTrack(trackIndex - 1));
if (nextBtn) nextBtn.addEventListener("click", () => loadTrack(trackIndex + 1));

if (playBtn) {
  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.src = playlist[trackIndex].src;
      audio.play();
      playBtn.innerText = "⏸";
      musicTitle.innerText = "🎵 " + playlist[trackIndex].title;
      musicTitle.classList.add("playing");
    } else {
      audio.pause();
      playBtn.innerText = "▶";
      musicTitle.classList.remove("playing");
    }
  });
}

/* =========================
   DOM READY (BUTTONS)
========================= */
document.addEventListener("DOMContentLoaded", function () {

  // THEME TOGGLE
  const themeBtn = document.getElementById("themeToggle");
  const savedTheme = localStorage.getItem("theme") || "dark";
  if (savedTheme === "aqua") document.body.classList.add("aqua");

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      document.body.classList.toggle("aqua");
      const isAqua = document.body.classList.contains("aqua");
      localStorage.setItem("theme", isAqua ? "aqua" : "dark");
    });
  }

  // ADMIN BUTTON
 let adminTimer = null;
let adminTimeLeft = 30;

const adminBtn = document.getElementById("adminBtn");

if (adminBtn) {
  adminBtn.addEventListener("click", function () {

    // Kalau sedang admin, jangan minta password lagi
    if (isAdmin) return;

    const pass = prompt("🔐 Masukkan Password Admin");

    if (pass === "123admin") {
      isAdmin = true;
      adminTimeLeft = 30;
      alert("✅ Mode Admin Aktif (30 detik)");
      attachEditEvents();

      // Ubah tampilan tombol jadi countdown
      adminBtn.textContent = adminTimeLeft;
adminBtn.classList.add("countdown");


      adminTimer = setInterval(() => {
        adminTimeLeft--;
        adminBtn.textContent = adminTimeLeft;

        if (adminTimeLeft <= 0) {
          clearInterval(adminTimer);
          isAdmin = false;

          // kembalikan tombol
          adminBtn.textContent = "🔒";

          alert("⏳ Waktu admin habis. Logout otomatis.");

          renderAll(); // refresh supaya harga tidak bisa diklik lagi
        }
      }, 1000);

    } else {
      alert("❌ Password Salah!");
    }

  });
}


  // CHAT BUTTON
const chatBox = document.getElementById("chatBox");
const chatToggle = document.getElementById("chatToggle");
const bubbles = document.querySelectorAll(".bubble");
const typing = document.getElementById("typing");
const chatWA = document.getElementById("chatWA");

let chatOpenedOnce = false;

function playChatSequence() {
  bubbles.forEach(b => b.classList.add("hidden"));
  typing.classList.remove("hidden");
  chatWA.classList.add("hidden");

  let i = 0;

  const interval = setInterval(() => {
    typing.classList.add("hidden");

    if (bubbles[i]) {
      bubbles[i].classList.remove("hidden");
      i++;
      typing.classList.remove("hidden");
    } else {
      clearInterval(interval);
      typing.classList.add("hidden");
      chatWA.classList.remove("hidden");
    }
  }, 1000);
}

if (chatToggle && chatBox) {
  chatToggle.addEventListener("click", () => {
    chatBox.classList.toggle("show");

    if (chatBox.classList.contains("show") && !chatOpenedOnce) {
      playChatSequence();
      chatOpenedOnce = true;
    }
  });
}




window.addEventListener("load", () => {
  setTimeout(() => {
    if (!localStorage.getItem("chatAutoOpened")) {
      chatBox.classList.add("show");
      playChatSequence();
      localStorage.setItem("chatAutoOpened", "yes");
    }
  }, 2500);
});


});

/* =========================
   INIT
========================= */
renderAll();
