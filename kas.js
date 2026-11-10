/* ==========================================================================
   KAS RITASE HARIAN  (kas.js)
   --------------------------------------------------------------------------
   • Siapa saja boleh input / edit / hapus baris — tanpa login.
   • Setiap perubahan dicatat di riwayat (append-only) lengkap dengan tanggal + jam.
   • Angka otomatis (total diserahkan, sisa uang, selisih, rekap) dihitung program,
     tampil bergembok, dan tidak bisa diubah.
   • Realtime lewat Firebase Realtime Database (koneksi dipakai bersama app.js).

   Struktur data:
     kas/{YYYY-MM}/{DD} = { diterima, fisik, rows:{ <id>:{nama,po,jumlah,ts,by,eby?,ets?} } }
     kasLog/{YYYY-MM}/{DD}/<id> = { act, detail, by, ts }
   ========================================================================== */
import { initializeApp, getDatabase, ref, onValue, set, push, remove } from "./vendor/fb-db.js";

const CFG = {
  apiKey: "AIzaSyDth7CHrLlloGLKegjEzkU-jcUiWxCq828",
  authDomain: "uangritase.firebaseapp.com",
  databaseURL: "https://uangritase-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "uangritase",
  storageBucket: "uangritase.firebasestorage.app",
  messagingSenderId: "398064880612",
  appId: "1:398064880612:web:106b463bcec509d5c255f1"
};

/* ───────── util ───────── */
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MON3 = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("id-ID");
const rp = (n) => nf.format(Math.round(Number(n) || 0));
const pad = (n) => String(n).padStart(2, "0");
const MAX_AMT = 1e9;

const IC = {
  prev: '<svg class="ksv" viewBox="0 0 24 24"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg>',
  next: '<svg class="ksv" viewBox="0 0 24 24"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>',
  copy: '<svg class="ksv" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="12" rx="2.2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h2"/></svg>',
  user: '<svg class="ksv" viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20c.6-3.6 3.5-5.6 7.2-5.6s6.6 2 7.2 5.6"/></svg>',
  edit: '<svg class="ksv" viewBox="0 0 24 24"><path d="M4 20h4.2L19.4 8.8a2.2 2.2 0 0 0 0-3.1l-1.1-1.1a2.2 2.2 0 0 0-3.1 0L4 15.8z"/><path d="m13.5 6.3 4.2 4.2"/></svg>',
  del: '<svg class="ksv" viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.8 12.2a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5L17.5 7M10 11v6M14 11v6"/></svg>',
  ok: '<svg class="ksv" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  x: '<svg class="ksv" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  plus: '<svg class="ksv" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  lock: '<svg class="ksv ksv-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'
};

const pd = (s) => { const p = s.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] || 1)); };
const fd = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
const addDays = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return fd(d); };
const addMonths = (ym, n) => { const p = ym.split("-").map(Number); const d = new Date(Date.UTC(p[0], p[1] - 1 + n, 1)); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1); };
const titleDate = (s) => { const d = pd(s); return pad(d.getUTCDate()) + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); };
const dowOf = (s) => DAYS[pd(s).getUTCDay()];
const monthTitle = (ym) => { const p = ym.split("-").map(Number); return MONTHS[p[1] - 1] + " " + p[0]; };
const fmtTs = (ts) => { const d = new Date((ts || 0) + 7 * 3600e3); return pad(d.getUTCDate()) + " " + MON3[d.getUTCMonth()] + " " + d.getUTCFullYear() + " · " + pad(d.getUTCHours()) + "." + pad(d.getUTCMinutes()) + "." + pad(d.getUTCSeconds()); };
const dayPath = (s) => "kas/" + s.slice(0, 7) + "/" + s.slice(8, 10);
const logPath = (s) => "kasLog/" + s.slice(0, 7) + "/" + s.slice(8, 10);
const digits = (s) => String(s || "").replace(/\D/g, "").slice(0, 10);
const num = (s) => { const d = digits(s); return d ? parseInt(d, 10) : 0; };
const fmtIn = (s) => { const d = digits(s); return d ? nf.format(parseInt(d, 10)) : ""; };
const up = (s) => String(s || "").replace(/\s+/g, " ").trim().toUpperCase();
const isKasbon = (po) => /^KASBON\b/i.test(String(po || "").trim());
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const toast = (m, t, ms) => (window.urToast ? window.urToast(esc(m), t || "info", ms) : console.log(m));

function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch { /* abaikan */ } }

/* ───────── perhitungan otomatis (tidak pernah diinput manual) ───────── */
function rowsOf(day) {
  const r = (day && day.rows) || {};
  return Object.keys(r)
    .filter((id) => r[id] && typeof r[id] === "object")
    .map((id) => Object.assign({ id }, r[id]))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0) || (a.id < b.id ? -1 : 1));
}
function calc(day) {
  const rows = rowsOf(day);
  const total = rows.reduce((s, r) => s + (Number(r.jumlah) || 0), 0);
  const diterima = Number(day && day.diterima) || 0;
  const sisa = diterima - total;
  const fisik = day && typeof day.fisik === "number" ? day.fisik : null;
  return { rows, total, diterima, sisa, fisik, selisih: fisik == null ? null : fisik - sisa };
}

/* ───────── state ───────── */
let db = null, offset = 0;
const S = {
  date: "", month: "", tab: "day", touched: false,
  day: undefined, monthData: undefined, log: undefined,
  editId: null, dirty: false, undo: null
};
const un = { day: null, month: null, log: null };
let undoTimer = null;

const nowMs = () => Date.now() + offset;
const todayWIB = () => fd(new Date(nowMs() + 7 * 3600e3));
const who = () => (lsGet("kas_who", "") || "Tamu").slice(0, 24);

/* ───────── firebase ───────── */
function listen(kind, path, cb) {
  if (un[kind]) { try { un[kind](); } catch { /* */ } un[kind] = null; }
  if (!db) return;
  un[kind] = onValue(ref(db, path), (snap) => cb(snap.val()), (err) => {
    toast(errMsg(err), "error", 7000);
    cb(null);
  });
}
function errMsg(e) {
  const c = e && e.code, m = (e && e.message) || "";
  if (c === "PERMISSION_DENIED" || /permission/i.test(m))
    return "Ditolak server: aturan database untuk kas belum dipasang. Publikasikan firebase-rules-kas.json di Firebase Console → Realtime Database → Rules.";
  if (m === "timeout") return "Koneksi lambat atau offline. Data belum tersimpan, coba lagi.";
  return "Gagal menyimpan: " + (m || e);
}
function ready() {
  if (!db) { toast("Server belum terhubung. Tunggu sebentar lalu coba lagi.", "warn", 4500); return false; }
  if (typeof navigator !== "undefined" && navigator.onLine === false) { toast("Sedang offline. Input kas hanya bisa saat online.", "warn", 4500); return false; }
  return true;
}
function guard(p) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]);
}
function writeAt(path, val) { return guard(set(ref(db, path), val)); }
function logAct(date, act, detail) {
  if (!db) return;
  push(ref(db, logPath(date)), { act, detail: trunc(detail, 190), by: who(), ts: nowMs() }).catch(() => {});
}
const rowTxt = (r) => [r.nama, r.po, "Rp " + rp(r.jumlah)].filter(Boolean).join(" · ");

/* ───────── aksi data ───────── */
async function addRow(nama, po, jumlah) {
  if (!ready()) return false;
  const date = S.date, row = { nama, po, jumlah, ts: nowMs(), by: who() };
  try {
    const r = push(ref(db, dayPath(date) + "/rows"));
    await guard(set(r, row));
    logAct(date, "tambah", rowTxt(row));
    rememberWords(nama, po);
    return true;
  } catch (e) { toast(errMsg(e), "error", 7000); return false; }
}
async function saveRow(id, nama, po, jumlah) {
  if (!ready()) return false;
  const date = S.date, old = ((S.day && S.day.rows) || {})[id];
  if (!old) { toast("Baris ini sudah dihapus orang lain.", "warn"); return true; }
  if (old.nama === nama && old.po === po && Number(old.jumlah) === jumlah) return true;
  const row = Object.assign({}, old, { nama, po, jumlah, eby: who(), ets: nowMs() });
  try {
    await writeAt(dayPath(date) + "/rows/" + id, row);
    logAct(date, "edit", trunc(rowTxt(old), 90) + "  →  " + trunc(rowTxt(row), 90));
    rememberWords(nama, po);
    return true;
  } catch (e) { toast(errMsg(e), "error", 7000); return false; }
}
async function delRow(id) {
  if (!ready()) return;
  const date = S.date, old = ((S.day && S.day.rows) || {})[id];
  if (!old) return;
  try {
    await guard(remove(ref(db, dayPath(date) + "/rows/" + id)));
    logAct(date, "hapus", rowTxt(old));
    showUndo({ date, id, row: old });
  } catch (e) { toast(errMsg(e), "error", 7000); }
}
async function undoDel() {
  const u = S.undo; if (!u || !ready()) return;
  hideUndo();
  try {
    await writeAt(dayPath(u.date) + "/rows/" + u.id, u.row);
    logAct(u.date, "pulih", rowTxt(u.row));
    toast("Baris dipulihkan", "success", 2200);
  } catch (e) { toast(errMsg(e), "error", 7000); }
}
async function setMoney(field, label, raw) {
  if (!ready()) return;
  const date = S.date, d = digits(raw);
  const prev = S.day && typeof S.day[field] === "number" ? S.day[field] : null;
  const val = d === "" ? null : parseInt(d, 10);
  if (val === prev) return;
  try {
    await writeAt(dayPath(date) + "/" + field, val);
    logAct(date, field, label + ": " + (prev == null ? "kosong" : "Rp " + rp(prev)) + "  →  " + (val == null ? "kosong" : "Rp " + rp(val)));
  } catch (e) { toast(errMsg(e), "error", 7000); }
}

/* kata yang pernah dipakai → saran isian */
function rememberWords(nama, po) {
  try {
    const names = JSON.parse(lsGet("kas_names", "[]")), pos = JSON.parse(lsGet("kas_pos", "[]"));
    const bump = (arr, v) => { if (!v) return arr; const i = arr.indexOf(v); if (i > -1) arr.splice(i, 1); arr.unshift(v); return arr.slice(0, 80); };
    lsSet("kas_names", JSON.stringify(bump(names, nama)));
    if (po && !/^\d+$/.test(po)) lsSet("kas_pos", JSON.stringify(bump(pos, po)));
  } catch { /* */ }
}
function fillSuggest() {
  const dn = $("kasNames"), dp = $("kasPos"); if (!dn || !dp) return;
  let names = [], pos = ["KASBON", "OTANG"];
  try { names = JSON.parse(lsGet("kas_names", "[]")); pos = pos.concat(JSON.parse(lsGet("kas_pos", "[]"))); } catch { /* */ }
  rowsOf(S.day).forEach((r) => { if (r.nama) names.push(r.nama); if (r.po && !/^\d+$/.test(r.po)) pos.push(r.po); });
  const uniq = (a) => a.filter((v, i) => v && a.indexOf(v) === i).slice(0, 80);
  dn.innerHTML = uniq(names).map((v) => '<option value="' + esc(v) + '">').join("");
  dp.innerHTML = uniq(pos).map((v) => '<option value="' + esc(v) + '">').join("");
}

/* ───────── undo bar ───────── */
function showUndo(u) {
  S.undo = u;
  let el = $("kasUndo");
  if (!el) {
    el = document.createElement("div"); el.id = "kasUndo"; el.className = "kas-undo";
    el.innerHTML = '<span id="kasUndoMsg"></span><button type="button" id="kasUndoBtn">Pulihkan</button>';
    document.body.appendChild(el);
    $("kasUndoBtn").addEventListener("click", undoDel);
  }
  $("kasUndoMsg").textContent = "Dihapus: " + (u.row.nama || "baris");
  el.classList.add("show");
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, 7000);
}
function hideUndo() { const el = $("kasUndo"); if (el) el.classList.remove("show"); S.undo = null; clearTimeout(undoTimer); }

/* ───────── input jumlah: format ribuan otomatis ───────── */
function bindAmt(inp) {
  inp.addEventListener("input", () => { const v = fmtIn(inp.value); if (v !== inp.value) inp.value = v; });
}

/* ───────── rangka halaman ───────── */
function mount() {
  const host = $("kasApp"); if (!host) return false;
  host.innerHTML =
    '<div class="kas" id="kasRoot">' +
      '<div class="kas-bar" id="kasBar">' +
        '<button class="kb-nav" type="button" data-act="prev" aria-label="Hari sebelumnya">' + IC.prev + '</button>' +
        '<label class="kb-date"><span class="kb-dow" id="kasDow"></span><strong id="kasTitle"></strong>' +
          '<input type="date" id="kasPick" aria-label="Pilih tanggal"></label>' +
        '<button class="kb-nav" type="button" data-act="next" aria-label="Hari berikutnya">' + IC.next + '</button>' +
      '</div>' +
      '<div class="kas-body">' +
        '<div class="kas-tools">' +
          '<div class="kas-tabs" role="tablist" aria-label="Tampilan kas">' +
            '<button type="button" role="tab" data-tab="day" aria-selected="true">Harian</button>' +
            '<button type="button" role="tab" data-tab="rekap" aria-selected="false">Rekap bulan</button>' +
            '<button type="button" role="tab" data-tab="log" aria-selected="false">Riwayat</button>' +
          '</div>' +
          '<button class="kbtn kbtn-ghost" type="button" id="kasToday">Hari ini</button>' +
          '<label class="kas-who" title="Nama ini ikut tercatat di riwayat">' + IC.user +
            '<input id="kasWho" type="text" maxlength="24" placeholder="Nama penginput" autocomplete="off" aria-label="Nama penginput"></label>' +
        '</div>' +
        '<div id="kasView"></div>' +
      '</div>' +
    '</div>';
  $("kasWho").value = lsGet("kas_who", "");
  $("kasWho").addEventListener("input", (e) => lsSet("kas_who", e.target.value.trim().slice(0, 24)));
  return true;
}

function setHead() {
  $("kasDow").textContent = dowOf(S.date) + (S.date === todayWIB() ? " · hari ini" : "");
  $("kasTitle").textContent = titleDate(S.date);
  $("kasPick").value = S.date;
  $("kasRoot").dataset.tab = S.tab;
  document.querySelectorAll(".kas-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab ? "true" : "false"));
}

function setDate(date, byUser) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  if (byUser) S.touched = true;
  S.date = date; S.day = undefined; S.log = undefined; S.editId = null; S.dirty = false;
  setHead();
  listen("day", dayPath(date), (v) => { S.day = v || {}; onDay(); });
  if (S.tab === "day") onDay();
  if (S.tab === "log") { renderLog(); listen("log", logPath(date), (v) => { S.log = v || {}; renderLog(); }); }
}

function setTab(tab) {
  S.tab = tab;
  if (un.log && tab !== "log") { un.log(); un.log = null; }
  if (un.month && tab !== "rekap") { un.month(); un.month = null; }
  setHead();
  if (tab === "day") renderDayShell(true);
  if (tab === "rekap") { S.month = S.date.slice(0, 7); renderRekapShell(); }
  if (tab === "log") { S.log = undefined; renderLog(); listen("log", logPath(S.date), (v) => { S.log = v || {}; renderLog(); }); }
}

/* ───────── TAMPILAN HARIAN ───────── */
function renderDayShell() {
  const v = $("kasView"); if (!v) return;
  v.innerHTML =
    '<div class="kd">' +
      '<div class="kd-main">' +
        '<form class="kd-add" id="kdAdd" autocomplete="off" novalidate>' +
          '<div class="kf kf-nama"><label for="kaNama">Nama</label><input id="kaNama" list="kasNames" maxlength="60" autocapitalize="characters" enterkeyhint="next" placeholder="Driver / TKBM"></div>' +
          '<div class="kf kf-po"><label for="kaPo">No PO / keterangan</label><input id="kaPo" list="kasPos" maxlength="60" autocapitalize="characters" enterkeyhint="next" placeholder="mis. KASBON"></div>' +
          '<div class="kf kf-amt"><label for="kaAmt">Jumlah</label><div class="amt"><span>Rp</span><input id="kaAmt" inputmode="numeric" enterkeyhint="done" placeholder="0"></div></div>' +
          '<button class="kd-addbtn" type="submit">' + IC.plus + '<span>Tambah baris</span></button>' +
          '<p class="kd-err" id="kaErr" role="alert"></p>' +
        '</form>' +
        '<datalist id="kasNames"></datalist><datalist id="kasPos"></datalist>' +
        '<div class="kd-head"><b id="kdCount">Catatan hari ini</b></div>' +
        '<div class="kd-listhead" aria-hidden="true"><span>#</span><span>Nama</span><span>No PO / keterangan</span><span>Jumlah</span><span></span></div>' +
        '<div class="kd-list" id="kdList"></div>' +
      '</div>' +
      '<aside class="ks" aria-label="Ringkasan kas">' +
        '<div class="ks-row ks-in"><label for="ksTerima">Uang diterima</label><div class="amt"><span>Rp</span><input id="ksTerima" inputmode="numeric" enterkeyhint="done" placeholder="0"></div></div>' +
        '<div class="ks-row ks-auto"><span class="k">Total diserahkan ' + IC.lock + '</span><b id="ksTotal">Rp 0</b></div>' +
        '<div class="ks-sisa"><span class="k">Sisa uang ' + IC.lock + '</span><b id="ksSisa">Rp 0</b></div>' +
        '<div class="ks-row ks-in ks-fisik"><label for="ksFisik">Fisik uang (hasil hitung)</label><div class="amt"><span>Rp</span><input id="ksFisik" inputmode="numeric" enterkeyhint="done" placeholder="Isi setelah menghitung uang"></div></div>' +
        '<div class="ks-row ks-auto ks-diff" id="ksDiff"><span class="k">Selisih ' + IC.lock + '</span><b id="ksSel">—</b><em id="ksTag"></em></div>' +
        '<button class="kbtn kbtn-ghost ks-copy" type="button" id="ksCopy">' + IC.copy + '<span>Salin laporan untuk WhatsApp</span></button>' +
        '<p class="ks-note">' + IC.lock + '<span>Angka bergembok dihitung otomatis dan tidak bisa diubah.</span></p>' +
      '</aside>' +
    '</div>';

  const nama = $("kaNama"), po = $("kaPo"), amt = $("kaAmt");
  bindAmt(amt); bindAmt($("ksTerima")); bindAmt($("ksFisik"));
  nama.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); po.focus(); } });
  po.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); amt.focus(); } });
  $("kdAdd").addEventListener("submit", async (e) => {
    e.preventDefault();
    const n = up(nama.value), p = up(po.value), j = num(amt.value), err = $("kaErr");
    err.textContent = "";
    if (!n) { err.textContent = "Isi nama dulu."; nama.focus(); return; }
    if (!j) { err.textContent = "Isi jumlah lebih dari 0."; amt.focus(); return; }
    if (j > MAX_AMT) { err.textContent = "Jumlah terlalu besar."; amt.focus(); return; }
    nama.value = ""; po.value = ""; amt.value = ""; nama.focus();      /* siap input berikutnya */
    const ok = await addRow(n, p, j);
    if (!ok) { if (!nama.value && !po.value && !amt.value) { nama.value = n; po.value = p; amt.value = fmtIn(String(j)); } }
    else flashSaved();
  });
  [["ksTerima", "diterima", "Uang diterima"], ["ksFisik", "fisik", "Fisik uang"]].forEach((a) => {
    const el = $(a[0]);
    el.addEventListener("change", () => setMoney(a[1], a[2], el.value));
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); el.blur(); } });
  });
  $("ksCopy").addEventListener("click", copyReport);
  $("kdList").addEventListener("click", onListClick);
  $("kdList").addEventListener("keydown", onListKey);
  onDay();
}

function onDay() {
  if (S.tab !== "day" || !$("kdList")) return;
  const c = calc(S.day);
  renderSummary(c);
  if (S.editId) { S.dirty = true; } else renderList(c);
  fillSuggest();
}

function setIfIdle(el, val) { if (el && document.activeElement !== el) el.value = val; }
function renderSummary(c) {
  if (S.day === undefined) return;
  setIfIdle($("ksTerima"), S.day.diterima == null ? "" : nf.format(S.day.diterima));
  setIfIdle($("ksFisik"), c.fisik == null ? "" : nf.format(c.fisik));
  $("ksTotal").textContent = "Rp " + rp(c.total);
  $("ksSisa").textContent = (c.sisa < 0 ? "−" : "") + "Rp " + rp(Math.abs(c.sisa));
  $("ksSisa").parentNode.classList.toggle("is-neg", c.sisa < 0);
  const d = $("ksDiff"), sel = $("ksSel"), tag = $("ksTag");
  d.classList.remove("ok", "less", "more", "none");
  if (c.selisih == null) { d.classList.add("none"); sel.textContent = "—"; tag.textContent = "isi fisik uang dulu"; }
  else if (c.selisih === 0) { d.classList.add("ok"); sel.textContent = "Rp 0"; tag.textContent = "Cocok"; }
  else if (c.selisih < 0) { d.classList.add("less"); sel.textContent = "−Rp " + rp(-c.selisih); tag.textContent = "Uang kurang"; }
  else { d.classList.add("more"); sel.textContent = "Rp " + rp(c.selisih); tag.textContent = "Uang lebih"; }
}

function rowView(r, i) {
  const k = isKasbon(r.po);
  return '<div class="kr' + (k ? " is-kasbon" : "") + '" data-id="' + esc(r.id) + '">' +
    '<span class="kr-no">' + (i + 1) + '</span>' +
    '<span class="kr-nama">' + esc(r.nama) + '</span>' +
    '<span class="kr-po">' + (r.po ? '<em>' + esc(r.po) + '</em>' : '<i class="kr-none">—</i>') + '</span>' +
    '<span class="kr-amt"><small>Rp</small><b>' + rp(r.jumlah) + '</b></span>' +
    '<span class="kr-act">' +
      '<button type="button" class="kib" data-act="edit" aria-label="Edit ' + esc(r.nama) + '" title="Edit">' + IC.edit + '</button>' +
      '<button type="button" class="kib kib-del" data-act="del" aria-label="Hapus ' + esc(r.nama) + '" title="Hapus">' + IC.del + '</button>' +
    '</span></div>';
}
function rowEdit(r, i) {
  return '<div class="kr kr-edit" data-id="' + esc(r.id) + '">' +
    '<span class="kr-no">' + (i + 1) + '</span>' +
    '<span class="kr-nama"><input class="ke ke-nama" value="' + esc(r.nama) + '" maxlength="60" aria-label="Nama" autocapitalize="characters" list="kasNames"></span>' +
    '<span class="kr-po"><input class="ke ke-po" value="' + esc(r.po) + '" maxlength="60" aria-label="No PO / keterangan" autocapitalize="characters" list="kasPos"></span>' +
    '<span class="kr-amt"><span class="amt"><span>Rp</span><input class="ke ke-amt" value="' + nf.format(r.jumlah || 0) + '" inputmode="numeric" aria-label="Jumlah"></span></span>' +
    '<span class="kr-act">' +
      '<button type="button" class="kib kib-ok" data-act="save" aria-label="Simpan" title="Simpan">' + IC.ok + '</button>' +
      '<button type="button" class="kib" data-act="cancel" aria-label="Batal" title="Batal">' + IC.x + '</button>' +
    '</span><span class="kr-err" role="alert"></span></div>';
}
function renderList(c) {
  const el = $("kdList"); if (!el) return;
  c = c || calc(S.day);
  $("kdCount").textContent = S.day === undefined ? "Memuat data…" : c.rows.length ? c.rows.length + " baris tercatat" : "Belum ada catatan";
  if (S.day === undefined) { el.innerHTML = '<div class="kd-empty">Menyambung ke server…</div>'; return; }
  if (!c.rows.length) {
    el.innerHTML = '<div class="kd-empty"><b>Belum ada catatan di tanggal ini.</b><span>Isi nama dan jumlah di atas, lalu tekan Tambah baris.</span></div>';
    return;
  }
  el.innerHTML = c.rows.map((r, i) => (S.editId === r.id ? rowEdit(r, i) : rowView(r, i))).join("");
  S.dirty = false;
}

function onListClick(e) {
  const b = e.target.closest("[data-act]"); if (!b) return;
  const rowEl = b.closest(".kr"), id = rowEl && rowEl.dataset.id, act = b.dataset.act;
  if (act === "edit") { S.editId = id; renderList(); const i = document.querySelector(".kr-edit .ke-nama"); if (i) { i.focus(); i.select(); } bindEditAmt(); }
  else if (act === "cancel") { S.editId = null; renderList(); }
  else if (act === "save") commitEdit(rowEl);
  else if (act === "del") delRow(id);
}
function bindEditAmt() { const a = document.querySelector(".kr-edit .ke-amt"); if (a) bindAmt(a); }
function onListKey(e) {
  const rowEl = e.target.closest(".kr-edit"); if (!rowEl) return;
  if (e.key === "Escape") { S.editId = null; renderList(); }
  else if (e.key === "Enter") { e.preventDefault(); commitEdit(rowEl); }
}
async function commitEdit(rowEl) {
  const id = rowEl.dataset.id, err = rowEl.querySelector(".kr-err");
  const n = up(rowEl.querySelector(".ke-nama").value), p = up(rowEl.querySelector(".ke-po").value), j = num(rowEl.querySelector(".ke-amt").value);
  if (!n) { err.textContent = "Nama wajib diisi."; return; }
  if (!j) { err.textContent = "Jumlah harus lebih dari 0."; return; }
  if (j > MAX_AMT) { err.textContent = "Jumlah terlalu besar."; return; }
  const ok = await saveRow(id, n, p, j);
  if (ok) { S.editId = null; renderList(); }
}

let savedTimer = null;
function flashSaved() {
  const b = document.querySelector(".kd-addbtn"); if (!b) return;
  b.classList.add("saved"); b.querySelector("span").textContent = "Tersimpan";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { b.classList.remove("saved"); b.querySelector("span").textContent = "Tambah baris"; }, 1100);
}

async function copyReport() {
  const c = calc(S.day), L = [];
  L.push("*KAS RITASE — " + dowOf(S.date) + ", " + titleDate(S.date) + "*");
  L.push("Uang diterima: Rp " + rp(c.diterima));
  L.push("");
  c.rows.forEach((r, i) => L.push((i + 1) + ". " + [r.nama, r.po].filter(Boolean).join(" · ") + " — Rp " + rp(r.jumlah)));
  L.push("");
  L.push("Total diserahkan: Rp " + rp(c.total));
  L.push("Sisa uang: " + (c.sisa < 0 ? "−" : "") + "Rp " + rp(Math.abs(c.sisa)));
  if (c.fisik != null) L.push("Fisik uang: Rp " + rp(c.fisik) + (c.selisih === 0 ? " (cocok)" : c.selisih < 0 ? " (kurang Rp " + rp(-c.selisih) + ")" : " (lebih Rp " + rp(c.selisih) + ")"));
  const text = L.join("\n");
  try { await navigator.clipboard.writeText(text); toast("Laporan disalin. Tinggal tempel di WhatsApp.", "success", 2600); }
  catch {
    const t = document.createElement("textarea"); t.value = text; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); toast("Laporan disalin. Tinggal tempel di WhatsApp.", "success", 2600); } catch { toast("Browser menolak menyalin.", "error"); }
    t.remove();
  }
}

/* ───────── REKAP BULAN ───────── */
function renderRekapShell() {
  const v = $("kasView"); if (!v) return;
  v.innerHTML =
    '<div class="kr-month">' +
      '<button class="kb-nav kb-nav-s" type="button" data-mact="mprev" aria-label="Bulan sebelumnya">' + IC.prev + '</button>' +
      '<strong id="kmTitle"></strong>' +
      '<button class="kb-nav kb-nav-s" type="button" data-mact="mnext" aria-label="Bulan berikutnya">' + IC.next + '</button>' +
    '</div>' +
    '<div id="kmBody"></div>';
  v.querySelector(".kr-month").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mact]"); if (!b) return;
    S.month = addMonths(S.month, b.dataset.mact === "mprev" ? -1 : 1);
    loadMonth();
  });
  $("kmBody").addEventListener("click", (e) => {
    const tr = e.target.closest("tr[data-date]"); if (!tr) return;
    setTab("day"); setDate(tr.dataset.date, true);
  });
  loadMonth();
}
function loadMonth() {
  $("kmTitle").textContent = monthTitle(S.month);
  S.monthData = undefined; renderRekap();
  listen("month", "kas/" + S.month, (v) => { S.monthData = v || {}; renderRekap(); });
}
function renderRekap() {
  const el = $("kmBody"); if (!el) return;
  if (S.monthData === undefined) { el.innerHTML = '<div class="kd-empty">Memuat rekap…</div>'; return; }
  const days = Object.keys(S.monthData).filter((d) => /^\d{2}$/.test(d)).sort();
  if (!days.length) { el.innerHTML = '<div class="kd-empty"><b>Belum ada catatan di ' + esc(monthTitle(S.month)) + '.</b><span>Buka tab Harian dan mulai input.</span></div>'; return; }
  let tD = 0, tS = 0, tN = 0;
  const trs = days.map((d) => {
    const c = calc(S.monthData[d]); tD += c.diterima; tS += c.total; tN += c.rows.length;
    const date = S.month + "-" + d, cls = c.selisih == null ? "none" : c.selisih === 0 ? "ok" : c.selisih < 0 ? "less" : "more";
    const sel = c.selisih == null ? "—" : c.selisih === 0 ? "Cocok" : (c.selisih < 0 ? "−" : "+") + rp(Math.abs(c.selisih));
    return '<tr data-date="' + date + '" tabindex="0"><th scope="row"><b>' + Number(d) + '</b><small>' + dowOf(date).slice(0, 3) + '</small></th>' +
      '<td>' + rp(c.diterima) + '</td><td>' + rp(c.total) + '<small>' + c.rows.length + ' baris</small></td>' +
      '<td class="kt-sisa">' + (c.sisa < 0 ? "−" : "") + rp(Math.abs(c.sisa)) + '</td>' +
      '<td>' + (c.fisik == null ? "—" : rp(c.fisik)) + '</td><td class="kt-sel ' + cls + '">' + sel + '</td></tr>';
  }).join("");
  el.innerHTML =
    '<div class="kt-wrap"><table class="kt"><thead><tr><th>Tgl</th><th>Diterima</th><th>Diserahkan</th><th>Sisa</th><th>Fisik</th><th>Selisih</th></tr></thead>' +
    '<tbody>' + trs + '</tbody>' +
    '<tfoot><tr><th>' + days.length + ' hari</th><td>' + rp(tD) + ' ' + IC.lock + '</td><td>' + rp(tS) + ' ' + IC.lock + '<small>' + tN + ' baris</small></td><td class="kt-sisa">' + (tD - tS < 0 ? "−" : "") + rp(Math.abs(tD - tS)) + ' ' + IC.lock + '</td><td></td><td></td></tr></tfoot></table></div>' +
    '<p class="kt-hint">Geser tabel ke kanan untuk melihat semua kolom.</p>' +
    '<p class="ks-note">' + IC.lock + '<span>Semua angka rekap dihitung otomatis dari data harian. Ketuk satu baris untuk membuka harinya.</span></p>';
}

/* ───────── RIWAYAT ───────── */
const ACT = { tambah: ["Tambah", "ok"], edit: ["Edit", "warn"], hapus: ["Hapus", "bad"], pulih: ["Pulihkan", "info"], diterima: ["Uang diterima", "viol"], fisik: ["Fisik uang", "viol"] };
function renderLog() {
  const v = $("kasView"); if (!v) return;
  if (S.log === undefined) { v.innerHTML = '<div class="kd-empty">Memuat riwayat…</div>'; return; }
  const items = Object.keys(S.log).map((id) => Object.assign({ id }, S.log[id])).filter((x) => x && x.ts).sort((a, b) => b.ts - a.ts);
  if (!items.length) { v.innerHTML = '<div class="kd-empty"><b>Belum ada riwayat di tanggal ' + esc(titleDate(S.date)) + '.</b><span>Setiap tambah, edit, dan hapus akan tercatat di sini beserta jamnya.</span></div>'; return; }
  v.innerHTML = '<p class="kh-sum">' + items.length + ' perubahan pada kas ' + esc(titleDate(S.date)) + '. Riwayat tidak bisa diubah atau dihapus.</p><ol class="kh">' +
    items.map((x) => {
      const a = ACT[x.act] || [x.act || "Ubah", "info"];
      return '<li class="kh-i kh-' + a[1] + '"><span class="kh-tag">' + esc(a[0]) + '</span><span class="kh-txt">' + esc(x.detail) + '</span>' +
        '<span class="kh-meta">' + esc(x.by || "Tamu") + ' · ' + fmtTs(x.ts) + ' WIB</span></li>';
    }).join("") + '</ol>';
}

/* ───────── event global ───────── */
function wire() {
  $("kasBar").addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    setDate(addDays(S.date, b.dataset.act === "prev" ? -1 : 1), true);
  });
  const pick = $("kasPick");
  pick.addEventListener("change", () => { if (pick.value) setDate(pick.value, true); });
  pick.addEventListener("click", () => { try { pick.showPicker && pick.showPicker(); } catch { /* */ } });
  $("kasToday").addEventListener("click", () => { setTab("day"); setDate(todayWIB(), true); });
  document.querySelectorAll(".kas-tabs [data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

  /* dock + tautan #kas */
  const go = () => { const s = $("kas"); if (s && s.scrollIntoView) s.scrollIntoView({ block: "start" }); };
  const dock = $("dock");
  if (dock) dock.addEventListener("click", (e) => { const b = e.target.closest("[data-go=kas]"); if (b) { e.preventDefault(); go(); } });
  window.addEventListener("hashchange", () => { if (location.hash === "#kas") go(); });
  if ("IntersectionObserver" in window && $("kas")) {
    new IntersectionObserver((en) => document.body.classList.toggle("kas-focus", en[0].isIntersecting && en[0].intersectionRatio > 0.15), { threshold: [0, .15, .4] }).observe($("kas"));
  }
  if (location.hash === "#kas") setTimeout(go, 700);
}

/* ───────── mulai ───────── */
function boot() {
  if (!mount()) return;
  S.date = todayWIB();
  wire();
  setHead();
  renderDayShell();
  try {
    db = getDatabase(initializeApp(CFG));
    onValue(ref(db, ".info/serverTimeOffset"), (s) => {
      offset = Number(s.val()) || 0;
      if (!S.touched && S.tab === "day" && todayWIB() !== S.date && !S.editId) setDate(todayWIB());
    });
    setDate(S.date);
  } catch (e) {
    console.warn("[Kas] Firebase tidak termuat:", e && e.message);
    $("kdList").innerHTML = '<div class="kd-empty"><b>Belum tersambung ke server.</b><span>Cek koneksi internet lalu muat ulang halaman.</span></div>';
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

/* untuk pengujian */
window.__kas = { calc, rowsOf, up, num, fmtIn, isKasbon };
