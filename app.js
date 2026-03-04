/* =========================
   GLOBAL STATE
========================= */
let isAdmin = false;
let adminTimer = null;
let adminTimeLeft = 30;

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

/* =========================
   LOAD SAVED DATA
========================= */
const saved = localStorage.getItem("ritaseData");
if (saved) Object.assign(data, JSON.parse(saved));

/* =========================
   UTIL
========================= */
function formatRupiah(n) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

/* =========================
   RENDER TABLE
========================= */
function render(target, rows) {
  const container = document.getElementById(target);
  if (!container) return;

  let html = `
    <div class="ritase-table-wrapper">
    <table class="ritase-table">
      <thead>
        <tr>
          <th>Pabrik</th>
          <th>Muatan</th>
          <th>Uang</th>
        </tr>
      </thead>
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

  html += "</tbody></table></div>";
  container.innerHTML = html;

  if (isAdmin) attachEditEvents();
}

function renderAll() {
  render("sps-aqua", data.spsAqua);
  render("galon-aqua", data.galonAqua);
  render("sps-vit", data.spsVit);
  render("galon-vit", data.galonVit);
}

/* =========================
   ADMIN EDIT
========================= */
function attachEditEvents() {
  document.querySelectorAll(".uang").forEach(cell => {
    cell.style.cursor = "pointer";
    cell.style.color = "#fbbf24";

    cell.onclick = () => {
      const key = cell.dataset.target.replace(/-([a-z])/g, g => g[1].toUpperCase());
      const index = cell.dataset.index;
      const current = data[key][index][2];

      const value = prompt(`Edit Harga (Saat ini: ${current})`, current);
      if (value && !isNaN(value)) {
        data[key][index][2] = parseInt(value);
        localStorage.setItem("ritaseData", JSON.stringify(data));
        renderAll();
      }
    };
  });
}

/* =========================
   DOM READY
========================= */
document.addEventListener("DOMContentLoaded", () => {

  renderAll();

  /* CLOCK */
  setInterval(() => {
    const el = document.getElementById("datetime");
    if (!el) return;
    const d = new Date();
    el.innerText =
      d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" }) + " WIB";
  }, 1000);

  /* VISITOR */
  let count = localStorage.getItem("visCount") || 1540;
  count = parseInt(count) + 1;
  localStorage.setItem("visCount", count);
  const visitorEl = document.getElementById("visitorNumber");
  if (visitorEl) visitorEl.innerText = count;

  /* ADMIN BUTTON */
  const adminBtn = document.getElementById("adminBtn");

  if (adminBtn) {
    adminBtn.addEventListener("click", () => {

      if (isAdmin) return;

      const pass = prompt("🔐 Masukkan Password Admin");

      if (pass === "123admin") {
        isAdmin = true;
        adminTimeLeft = 30;
        attachEditEvents();

        adminBtn.classList.add("countdown");

        adminTimer = setInterval(() => {
          adminTimeLeft--;
          adminBtn.textContent = adminTimeLeft;

          if (adminTimeLeft <= 0) {
            clearInterval(adminTimer);
            isAdmin = false;
            adminBtn.textContent = "🔒";
            renderAll();
            alert("⏳ Waktu admin habis.");
          }
        }, 1000);

      } else {
        alert("❌ Password Salah!");
      }
    });
  }

  /* SEARCH DMS */
  const searchInput = document.getElementById("searchInput");
  const dmsTable = document.getElementById("dmsTable");

  if (searchInput && dmsTable) {
    const rows = dmsTable.querySelectorAll("tbody tr");

    searchInput.addEventListener("keyup", () => {
      const filter = searchInput.value.toUpperCase();

      rows.forEach(row => {
        const text = row.innerText.toUpperCase();
        row.style.display = text.includes(filter) ? "" : "none";
      });
    });

    /* ROW ACTIVE (NO DOUBLE LOGIC) */
    rows.forEach(row => {
      row.addEventListener("click", () => {
        rows.forEach(r => r.classList.remove("active-row"));
        row.classList.add("active-row");
      });
    });
  }

});

/* =========================
   CHAT PREMIUM FIX
========================= */

document.addEventListener("DOMContentLoaded", () => {

  const chatToggle = document.getElementById("chatToggle");
  const chatBox = document.getElementById("chatBox");
  const chatClose = document.getElementById("chatClose");
  const chatWA = document.getElementById("chatWA");
  const typing = document.getElementById("typing");
  const bubbles = document.querySelectorAll(".bubble.bot");
  const chatSound = document.getElementById("chatSound");

  function showChatSequence() {
    let delay = 800;

    bubbles.forEach((bubble, i) => {
      setTimeout(() => {
        typing.classList.remove("hidden");

        setTimeout(() => {
          typing.classList.add("hidden");
          bubble.classList.remove("hidden");
          chatSound.play();
        }, 800);

      }, delay);

      delay += 1500;
    });

    setTimeout(() => {
      chatWA.classList.remove("hidden");
    }, delay);
  }

  if (chatToggle) {
    chatToggle.addEventListener("click", () => {
      chatBox.classList.toggle("show");

      if (chatBox.classList.contains("show")) {
        showChatSequence();
      }
    });
  }

  if (chatClose) {
    chatClose.addEventListener("click", () => {
      chatBox.classList.remove("show");
    });
  }

});
