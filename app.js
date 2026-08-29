/* ==========================================================================
   UangRitase — app.js (versi ringan)
   Perubahan utama dari versi lama:
   - Canvas particle-network (O(n²) per frame + mouse tracking) DIHAPUS
   - Interval JS yang terus-menerus membuat elemen "bubble" DIHAPUS
   - Diganti ambient blob CSS-only (lihat style.css) -> nyaris tanpa biaya CPU
   - Jumlah bintang di langit dikurangi, interval update diperlambat
   - Tabel referensi baru (galon/SPS/item/pabrik/DMS) disembunyikan di
     accordion & baru dirender saat pertama kali dibuka (lazy render)
   ========================================================================== */

/* ---------- Firebase ---------- */
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDth7CHrLlloGLKegjEzkU-jcUiWxCq828",
  authDomain: "uangritase.firebaseapp.com",
  databaseURL: "https://uangritase-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "uangritase",
  storageBucket: "uangritase.firebasestorage.app",
  messagingSenderId: "398064880612",
  appId: "1:398064880612:web:106b463bcec509d5c255f1"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

/* ---------- Helper kecil ---------- */
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rupiah = (n) => "Rp " + Number(n).toLocaleString("id-ID");
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const isVit = (s) => s.includes("vit");

/* ---------- Data default (dipakai kalau Firebase kosong) ---------- */
const DEFAULT_RITASE = {
  spsAqua: [
    ["CRG", "All SKU", 652000], ["CTR", "All SKU", 532000], ["MKS", "All SKU", 767000],
    ["CHR", "All SKU", 612000], ["KEDEP", "All SKU", 656500],
    ["CJR > 1120", "AQ 1500 ML", 943000], ["CJR > 1440", "AQ 600 ML", 943000],
    ["CJR > 840", "AQ 1500 ML", 749000], ["CJR > 960", "AQ 600 ML", 749000],
    ["CJR > 2340", "AQ 330 ML", 943000], ["CJR > 980", "AQ 1500 ML", 823000],
    ["CJR > 1820", "AQ 330 ML", 1167000], ["DEPO JONGGOL", "All SKU", 714000]
  ],
  galonAqua: [
    ["TBP", "432", 605000], ["TBP", "528", 622000], ["TBP", "720", 794000],
    ["TBP", "960", 809000], ["TBP", "1008", 820000], ["MKS", "432", 679000],
    ["MKS", "528", 696000], ["MKS", "960 LASAH", 859000], ["MKS", "960 JUGRACK", 821000],
    ["MKS", "1008", 870000], ["MKS", "720", 844000], ["CHG", "960 JUGRACK", 633000],
    ["CRG", "960 JUGRACK", 652000]
  ],
  spsVit: [
    ["TMP", "VT 200 ML", 642000], ["TMP", "VT 550 ML", 607000], ["TMP", "VT MOSKA 220", 642000],
    ["TMP", "VT 1500 ML", 630000], ["GIT", "VT 330 ML", 2163000]
  ],
  galonVit: [
    ["BTA", "528", 463000], ["BTA", "768", 574000], ["BTA", "960", 501000],
    ["SSS", "528", 457000], ["SSS", "768", 568000]
  ]
};

const DEFAULT_DMS = [
  ["9101-9100", "MEKARSARI PLANT AGM"], ["9009-9000", "SUBANG PLANT TIV"],
  ["9017-9000", "CIANJUR PLANT TIV"], ["9013-9000", "CITEUREUP PLANT TIV"],
  ["9042-9000", "TIRTA MAS PERKASA"], ["9036-9000", "TIV XWH KEDEP"],
  ["9051-9000", "GRAHAMAS INTITIRTA"], ["90A2-9000", "TGSM"],
  ["9076-9000", "SENTUL PLANT TIV"], ["9039-9000", "BUANA TIRTA ABADI"],
  ["90A3-9000", "SUMBER SUKSES SENTOSA 2"], ["90A0-9000", "CARINGIN PLANT TIV"],
  ["9105-9100", "BABAKANPARI PLANT AGM"], ["9018-9000", "CIHERANG PLANT TIV"],
  ["9059-9000", "TIV XWH CIMANGGIS"], ["9056-9000", "TML CICURUG"],
  ["9077-9000", "XWH PETUNG SARI"], ["9027-9000", "CIBINONG DC TIV"],
  ["9015-9000", "KLATEN PLANT TIV"], ["9010-9000", "WONOSOBO PLANT TIV"],
  ["90A8-9000", "BANYUWANGI PLANT TIV"], ["90AD-9000", "TIRTA MAS PERKASA BAWEN"],
  ["90A5-9000", "XWH SENTUL"]
];

/* ---------- Data referensi baru (PT. LOKON PRIMA — update 25 Mei 2026) ---------- */
/* Statis di sisi klien: tidak perlu edit admin / Firebase, murni tabel lookup. */
const REF_DATA = {
  galon: {
    label: "Kode Galon (Driver)", icon: "fa-jug-water",
    cols: ["Nama Driver", "Kode"],
    rows: [
      ["ABDUL ROHIM","281-R003"],["ADUN","281-R005"],["ANDRI KOSWARA","281-R064"],
      ["ANDRI SETIAWAN","281-R068"],["BAENURI","281-R012"],["BURHANUDIN","281-R013"],
      ["CECEP SUPRIYADI","281-R015"],["DADAN","281-R057"],["DEDE HARYANA","281-R016"],
      ["FAHRUL ROZI","281-R018"],["FIRMANSYAH","281-R051"],["GILANG","281-R045"],
      ["HERIYAWAN","281-R019"],["JAMALUDIN","281-R065"],["M JAELANI","281-R063"],
      ["MEDI","281-R022"],["MUSTOFA","281-R054"],["MUIS ISKANDAR","281-R026"],
      ["NANANG SURYANA","281-R027"],["NICANG","281-R028"],["NURUL HAQI","281-R055"],
      ["NURYADI","281-R029"],["RENDI PURNOMO","281-R031"],["SAEPULOH","281-R033"],
      ["SANUSI","281-R034"],["SARIPUDIN","281-R035"],["TEGUH KARYADI","281-R039"],
      ["TEJA SUMIRAT","281-R040"],["YAYAN","281-R067"],["WAHYU HIDAYAT","281-R042"]
    ]
  },
  sps: {
    label: "Kode SPS (Driver)", icon: "fa-truck",
    cols: ["Nama Driver", "Kode"],
    rows: [
      ["A BAHRUNI","281-R001"],["ARIS PAHRIJAL","281-R010"],["ARGI MULYANA","281-R061"],
      ["CAKRAINA","281-R014"],["FAHRI MUHAMMAD","281-R058"],["HERMANSYAH","281-R020"],
      ["IKBAL TAWAKAL","281-R043"],["INANG","281-R060"],["IRWAN","281-R044"],
      ["NAMIN","281-R062"],["LUKMANUL HAKIM","281-R021"],["M DWI CAHYANTO","281-R047"],
      ["M. CIPTAYUDIN","281-R023"],["RELY TRIGUNO","281-R030"],["REYNALDI","281-R056"],
      ["SOPIAN","281-R036"],["SUPIAN","281-R037"],["TAUFIK HIDAYAT","281-R038"]
    ]
  },
  itemUtama: {
    label: "Item Utama", icon: "fa-box",
    cols: ["Item", "Kode"],
    rows: [
      ["AQ, GALON ISI","74559"],["AQ, GALON BTL","10516937"],
      ["VT, GALON ISI","74560"],["VT, GALON BTL","10169932"],["JUGRACK","10169743"]
    ]
  },
  itemAqua: {
    label: "Item AQUA (ml)", icon: "fa-droplet",
    cols: ["Item", "Kode"],
    rows: [
      ["AQ, 200 ml","204579"],["AQ, 220 CUBE","166126"],["AQ, 330 ml","74556"],
      ["AQ, 600 ml","<span class=\"kode-strike\">74501</span> (dicoret)"],
      ["AQ, 600 GOS","208575"],["AQ, 750 ml","81681"],["AQ, 1500 ml","74553"],["PALET","10169749"]
    ]
  },
  itemVit: {
    label: "Item VIT", icon: "fa-circle",
    cols: ["Item", "Kode"],
    rows: [
      ["VT, 200","173022"],["VT, 220 MOKSA","164026"],
      ["KARTON VT","<span class=\"kode-highlight\">81714</span>"],
      ["VT, 330","112839"],["VT, 550","157095"],["VT, 1500","74565"]
    ]
  },
  itemMizz: {
    label: "Item MIZZ", icon: "fa-bottle-water",
    cols: ["Item", "Kode"],
    rows: [["MIZZ ALL 500","145141"],["MIZZ MUC","145143"],["MIZZ COCO BOS","206774"]]
  },
  pabrik: {
    label: "Kode Pabrik (Singkatan)", icon: "fa-industry",
    cols: ["Pabrik", "Kode"],
    rows: [
      ["B / CTR","9013-9000"],["C / SENTUL","9076-9000"],["CJR","9017-9000"],
      ["E / MKS","9101-9100"],["G / TBP","9105-9100"],["X / CRG","90A0-9000"],
      ["Z / CHG","9018-9000"],["BTA","9039-9000"],["GIT","9051-9000"],
      ["KEDEP","9036-9000"],["SSS","90A3-9000"],["TMP","9042-9000"]
    ]
  },
  dmsLevel: {
    label: "DMS Level", icon: "fa-hashtag",
    cols: ["DMS", "Kode"],
    rows: [["DMS 3","7281"],["DMS 5","9616"],["DMS 5 NG","9301"]]
  }
};
const REF_NOTE = "Pabrik BTA → keluar RB 10 · Pabrik SSS → keluar RB 15 (update 25 Mei 2026)";

/* ---------- State ---------- */
let isAdmin = false;
let logoutTimer = null, logoutSeconds = 300;
let sortState = {};
let ritase = { spsAqua: [], galonAqua: [], spsVit: [], galonVit: [] };
let dmsList = [];
let historyList = [];
let editCtx = null;      // konteks row-edit modal
let deleteCtx = null;    // konteks delete modal
let undoStack = [];
let undoTimer = null;
let resizeTimer = null;
let chatOpened = false;

/* ---------- Firebase data <-> array (hindari masalah array-sparse) ---------- */
function toObj(arr) { const o = {}; arr.forEach((r, i) => (o["r" + i] = JSON.stringify(r))); return o; }
function fromObj(o) {
  if (!o || typeof o !== "object") return [];
  return Object.keys(o).filter(k => k.startsWith("r"))
    .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
    .map(k => { try { return JSON.parse(o[k]); } catch { return null; } })
    .filter(Boolean);
}

/* ---------- Toast ---------- */
function toast(msg, type = "info", duration = 3200) {
  const c = $("toastContainer"); if (!c) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icon = { success: "✅", error: "❌", info: "ℹ️", warn: "⚠️" }[type] || "ℹ️";
  el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${msg}</span>`;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-show"));
  setTimeout(() => { el.classList.remove("toast-show"); el.classList.add("toast-hide"); setTimeout(() => el.remove(), 420); }, duration);
}

/* ---------- Firebase write ---------- */
function saveRitase() {
  if (!auth.currentUser) return toast("⚠️ Login admin dulu!", "warn");
  set(ref(db, "ritase"), {
    spsAqua: toObj(ritase.spsAqua), galonAqua: toObj(ritase.galonAqua),
    spsVit: toObj(ritase.spsVit), galonVit: toObj(ritase.galonVit)
  }).then(() => toast("✅ Data tersimpan!", "success", 2000))
    .catch(e => toast(e.code === "PERMISSION_DENIED" ? "❌ Permission denied! Cek Firebase Rules" : "❌ Error: " + e.message, "error", 6000));
}
function saveDms() {
  if (!auth.currentUser) return toast("⚠️ Login admin dulu!", "warn");
  set(ref(db, "dms"), toObj(dmsList)).then(() => toast("✅ DMS tersimpan!", "success", 2000))
    .catch(e => toast(e.code === "PERMISSION_DENIED" ? "❌ Permission denied! Cek Firebase Rules" : "❌ Error DMS: " + e.message, "error", 6000));
}
function pushHistory(action, section, detail) {
  if (!auth.currentUser) return;
  push(ref(db, "history"), { action, section, detail, email: auth.currentUser.email, ts: Date.now() }).catch(() => {});
}

/* ---------- Stats ---------- */
function animateNumber(el, target) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }
  let step = 0; const steps = 20;
  const tick = () => { step++; el.textContent = Math.round(start + (step / steps) * (target - start)); if (step < steps) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}
function renderStats() {
  const all = [...ritase.spsAqua, ...ritase.galonAqua, ...ritase.spsVit, ...ritase.galonVit];
  const values = all.map(r => Number(r[2]));
  animateNumber($("statTotal"), all.length);
  if ($("statAvg")) $("statAvg").textContent = rupiah(values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0);
  if ($("statHigh")) $("statHigh").textContent = rupiah(values.length ? Math.max(...values) : 0);
}

/* ---------- Render tabel ritase per kategori ---------- */
const SECTION_LABEL = { "sps-aqua": "SPS AQUA", "galon-aqua": "GALON AQUA", "sps-vit": "SPS VIT", "galon-vit": "GALON VIT" };

function renderRitaseTable(id, rows) {
  const container = $(id); if (!container) return;
  const vit = isVit(id);
  const priceCls = vit ? "uang vit-price" : "uang";
  let html = `<div class="rtw"><table class="ritase-table"><thead><tr>
      <th class="th-no">#</th><th>Pabrik</th><th>Muatan</th>
      <th class="th-price">Uang Ritase</th>
      ${isAdmin ? '<th class="th-act"><i class="fas fa-sliders"></i></th>' : ""}
    </tr></thead><tbody>`;
  rows.forEach((r, i) => {
    html += `<tr class="rtr${vit ? " vit-row" : ""}" data-i="${i}">
        <td class="td-no">${i + 1}</td>
        <td class="td-pabrik">${esc(r[0])}</td>
        <td class="td-muatan"><span class="muatan-chip">${esc(r[1])}</span></td>
        <td class="${priceCls}">${rupiah(r[2])}</td>
        ${isAdmin ? `<td class="td-act"><div class="act-group">
          <button class="act-btn act-edit" data-target="${id}" data-i="${i}"><i class="fas fa-pen-to-square"></i></button>
          <button class="act-btn act-del" data-target="${id}" data-i="${i}"><i class="fas fa-trash-can"></i></button>
        </div></td>` : ""}
      </tr>`;
  });
  html += "</tbody></table></div>";
  if (isAdmin) html += `<button class="add-fab-btn" data-target="${id}"><i class="fas fa-plus-circle"></i><span>Tambah Rute ${SECTION_LABEL[id] || ""}</span></button>`;
  container.innerHTML = html;

  const wrap = container.querySelector(".rtw");
  if (wrap) requestAnimationFrame(() => { if (wrap.scrollWidth > wrap.clientWidth + 2) wrap.classList.add("scrollable"); });

  container.querySelectorAll(".rtr").forEach((tr, i) => { tr.style.animationDelay = 22 * i + "ms"; tr.classList.add("row-in"); });

  const countEl = $(`count-${id}`); if (countEl) countEl.textContent = `${rows.length} rute`;

  if (isAdmin) {
    container.querySelectorAll(".act-edit").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openRowEdit(b.dataset.target, +b.dataset.i); }));
    container.querySelectorAll(".act-del").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openDeleteModal("ritase", b.dataset.target, +b.dataset.i); }));
    container.querySelectorAll(".add-fab-btn").forEach(b => b.addEventListener("click", () => openRowEdit(b.dataset.target, -1)));
    enableSwipeDelete(container);
  }
  enableRowSelect(container);
}

function enableSwipeDelete(container) {
  container.querySelectorAll(".rtr").forEach(tr => {
    let startX = 0, dx = 0, dragging = false;
    tr.addEventListener("touchstart", e => { startX = e.touches[0].clientX; dx = 0; dragging = true; }, { passive: true });
    tr.addEventListener("touchmove", e => {
      if (!dragging) return;
      dx = e.touches[0].clientX - startX;
      if (dx < 0) { tr.style.transform = `translateX(${Math.max(dx, -110)}px)`; tr.style.opacity = "" + (1 + dx / 220); }
    }, { passive: true });
    tr.addEventListener("touchend", () => {
      dragging = false;
      if (dx < -75) {
        tr.style.transition = "transform .22s,opacity .22s"; tr.style.transform = "translateX(-120%)"; tr.style.opacity = "0";
        const target = tr.closest("[id]")?.id, i = +tr.dataset.i;
        setTimeout(() => openDeleteModal("ritase", target, i), 200);
      } else {
        tr.style.transition = "transform .3s,opacity .3s"; tr.style.transform = ""; tr.style.opacity = "";
        setTimeout(() => { tr.style.transition = ""; }, 320);
      }
    });
  });
}
function enableRowSelect(container) {
  container.querySelectorAll(".rtr").forEach(tr => {
    tr.addEventListener("click", e => {
      if (e.target.closest(".act-btn,.add-fab-btn")) return;
      const wasActive = tr.classList.contains("row-active");
      tr.closest("tbody").querySelectorAll(".row-active").forEach(t => t.classList.remove("row-active"));
      if (!wasActive) tr.classList.add("row-active");
    });
  });
}

function renderAllRitase() {
  renderRitaseTable("sps-aqua", ritase.spsAqua);
  renderRitaseTable("galon-aqua", ritase.galonAqua);
  renderRitaseTable("sps-vit", ritase.spsVit);
  renderRitaseTable("galon-vit", ritase.galonVit);
  renderStats();
  renderAdminButton();
}

/* ---------- Row edit modal (ritase) ---------- */
function openRowEdit(target, index) {
  const key = camel(target);
  const isNew = index === -1;
  const row = isNew ? ["", "", ""] : ritase[key][index];
  editCtx = { key, target, index };
  const title = $("rowEditTitle"); if (title) title.innerHTML = isNew ? '<i class="fas fa-circle-plus"></i> Tambah Rute' : '<i class="fas fa-pen-to-square"></i> Edit Rute';
  const pill = $("rowEditSection");
  if (pill) { pill.textContent = SECTION_LABEL[target] || target; pill.className = "section-pill " + (isVit(target) ? "badge-vit" : "badge-aqua"); }
  const circle = $("editIconCircle");
  if (circle) { const vit = isVit(target); circle.style.background = vit ? "rgba(255,69,96,0.12)" : ""; circle.style.color = vit ? "var(--vit)" : ""; circle.style.borderColor = vit ? "rgba(255,69,96,0.25)" : ""; }
  $("rowEditPabrik").value = row[0]; $("rowEditMuatan").value = row[1]; $("rowEditHarga").value = row[2] || "";
  clearFieldErrors();
  openModal("rowEditModal");
  setTimeout(() => $("rowEditPabrik")?.focus(), 230);
}
function submitRowEdit() {
  const pabrik = $("rowEditPabrik").value.trim().toUpperCase();
  const muatan = $("rowEditMuatan").value.trim().toUpperCase();
  const harga = parseInt($("rowEditHarga").value.trim());
  clearFieldErrors();
  let ok = true;
  if (!pabrik) { setFieldError("ferrPabrik", "Nama pabrik wajib diisi"); ok = false; }
  if (!muatan) { setFieldError("ferrMuatan", "Muatan wajib diisi"); ok = false; }
  if (!harga || harga <= 0) { setFieldError("ferrHarga", "Harga harus angka > 0"); ok = false; }
  if (!ok) return;
  const { key, target, index } = editCtx;
  const isNew = index === -1;
  const sectionName = SECTION_LABEL[target] || target;
  if (isNew) { ritase[key].push([pabrik, muatan, harga]); toast(`✦ Rute ditambahkan: ${pabrik}`, "success"); }
  else { ritase[key][index] = [pabrik, muatan, harga]; toast(`✦ Rute diperbarui: ${pabrik}`, "success"); }
  pushHistory(isNew ? "tambah" : "edit", sectionName, `${pabrik} · ${muatan} · ${rupiah(harga)}`);
  saveRitase();
  closeModal("rowEditModal");
  renderRitaseTable(target, ritase[key]);
  renderStats();
  setTimeout(() => {
    const rows = document.querySelectorAll(`#${target} .rtr`);
    const idx = isNew ? rows.length - 1 : index;
    if (rows[idx]) { rows[idx].classList.add("row-highlight"); setTimeout(() => rows[idx]?.classList.remove("row-highlight"), 2500); }
  }, 140);
}

/* ---------- Delete + undo ---------- */
function openDeleteModal(type, target, index) {
  let label = "";
  if (type === "ritase") {
    const key = camel(target); const row = ritase[key]?.[index]; if (!row) return;
    label = `${row[0]} · ${row[1]}`; deleteCtx = { type, key, target, index, row: [...row] };
  } else {
    const row = dmsList[index]; if (!row) return;
    label = `${row[0]} · ${row[1]}`; deleteCtx = { type, index, row: [...row] };
  }
  const el = $("deleteLabel"); if (el) el.textContent = label;
  openModal("deleteModal");
}
function confirmDelete() {
  if (!deleteCtx) return;
  const { type, key, target, index, row } = deleteCtx;
  undoStack.push({ ...deleteCtx, ts: Date.now() });
  deleteCtx = null;
  closeModal("deleteModal");
  if (type === "ritase") {
    ritase[key].splice(index, 1);
    pushHistory("hapus", SECTION_LABEL[target] || target, `${row[0]} · ${row[1]}`);
    saveRitase(); renderRitaseTable(target, ritase[key]); renderStats();
  } else {
    dmsList.splice(index, 1);
    pushHistory("hapus", "DMS", `${row[0]} · ${row[1]}`);
    saveDms(); renderDmsTable();
  }
  showUndoBar(`${row[0]} dihapus`);
}
function showUndoBar(msg) {
  let bar = $("undoBar");
  if (!bar) {
    bar = document.createElement("div"); bar.id = "undoBar";
    bar.innerHTML = '<span id="undoMsg"></span><button id="undoBtn"><i class="fas fa-rotate-left"></i> Pulihkan</button>';
    document.body.appendChild(bar);
    $("undoBtn").addEventListener("click", undoDelete);
  }
  $("undoMsg").textContent = msg;
  bar.classList.add("undo-show");
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => bar.classList.remove("undo-show"), 5000);
}
function undoDelete() {
  const item = undoStack.pop(); if (!item) return;
  clearTimeout(undoTimer); $("undoBar")?.classList.remove("undo-show");
  if (item.type === "ritase") { ritase[item.key].splice(item.index, 0, item.row); saveRitase(); renderRitaseTable(item.target, ritase[item.key]); renderStats(); }
  else { dmsList.splice(item.index, 0, item.row); saveDms(); renderDmsTable(); }
  toast("✦ Data berhasil dipulihkan", "success");
}

/* ---------- Modal helpers ---------- */
function openModal(id) { const m = $(id); if (!m) return; m.classList.remove("hidden"); requestAnimationFrame(() => m.classList.add("modal-open")); document.body.style.overflow = "hidden"; }
function closeModal(id) { const m = $(id); if (!m) return; m.classList.remove("modal-open"); setTimeout(() => { m.classList.add("hidden"); document.body.style.overflow = ""; }, 300); }
function setFieldError(id, msg) { const el = $(id); if (el) el.textContent = msg; }
function clearFieldErrors() { document.querySelectorAll(".ferr").forEach(e => e.textContent = ""); }

/* ---------- DMS table (nama lengkap pabrik) ---------- */
function renderDmsTable() {
  const tbody = document.querySelector("#dmsTable tbody"); if (!tbody) return;
  tbody.innerHTML = "";
  dmsList.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.className = "dms-row"; tr.style.animationDelay = 18 * i + "ms";
    tr.innerHTML = `
        <td class="dms-td-kode"><span class="kode-chip">${esc(row[0])}</span></td>
        <td class="dms-td-nama">${esc(row[1])}</td>
        ${isAdmin ? `<td class="td-act"><div class="act-group">
          <button class="act-btn act-edit" data-i="${i}"><i class="fas fa-pen-to-square"></i></button>
          <button class="act-btn act-del" data-i="${i}"><i class="fas fa-trash-can"></i></button>
        </div></td>` : ""}`;
    tr.addEventListener("click", e => {
      if (e.target.closest(".act-btn")) return;
      document.querySelectorAll("#dmsTable tbody tr.active-row").forEach(t => t.classList.remove("active-row"));
      tr.classList.add("active-row");
      navigator.clipboard?.writeText(row[0]).then(() => toast(`📋 Disalin: ${row[0]} · ${row[1]}`, "info", 2200)).catch(() => {});
    });
    tbody.appendChild(tr);
    requestAnimationFrame(() => tr.classList.add("row-in"));
  });
  if (isAdmin) {
    tbody.querySelectorAll(".act-edit").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openDmsEdit(+b.dataset.i); }));
    tbody.querySelectorAll(".act-del").forEach(b => b.addEventListener("click", e => { e.stopPropagation(); openDeleteModal("dms", null, +b.dataset.i); }));
  }
  const count = $("dmsCount"); if (count) count.textContent = `${dmsList.length} pabrik`;
  const addWrap = $("dmsAddWrap"); if (addWrap) addWrap.style.display = isAdmin ? "flex" : "none";

  const headRow = document.querySelector("#dmsTable thead tr");
  if (headRow) {
    const existing = headRow.querySelector(".th-act-dms");
    if (isAdmin && !existing) { const th = document.createElement("th"); th.className = "th-act-dms th-act"; th.innerHTML = '<i class="fas fa-sliders"></i>'; headRow.appendChild(th); }
    else if (!isAdmin && existing) existing.remove();
  }
  setupDmsSearch();
}
function setupDmsSearch() {
  const input = $("searchInput"), clearBtn = $("searchClear");
  if (!input || input.dataset.ready) return;
  input.dataset.ready = "1";
  const filter = () => {
    const table = $("dmsTable"), noResult = $("noResult"), noQuery = $("noResultQuery"), count = $("dmsCount");
    if (!table) return;
    const q = input.value.toUpperCase().trim();
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    let visible = 0;
    rows.forEach(tr => { const match = tr.textContent.toUpperCase().includes(q); tr.style.display = match ? "" : "none"; if (match) visible++; });
    if (clearBtn) clearBtn.style.display = q ? "flex" : "none";
    if (noResult) { noResult.classList.toggle("hidden", visible > 0 || !q); if (noQuery) noQuery.textContent = input.value; }
    if (count) count.textContent = q ? `${visible} dari ${dmsList.length} pabrik` : `${dmsList.length} pabrik`;
  };
  input.addEventListener("input", filter);
  clearBtn?.addEventListener("click", () => { input.value = ""; filter(); input.focus(); });
}
function openDmsEdit(index) {
  const isNew = index === -1;
  const row = isNew ? ["", ""] : dmsList[index];
  const title = $("dmsEditTitle"); if (title) title.innerHTML = isNew ? '<i class="fas fa-circle-plus"></i> Tambah Pabrik' : '<i class="fas fa-pen-to-square"></i> Edit Pabrik';
  $("dmsEditKode").value = row[0]; $("dmsEditNama").value = row[1]; $("dmsEditIndex").value = index;
  clearFieldErrors(); openModal("dmsEditModal");
  setTimeout(() => $("dmsEditKode")?.focus(), 230);
}
function submitDmsEdit() {
  const kode = $("dmsEditKode").value.trim().toUpperCase();
  const nama = $("dmsEditNama").value.trim().toUpperCase();
  const index = parseInt($("dmsEditIndex").value);
  const isNew = index === -1;
  clearFieldErrors();
  let ok = true;
  if (!kode) { setFieldError("ferrKode", "Kode wajib diisi"); ok = false; }
  if (!nama) { setFieldError("ferrNama", "Nama pabrik wajib diisi"); ok = false; }
  if (!ok) return;
  if (isNew) { dmsList.push([kode, nama]); toast(`✦ Pabrik ditambahkan: ${kode}`, "success"); }
  else { dmsList[index] = [kode, nama]; toast(`✦ Pabrik diperbarui: ${kode}`, "success"); }
  pushHistory(isNew ? "tambah" : "edit", "DMS", `${kode} · ${nama}`);
  saveDms(); closeModal("dmsEditModal"); renderDmsTable();
}

/* ---------- Admin login / countdown ---------- */
async function submitAdminLogin() {
  const email = $("adminEmailInput").value.trim(), pass = $("adminPassInput").value.trim();
  const err = $("adminError"); if (err) err.textContent = "";
  if (!email || !pass) { if (!email) setFieldError("ferrEmail", "Email wajib diisi"); if (!pass) setFieldError("ferrPass", "Password wajib diisi"); return; }
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    closeModal("adminModal"); toast("✦ Login berhasil!", "success");
  } catch (e) {
    if (err) { err.textContent = "Email atau password salah"; err.style.display = "flex"; }
    const box = $("adminModal")?.querySelector(".modal-box");
    if (box) { box.classList.add("modal-shake"); setTimeout(() => box.classList.remove("modal-shake"), 450); }
    toast("Email atau password salah", "error");
  }
}
function renderAdminButton() {
  const btn = $("adminBtn"); if (!btn || !isAdmin) return;
  btn.classList.add("countdown");
  const mm = Math.floor(logoutSeconds / 60), ss = logoutSeconds % 60;
  const dashOffset = 276 - (logoutSeconds / 300) * 276;
  btn.innerHTML = `<svg class="timer-ring" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,69,96,0.18)" stroke-width="8"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#ff4560" stroke-width="8"
        stroke-dasharray="276" stroke-dashoffset="${dashOffset}"
        stroke-linecap="round" transform="rotate(-90 50 50)"
        style="transition:stroke-dashoffset 0.95s linear"/>
    </svg><span class="timer-text">${mm}:${ss.toString().padStart(2, "0")}</span>`;
}

/* ---------- History modal ---------- */
function renderHistoryList() {
  const el = $("historyList"); if (!el) return;
  if (!historyList.length) { el.innerHTML = '<div class="hist-empty"><i class="fas fa-inbox"></i><p>Belum ada histori</p></div>'; return; }
  const icons = { tambah: "<i class='fas fa-plus-circle' style='color:#00e676'></i>", edit: "<i class='fas fa-pen-to-square' style='color:#ffc107'></i>", hapus: "<i class='fas fa-trash-can' style='color:#ff4560'></i>" };
  const labels = { tambah: "Tambah", edit: "Edit", hapus: "Hapus" };
  el.innerHTML = historyList.map(h => {
    const time = new Date(h.ts).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    return `<div class="hist-item">
        <div class="hist-action">${icons[h.action] || "•"} <span class="hist-badge hist-${h.action}">${labels[h.action] || h.action}</span></div>
        <div class="hist-detail">${esc(h.detail)}</div>
        <div class="hist-meta"><span class="hist-section">${esc(h.section)}</span> · <span class="hist-time">${time}</span></div>
      </div>`;
  }).join("");
}

/* ---------- Chat widget ---------- */
function initChat() {
  const toggle = $("chatToggle"), box = $("chatBox"), closeBtn = $("chatClose"), waLink = $("chatWA");
  const typingEl = $("typing"), bubbles = document.querySelectorAll(".bubble.bot"), sound = $("chatSound"), badge = document.querySelector(".chat-notif");
  const playSequence = () => {
    bubbles.forEach(b => b.classList.add("hidden")); typingEl?.classList.add("hidden"); waLink?.classList.add("hidden");
    let delay = 600;
    bubbles.forEach(b => {
      setTimeout(() => {
        typingEl?.classList.remove("hidden");
        setTimeout(() => { typingEl?.classList.add("hidden"); b.classList.remove("hidden"); if (sound) { sound.currentTime = 0; sound.play().catch(() => {}); } }, 700);
      }, delay);
      delay += 1400;
    });
    setTimeout(() => waLink?.classList.remove("hidden"), delay + 200);
  };
  toggle?.addEventListener("click", () => {
    if (box.classList.toggle("show")) { if (badge) badge.style.display = "none"; if (!chatOpened) { chatOpened = true; playSequence(); } }
  });
  closeBtn?.addEventListener("click", () => box.classList.remove("show"));
  document.addEventListener("click", e => { if (box?.classList.contains("show") && !box.contains(e.target) && !toggle.contains(e.target)) box.classList.remove("show"); });
}

/* ---------- Lite mode ---------- */
function isLite() { return document.documentElement.classList.contains("lite-mode"); }
function initLiteToggle() {
  const btn = $("liteToggle"); if (!btn) return;
  const on = isLite();
  btn.classList.toggle("active", on);
  btn.title = on ? "Mode Ringan: AKTIF — klik untuk kembali normal" : "Mode Ringan (matikan efek berat untuk PC lawas)";
  btn.addEventListener("click", () => { localStorage.setItem("liteMode", isLite() ? "0" : "1"); location.reload(); });
}

/* ---------- Filter nav (kartu ritase) ---------- */
function initFilterNav() {
  const btns = document.querySelectorAll(".filter-btn"), cards = document.querySelectorAll(".glass-card");
  btns.forEach(btn => btn.addEventListener("click", () => {
    btns.forEach(b => b.classList.remove("active")); btn.classList.add("active");
    const f = btn.dataset.filter;
    cards.forEach(c => { c.style.display = (f === "all" || (c.dataset.category || "").includes(f)) ? "" : "none"; });
  }));
}
function initSortButtons() {
  document.querySelectorAll(".card-sort").forEach(btn => {
    const target = btn.dataset.target; sortState[target] = "none";
    btn.addEventListener("click", () => {
      const key = camel(target);
      if (sortState[target] !== "asc") { ritase[key].sort((a, b) => a[2] - b[2]); sortState[target] = "asc"; btn.classList.add("asc"); btn.classList.remove("desc"); }
      else { ritase[key].sort((a, b) => b[2] - a[2]); sortState[target] = "desc"; btn.classList.add("desc"); btn.classList.remove("asc"); }
      renderRitaseTable(target, ritase[key]);
    });
  });
}

/* ---------- ACCORDION: menu data lainnya (lazy render saat dibuka) ---------- */
const accRendered = {};
function initAccordion() {
  document.querySelectorAll(".acc-item").forEach(item => {
    const key = item.dataset.acc;
    const head = item.querySelector(".acc-head");
    const body = item.querySelector(".acc-body");
    head.addEventListener("click", () => {
      const opening = !item.classList.contains("acc-open");
      item.classList.toggle("acc-open", opening);
      if (opening) {
        if (!accRendered[key]) { renderAccordionContent(key); accRendered[key] = true; }
        body.style.maxHeight = body.scrollHeight + "px";
      } else {
        body.style.maxHeight = "0px";
      }
    });
  });
}
function renderAccordionContent(key) {
  if (key === "dmsPabrik") { renderDmsTable(); }
  if (key === "refKode") { initRefTabs(); }
}
// re-measure open accordion height after its content re-renders (search, edit, dll)
function refreshOpenAccordionHeight(key) {
  const item = document.querySelector(`.acc-item[data-acc="${key}"]`);
  if (item && item.classList.contains("acc-open")) {
    const body = item.querySelector(".acc-body");
    requestAnimationFrame(() => { body.style.maxHeight = body.scrollHeight + "px"; });
  }
}

/* ---------- Tabel referensi (sub-tab di dalam accordion refKode) ---------- */
function initRefTabs() {
  const tabsWrap = $("refTabs"), panelsWrap = $("refPanels");
  if (!tabsWrap || !panelsWrap) return;
  const keys = Object.keys(REF_DATA);
  tabsWrap.innerHTML = keys.map((k, i) => `<button class="ref-tab-btn${i === 0 ? " active" : ""}" data-ref="${k}"><i class="fas ${REF_DATA[k].icon}"></i> ${REF_DATA[k].label}</button>`).join("");
  panelsWrap.innerHTML = keys.map((k, i) => {
    const d = REF_DATA[k];
    const rowsHtml = d.rows.map((r, ri) => `<tr><td>${ri + 1}. ${esc(r[0])}</td><td>${r[1]}</td></tr>`).join("");
    return `<div class="ref-panel${i === 0 ? " active" : ""}" data-panel="${k}">
        <div class="table-container"><table class="ref-table">
          <thead><tr><th>${esc(d.cols[0])}</th><th>${esc(d.cols[1])}</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table></div>
      </div>`;
  }).join("") + `<p class="ref-empty" style="text-align:left;padding:10px 2px 0"><i class="fas fa-circle-info"></i> ${REF_NOTE}</p>`;

  tabsWrap.querySelectorAll(".ref-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      tabsWrap.querySelectorAll(".ref-tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      panelsWrap.querySelectorAll(".ref-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === btn.dataset.ref));
      refreshOpenAccordionHeight("refKode");
    });
  });
  refreshOpenAccordionHeight("refKode");
}

/* ---------- Sky background (ringan): CSS-driven, dihitung 1x/menit ---------- */
function initSky() {
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sunEl = $("sunEl"), moonEl = $("moonEl"), starsSmall = $("starsSmall"), starsBig = $("starsBig"), skyGradient = $("skyGradient"), cloudsWrap = $("cloudsWrap");
  if (isLite()) return;

  function getWIB() {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      const obj = {}; fmt.formatToParts(new Date()).forEach(p => obj[p.type] = p.value);
      return (parseInt(obj.hour, 10) % 24) + parseInt(obj.minute, 10) / 60 + parseInt(obj.second, 10) / 3600;
    } catch { const d = new Date(); return ((d.getUTCHours() + d.getUTCMinutes() / 60) + 7) % 24; }
  }
  const STOPS = [
    { t: 0, c: ["#03060f", "#070b1c", "#0b1330", "#111c3d", "#152648"] },
    { t: 4.5, c: ["#03060f", "#080c1e", "#0d1636", "#17203f", "#241f3a"] },
    { t: 5.75, c: ["#0e1030", "#302050", "#8a3f6b", "#e2703f", "#ffbf6b"] },
    { t: 7, c: ["#1c5fa8", "#2f86c9", "#57ade0", "#8fd0ec", "#c9ecf7"] },
    { t: 12, c: ["#1670c2", "#2f96da", "#5fc0ea", "#9adcf2", "#dcf3fa"] },
    { t: 17, c: ["#1c4a8a", "#3c5f9e", "#a15f8a", "#e2854f", "#ffcf8a"] },
    { t: 18.25, c: ["#170f30", "#3a1f52", "#9a3f68", "#e2643f", "#ffb15f"] },
    { t: 19.25, c: ["#080a20", "#0e1436", "#17203f", "#1c2540", "#2a2440"] },
    { t: 24, c: ["#03060f", "#070b1c", "#0b1330", "#111c3d", "#152648"] }
  ];
  const hexToRgb = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const lerp = (a, b, r) => Math.round(a + (b - a) * r);
  function gradientAt(t) {
    let i = 0; while (i < STOPS.length - 1 && t > STOPS[i + 1].t) i++;
    const a = STOPS[i], b = STOPS[Math.min(i + 1, STOPS.length - 1)];
    const span = b.t - a.t || 1, r = Math.max(0, Math.min(1, (t - a.t) / span));
    const colors = a.c.map((hexA, idx) => { const A = hexToRgb(hexA), B = hexToRgb(b.c[idx]); return `rgb(${lerp(A[0], B[0], r)},${lerp(A[1], B[1], r)},${lerp(A[2], B[2], r)})`; });
    return `linear-gradient(180deg,${colors[0]} 0%,${colors[1]} 25%,${colors[2]} 52%,${colors[3]} 78%,${colors[4]} 100%)`;
  }
  const SUNRISE = 5.75, SUNSET = 17.85;
  function arcPos(p) { const x = 6 + p * 88, y = 90 - Math.sin(p * Math.PI) * 72, o = Math.min(1, Math.sin(p * Math.PI) * 6); return { x, y, o }; }

  function update() {
    const t = getWIB();
    if (skyGradient) skyGradient.style.background = gradientAt(t);
    const isDay = t >= SUNRISE && t < SUNSET;
    if (sunEl) { if (isDay) { const p = arcPos((t - SUNRISE) / (SUNSET - SUNRISE)); sunEl.style.left = p.x + "%"; sunEl.style.top = p.y + "%"; sunEl.style.opacity = p.o; } else sunEl.style.opacity = 0; }
    if (moonEl) {
      if (!isDay) { const nightLen = (24 - SUNSET) + SUNRISE; const elapsed = t >= SUNSET ? (t - SUNSET) : ((24 - SUNSET) + t); const p = arcPos(Math.max(0, Math.min(1, elapsed / nightLen))); moonEl.style.left = p.x + "%"; moonEl.style.top = p.y + "%"; moonEl.style.opacity = p.o; }
      else moonEl.style.opacity = 0;
    }
    starsSmall?.classList.toggle("show", !isDay); starsBig?.classList.toggle("show", !isDay);
    cloudsWrap?.classList.toggle("clouds-day", isDay); cloudsWrap?.classList.toggle("clouds-night", !isDay);
  }
  // Bintang: dikurangi dari 70+16 -> 40+10 titik (cukup utk kesan malam, jauh lebih ringan)
  function scatter(count) { const arr = []; for (let i = 0; i < count; i++) arr.push((Math.random() * 100).toFixed(2) + "vw " + (Math.random() * 62).toFixed(2) + "vh #fff"); return arr.join(","); }
  if (starsSmall && starsBig) { starsSmall.style.boxShadow = scatter(40); starsBig.style.boxShadow = scatter(10); }
  // Awan: dikurangi dikit dari sebelumnya
  if (cloudsWrap) {
    const n = window.innerWidth < 640 ? 3 : 5;
    for (let i = 0; i < n; i++) {
      const c = document.createElement("div"); c.className = "cloud";
      const w = 90 + Math.random() * 110, h = w * 0.32;
      c.style.width = w + "px"; c.style.height = h + "px"; c.style.top = (4 + Math.random() * 34) + "%";
      const dur = 70 + Math.random() * 90; c.style.animationDuration = dur + "s"; c.style.animationDelay = "-" + (Math.random() * dur).toFixed(1) + "s";
      cloudsWrap.appendChild(c);
    }
  }
  update();
  if (!reduceMotion) setInterval(update, 60000); // sebelumnya 45s -> 60s
}

/* ---------- Datetime pill & visitor counter ---------- */
function initClock() {
  const el = $("datetime"); if (!el) return;
  const tick = () => { el.textContent = new Date().toLocaleString("id-ID", { weekday: "short", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB"; };
  tick(); setInterval(tick, 1000);
}
function initVisitorCounter() {
  let total = parseInt(localStorage.getItem("visCount") || "1540") + 1;
  localStorage.setItem("visCount", total);
  const el = $("visitorNumber"); if (!el) return;
  let n = total - 20;
  const step = () => { n++; el.textContent = n; if (n < total) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ---------- Reveal on scroll (murah: sekali per elemen) ---------- */
function initRevealOnScroll() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = "1"; e.target.style.transform = "translateY(0)"; io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  document.querySelectorAll(".glass-card, .stats-bar").forEach(el => { el.style.transition = "opacity 0.6s ease, transform 0.6s ease"; io.observe(el); });
}

/* ---------- Window resize: cek scrollable ritase-table ---------- */
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { document.querySelectorAll(".rtw").forEach(w => w.classList.toggle("scrollable", w.scrollWidth > w.clientWidth + 2)); }, 200);
}, { passive: true });

/* ---------- Firebase listeners ---------- */
onValue(ref(db, "ritase"), snap => {
  const v = snap.val();
  const spsAqua = fromObj(v?.spsAqua), galonAqua = fromObj(v?.galonAqua), spsVit = fromObj(v?.spsVit), galonVit = fromObj(v?.galonVit);
  ritase.spsAqua = spsAqua.length ? spsAqua : DEFAULT_RITASE.spsAqua.map(r => [...r]);
  ritase.galonAqua = galonAqua.length ? galonAqua : DEFAULT_RITASE.galonAqua.map(r => [...r]);
  ritase.spsVit = spsVit.length ? spsVit : DEFAULT_RITASE.spsVit.map(r => [...r]);
  ritase.galonVit = galonVit.length ? galonVit : DEFAULT_RITASE.galonVit.map(r => [...r]);
  renderAllRitase();
});
onValue(ref(db, "dms"), snap => {
  const arr = fromObj(snap.val());
  dmsList = arr.length ? arr : DEFAULT_DMS.map(r => [...r]);
  if (accRendered.dmsPabrik) renderDmsTable();
});
onValue(ref(db, "history"), snap => {
  const v = snap.val();
  historyList = v ? Object.entries(v).map(([id, h]) => ({ id, ...h })).sort((a, b) => b.ts - a.ts).slice(0, 50) : [];
  renderHistoryList();
});
onAuthStateChanged(auth, user => {
  isAdmin = !!user;
  const histBtn = $("histBtn"); if (histBtn) histBtn.style.display = isAdmin ? "flex" : "none";
  const adminBtn = $("adminBtn");
  if (adminBtn) {
    if (isAdmin) {
      clearInterval(logoutTimer); logoutSeconds = 300; renderAdminButton();
      logoutTimer = setInterval(() => { logoutSeconds--; renderAdminButton(); if (logoutSeconds <= 0) { clearInterval(logoutTimer); signOut(auth); } }, 1000);
    } else {
      clearInterval(logoutTimer); adminBtn.classList.remove("countdown"); adminBtn.innerHTML = '<i class="fas fa-lock"></i>';
    }
  }
  renderAllRitase();
  if (accRendered.dmsPabrik) renderDmsTable();
});

/* ---------- Init ---------- */
document.addEventListener("DOMContentLoaded", () => {
  initSky();
  initClock();
  initVisitorCounter();
  initFilterNav();
  initSortButtons();
  initAccordion();
  initChat();
  initLiteToggle();
  initRevealOnScroll();

  $("adminPassToggle")?.addEventListener("click", () => {
    const input = $("adminPassInput"); const wasHidden = input.type === "password";
    input.type = wasHidden ? "text" : "password";
    $("adminPassToggle").innerHTML = wasHidden ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
  });
  $("adminBtn")?.addEventListener("click", () => {
    if (isAdmin) { signOut(auth); toast("Logout berhasil", "info"); return; }
    $("adminEmailInput").value = ""; $("adminPassInput").value = "";
    const err = $("adminError"); if (err) err.textContent = "";
    clearFieldErrors(); openModal("adminModal");
    setTimeout(() => $("adminEmailInput")?.focus(), 240);
  });
  $("adminXClose")?.addEventListener("click", () => closeModal("adminModal"));
  $("adminCancel")?.addEventListener("click", () => closeModal("adminModal"));
  $("adminConfirm")?.addEventListener("click", submitAdminLogin);
  [$("adminEmailInput"), $("adminPassInput")].forEach(el => el?.addEventListener("keydown", e => { if (e.key === "Enter") submitAdminLogin(); }));
  $("adminModal")?.addEventListener("click", e => { if (e.target === $("adminModal")) closeModal("adminModal"); });

  $("deleteConfirm")?.addEventListener("click", confirmDelete);
  $("deleteCancel")?.addEventListener("click", () => { closeModal("deleteModal"); deleteCtx = null; });
  $("deleteModal")?.addEventListener("click", e => { if (e.target === $("deleteModal")) { closeModal("deleteModal"); deleteCtx = null; } });

  $("rowEditX")?.addEventListener("click", () => { closeModal("rowEditModal"); editCtx = null; clearFieldErrors(); });
  $("rowEditCancel")?.addEventListener("click", () => { closeModal("rowEditModal"); editCtx = null; clearFieldErrors(); });
  $("rowEditConfirm")?.addEventListener("click", submitRowEdit);
  $("rowEditHarga")?.addEventListener("keydown", e => { if (e.key === "Enter") submitRowEdit(); });
  $("rowEditModal")?.addEventListener("click", e => { if (e.target === $("rowEditModal")) { closeModal("rowEditModal"); editCtx = null; clearFieldErrors(); } });

  $("dmsEditX")?.addEventListener("click", () => closeModal("dmsEditModal"));
  $("dmsEditCancel")?.addEventListener("click", () => closeModal("dmsEditModal"));
  $("dmsEditConfirm")?.addEventListener("click", submitDmsEdit);
  ["dmsEditKode", "dmsEditNama"].forEach(id => $(id)?.addEventListener("keydown", e => { if (e.key === "Enter") submitDmsEdit(); }));
  $("dmsEditModal")?.addEventListener("click", e => { if (e.target === $("dmsEditModal")) closeModal("dmsEditModal"); });
  $("dmsAddBtn")?.addEventListener("click", () => openDmsEdit(-1));

  $("histBtn")?.addEventListener("click", () => openModal("historyModal"));
  $("historyClose")?.addEventListener("click", () => closeModal("historyModal"));
  $("historyModal")?.addEventListener("click", e => { if (e.target === $("historyModal")) closeModal("historyModal"); });

  document.querySelectorAll(".glass-card").forEach((c, i) => { c.style.animationDelay = 0.07 * i + "s"; });
  setTimeout(() => toast("Menghubungkan ke Firebase… ✦", "info", 2000), 400);
});
