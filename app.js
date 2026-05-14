/* ═══════════════════════════════════════════════════
   UANG RITASE · app.js · 2026 ULTRA EDITION
   ✦ Admin Login: Email + Password + eye-toggle
   ✦ Full CRUD: Tambah / Edit / Hapus semua tabel
   ✦ Delete Confirmation Modal (no browser confirm)
   ✦ Undo system (5 detik) setelah hapus
   ✦ Swipe-to-delete on mobile (ritase table)
   ✦ Row highlight on tambah/edit
   ✦ Animated row entrance per item
   ✦ SVG countdown ring on admin button
   ✦ Per-field inline validation errors
   ✦ Auto-save localStorage
═══════════════════════════════════════════════════ */

/* ══ STATE ══ */
let isAdmin       = false;
let adminTimer    = null;
let adminTimeLeft = 300;   // 5 menit
let sortState     = {};
let pendingRowEdit = null;
let pendingDelete  = null;
let undoStack      = [];
let chatOpened     = false;
let undoBarTimer   = null;

/* ══ CREDENTIALS ══ */
const ADMIN_EMAIL    = "admin@uangritase.com";
const ADMIN_PASSWORD = "Admin@2026";

/* ══ DEFAULT DATA ══ */
const defaultData = {
  spsAqua: [
    ["CRG","All SKU",652000],["CTR","All SKU",532000],["MKS","All SKU",767000],
    ["CHR","All SKU",612000],["KEDEP","All SKU",656500],
    ["CJR > 1120","AQ 1500 ML",943000],["CJR > 1440","AQ 600 ML",943000],
    ["CJR > 840","AQ 1500 ML",749000],["CJR > 960","AQ 600 ML",749000],
    ["CJR > 2340","AQ 330 ML",943000],["CJR > 980","AQ 1500 ML",823000],
    ["CJR > 1820","AQ 330 ML",1167000],["DEPO JONGGOL","All SKU",714000]
  ],
  galonAqua: [
    ["TBP","432",605000],["TBP","528",622000],["TBP","720",794000],
    ["TBP","960",809000],["TBP","1008",820000],["MKS","432",679000],
    ["MKS","528",696000],["MKS","960 LASAH",859000],["MKS","960 JUGRACK",821000],
    ["MKS","1008",870000],["MKS","720",844000],
    ["CHG","960 JUGRACK",633000],["CRG","960 JUGRACK",652000]
  ],
  spsVit: [
    ["TMP","VT 200 ML",642000],["TMP","VT 550 ML",607000],
    ["TMP","VT MOSKA 220",642000],["TMP","VT 1500 ML",630000],
    ["GIT","VT 330 ML",2163000]
  ],
  galonVit: [
    ["BTA","528",463000],["BTA","768",574000],["BTA","960",501000],
    ["SSS","528",457000],["SSS","768",568000]
  ]
};

const defaultDms = [
  ["9101-9100","MEKARSARI PLANT AGM"],["9009-9000","SUBANG PLANT TIV"],
  ["9017-9000","CIANJUR PLANT TIV"],["9013-9000","CITEUREUP PLANT TIV"],
  ["9042-9000","TIRTA MAS PERKASA"],["9036-9000","TIV XWH KEDEP"],
  ["9051-9000","GRAHAMAS INTITIRTA"],["90A2-9000","TGSM"],
  ["9076-9000","SENTUL PLANT TIV"],["9039-9000","BUANA TIRTA ABADI"],
  ["90A3-9000","SUMBER SUKSES SENTOSA 2"],["90A0-9000","CARINGIN PLANT TIV"],
  ["9105-9100","BABAKANPARI PLANT AGM"],["9018-9000","CIHERANG PLANT TIV"],
  ["9059-9000","TIV XWH CIMANGGIS"],["9056-9000","TML CICURUG"],
  ["9077-9000","XWH PETUNG SARI"],["9027-9000","CIBINONG DC TIV"],
  ["9015-9000","KLATEN PLANT TIV"],["9010-9000","WONOSOBO PLANT TIV"],
  ["90A8-9000","BANYUWANGI PLANT TIV"],["90AD-9000","TIRTA MAS PERKASA BAWEN"],
  ["90A5-9000","XWH SENTUL"]
];

/* ── Load persisted data ── */
const data = JSON.parse(JSON.stringify(defaultData));
try { const s = localStorage.getItem("ritaseData"); if (s) Object.assign(data, JSON.parse(s)); } catch(e) {}
let dmsData = JSON.parse(JSON.stringify(defaultDms));
try { const s = localStorage.getItem("dmsData"); if (s) dmsData = JSON.parse(s); } catch(e) {}

/* ══ UTILS ══ */
const $   = id => document.getElementById(id);
const esc = s  => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const fmt = n  => "Rp\u00A0" + Number(n).toLocaleString("id-ID");
const toKey  = t => t.replace(/-([a-z])/g, (_,c) => c.toUpperCase());
const isVit  = t => t.includes("vit");
const saveData = () => { try { localStorage.setItem("ritaseData", JSON.stringify(data)); } catch(e) {} };
const saveDms  = () => { try { localStorage.setItem("dmsData",    JSON.stringify(dmsData)); } catch(e) {} };

/* ══ TOAST ══ */
function toast(msg, type="info", dur=3200) {
  const c = $("toastContainer"); if (!c) return;
  const icons = { success:"✅", error:"❌", info:"ℹ️", warn:"⚠️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]||"ℹ️"}</span><span class="toast-msg">${msg}</span>`;
  c.appendChild(el);
  requestAnimationFrame(() => el.classList.add("toast-show"));
  setTimeout(() => {
    el.classList.remove("toast-show");
    el.classList.add("toast-hide");
    setTimeout(() => el.remove(), 420);
  }, dur);
}

/* ══ STATS ══ */
function updateStats() {
  const all    = [...data.spsAqua, ...data.galonAqua, ...data.spsVit, ...data.galonVit];
  const prices = all.map(r => r[2]);
  const total  = all.length;
  const avg    = prices.length ? Math.round(prices.reduce((a,b) => a+b, 0) / prices.length) : 0;
  const high   = prices.length ? Math.max(...prices) : 0;
  animCount($("statTotal"), total);
  if ($("statAvg"))  $("statAvg").textContent  = fmt(avg);
  if ($("statHigh")) $("statHigh").textContent = fmt(high);
}

function animCount(el, target) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  if (start === target) { el.textContent = target; return; }
  let f = 0, frames = 20;
  const step = () => { f++; el.textContent = Math.round(start + (target - start) * (f/frames)); if (f < frames) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ══ RENDER RITASE TABLE ══ */
function render(target, rows) {
  const container = $(target);
  if (!container) return;
  const vit = isVit(target);
  const priceCls = vit ? "uang vit-price" : "uang";
  const labels = { "sps-aqua":"SPS AQUA","galon-aqua":"GALON AQUA","sps-vit":"SPS VIT","galon-vit":"GALON VIT" };

  let html = `<div class="rtw"><table class="ritase-table">
    <thead><tr>
      <th class="th-no">#</th>
      <th>Pabrik</th>
      <th>Muatan</th>
      <th class="th-price">Uang Ritase</th>
      ${isAdmin ? '<th class="th-act"><i class="fas fa-sliders"></i></th>' : ''}
    </tr></thead><tbody>`;

  rows.forEach((r, i) => {
    html += `<tr class="rtr${vit ? " vit-row" : ""}" data-i="${i}">
      <td class="td-no">${i+1}</td>
      <td class="td-pabrik">${esc(r[0])}</td>
      <td class="td-muatan"><span class="muatan-chip">${esc(r[1])}</span></td>
      <td class="${priceCls}">${fmt(r[2])}</td>
      ${isAdmin ? `<td class="td-act"><div class="act-group">
        <button class="act-btn act-edit" data-target="${target}" data-i="${i}" title="Edit baris"><i class="fas fa-pen-to-square"></i></button>
        <button class="act-btn act-del"  data-target="${target}" data-i="${i}" title="Hapus baris"><i class="fas fa-trash-can"></i></button>
      </div></td>` : ''}
    </tr>`;
  });

  html += `</tbody></table></div>`;
  if (isAdmin) {
    html += `<button class="add-fab-btn" data-target="${target}">
      <i class="fas fa-plus-circle"></i><span>Tambah Rute ${labels[target]||""}</span>
    </button>`;
  }

  container.innerHTML = html;

  /* Stagger row entrance */
  container.querySelectorAll(".rtr").forEach((tr, i) => {
    tr.style.animationDelay = `${i * 22}ms`;
    tr.classList.add("row-in");
  });

  const cEl = $(`count-${target}`);
  if (cEl) cEl.textContent = `${rows.length} rute`;

  if (isAdmin) {
    container.querySelectorAll(".act-edit").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); openRowEdit(b.dataset.target, +b.dataset.i); })
    );
    container.querySelectorAll(".act-del").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); confirmDelete("ritase", b.dataset.target, +b.dataset.i); })
    );
    container.querySelectorAll(".add-fab-btn").forEach(b =>
      b.addEventListener("click", () => openRowEdit(b.dataset.target, -1))
    );
    attachSwipe(container);
  }
  attachRowZoom(container);
}

/* ── Swipe-to-delete (mobile) ── */
function attachSwipe(container) {
  container.querySelectorAll(".rtr").forEach(tr => {
    let sx = 0, dx = 0, swiping = false;
    tr.addEventListener("touchstart", e => { sx = e.touches[0].clientX; dx = 0; swiping = true; }, { passive: true });
    tr.addEventListener("touchmove", e => {
      if (!swiping) return;
      dx = e.touches[0].clientX - sx;
      if (dx < 0) {
        tr.style.transform = `translateX(${Math.max(dx, -110)}px)`;
        tr.style.opacity   = `${1 + dx / 220}`;
      }
    }, { passive: true });
    tr.addEventListener("touchend", () => {
      swiping = false;
      if (dx < -75) {
        tr.style.transition = "transform 0.22s, opacity 0.22s";
        tr.style.transform  = "translateX(-120%)";
        tr.style.opacity    = "0";
        const tgt = tr.closest("[id]")?.id, i = +tr.dataset.i;
        setTimeout(() => confirmDelete("ritase", tgt, i), 200);
      } else {
        tr.style.transition = "transform 0.3s, opacity 0.3s";
        tr.style.transform  = "";
        tr.style.opacity    = "";
        setTimeout(() => { tr.style.transition = ""; }, 320);
      }
    });
  });
}

/* ── Row expand on tap ── */
function attachRowZoom(container) {
  container.querySelectorAll(".rtr").forEach(tr => {
    tr.addEventListener("click", e => {
      if (e.target.closest(".act-btn") || e.target.closest(".add-fab-btn")) return;
      const was = tr.classList.contains("row-active");
      tr.closest("tbody").querySelectorAll(".row-active").forEach(r => r.classList.remove("row-active"));
      if (!was) tr.classList.add("row-active");
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

/* ══ ROW EDIT MODAL ══ */
function openRowEdit(target, index) {
  const key   = toKey(target);
  const isNew = index === -1;
  const row   = isNew ? ["", "", ""] : data[key][index];

  pendingRowEdit = { key, target, index };

  const labels = { "sps-aqua":"SPS AQUA", "galon-aqua":"GALON AQUA", "sps-vit":"SPS VIT", "galon-vit":"GALON VIT" };
  const titleEl = $("rowEditTitle");
  if (titleEl) titleEl.innerHTML = isNew
    ? '<i class="fas fa-circle-plus"></i> Tambah Rute'
    : '<i class="fas fa-pen-to-square"></i> Edit Rute';

  const secEl = $("rowEditSection");
  if (secEl) {
    secEl.textContent  = labels[target] || target;
    secEl.className    = "section-pill " + (isVit(target) ? "badge-vit" : "badge-aqua");
  }

  /* Set icon colour */
  const iconEl = $("editIconCircle");
  if (iconEl) {
    iconEl.className = isVit(target) ? "edit-icon-circle" : "edit-icon-circle";
    iconEl.style.background = isVit(target) ? "rgba(255,69,96,0.12)" : "";
    iconEl.style.color      = isVit(target) ? "var(--vit)" : "";
    iconEl.style.borderColor= isVit(target) ? "rgba(255,69,96,0.25)" : "";
  }

  $("rowEditPabrik").value = row[0];
  $("rowEditMuatan").value = row[1];
  $("rowEditHarga").value  = row[2] || "";
  clearFieldErrors();
  openModal("rowEditModal");
  setTimeout(() => $("rowEditPabrik")?.focus(), 230);
}

function saveRowEdit() {
  const pabrik = $("rowEditPabrik").value.trim().toUpperCase();
  const muatan = $("rowEditMuatan").value.trim().toUpperCase();
  const harga  = parseInt($("rowEditHarga").value.trim());
  clearFieldErrors();
  let ok = true;
  if (!pabrik) { setFerr("ferrPabrik", "Nama pabrik wajib diisi"); ok = false; }
  if (!muatan) { setFerr("ferrMuatan", "Muatan wajib diisi"); ok = false; }
  if (!harga || harga <= 0) { setFerr("ferrHarga", "Harga harus angka lebih dari 0"); ok = false; }
  if (!ok) return;

  const { key, target, index } = pendingRowEdit;
  const isNew = index === -1;

  if (isNew) { data[key].push([pabrik, muatan, harga]); toast(`✦ Rute ditambahkan: ${pabrik}`, "success"); }
  else       { data[key][index] = [pabrik, muatan, harga]; toast(`✦ Rute diperbarui: ${pabrik}`, "success"); }

  saveData();
  closeModal("rowEditModal");
  pendingRowEdit = null;
  render(target, data[key]);
  updateStats();

  /* Highlight new/edited row */
  setTimeout(() => {
    const rows = document.querySelectorAll(`#${target} .rtr`);
    const idx  = isNew ? rows.length - 1 : index;
    if (rows[idx]) {
      rows[idx].classList.add("row-highlight");
      setTimeout(() => rows[idx]?.classList.remove("row-highlight"), 2500);
    }
  }, 140);
}

/* ══ DELETE CONFIRM ══ */
function confirmDelete(type, target, index) {
  let label = "";
  if (type === "ritase") {
    const key = toKey(target), row = data[key]?.[index];
    if (!row) return;
    label = `${row[0]} · ${row[1]}`;
    pendingDelete = { type, key, target, index, row: [...row] };
  } else {
    const row = dmsData[index];
    if (!row) return;
    label = `${row[0]} · ${row[1]}`;
    pendingDelete = { type, index, row: [...row] };
  }
  const lEl = $("deleteLabel");
  if (lEl) lEl.textContent = label;
  openModal("deleteModal");
}

function doDelete() {
  if (!pendingDelete) return;
  const { type, key, target, index, row } = pendingDelete;
  undoStack.push({ ...pendingDelete, ts: Date.now() });
  pendingDelete = null;
  closeModal("deleteModal");

  if (type === "ritase") { data[key].splice(index, 1); saveData(); render(target, data[key]); updateStats(); }
  else                   { dmsData.splice(index, 1); saveDms(); renderDmsTable(); }

  showUndoBar(`${row[0]} dihapus`);
}

/* ── Undo bar ── */
function showUndoBar(msg) {
  let bar = $("undoBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "undoBar";
    bar.innerHTML = `<span id="undoMsg"></span><button id="undoBtn"><i class="fas fa-rotate-left"></i> Pulihkan</button>`;
    document.body.appendChild(bar);
    $("undoBtn").addEventListener("click", doUndo);
  }
  $("undoMsg").textContent = msg;
  bar.classList.add("undo-show");
  clearTimeout(undoBarTimer);
  undoBarTimer = setTimeout(() => bar.classList.remove("undo-show"), 5000);
}

function doUndo() {
  const entry = undoStack.pop();
  if (!entry) return;
  clearTimeout(undoBarTimer);
  $("undoBar")?.classList.remove("undo-show");
  if (entry.type === "ritase") { data[entry.key].splice(entry.index, 0, entry.row); saveData(); render(entry.target, data[entry.key]); updateStats(); }
  else                         { dmsData.splice(entry.index, 0, entry.row); saveDms(); renderDmsTable(); }
  toast("✦ Data berhasil dipulihkan", "success");
}

/* ══ MODAL HELPERS ══ */
function openModal(id) {
  const m = $(id); if (!m) return;
  m.classList.remove("hidden");
  requestAnimationFrame(() => m.classList.add("modal-open"));
  document.body.style.overflow = "hidden";
}
function closeModal(id) {
  const m = $(id); if (!m) return;
  m.classList.remove("modal-open");
  setTimeout(() => { m.classList.add("hidden"); document.body.style.overflow = ""; }, 300);
}

/* Field errors */
function setFerr(ferrId, msg) {
  const el = $(ferrId);
  if (el) el.textContent = msg;
  /* Also highlight input */
  const inputId = ferrId.replace("ferr","").replace("P","p").replace("M","m").replace("H","h").replace("K","k").replace("N","n");
  const input = document.querySelector(`[id$="${inputId}"]`) || document.querySelector(`#rowEdit${inputId.charAt(0).toUpperCase()+inputId.slice(1)}`) || null;
}
function clearFieldErrors() {
  document.querySelectorAll(".ferr").forEach(el => el.textContent = "");
  document.querySelectorAll(".finput.input-error").forEach(el => el.classList.remove("input-error"));
}

/* ══ ADMIN LOGIN ══ */
function setupAdmin() {
  /* Eye toggle */
  $("adminPassToggle")?.addEventListener("click", () => {
    const p = $("adminPassInput");
    const isP = p.type === "password";
    p.type = isP ? "text" : "password";
    $("adminPassToggle").innerHTML = isP ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
  });

  /* Open modal */
  $("adminBtn")?.addEventListener("click", () => {
    if (isAdmin) { doAdminLogout(); return; }
    $("adminEmailInput").value = "";
    $("adminPassInput").value  = "";
    const err = $("adminError");
    if (err) err.textContent = "";
    clearFieldErrors();
    openModal("adminModal");
    setTimeout(() => $("adminEmailInput")?.focus(), 240);
  });

  $("adminXClose")?.addEventListener("click",  () => closeModal("adminModal"));
  $("adminCancel")?.addEventListener("click",  () => closeModal("adminModal"));
  $("adminConfirm")?.addEventListener("click", tryAdminLogin);
  [$("adminEmailInput"), $("adminPassInput")].forEach(inp =>
    inp?.addEventListener("keydown", e => { if (e.key === "Enter") tryAdminLogin(); })
  );
  $("adminModal")?.addEventListener("click", e => { if (e.target === $("adminModal")) closeModal("adminModal"); });

  /* Delete modal */
  $("deleteConfirm")?.addEventListener("click", doDelete);
  $("deleteCancel")?.addEventListener("click",  () => { closeModal("deleteModal"); pendingDelete = null; });
  $("deleteModal")?.addEventListener("click",   e => { if (e.target === $("deleteModal")) { closeModal("deleteModal"); pendingDelete = null; } });

  /* Row edit modal */
  $("rowEditX")?.addEventListener("click",       () => { closeModal("rowEditModal"); pendingRowEdit = null; clearFieldErrors(); });
  $("rowEditCancel")?.addEventListener("click",  () => { closeModal("rowEditModal"); pendingRowEdit = null; clearFieldErrors(); });
  $("rowEditConfirm")?.addEventListener("click", saveRowEdit);
  $("rowEditHarga")?.addEventListener("keydown", e => { if (e.key === "Enter") saveRowEdit(); });
  $("rowEditModal")?.addEventListener("click",   e => { if (e.target === $("rowEditModal")) { closeModal("rowEditModal"); pendingRowEdit = null; clearFieldErrors(); } });

  /* DMS edit modal */
  $("dmsEditX")?.addEventListener("click",       () => closeModal("dmsEditModal"));
  $("dmsEditCancel")?.addEventListener("click",  () => closeModal("dmsEditModal"));
  $("dmsEditConfirm")?.addEventListener("click", saveDmsEdit);
  ["dmsEditKode","dmsEditNama"].forEach(id => $(id)?.addEventListener("keydown", e => { if (e.key === "Enter") saveDmsEdit(); }));
  $("dmsEditModal")?.addEventListener("click",   e => { if (e.target === $("dmsEditModal")) closeModal("dmsEditModal"); });

  /* DMS add button */
  $("dmsAddBtn")?.addEventListener("click", () => openDmsEdit(-1));
}

function tryAdminLogin() {
  const email = ($("adminEmailInput")?.value || "").trim().toLowerCase();
  const pass  = ($("adminPassInput")?.value  || "").trim();
  const err   = $("adminError");
  if (err) err.textContent = "";

  /* Validate */
  if (!email) {
    if (err) err.textContent = "Email wajib diisi";
    $("adminEmailInput")?.focus(); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (err) err.textContent = "Format email tidak valid";
    $("adminEmailInput")?.focus(); return;
  }
  if (!pass) {
    if (err) err.textContent = "Password wajib diisi";
    $("adminPassInput")?.focus(); return;
  }

  if (email !== ADMIN_EMAIL.toLowerCase() || pass !== ADMIN_PASSWORD) {
    const box = $("adminModal")?.querySelector(".modal-box");
    box?.classList.add("modal-shake");
    setTimeout(() => box?.classList.remove("modal-shake"), 450);
    if (err) err.textContent = "Email atau password salah";
    $("adminPassInput").value = "";
    $("adminPassInput")?.focus();
    return;
  }

  /* SUCCESS */
  isAdmin = true;
  adminTimeLeft = 300;
  closeModal("adminModal");
  updateAdminBtn();
  renderAll();
  renderDmsTable();
  toast("✦ Mode Admin aktif · 5 menit", "success", 3500);
  adminTimer = setInterval(() => {
    adminTimeLeft--;
    updateAdminBtn();
    if (adminTimeLeft <= 0) doAdminLogout();
  }, 1000);
}

function doAdminLogout() {
  clearInterval(adminTimer);
  isAdmin = false;
  const btn = $("adminBtn");
  if (btn) { btn.classList.remove("countdown"); btn.innerHTML = '<i class="fas fa-lock"></i>'; }
  renderAll();
  renderDmsTable();
  toast("Sesi admin berakhir", "info");
}

function updateAdminBtn() {
  const btn = $("adminBtn"); if (!btn) return;
  btn.classList.add("countdown");
  const m   = Math.floor(adminTimeLeft / 60);
  const s   = adminTimeLeft % 60;
  const pct = (adminTimeLeft / 300) * 276; /* circumference = 2π×44 ≈ 276 */
  btn.innerHTML = `
    <svg class="timer-ring" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,69,96,0.18)" stroke-width="8"/>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#ff4560" stroke-width="8"
        stroke-dasharray="276" stroke-dashoffset="${276 - pct}"
        stroke-linecap="round" transform="rotate(-90 50 50)"
        style="transition:stroke-dashoffset 0.95s linear"/>
    </svg>
    <span class="timer-text">${m}:${s.toString().padStart(2,"0")}</span>`;
}

/* ══ SORT ══ */
function setupSort() {
  document.querySelectorAll(".card-sort").forEach(btn => {
    const target = btn.dataset.target;
    sortState[target] = "none";
    btn.addEventListener("click", () => {
      const key = toKey(target);
      if (sortState[target] !== "asc") {
        data[key].sort((a,b) => a[2]-b[2]); sortState[target] = "asc";
        btn.classList.add("asc"); btn.classList.remove("desc");
      } else {
        data[key].sort((a,b) => b[2]-a[2]); sortState[target] = "desc";
        btn.classList.add("desc"); btn.classList.remove("asc");
      }
      render(target, data[key]);
    });
  });
}

/* ══ FILTER ══ */
function setupFilter() {
  const btns = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".glass-card");
  btns.forEach(btn => btn.addEventListener("click", () => {
    btns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const f = btn.dataset.filter;
    cards.forEach(c => { c.style.display = (f === "all" || (c.dataset.category||"").includes(f)) ? "" : "none"; });
  }));
}

/* ══ DMS TABLE ══ */
function renderDmsTable() {
  const tbody = document.querySelector("#dmsTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  dmsData.forEach((row, i) => {
    const tr = document.createElement("tr");
    tr.className = "dms-row";
    tr.style.animationDelay = `${i * 18}ms`;
    tr.innerHTML = `
      <td class="dms-td-kode"><span class="kode-chip">${esc(row[0])}</span></td>
      <td class="dms-td-nama">${esc(row[1])}</td>
      ${isAdmin ? `<td class="td-act"><div class="act-group">
        <button class="act-btn act-edit" data-i="${i}" title="Edit"><i class="fas fa-pen-to-square"></i></button>
        <button class="act-btn act-del"  data-i="${i}" title="Hapus"><i class="fas fa-trash-can"></i></button>
      </div></td>` : ""}`;

    tr.addEventListener("click", e => {
      if (e.target.closest(".act-btn")) return;
      document.querySelectorAll("#dmsTable tbody tr.active-row").forEach(r => r.classList.remove("active-row"));
      tr.classList.add("active-row");
      navigator.clipboard?.writeText(row[0]).then(() => toast(`📋 Disalin: ${row[0]} · ${row[1]}`, "info", 2200)).catch(() => {});
    });

    tbody.appendChild(tr);
    requestAnimationFrame(() => tr.classList.add("row-in"));
  });

  if (isAdmin) {
    tbody.querySelectorAll(".act-edit").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); openDmsEdit(+b.dataset.i); })
    );
    tbody.querySelectorAll(".act-del").forEach(b =>
      b.addEventListener("click", e => { e.stopPropagation(); confirmDelete("dms", null, +b.dataset.i); })
    );
  }

  const dmsCount = $("dmsCount");
  if (dmsCount) dmsCount.textContent = `${dmsData.length} pabrik`;

  const addWrap = $("dmsAddWrap");
  if (addWrap) addWrap.style.display = isAdmin ? "flex" : "none";

  /* Handle Aksi column in header */
  const thead = document.querySelector("#dmsTable thead tr");
  if (thead) {
    const ex = thead.querySelector(".th-act-dms");
    if (isAdmin && !ex) {
      const th = document.createElement("th");
      th.className = "th-act-dms th-act";
      th.innerHTML = '<i class="fas fa-sliders"></i>';
      thead.appendChild(th);
    } else if (!isAdmin && ex) {
      ex.remove();
    }
  }

  setupSearch();
}

function openDmsEdit(index) {
  const isNew = index === -1;
  const row   = isNew ? ["", ""] : dmsData[index];
  const titleEl = $("dmsEditTitle");
  if (titleEl) titleEl.innerHTML = isNew
    ? '<i class="fas fa-circle-plus"></i> Tambah Pabrik'
    : '<i class="fas fa-pen-to-square"></i> Edit Pabrik';
  $("dmsEditKode").value  = row[0];
  $("dmsEditNama").value  = row[1];
  $("dmsEditIndex").value = index;
  clearFieldErrors();
  openModal("dmsEditModal");
  setTimeout(() => $("dmsEditKode")?.focus(), 230);
}

function saveDmsEdit() {
  const kode  = $("dmsEditKode").value.trim().toUpperCase();
  const nama  = $("dmsEditNama").value.trim().toUpperCase();
  const index = parseInt($("dmsEditIndex").value);
  const isNew = index === -1;
  clearFieldErrors();
  let ok = true;
  if (!kode) { setFerr("ferrKode", "Kode wajib diisi"); ok = false; }
  if (!nama)  { setFerr("ferrNama", "Nama pabrik wajib diisi"); ok = false; }
  if (!ok) return;

  if (isNew) { dmsData.push([kode, nama]); toast(`✦ Pabrik ditambahkan: ${kode}`, "success"); }
  else       { dmsData[index] = [kode, nama]; toast(`✦ Pabrik diperbarui: ${kode}`, "success"); }

  saveDms();
  closeModal("dmsEditModal");
  renderDmsTable();
}

/* ══ SEARCH DMS ══ */
function setupSearch() {
  const si = $("searchInput"), sc = $("searchClear"), dt = $("dmsTable");
  const nr = $("noResult"), nq = $("noResultQuery"), dc = $("dmsCount");
  if (!si || !dt) return;

  const allRows = Array.from(dt.querySelectorAll("tbody tr"));
  const total   = dmsData.length;

  function doSearch() {
    const q = si.value.toUpperCase().trim();
    let vis = 0;
    allRows.forEach(r => { const m = r.textContent.toUpperCase().includes(q); r.style.display = m ? "" : "none"; if (m) vis++; });
    if (sc) sc.style.display = q ? "flex" : "none";
    if (nr) { nr.classList.toggle("hidden", vis > 0 || !q); if (nq) nq.textContent = si.value; }
    if (dc) dc.textContent = q ? `${vis} dari ${total} pabrik` : `${total} pabrik`;
  }

  const ni = si.cloneNode(true); si.parentNode.replaceChild(ni, si);
  ni.addEventListener("input", doSearch);
  if (sc) {
    const nc = sc.cloneNode(true); sc.parentNode.replaceChild(nc, sc);
    nc.addEventListener("click", () => { ni.value = ""; doSearch(); ni.focus(); });
  }
}

/* ══ CHAT ══ */
function setupChat() {
  const toggle = $("chatToggle"), box = $("chatBox"), close = $("chatClose"), wa = $("chatWA");
  const typing = $("typing"), bubbles = document.querySelectorAll(".bubble.bot");
  const sound = $("chatSound"), notif = document.querySelector(".chat-notif");

  const reset = () => { bubbles.forEach(b => b.classList.add("hidden")); typing?.classList.add("hidden"); wa?.classList.add("hidden"); };
  const seq   = () => {
    reset(); let d = 600;
    bubbles.forEach(b => {
      setTimeout(() => { typing?.classList.remove("hidden"); setTimeout(() => { typing?.classList.add("hidden"); b.classList.remove("hidden"); sound && (sound.currentTime = 0, sound.play().catch(() => {})); }, 700); }, d);
      d += 1400;
    });
    setTimeout(() => wa?.classList.remove("hidden"), d + 200);
  };
  toggle?.addEventListener("click", () => {
    const open = box.classList.toggle("show");
    if (open) { notif && (notif.style.display = "none"); !chatOpened && (chatOpened = true, seq()); }
  });
  close?.addEventListener("click", () => box.classList.remove("show"));
  document.addEventListener("click", e => { if (box?.classList.contains("show") && !box.contains(e.target) && !toggle.contains(e.target)) box.classList.remove("show"); });
}

/* ══ CLOCK ══ */
function startClock() {
  const tick = () => {
    const el = $("datetime"); if (!el) return;
    el.textContent = new Date().toLocaleString("id-ID", { weekday:"short", day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }) + " WIB";
  };
  tick(); setInterval(tick, 1000);
}

/* ══ VISITOR ══ */
function initVisitor() {
  let c = parseInt(localStorage.getItem("visCount") || "1540") + 1;
  localStorage.setItem("visCount", c);
  const el = $("visitorNumber"); if (!el) return;
  let s = c - 20;
  const step = () => { s++; el.textContent = s; if (s < c) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}

/* ══ INIT ══ */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  renderDmsTable();
  startClock();
  initVisitor();
  setupSort();
  setupFilter();
  setupSearch();
  setupAdmin();
  setupChat();

  document.querySelectorAll(".glass-card").forEach((c, i) => { c.style.animationDelay = `${i * 0.07}s`; });
  setTimeout(() => toast("Data ritase berhasil dimuat ✦", "success", 2500), 900);
});
