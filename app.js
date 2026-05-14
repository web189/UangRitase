/* ═══════════════════════════════════════════
   UANG RITASE · app.js · 2026 EDITION v2
   Improvements:
   - Admin Login: Email + Password validation
   - Ritase Tables: Add / Edit full row / Delete row
   - DMS Table: Add / Edit / Delete row
   - Persistent localStorage for all changes
═══════════════════════════════════════════ */

/* ── STATE ── */
let isAdmin        = false;
let adminTimer     = null;
let adminTimeLeft  = 300; // 5 menit
let sortState      = {};
let pendingEdit    = null; // { key, index } for price-only (legacy, now full row)
let pendingRowEdit = null; // { key, index } for full row edit
let chatOpened     = false;

/* ── CREDENTIALS ── */
const ADMIN_EMAIL    = "admin@uangritase.com";
const ADMIN_PASSWORD = "Admin@2026";

/* ── DATA ── */
const defaultData = {
  spsAqua: [
    ["CRG",           "All SKU",      652000],
    ["CTR",           "All SKU",      532000],
    ["MKS",           "All SKU",      767000],
    ["CHR",           "All SKU",      612000],
    ["KEDEP",         "All SKU",      656500],
    ["CJR > 1120",    "AQ 1500 ML",   943000],
    ["CJR > 1440",    "AQ 600 ML",    943000],
    ["CJR > 840",     "AQ 1500 ML",   749000],
    ["CJR > 960",     "AQ 600 ML",    749000],
    ["CJR > 2340",    "AQ 330 ML",    943000],
    ["CJR > 980",     "AQ 1500 ML",   823000],
    ["CJR > 1820",    "AQ 330 ML",   1167000],
    ["DEPO JONGGOL",  "All SKU",      714000]
  ],
  galonAqua: [
    ["TBP", "432",          605000],
    ["TBP", "528",          622000],
    ["TBP", "720",          794000],
    ["TBP", "960",          809000],
    ["TBP", "1008",         820000],
    ["MKS", "432",          679000],
    ["MKS", "528",          696000],
    ["MKS", "960 LASAH",    859000],
    ["MKS", "960 JUGRACK",  821000],
    ["MKS", "1008",         870000],
    ["MKS", "720",          844000],
    ["CHG", "960 JUGRACK",  633000],
    ["CRG", "960 JUGRACK",  652000]
  ],
  spsVit: [
    ["TMP", "VT 200 ML",      642000],
    ["TMP", "VT 550 ML",      607000],
    ["TMP", "VT MOSKA 220",   642000],
    ["TMP", "VT 1500 ML",     630000],
    ["GIT", "VT 330 ML",     2163000]
  ],
  galonVit: [
    ["BTA", "528",  463000],
    ["BTA", "768",  574000],
    ["BTA", "960",  501000],
    ["SSS", "528",  457000],
    ["SSS", "768",  568000]
  ]
};

/* ── DMS DATA ── */
const defaultDms = [
  ["9101-9100", "MEKARSARI PLANT AGM"],
  ["9009-9000", "SUBANG PLANT TIV"],
  ["9017-9000", "CIANJUR PLANT TIV"],
  ["9013-9000", "CITEUREUP PLANT TIV"],
  ["9042-9000", "TIRTA MAS PERKASA"],
  ["9036-9000", "TIV XWH KEDEP"],
  ["9051-9000", "GRAHAMAS INTITIRTA"],
  ["90A2-9000", "TGSM"],
  ["9076-9000", "SENTUL PLANT TIV"],
  ["9039-9000", "BUANA TIRTA ABADI"],
  ["90A3-9000", "SUMBER SUKSES SENTOSA 2"],
  ["90A0-9000", "CARINGIN PLANT TIV"],
  ["9105-9100", "BABAKANPARI PLANT AGM"],
  ["9018-9000", "CIHERANG PLANT TIV"],
  ["9059-9000", "TIV XWH CIMANGGIS"],
  ["9056-9000", "TML CICURUG"],
  ["9077-9000", "XWH PETUNG SARI"],
  ["9027-9000", "CIBINONG DC TIV"],
  ["9015-9000", "KLATEN PLANT TIV"],
  ["9010-9000", "WONOSOBO PLANT TIV"],
  ["90A8-9000", "BANYUWANGI PLANT TIV"],
  ["90AD-9000", "TIRTA MAS PERKASA BAWEN"],
  ["90A5-9000", "XWH SENTUL"]
];

// Working data – merge with saved overrides
const data = JSON.parse(JSON.stringify(defaultData));
try {
  const saved = localStorage.getItem("ritaseData");
  if (saved) Object.assign(data, JSON.parse(saved));
} catch(e) {}

let dmsData = JSON.parse(JSON.stringify(defaultDms));
try {
  const savedDms = localStorage.getItem("dmsData");
  if (savedDms) dmsData = JSON.parse(savedDms);
} catch(e) {}

/* ── UTILS ── */
function formatRupiah(n) {
  return "Rp\u00A0" + Number(n).toLocaleString("id-ID");
}
function targetToKey(target) {
  return target.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}
function isVitSection(target) {
  return target.includes("vit");
}
function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}
function saveData() {
  try { localStorage.setItem("ritaseData", JSON.stringify(data)); } catch(e) {}
}
function saveDms() {
  try { localStorage.setItem("dmsData", JSON.stringify(dmsData)); } catch(e) {}
}

/* ── TOAST ── */
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.4s ease forwards";
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

/* ── STATS ── */
function updateStats() {
  const allRows = [...data.spsAqua, ...data.galonAqua, ...data.spsVit, ...data.galonVit];
  const prices  = allRows.map(r => r[2]);
  const total   = allRows.length;
  const avg     = prices.length ? Math.round(prices.reduce((a,b)=>a+b,0)/prices.length) : 0;
  const high    = prices.length ? Math.max(...prices) : 0;
  const el = id => document.getElementById(id);
  if (el("statTotal")) el("statTotal").textContent = total;
  if (el("statAvg"))   el("statAvg").textContent   = formatRupiah(avg);
  if (el("statHigh"))  el("statHigh").textContent  = formatRupiah(high);
}

/* ── RENDER TABLE ── */
function render(target, rows) {
  const container = document.getElementById(target);
  if (!container) return;

  const isVit      = isVitSection(target);
  const priceClass = isVit ? "uang vit-price" : "uang";

  let html = `
    <div class="ritase-table-wrapper">
      <table class="ritase-table">
        <thead>
          <tr>
            <th>Pabrik</th>
            <th>Muatan</th>
            <th style="text-align:right">Uang Ritase</th>
            ${isAdmin ? '<th class="th-actions">Aksi</th>' : ''}
          </tr>
        </thead>
        <tbody>`;

  rows.forEach((r, i) => {
    const isVitRow   = isVit ? " vit-row" : "";
    html += `
      <tr class="${isVitRow.trim()}">
        <td class="td-pabrik">${escHtml(r[0])}</td>
        <td class="td-muatan">${escHtml(r[1])}</td>
        <td class="${priceClass}" data-target="${target}" data-index="${i}">
          ${formatRupiah(r[2])}
        </td>
        ${isAdmin ? `
        <td class="td-actions">
          <button class="row-btn edit-row-btn" data-target="${target}" data-index="${i}" title="Edit baris">
            <i class="fas fa-pen"></i>
          </button>
          <button class="row-btn delete-row-btn" data-target="${target}" data-index="${i}" title="Hapus baris">
            <i class="fas fa-trash"></i>
          </button>
        </td>` : ''}
      </tr>`;
  });

  html += `</tbody></table></div>`;

  // Add row button (admin only)
  if (isAdmin) {
    html += `
      <div class="add-row-wrap">
        <button class="add-row-btn" data-target="${target}">
          <i class="fas fa-plus"></i> Tambah Rute
        </button>
      </div>`;
  }

  container.innerHTML = html;

  // Badge count
  const countEl = document.getElementById(`count-${target}`);
  if (countEl) countEl.textContent = `${rows.length} rute`;

  if (isAdmin) {
    // Edit full row buttons
    container.querySelectorAll(".edit-row-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openRowEditModal(btn.dataset.target, parseInt(btn.dataset.index));
      });
    });
    // Delete row buttons
    container.querySelectorAll(".delete-row-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteRow(btn.dataset.target, parseInt(btn.dataset.index));
      });
    });
    // Add row button
    container.querySelectorAll(".add-row-btn").forEach(btn => {
      btn.addEventListener("click", () => openRowEditModal(btn.dataset.target, -1));
    });
  }

  attachRowZoom(container);
}

/* ── ROW ZOOM ── */
function attachRowZoom(container) {
  const rows = container.querySelectorAll(".ritase-table tbody tr");
  rows.forEach(row => {
    row.addEventListener("click", (e) => {
      if (e.target.closest(".row-btn")) return;
      const isActive = row.classList.contains("row-active");
      const tbody = row.closest("tbody");
      tbody.querySelectorAll("tr.row-active").forEach(r => r.classList.remove("row-active"));
      if (!isActive) row.classList.add("row-active");
    });
  });
}

function renderAll() {
  render("sps-aqua",   data.spsAqua);
  render("galon-aqua", data.galonAqua);
  render("sps-vit",    data.spsVit);
  render("galon-vit",  data.galonVit);
  updateStats();
}

/* ── DELETE ROW (Ritase) ── */
function deleteRow(target, index) {
  const key  = targetToKey(target);
  const row  = data[key][index];
  if (!confirm(`Hapus rute "${row[0]} - ${row[1]}"?`)) return;
  data[key].splice(index, 1);
  saveData();
  render(target, data[key]);
  updateStats();
  showToast(`Rute dihapus: ${row[0]}`, "info");
}

/* ── ROW EDIT MODAL (Tambah / Edit Ritase) ── */
function openRowEditModal(target, index) {
  const key       = targetToKey(target);
  const isNew     = index === -1;
  const row       = isNew ? ["", "", ""] : data[key][index];

  pendingRowEdit  = { key, target, index };

  // Populate modal
  document.getElementById("rowEditTitle").textContent  = isNew ? "Tambah Rute" : "Edit Rute";
  document.getElementById("rowEditPabrik").value       = isNew ? "" : row[0];
  document.getElementById("rowEditMuatan").value       = isNew ? "" : row[1];
  document.getElementById("rowEditHarga").value        = isNew ? "" : row[2];
  document.getElementById("rowEditModal").classList.remove("hidden");
  setTimeout(() => document.getElementById("rowEditPabrik").focus(), 100);
}

function saveRowEdit() {
  const pabrik = document.getElementById("rowEditPabrik").value.trim();
  const muatan = document.getElementById("rowEditMuatan").value.trim();
  const harga  = parseInt(document.getElementById("rowEditHarga").value.trim());

  if (!pabrik) { showToast("Nama pabrik wajib diisi", "error"); return; }
  if (!muatan) { showToast("Muatan wajib diisi", "error"); return; }
  if (!harga || harga <= 0) { showToast("Harga harus angka > 0", "error"); return; }

  const { key, target, index } = pendingRowEdit;
  const isNew = index === -1;

  if (isNew) {
    data[key].push([pabrik, muatan, harga]);
    showToast(`Rute ditambahkan: ${pabrik}`, "success");
  } else {
    data[key][index] = [pabrik, muatan, harga];
    showToast(`Rute diperbarui: ${pabrik}`, "success");
  }

  saveData();
  document.getElementById("rowEditModal").classList.add("hidden");
  pendingRowEdit = null;
  render(target, data[key]);
  updateStats();
}

/* ── SORT ── */
function setupSort() {
  document.querySelectorAll(".card-sort").forEach(btn => {
    const target = btn.dataset.target;
    sortState[target] = "none";
    btn.addEventListener("click", () => {
      const key   = targetToKey(target);
      const rows  = data[key];
      const state = sortState[target];
      if (state === "none" || state === "desc") {
        rows.sort((a,b) => a[2]-b[2]);
        sortState[target] = "asc";
        btn.title = "Sorted: Terendah → Tertinggi";
        btn.classList.add("asc"); btn.classList.remove("desc");
      } else {
        rows.sort((a,b) => b[2]-a[2]);
        sortState[target] = "desc";
        btn.title = "Sorted: Tertinggi → Terendah";
        btn.classList.add("desc"); btn.classList.remove("asc");
      }
      render(target, rows);
    });
  });
}

/* ── FILTER ── */
function setupFilter() {
  const btns  = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".glass-card");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;
      cards.forEach(card => {
        if (filter === "all") { card.style.display = ""; }
        else {
          const cats = card.dataset.category || "";
          card.style.display = cats.includes(filter) ? "" : "none";
        }
      });
    });
  });
}

/* ── ADMIN MODAL ── */
function setupAdmin() {
  const adminBtn     = document.getElementById("adminBtn");
  const adminModal   = document.getElementById("adminModal");
  const adminCancel  = document.getElementById("adminCancel");
  const adminConfirm = document.getElementById("adminConfirm");
  const passInput    = document.getElementById("adminPassInput");
  const emailInput   = document.getElementById("adminEmailInput");
  const passToggle   = document.getElementById("adminPassToggle");
  const errorMsg     = document.getElementById("adminError");

  if (passToggle) {
    passToggle.addEventListener("click", () => {
      const isPass = passInput.type === "password";
      passInput.type = isPass ? "text" : "password";
      passToggle.innerHTML = isPass
        ? '<i class="fas fa-eye-slash"></i>'
        : '<i class="fas fa-eye"></i>';
    });
  }

  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      if (isAdmin) {
        // Logout
        clearInterval(adminTimer);
        isAdmin = false;
        adminBtn.classList.remove("countdown");
        adminBtn.innerHTML = '<i class="fas fa-lock"></i>';
        renderAll();
        renderDmsTable();
        showToast("Keluar dari mode admin", "info");
        return;
      }
      if (emailInput) emailInput.value = "";
      if (passInput)  passInput.value  = "";
      if (errorMsg)   errorMsg.textContent = "";
      adminModal.classList.remove("hidden");
      setTimeout(() => emailInput && emailInput.focus(), 150);
    });
  }

  if (adminCancel) {
    adminCancel.addEventListener("click", () => adminModal.classList.add("hidden"));
  }
  if (adminConfirm) {
    adminConfirm.addEventListener("click", tryAdminLogin);
  }

  // Enter key on any input
  [emailInput, passInput].forEach(inp => {
    if (inp) inp.addEventListener("keydown", e => { if (e.key === "Enter") tryAdminLogin(); });
  });

  if (adminModal) {
    adminModal.addEventListener("click", e => {
      if (e.target === adminModal) adminModal.classList.add("hidden");
    });
  }
}

function tryAdminLogin() {
  const emailInput = document.getElementById("adminEmailInput");
  const passInput  = document.getElementById("adminPassInput");
  const adminModal = document.getElementById("adminModal");
  const adminBtn   = document.getElementById("adminBtn");
  const errorMsg   = document.getElementById("adminError");

  const email = (emailInput?.value || "").trim().toLowerCase();
  const pass  = (passInput?.value  || "").trim();

  // Validate
  if (!email) {
    if (errorMsg) errorMsg.textContent = "Email wajib diisi";
    emailInput?.focus();
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    if (errorMsg) errorMsg.textContent = "Format email tidak valid";
    emailInput?.focus();
    return;
  }
  if (!pass) {
    if (errorMsg) errorMsg.textContent = "Password wajib diisi";
    passInput?.focus();
    return;
  }

  if (email === ADMIN_EMAIL.toLowerCase() && pass === ADMIN_PASSWORD) {
    isAdmin       = true;
    adminTimeLeft = 300;
    adminModal.classList.add("hidden");
    adminBtn.classList.add("countdown");
    adminBtn.classList.remove("active");
    updateAdminBtnTimer();
    renderAll();
    renderDmsTable();
    showToast("Mode Admin aktif · 5 menit", "success");

    adminTimer = setInterval(() => {
      adminTimeLeft--;
      updateAdminBtnTimer();
      if (adminTimeLeft <= 0) {
        clearInterval(adminTimer);
        isAdmin = false;
        adminBtn.classList.remove("countdown");
        adminBtn.innerHTML = '<i class="fas fa-lock"></i>';
        renderAll();
        renderDmsTable();
        showToast("Sesi admin berakhir", "info");
      }
    }, 1000);

  } else {
    if (errorMsg) errorMsg.textContent = "Email atau password salah!";
    passInput && (passInput.value = "");
    passInput?.focus();
    showToast("Login gagal!", "error");
  }
}

function updateAdminBtnTimer() {
  const adminBtn = document.getElementById("adminBtn");
  if (!adminBtn) return;
  const m = Math.floor(adminTimeLeft / 60);
  const s = adminTimeLeft % 60;
  adminBtn.innerHTML = `<span style="font-size:11px;font-weight:800">${m}:${s.toString().padStart(2,'0')}</span>`;
}

/* ── ROW EDIT MODAL SETUP ── */
function setupRowEditModal() {
  const modal   = document.getElementById("rowEditModal");
  const cancel  = document.getElementById("rowEditCancel");
  const confirm = document.getElementById("rowEditConfirm");
  const inp     = document.getElementById("rowEditHarga");

  if (cancel)  cancel.addEventListener("click",  () => { modal.classList.add("hidden"); pendingRowEdit = null; });
  if (confirm) confirm.addEventListener("click", saveRowEdit);
  if (inp)     inp.addEventListener("keydown", e => { if (e.key === "Enter") saveRowEdit(); });
  if (modal)   modal.addEventListener("click", e => { if (e.target === modal) { modal.classList.add("hidden"); pendingRowEdit = null; } });
}

/* ── DMS TABLE ── */
function renderDmsTable() {
  const tbody   = document.querySelector("#dmsTable tbody");
  const dmsCount = document.getElementById("dmsCount");
  if (!tbody) return;

  tbody.innerHTML = "";

  dmsData.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escHtml(row[0])}</td>
      <td>${escHtml(row[1])}</td>
      ${isAdmin ? `
      <td class="td-actions">
        <button class="row-btn edit-row-btn" data-index="${i}" title="Edit">
          <i class="fas fa-pen"></i>
        </button>
        <button class="row-btn delete-row-btn" data-index="${i}" title="Hapus">
          <i class="fas fa-trash"></i>
        </button>
      </td>` : ''}
    `;

    // Copy on click (non-admin cells)
    tr.addEventListener("click", (e) => {
      if (e.target.closest(".row-btn")) return;
      document.querySelectorAll("#dmsTable tbody tr.active-row").forEach(r => r.classList.remove("active-row"));
      tr.classList.add("active-row");
      const code = row[0];
      const name = row[1];
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          showToast(`Disalin: ${code} · ${name}`, "info", 2500);
        }).catch(() => {});
      }
    });

    tbody.appendChild(tr);
  });

  // Attach admin buttons
  if (isAdmin) {
    tbody.querySelectorAll(".edit-row-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openDmsEditModal(parseInt(btn.dataset.index));
      });
    });
    tbody.querySelectorAll(".delete-row-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteDmsRow(parseInt(btn.dataset.index));
      });
    });
  }

  // Update count
  if (dmsCount) dmsCount.textContent = `${dmsData.length} pabrik`;

  // Update search
  setupSearch();

  // Add button for admin
  const addWrap = document.getElementById("dmsAddWrap");
  if (addWrap) addWrap.style.display = isAdmin ? "flex" : "none";

  // Add action column header
  const thead = document.querySelector("#dmsTable thead tr");
  if (thead) {
    const existing = thead.querySelector(".th-actions-dms");
    if (isAdmin && !existing) {
      const th = document.createElement("th");
      th.className = "th-actions-dms";
      th.textContent = "Aksi";
      thead.appendChild(th);
    } else if (!isAdmin && existing) {
      existing.remove();
    }
  }
}

function openDmsEditModal(index) {
  const isNew = index === -1;
  const row   = isNew ? ["", ""] : dmsData[index];

  document.getElementById("dmsEditTitle").textContent  = isNew ? "Tambah Pabrik" : "Edit Pabrik";
  document.getElementById("dmsEditKode").value         = isNew ? "" : row[0];
  document.getElementById("dmsEditNama").value         = isNew ? "" : row[1];
  document.getElementById("dmsEditIndex").value        = index;
  document.getElementById("dmsEditModal").classList.remove("hidden");
  setTimeout(() => document.getElementById("dmsEditKode").focus(), 100);
}

function saveDmsEdit() {
  const kode  = document.getElementById("dmsEditKode").value.trim().toUpperCase();
  const nama  = document.getElementById("dmsEditNama").value.trim().toUpperCase();
  const index = parseInt(document.getElementById("dmsEditIndex").value);
  const isNew = index === -1;

  if (!kode) { showToast("Kode pabrik wajib diisi", "error"); return; }
  if (!nama)  { showToast("Nama pabrik wajib diisi", "error"); return; }

  if (isNew) {
    dmsData.push([kode, nama]);
    showToast(`Pabrik ditambahkan: ${kode}`, "success");
  } else {
    dmsData[index] = [kode, nama];
    showToast(`Pabrik diperbarui: ${kode}`, "success");
  }

  saveDms();
  document.getElementById("dmsEditModal").classList.add("hidden");
  renderDmsTable();
}

function deleteDmsRow(index) {
  const row = dmsData[index];
  if (!confirm(`Hapus pabrik "${row[0]} - ${row[1]}"?`)) return;
  dmsData.splice(index, 1);
  saveDms();
  renderDmsTable();
  showToast(`Pabrik dihapus: ${row[0]}`, "info");
}

function setupDmsEditModal() {
  const modal   = document.getElementById("dmsEditModal");
  const cancel  = document.getElementById("dmsEditCancel");
  const confirm = document.getElementById("dmsEditConfirm");

  if (cancel)  cancel.addEventListener("click",  () => modal.classList.add("hidden"));
  if (confirm) confirm.addEventListener("click", saveDmsEdit);
  if (modal)   modal.addEventListener("click", e => { if (e.target === modal) modal.classList.add("hidden"); });

  // Enter key
  ["dmsEditKode","dmsEditNama"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", e => { if (e.key === "Enter") saveDmsEdit(); });
  });

  // Add button
  const addBtn = document.getElementById("dmsAddBtn");
  if (addBtn) addBtn.addEventListener("click", () => openDmsEditModal(-1));
}

/* ── SEARCH DMS ── */
function setupSearch() {
  const searchInput = document.getElementById("searchInput");
  const searchClear = document.getElementById("searchClear");
  const dmsTable    = document.getElementById("dmsTable");
  const noResult    = document.getElementById("noResult");
  const noResQ      = document.getElementById("noResultQuery");
  const dmsCount    = document.getElementById("dmsCount");

  if (!searchInput || !dmsTable) return;

  const allRows = Array.from(dmsTable.querySelectorAll("tbody tr"));
  const total   = dmsData.length;

  function doSearch() {
    const filter = searchInput.value.toUpperCase().trim();
    let visible  = 0;
    allRows.forEach(row => {
      const match = row.textContent.toUpperCase().includes(filter);
      row.style.display = match ? "" : "none";
      if (match) visible++;
    });
    if (searchClear) searchClear.style.display = filter ? "flex" : "none";
    if (noResult) {
      noResult.classList.toggle("hidden", visible > 0 || !filter);
      if (noResQ) noResQ.textContent = searchInput.value;
    }
    if (dmsCount) {
      dmsCount.textContent = filter
        ? `${visible} dari ${total} pabrik`
        : `${total} pabrik`;
    }
  }

  // Remove old listeners by cloning
  const newInput = searchInput.cloneNode(true);
  searchInput.parentNode.replaceChild(newInput, searchInput);
  newInput.addEventListener("input", doSearch);

  const newClear = searchClear ? searchClear.cloneNode(true) : null;
  if (searchClear && newClear) {
    searchClear.parentNode.replaceChild(newClear, searchClear);
    newClear.addEventListener("click", () => { newInput.value = ""; doSearch(); newInput.focus(); });
  }
}

/* ── CHAT WIDGET ── */
function setupChat() {
  const chatToggle = document.getElementById("chatToggle");
  const chatBox    = document.getElementById("chatBox");
  const chatClose  = document.getElementById("chatClose");
  const chatWA     = document.getElementById("chatWA");
  const typing     = document.getElementById("typing");
  const bubbles    = document.querySelectorAll(".bubble.bot");
  const chatSound  = document.getElementById("chatSound");
  const chatNotif  = document.querySelector(".chat-notif");

  function resetBubbles() {
    bubbles.forEach(b => b.classList.add("hidden"));
    if (typing) typing.classList.add("hidden");
    if (chatWA) chatWA.classList.add("hidden");
  }

  function showSequence() {
    resetBubbles();
    let delay = 600;
    bubbles.forEach((bubble) => {
      setTimeout(() => {
        if (typing) typing.classList.remove("hidden");
        setTimeout(() => {
          if (typing) typing.classList.add("hidden");
          bubble.classList.remove("hidden");
          if (chatSound) { chatSound.currentTime = 0; chatSound.play().catch(() => {}); }
        }, 700);
      }, delay);
      delay += 1400;
    });
    setTimeout(() => { if (chatWA) chatWA.classList.remove("hidden"); }, delay + 200);
  }

  if (chatToggle) {
    chatToggle.addEventListener("click", () => {
      const isOpen = chatBox.classList.toggle("show");
      if (isOpen) {
        if (chatNotif) chatNotif.style.display = "none";
        if (!chatOpened) { chatOpened = true; showSequence(); }
      }
    });
  }
  if (chatClose) chatClose.addEventListener("click", () => chatBox.classList.remove("show"));
  document.addEventListener("click", e => {
    if (chatBox && chatBox.classList.contains("show") &&
        !chatBox.contains(e.target) &&
        !chatToggle.contains(e.target)) {
      chatBox.classList.remove("show");
    }
  });
}

/* ── CLOCK ── */
function startClock() {
  function tick() {
    const el = document.getElementById("datetime");
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleString("id-ID", {
      weekday: "short", day: "2-digit", month: "short",
      year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }) + " WIB";
  }
  tick();
  setInterval(tick, 1000);
}

/* ── VISITOR COUNTER ── */
function initVisitor() {
  let count = parseInt(localStorage.getItem("visCount") || "1540");
  count++;
  localStorage.setItem("visCount", count);
  const el = document.getElementById("visitorNumber");
  if (el) {
    let start = count - 20;
    const step = () => { start++; el.textContent = start; if (start < count) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderDmsTable();
  startClock();
  initVisitor();
  setupSort();
  setupFilter();
  setupSearch();
  setupAdmin();
  setupRowEditModal();
  setupDmsEditModal();
  setupChat();

  document.querySelectorAll(".glass-card").forEach((card, i) => {
    card.style.animationDelay = `${i * 0.07}s`;
  });

  setTimeout(() => showToast("Data ritase berhasil dimuat", "success", 2500), 800);
});
