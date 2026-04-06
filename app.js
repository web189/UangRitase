/* ═══════════════════════════════════════════
   UANG RITASE · app.js · 2026 EDITION
   Fixes:
   - Admin: prompt() → modal UI
   - Chat: sequence resets on reopen
   - Edit: proper key conversion
   - Footer: unclosed HTML tags
   New Features:
   - Stats bar (total, avg, highest)
   - Filter by category
   - Sort by price (toggle)
   - Toast notifications
   - Animated mesh canvas
   - Search clear button + no-result state
   - DMS row copy on click
   - Modal-based admin password
   - Show/hide password toggle
   - Admin timer visual display
═══════════════════════════════════════════ */

/* ── STATE ── */
let isAdmin        = false;
let adminTimer     = null;
let adminTimeLeft  = 30;
let sortState      = {};   // { "sps-aqua": "none" | "asc" | "desc", ... }
let pendingEdit    = null; // { key, index }
let chatOpened     = false;

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

// Clone to working data, then merge saved overrides
const data = JSON.parse(JSON.stringify(defaultData));
try {
  const saved = localStorage.getItem("ritaseData");
  if (saved) Object.assign(data, JSON.parse(saved));
} catch(e) { /* ignore corrupt storage */ }

/* ── UTILS ── */
function formatRupiah(n) {
  return "Rp\u00A0" + Number(n).toLocaleString("id-ID");
}

// Convert DOM target id → data key  e.g. "sps-aqua" → "spsAqua"
function targetToKey(target) {
  return target.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function isVitSection(target) {
  return target.includes("vit");
}

/* ── TOAST ── */
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast  = document.createElement("div");
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
  const allRows = [
    ...data.spsAqua, ...data.galonAqua,
    ...data.spsVit,  ...data.galonVit
  ];
  const prices = allRows.map(r => r[2]);
  const total  = allRows.length;
  const avg    = Math.round(prices.reduce((a,b) => a+b, 0) / prices.length);
  const high   = Math.max(...prices);

  const el = id => document.getElementById(id);
  if (el("statTotal")) el("statTotal").textContent = total;
  if (el("statAvg"))   el("statAvg").textContent   = formatRupiah(avg);
  if (el("statHigh"))  el("statHigh").textContent  = formatRupiah(high);
}

/* ── RENDER TABLE ── */
function render(target, rows) {
  const container = document.getElementById(target);
  if (!container) return;

  const isVit   = isVitSection(target);
  const priceClass = isVit ? "uang vit-price" : "uang";

  let html = `
    <div class="ritase-table-wrapper">
      <table class="ritase-table">
        <thead>
          <tr>
            <th>Pabrik</th>
            <th>Muatan</th>
            <th style="text-align:right">Uang Ritase</th>
          </tr>
        </thead>
        <tbody>`;

  rows.forEach((r, i) => {
    const editClass = isAdmin ? " editable" : "";
    html += `
      <tr>
        <td class="td-pabrik">${escHtml(r[0])}</td>
        <td class="td-muatan">${escHtml(r[1])}</td>
        <td class="${priceClass}${editClass}"
            data-target="${target}"
            data-index="${i}">
          ${formatRupiah(r[2])}
        </td>
      </tr>`;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;

  // Update count badge
  const countEl = document.getElementById(`count-${target}`);
  if (countEl) countEl.textContent = `${rows.length} rute`;

  if (isAdmin) attachEditEvents(container);
}

// Minimal HTML escape to prevent XSS in data
function escHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;");
}

function renderAll() {
  render("sps-aqua",   data.spsAqua);
  render("galon-aqua", data.galonAqua);
  render("sps-vit",    data.spsVit);
  render("galon-vit",  data.galonVit);
  updateStats();
}

/* ── SORT ── */
function setupSort() {
  document.querySelectorAll(".card-sort").forEach(btn => {
    const target = btn.dataset.target;
    sortState[target] = "none";

    btn.addEventListener("click", () => {
      const key    = targetToKey(target);
      const rows   = data[key];
      const state  = sortState[target];

      if (state === "none" || state === "desc") {
        rows.sort((a, b) => a[2] - b[2]);
        sortState[target] = "asc";
        btn.title = "Sorted: Terendah → Tertinggi";
        btn.classList.add("asc");
        btn.classList.remove("desc");
      } else {
        rows.sort((a, b) => b[2] - a[2]);
        sortState[target] = "desc";
        btn.title = "Sorted: Tertinggi → Terendah";
        btn.classList.add("desc");
        btn.classList.remove("asc");
      }
      render(target, rows);
      if (isAdmin) attachEditEvents(document.getElementById(target));
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
        if (filter === "all") {
          card.style.display = "";
        } else {
          const cats = card.dataset.category || "";
          card.style.display = cats.includes(filter) ? "" : "none";
        }
      });
    });
  });
}

/* ── ADMIN EDIT EVENTS ── */
function attachEditEvents(scope) {
  const container = scope || document;
  container.querySelectorAll(".uang").forEach(cell => {
    cell.classList.add("editable");
    cell.onclick = () => openEditModal(cell);
  });
}

function openEditModal(cell) {
  if (!isAdmin) return;
  const target = cell.dataset.target;
  const index  = parseInt(cell.dataset.index);
  const key    = targetToKey(target);
  const row    = data[key][index];

  pendingEdit = { key, index };

  const desc = document.getElementById("editModalDesc");
  const inp  = document.getElementById("editPriceInput");
  if (desc) desc.textContent = `Pabrik: ${row[0]} · Muatan: ${row[1]}`;
  if (inp)  inp.value = row[2];

  document.getElementById("editModal").classList.remove("hidden");
  setTimeout(() => inp && inp.focus(), 100);
}

/* ── ADMIN: MODAL-BASED ── */
function setupAdmin() {
  const adminBtn     = document.getElementById("adminBtn");
  const adminModal   = document.getElementById("adminModal");
  const adminCancel  = document.getElementById("adminCancel");
  const adminConfirm = document.getElementById("adminConfirm");
  const passInput    = document.getElementById("adminPassInput");
  const passToggle   = document.getElementById("adminPassToggle");

  // Show/hide password toggle
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
      if (isAdmin) return; // already active, do nothing
      passInput.value = "";
      adminModal.classList.remove("hidden");
      setTimeout(() => passInput.focus(), 150);
    });
  }

  if (adminCancel) {
    adminCancel.addEventListener("click", () => {
      adminModal.classList.add("hidden");
    });
  }

  // Confirm via button
  if (adminConfirm) {
    adminConfirm.addEventListener("click", tryAdminLogin);
  }

  // Confirm via Enter key
  if (passInput) {
    passInput.addEventListener("keydown", e => {
      if (e.key === "Enter") tryAdminLogin();
    });
  }

  // Close modal on overlay click
  if (adminModal) {
    adminModal.addEventListener("click", e => {
      if (e.target === adminModal) adminModal.classList.add("hidden");
    });
  }
}

function tryAdminLogin() {
  const passInput  = document.getElementById("adminPassInput");
  const adminModal = document.getElementById("adminModal");
  const adminBtn   = document.getElementById("adminBtn");

  if (!passInput) return;
  const pass = passInput.value.trim();

  if (pass === "123admin") {
    isAdmin       = true;
    adminTimeLeft = 30;
    adminModal.classList.add("hidden");
    adminBtn.classList.add("countdown");
    adminBtn.classList.remove("active");
    adminBtn.innerHTML = `<span>${adminTimeLeft}</span>`;

    renderAll(); // re-render with edit mode

    showToast("Mode Admin aktif · 30 detik", "success");

    adminTimer = setInterval(() => {
      adminTimeLeft--;
      adminBtn.innerHTML = `<span>${adminTimeLeft}</span>`;

      if (adminTimeLeft <= 0) {
        clearInterval(adminTimer);
        isAdmin = false;
        adminBtn.classList.remove("countdown");
        adminBtn.innerHTML = '<i class="fas fa-lock"></i>';
        renderAll();
        showToast("Sesi admin berakhir", "info");
      }
    }, 1000);

  } else {
    showToast("Password salah!", "error");
    passInput.value = "";
    passInput.focus();
  }
}

/* ── EDIT MODAL ── */
function setupEditModal() {
  const editModal   = document.getElementById("editModal");
  const editCancel  = document.getElementById("editCancel");
  const editConfirm = document.getElementById("editConfirm");
  const editInput   = document.getElementById("editPriceInput");

  if (editCancel) {
    editCancel.addEventListener("click", () => {
      editModal.classList.add("hidden");
      pendingEdit = null;
    });
  }

  if (editConfirm) {
    editConfirm.addEventListener("click", saveEdit);
  }

  if (editInput) {
    editInput.addEventListener("keydown", e => {
      if (e.key === "Enter") saveEdit();
      if (e.key === "Escape") {
        editModal.classList.add("hidden");
        pendingEdit = null;
      }
    });
  }

  if (editModal) {
    editModal.addEventListener("click", e => {
      if (e.target === editModal) {
        editModal.classList.add("hidden");
        pendingEdit = null;
      }
    });
  }
}

function saveEdit() {
  const editModal = document.getElementById("editModal");
  const editInput = document.getElementById("editPriceInput");
  if (!pendingEdit || !editInput) return;

  const val = editInput.value.trim();
  if (!val || isNaN(val) || parseInt(val) <= 0) {
    showToast("Masukkan nominal yang valid", "error");
    editInput.focus();
    return;
  }

  const { key, index } = pendingEdit;
  const oldVal = data[key][index][2];
  data[key][index][2] = parseInt(val);

  try {
    localStorage.setItem("ritaseData", JSON.stringify(data));
  } catch(e) {
    showToast("Gagal menyimpan data", "error");
  }

  editModal.classList.add("hidden");
  pendingEdit = null;
  renderAll();

  showToast(`Harga diperbarui: ${formatRupiah(oldVal)} → ${formatRupiah(parseInt(val))}`, "success");
}

/* ── CLOCK ── */
function startClock() {
  function tick() {
    const el = document.getElementById("datetime");
    if (!el) return;
    const d = new Date();
    el.textContent = d.toLocaleString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
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
    // Animate count up
    let start = count - 20;
    const step = () => {
      start++;
      el.textContent = start;
      if (start < count) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
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
  const total   = allRows.length;

  function doSearch() {
    const filter  = searchInput.value.toUpperCase().trim();
    let visible   = 0;

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

  searchInput.addEventListener("input", doSearch);

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      doSearch();
      searchInput.focus();
    });
  }

  // Row click: highlight + copy code to clipboard
  allRows.forEach(row => {
    row.addEventListener("click", () => {
      allRows.forEach(r => r.classList.remove("active-row"));
      row.classList.add("active-row");

      const code = row.cells[0]?.textContent?.trim();
      const name = row.cells[1]?.textContent?.trim();
      if (code && navigator.clipboard) {
        navigator.clipboard.writeText(code).then(() => {
          showToast(`Disalin: ${code} · ${name}`, "info", 2500);
        }).catch(() => {});
      }
    });
  });
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
          if (chatSound) {
            chatSound.currentTime = 0;
            chatSound.play().catch(() => {});
          }
        }, 700);
      }, delay);
      delay += 1400;
    });

    setTimeout(() => {
      if (chatWA) chatWA.classList.remove("hidden");
    }, delay + 200);
  }

  if (chatToggle) {
    chatToggle.addEventListener("click", () => {
      const isOpen = chatBox.classList.toggle("show");

      if (isOpen) {
        // Hide notification badge
        if (chatNotif) chatNotif.style.display = "none";
        if (!chatOpened) {
          chatOpened = true;
          showSequence();
        }
      }
    });
  }

  if (chatClose) {
    chatClose.addEventListener("click", () => {
      chatBox.classList.remove("show");
    });
  }

  // Close on outside click
  document.addEventListener("click", e => {
    if (chatBox.classList.contains("show") &&
        !chatBox.contains(e.target) &&
        !chatToggle.contains(e.target)) {
      chatBox.classList.remove("show");
    }
  });
}

/* ── MESH CANVAS (animated particles) ── */
function initMesh() {
  const canvas = document.getElementById("meshCanvas");
  if (!canvas) return;

  const ctx  = canvas.getContext("2d");
  let W, H;
  const particles = [];
  const COUNT     = 40;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function rand(min, max) { return Math.random() * (max - min) + min; }

  for (let i = 0; i < COUNT; i++) {
    particles.push({
      x: rand(0, window.innerWidth),
      y: rand(0, window.innerHeight),
      r: rand(1, 2.5),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.2, 0.2),
      alpha: rand(0.2, 0.6)
    });
  }

  const CONNECT_DIST = 150;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Update
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    });

    // Draw lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx   = particles[i].x - particles[j].x;
        const dy   = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < CONNECT_DIST) {
          const alpha = (1 - dist / CONNECT_DIST) * 0.15;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw dots
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 200, 255, ${p.alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }
  draw();
}

/* ── INIT ── */
document.addEventListener("DOMContentLoaded", () => {
  renderAll();
  startClock();
  initVisitor();
  setupSort();
  setupFilter();
  setupSearch();
  setupAdmin();
  setupEditModal();
  setupChat();
  initMesh();

  // Stagger card entrance
  document.querySelectorAll(".glass-card").forEach((card, i) => {
    card.style.animationDelay = `${i * 0.07}s`;
  });

  // Show welcome toast after brief delay
  setTimeout(() => {
    showToast("Data ritase berhasil dimuat", "success", 2500);
  }, 800);
});