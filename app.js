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
  
  let html = `<table><thead><tr><th>Pabrik</th><th>Muatan</th><th>Uang</th></tr></thead><tbody>`;
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
   FEATURES
========================= */
// 1. Clock
setInterval(() => {
  const d = new Date();
  document.getElementById("datetime").innerText = d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' }) + " WIB";
}, 1000);

// 2. Theme Toggle (Fix: Only one declaration)
const themeBtn = document.getElementById("themeToggle");
const savedTheme = localStorage.getItem("theme") || "dark";
if (savedTheme === "aqua") document.body.classList.add("aqua");

themeBtn.addEventListener("click", () => {
  document.body.classList.toggle("aqua");
  const isAqua = document.body.classList.contains("aqua");
  localStorage.setItem("theme", isAqua ? "aqua" : "dark");
});

// 3. Admin & Edit
document.getElementById("adminBtn").addEventListener("click", () => {
  const pass = prompt("🔐 Masukkan Password Admin");
  if (pass === "admin123") {
    isAdmin = true;
    alert("✅ Mode Admin Aktif! Klik pada harga untuk mengubah data.");
    attachEditEvents();
  } else {
    alert("❌ Password Salah!");
  }
});

function attachEditEvents() {
  document.querySelectorAll(".uang").forEach(cell => {
    cell.style.cursor = "pointer";
    cell.style.color = "#fbbf24"; // Memberi tanda bisa diedit
    cell.onclick = () => {
      const t = cell.dataset.target.replace(/-([a-z])/g, g => g[1].toUpperCase()); // convert sps-aqua to spsAqua
      const i = cell.dataset.index;
      const currentVal = data[t][i][2];
      const v = prompt(`Edit Harga (Saat ini: ${currentVal}):`, currentVal);
      if (v && !isNaN(v)) {
        data[t][i][2] = parseInt(v);
        localStorage.setItem("ritaseData", JSON.stringify(data));
        renderAll();
      }
    };
  });
}

// 4. Music Player Logic
const playlist = [
  { title: "Water Relaxation", src: "video/music1.mp3" }, // Pastikan file ada
  { title: "Driving Mood", src: "video/music2.mp3" }
];
let trackIndex = 0;
const audio = document.getElementById("audioPlayer");
const playBtn = document.getElementById("playBtn");
const musicTitle = document.getElementById("musicTitle");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");

function loadTrack(i) {
  trackIndex = (i + playlist.length) % playlist.length;
  audio.src = playlist[trackIndex].src;
  audio.play();
  playBtn.innerText = "⏸";
  musicTitle.innerText = "🎵 " + playlist[trackIndex].title;
  musicTitle.classList.add("playing");
}

prevBtn.addEventListener("click", () => {
  loadTrack(trackIndex - 1);
});

nextBtn.addEventListener("click", () => {
  loadTrack(trackIndex + 1);
});

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

// 5. Visitor Counter (Local Simulation)
let count = localStorage.getItem("visCount") || 1540;
count = parseInt(count) + 1;
localStorage.setItem("visCount", count);
document.getElementById("visitorNumber").innerText = count;

// Init
renderAll();
setTimeout(() => {
  document
    .querySelectorAll(".uang")[i]
    ?.classList.add("updated");
}, 50);

document.addEventListener("click", e => {
  const row = e.target.closest("tr");
  if (!row) return;

  row.classList.remove("pulse"); // reset
  void row.offsetWidth;          // force reflow
  row.classList.add("pulse");
});

const observer = new IntersectionObserver(
  entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("show");
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".glass").forEach(card => {
  card.classList.add("reveal");
  observer.observe(card);
});

document.addEventListener("DOMContentLoaded", () => {

  const chatToggle = document.getElementById("chatToggle");
  const chatBox = document.getElementById("chatBox");
  const chatClose = document.getElementById("chatClose");

  if (!chatToggle || !chatBox) {
    console.warn("Chat element tidak ditemukan");
    return;
  }

  chatToggle.addEventListener("click", () => {
    chatBox.classList.toggle("show");
  });

  chatClose.addEventListener("click", () => {
    chatBox.classList.remove("show");
  });

});
