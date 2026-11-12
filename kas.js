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
const WA_NAME = "Ibu Alda", WA_NUM = "6285773634651";   /* tujuan kirim WhatsApp (format 62…, tanpa + dan 0) */

const IC = {
  prev: '<svg class="ksv" viewBox="0 0 24 24"><path d="m14.5 5.5-6.5 6.5 6.5 6.5"/></svg>',
  next: '<svg class="ksv" viewBox="0 0 24 24"><path d="m9.5 5.5 6.5 6.5-6.5 6.5"/></svg>',
  copy: '<svg class="ksv" viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="12" rx="2.2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h2"/></svg>',
  print: '<svg class="ksv" viewBox="0 0 24 24"><path d="M7 9V4.5h10V9M7 17H5.2A1.7 1.7 0 0 1 3.5 15.3v-5A1.7 1.7 0 0 1 5.2 8.6h13.6a1.7 1.7 0 0 1 1.7 1.7v5a1.7 1.7 0 0 1-1.7 1.7H17"/><rect x="7" y="13.5" width="10" height="6" rx="1"/></svg>',
  calc: '<svg class="ksv" viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01M15.5 16h.01" stroke-width="2.6"/></svg>',
  doc: '<svg class="ksv" viewBox="0 0 24 24"><path d="M6.5 3.5h11v17l-2.2-1.5-2.2 1.5-2.1-1.5-2.2 1.5-2.3-1.5z"/><path d="M9.5 8.5h5M9.5 12h5"/></svg>',
  pin: '<svg class="ksv" viewBox="0 0 24 24"><path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 1 0-13 0c0 5.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>',
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

/* ───────── KALKULATOR SEDERHANA ───────── */
const Calc = (() => {
  let ov = null, opener = null;
  const st = { expr: "", prev: "", fresh: false, err: "" };
  const ROWS = [["(", ")", "%", "AC"], ["7", "8", "9", "÷"], ["4", "5", "6", "×"], ["1", "2", "3", "−"], ["0", ",", "=", "+"]];
  const OPK = { "÷": "/", "×": "*", "−": "-", "+": "+" };
  const isOp = (c) => c === "+" || c === "-" || c === "*" || c === "/";

  function evalExpr(src) {
    /* "200+10%" → 220 (persen dari angka sebelumnya) */
    src = src.replace(/(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)%/g, "$1$2($1*$3/100)");
    const toks = src.match(/\d+\.?\d*|\.\d+|[-+*/()%]/g) || [];
    const out = [], ops = [], prec = { "+": 1, "-": 1, "*": 2, "/": 2, u: 3 };
    let prev = null;                                  /* n=angka, o=operator, (=kurung buka */
    const push = (op) => { while (ops.length) { const t = ops[ops.length - 1]; if (t !== "(" && prec[t] >= prec[op]) out.push(ops.pop()); else break; } ops.push(op); };
    for (const tk of toks) {
      if (/^[\d.]/.test(tk)) { if (prev === "n") push("*"); out.push(parseFloat(tk)); prev = "n"; }
      else if (tk === "%") { if (prev !== "n") throw 0; out.push("%"); }
      else if (tk === "(") { if (prev === "n") push("*"); ops.push("("); prev = "("; }
      else if (tk === ")") { while (ops.length && ops[ops.length - 1] !== "(") out.push(ops.pop()); if (!ops.length) throw 0; ops.pop(); prev = "n"; }
      else if ((tk === "-" || tk === "+") && (prev === null || prev === "o" || prev === "(")) { if (tk === "-") { ops.push("u"); } prev = "o"; }
      else { if (prev !== "n") throw 0; push(tk); prev = "o"; }
    }
    if (prev === "o") throw 0;
    while (ops.length) { const o = ops.pop(); if (o === "(") throw 0; out.push(o); }
    const s = [];
    for (const x of out) {
      if (typeof x === "number") s.push(x);
      else if (x === "%") s.push(s.pop() / 100);
      else if (x === "u") s.push(-s.pop());
      else { const b = s.pop(), a = s.pop(); if (a === undefined || b === undefined) throw 0; s.push(x === "+" ? a + b : x === "-" ? a - b : x === "*" ? a * b : a / b); }
    }
    if (s.length !== 1 || !isFinite(s[0])) throw 0;
    return Math.round(s[0] * 1e10) / 1e10;
  }
  const grp = (m) => { const p = m.split("."); const g = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); return p.length > 1 ? g + "," + p[1] : g; };
  const show = (e) => e.replace(/\d+\.?\d*|\.\d+/g, grp).replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−");

  function paint() {
    const m = $("kcMain"); if (!m) return;
    const t = st.err || show(st.expr) || "0";
    m.textContent = t; m.className = "kc-main" + (t.length > 18 ? " s2" : t.length > 11 ? " s1" : "");
    $("kcPrev").textContent = st.prev ? show(st.prev) : "";
  }
  function lastNum() { const m = st.expr.match(/\d*\.?\d*$/); return m ? m[0] : ""; }
  function press(k) {
    st.err = "";
    if (k === "AC") { st.expr = ""; st.prev = ""; st.fresh = false; return paint(); }
    if (k === "bs") { if (st.fresh) { st.prev = ""; st.fresh = false; } st.expr = st.expr.slice(0, -1); return paint(); }
    if (k === "=") {
      if (!st.expr) return;
      let e = st.expr; while (isOp(e.slice(-1))) e = e.slice(0, -1);
      const open = (e.match(/\(/g) || []).length - (e.match(/\)/g) || []).length; for (let i = 0; i < open; i++) e += ")";
      try { const r = evalExpr(e); if (Math.abs(r) >= 1e15) throw 0; st.prev = e + " ="; st.expr = String(r); st.fresh = true; }
      catch { st.err = "Tidak valid"; }
      return paint();
    }
    const l = st.expr.slice(-1);
    if (/\d/.test(k)) {
      if (st.fresh) { st.expr = ""; st.prev = ""; st.fresh = false; }
      if (lastNum() === "0") st.expr = st.expr.slice(0, -1);
      if (l === ")" || l === "%") st.expr += "*";
      if (lastNum().replace(".", "").length >= 15) return;
      st.expr += k;
    } else if (k === ",") {
      if (st.fresh) { st.expr = ""; st.prev = ""; st.fresh = false; }
      const n = lastNum(); if (n.indexOf(".") > -1) return;
      st.expr += (n === "" ? "0." : ".");
    } else if (OPK[k]) {
      const op = OPK[k];
      st.fresh = false;
      if (!st.expr) { if (op === "-") st.expr = "-"; return paint(); }
      if (st.expr === "-") return;
      if (isOp(l)) { if (op === "-" && (l === "*" || l === "/")) st.expr += op; else st.expr = st.expr.slice(0, -1) + op; }
      else if (l === "(") { if (op === "-") st.expr += op; }
      else st.expr += op;
    } else if (k === "(") {
      if (st.fresh) { st.expr = ""; st.prev = ""; st.fresh = false; }
      if (/[\d)%]/.test(l)) st.expr += "*";
      st.expr += "(";
    } else if (k === ")") {
      const open = (st.expr.match(/\(/g) || []).length - (st.expr.match(/\)/g) || []).length;
      if (open > 0 && /[\d)%]/.test(l)) st.expr += ")";
    } else if (k === "%") {
      if (/[\d)]/.test(l)) st.expr += "%";
    }
    paint();
  }
  function useAmount() {
    let v;
    try { let e = st.expr; while (isOp(e.slice(-1))) e = e.slice(0, -1); v = e ? evalExpr(e) : 0; } catch { st.err = "Tidak valid"; return paint(); }
    v = Math.round(v);
    if (!(v > 0)) { toast("Hasil harus lebih dari 0 untuk dipakai sebagai jumlah.", "warn", 3000); return; }
    close();
    if (S.tab !== "day") setTab("day");
    const a = $("kaAmt"); if (a) { a.value = fmtIn(String(v)); a.focus(); }
  }
  function build() {
    ov = document.createElement("div"); ov.id = "kcOv"; ov.className = "kc-ov"; ov.hidden = true;
    ov.innerHTML =
      '<div class="kc" role="dialog" aria-modal="true" aria-label="Kalkulator" tabindex="-1">' +
        '<div class="kc-top"><b>Kalkulator</b><button type="button" class="kc-x" data-k="close" aria-label="Tutup">' + IC.x + '</button></div>' +
        '<div class="kc-disp"><div class="kc-prev" id="kcPrev"></div><div class="kc-main" id="kcMain">0</div></div>' +
        '<div class="kc-pad">' + ROWS.map((r) => r.map((k) => {
          const c = k === "=" ? "kc-eq" : (k === "AC" || OPK[k] || k === "%" || k === "(" || k === ")") ? "kc-op" : "kc-num";
          return '<button type="button" class="kc-k ' + c + '" data-k="' + k + '">' + k + '</button>';
        }).join("")).join("") + '</div>' +
        '<div class="kc-foot"><button type="button" class="kc-f" data-k="bs">⌫ Hapus</button><button type="button" class="kc-f kc-use" data-k="use">Pakai di Jumlah</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", (e) => {
      if (e.target === ov) return close();
      const b = e.target.closest("[data-k]"); if (!b) return;
      const k = b.dataset.k;
      if (k === "close") close(); else if (k === "use") useAmount(); else press(k);
    });
    document.addEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (!ov || ov.hidden) return;
    const k = e.key;
    if (k === "Escape") { e.preventDefault(); return close(); }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let m = null;
    if (/^\d$/.test(k)) m = k; else if (k === "." || k === ",") m = ","; else if (k === "+") m = "+"; else if (k === "-") m = "−";
    else if (k === "*" || k === "x" || k === "X") m = "×"; else if (k === "/") m = "÷"; else if (k === "Enter" || k === "=") m = "=";
    else if (k === "Backspace") m = "bs"; else if (k === "%" || k === "(" || k === ")") m = k; else if (k === "Delete") m = "AC";
    if (m) { e.preventDefault(); press(m); }
  }
  function open(btn) { if (!ov) build(); opener = btn || null; ov.hidden = false; paint(); const d = ov.querySelector(".kc"); if (d) d.focus(); }
  function close() { if (ov) ov.hidden = true; if (opener && opener.focus) opener.focus(); }
  return { open, close, evalExpr };
})();

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
          '<button class="kbtn kbtn-icon" type="button" id="kasCalc" aria-label="Kalkulator" title="Kalkulator">' + IC.calc + '</button>' +
          '<div class="kas-links">' +
          '<a class="kbtn kbtn-bkb" href="https://web189.github.io/E-Book/index.html#/dms-manual" target="_blank" rel="noopener noreferrer">' + IC.print + '<span>Cetak BKB Manual</span></a>' +
          '<a class="kbtn kbtn-gps" href="https://benyoriki.github.io/Absensi/index.html" target="_blank" rel="noopener noreferrer">' + IC.pin + '<span>Absen GPS</span></a>' +
          '</div>' +
        '</div>' +
        '<div id="kasView"></div>' +
      '</div>' +
    '</div>';
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
  const amtIn = (id, ph) => '<div class="amt"><span>Rp</span><input id="' + id + '" inputmode="numeric" enterkeyhint="done" placeholder="' + ph + '"></div>';
  v.innerHTML =
    '<div class="kd" id="kdRoot">' +
      '<div class="kd-mini" id="kdMini"><span>Sisa uang</span><b id="kmSisa">Rp 0</b><small id="kmInfo"></small></div>' +
      '<section class="kk" id="kkBox" aria-label="Ringkasan kas">' +
        '<div class="kk-c kk-terima"><label for="ksTerima">Uang diterima</label>' + amtIn("ksTerima", "0") + '</div>' +
        '<div class="kk-c kk-total"><span class="k">Total diserahkan ' + IC.lock + '</span><b id="ksTotal">Rp 0</b><small id="ksCount">0 baris</small></div>' +
        '<div class="kk-c kk-sisa"><span class="k">Sisa uang ' + IC.lock + '</span><b id="ksSisa">Rp 0</b></div>' +
        '<div class="kk-c kk-fisik"><label for="ksFisik">Fisik uang</label>' + amtIn("ksFisik", "Hasil hitung") + '</div>' +
        '<div class="kk-c kk-diff none" id="ksDiff"><span class="k">Selisih ' + IC.lock + '</span><b id="ksSel">—</b><em id="ksTag"></em></div>' +
      '</section>' +
      '<form class="kd-add" id="kdAdd" autocomplete="off" novalidate>' +
        '<div class="kf kf-nama"><label for="kaNama">Nama</label><input id="kaNama" list="kasNames" maxlength="60" autocapitalize="characters" enterkeyhint="next" placeholder="Driver / TKBM"></div>' +
        '<div class="kf kf-po"><label for="kaPo">No PO / keterangan</label><input id="kaPo" list="kasPos" maxlength="60" autocapitalize="characters" enterkeyhint="next" placeholder="mis. KASBON"></div>' +
        '<div class="kf kf-amt"><label for="kaAmt">Jumlah</label>' + amtIn("kaAmt", "0") + '</div>' +
        '<button class="kd-addbtn" type="submit">' + IC.plus + '<span>Tambah baris</span></button>' +
        '<p class="kd-err" id="kaErr" role="alert"></p>' +
      '</form>' +
      '<datalist id="kasNames"></datalist><datalist id="kasPos"></datalist>' +
      '<div class="kd-bar"><b id="kdCount">Catatan hari ini</b>' +
        '<div class="kd-bar-a">' +
          '<button class="kbtn kbtn-wa" type="button" id="ksWa"><i class="fab fa-whatsapp"></i><span>Kirim ke <span class="wa-w">WhatsApp </span>' + esc(WA_NAME) + '</span></button>' +
          '<button class="kbtn kbtn-ghost" type="button" id="ksCopy">' + IC.copy + '<span>Salin teks</span></button>' +
        '</div></div>' +
      '<p class="ks-hint">HP: dikirim sebagai gambar lewat menu Bagikan. Komputer: gambar disalin otomatis, chat WhatsApp Web terbuka, tinggal tekan Ctrl+V lalu Enter.</p>' +
      '<div class="kd-listhead" aria-hidden="true"><span>#</span><span>Nama</span><span>No PO / keterangan</span><span>Jumlah</span><span></span></div>' +
      '<div class="kd-list" id="kdList"></div>' +
    '</div>';

  if (miniIO) { try { miniIO.disconnect(); } catch { /* */ } miniIO = null; }
  if ("IntersectionObserver" in window) {
    miniIO = new IntersectionObserver((en) => { const e = en[0], r = $("kdRoot"); if (r) r.classList.toggle("mini-on", !e.isIntersecting && e.boundingClientRect.bottom < 60); });
    miniIO.observe($("kkBox"));
  }
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
  $("ksWa").addEventListener("click", sendWA);
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
  $("ksCount").textContent = c.rows.length + " baris";
  $("kmSisa").textContent = (c.sisa < 0 ? "−" : "") + "Rp " + rp(Math.abs(c.sisa));
  $("kmInfo").textContent = c.rows.length + " baris · Rp " + rp(c.total);
  $("kdMini").classList.toggle("is-neg", c.sisa < 0);
  $("ksSisa").textContent = (c.sisa < 0 ? "−" : "") + "Rp " + rp(Math.abs(c.sisa));
  $("ksSisa").parentNode.classList.toggle("is-neg", c.sisa < 0);
  const d = $("ksDiff"), sel = $("ksSel"), tag = $("ksTag");
  d.classList.remove("ok", "less", "more", "none");
  if (c.selisih == null) { d.classList.add("none"); sel.textContent = "—"; tag.textContent = "isi fisik dulu"; }
  else if (c.selisih === 0) { d.classList.add("ok"); sel.textContent = "Rp 0"; tag.textContent = "Cocok"; }
  else if (c.selisih < 0) { d.classList.add("less"); sel.textContent = "−Rp " + rp(-c.selisih); tag.textContent = "Uang kurang"; }
  else { d.classList.add("more"); sel.textContent = "Rp " + rp(c.selisih); tag.textContent = "Uang lebih"; }
}

const hueOf = (t) => { let h = 0; const x = String(t || "?"); for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) % 360; return h; };
function rowView(r, i) {
  const k = isKasbon(r.po);
  return '<div class="kr' + (k ? " is-kasbon" : "") + '" data-id="' + esc(r.id) + '">' +
    '<span class="kr-no">' + (i + 1) + '</span>' +
    '<span class="kr-nama"><i class="kr-av" style="--h:' + hueOf(r.nama) + '">' + esc(String(r.nama || "?").charAt(0)) + '</i><b>' + esc(r.nama) + '</b></span>' +
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
    el.innerHTML = '<div class="kd-empty"><span class="kd-empty-ic">' + IC.doc + '</span><b>Belum ada catatan di tanggal ini</b><span>Isi nama dan jumlah, lalu tekan Tambah baris.</span><button type="button" class="kbtn" data-act="focus">Mulai catat</button></div>';
    return;
  }
  el.innerHTML = c.rows.map((r, i) => (S.editId === r.id ? rowEdit(r, i) : rowView(r, i))).join("");
  S.dirty = false;
}

function onListClick(e) {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "focus") { const n = $("kaNama"); if (n) { n.focus(); if (n.scrollIntoView) n.scrollIntoView({ block: "center" }); } return; }
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

let savedTimer = null, miniIO = null;
function flashSaved() {
  const b = document.querySelector(".kd-addbtn"); if (!b) return;
  b.classList.add("saved"); b.querySelector("span").textContent = "Tersimpan";
  clearTimeout(savedTimer);
  savedTimer = setTimeout(() => { b.classList.remove("saved"); b.querySelector("span").textContent = "Tambah baris"; }, 1100);
}


/* ───────── GAMBAR REKAP (meniru lembar Excel) + KIRIM WHATSAPP ───────── */
function drawSheet(c, date) {
  const SERIF = '"Times New Roman","Liberation Serif",Tinos,serif';
  const X = [0, 44, 320, 600, 1380, 1600], W = 1600, RH = 39, TH = 69, HH = 35;
  const n = c.rows.length + 3;            /* baris terisi + 3 baris kosong */
  const H = TH + HH + n * RH + RH * 5;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  const line = "#b9b9b9";
  const rect = (x0, y0, x1, y1, fill) => { g.fillStyle = fill; g.fillRect(x0, y0, x1 - x0, y1 - y0); };
  const box = (x0, y0, x1, y1) => { g.strokeStyle = line; g.lineWidth = 1; g.strokeRect(x0 + .5, y0 + .5, x1 - x0, y1 - y0); };
  const fit = (t, px, maxW) => { let f = px; do { g.font = "bold " + f + "px " + SERIF; f--; } while (g.measureText(t).width > maxW && f > 10); };
  const mid = (t, x0, x1, y, px, color) => { g.fillStyle = color || "#000"; fit(t, px, x1 - x0 - 16); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(t, (x0 + x1) / 2, y); };
  const money = (v, x0, x1, y, px, color) => {
    g.fillStyle = color || "#000"; g.textBaseline = "middle";
    g.font = "bold " + px + "px " + SERIF; g.textAlign = "left"; g.fillText("Rp", x0 + 10, y);
    fit(v, px, x1 - x0 - 70); g.textAlign = "right"; g.fillText(v, x1 - 10, y);
  };
  const d = pd(date), title = pad(d.getUTCDate()) + " " + (d.getUTCMonth() === 10 ? "Nopember" : MONTHS[d.getUTCMonth()]) + " " + d.getUTCFullYear();

  rect(X[1], 0, W, TH, "#ffff1a"); box(X[1], 0, W - 1, TH);
  mid(title, X[1], W, TH / 2, 30);
  rect(X[1], TH, W, TH + HH, "#92cddc");
  ["Uang Diterima", "NAMA", "NO PO", "JUMLAH"].forEach((t, i) => { box(X[i + 1], TH, X[i + 2] - 1, TH + HH); mid(t, X[i + 1], X[i + 2], TH + HH / 2, 22); });

  for (let i = 0; i < n; i++) {
    const y = TH + HH + i * RH, cy = y + RH / 2, r = c.rows[i];
    for (let k = 0; k < 5; k++) box(X[k], y, X[k + 1] - 1, y + RH);
    mid(String(i + 1), X[0], X[1], cy, 20);
    if (i === 0) money(rp(c.diterima), X[1], X[2], cy, 22);
    if (!r) continue;
    mid(r.nama || "", X[2], X[3], cy, 22);
    if (isKasbon(r.po)) { rect(X[3], y, X[4], y + RH, "#ff0000"); box(X[3], y, X[4] - 1, y + RH); mid(r.po, X[3], X[4], cy, 22, "#7a0000"); }
    else mid(r.po || "", X[3], X[4], cy, 22);
    money(rp(r.jumlah), X[4], X[5], cy, 22);
  }

  let y = TH + HH + n * RH;
  const row = (fill) => { if (fill) rect(X[1], y, W, y + RH, fill); box(X[1], y, X[4] - 1, y + RH); box(X[4], y, W - 1, y + RH); };
  const left = (t, px, dx) => { g.fillStyle = "#000"; g.font = "bold " + px + "px " + SERIF; g.textAlign = "left"; g.textBaseline = "middle"; g.fillText(t, X[1] + dx, y + RH / 2); };
  row(); left("TOTAL UANG YANG DITERIMA", 20, 4); money(rp(c.diterima), X[4], W, y + RH / 2, 18); y += RH;
  row(); left("TOTAL UANG YANG DISERAHKAN", 20, 4); money(rp(c.total), X[4], W, y + RH / 2, 18); y += RH;
  row("#ffff1a"); left("SISA UANG", 20, 90); money((c.sisa < 0 ? "-" : "") + rp(Math.abs(c.sisa)), X[4], W, y + RH / 2, 30); y += RH;
  row("#92cddc"); left("FISIK UANG", 20, 84); y += RH;
  row();
  if (c.fisik != null) { rect(X[4], y, W, y + RH, "#ff0000"); box(X[4], y, W - 1, y + RH); money(rp(c.fisik), X[4], W, y + RH / 2, 18); }
  return cv;
}

/* HP / tablet = layar sentuh. Desktop (Windows, Mac, Linux) = pakai WhatsApp Web */
function isMobileDevice() {
  try { if (navigator.userAgentData && navigator.userAgentData.mobile) return true; } catch (e) {}
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

function sendWA() {
  if (S.day === undefined) { toast("Data belum dimuat. Tunggu sebentar.", "warn"); return; }
  const c = calc(S.day);
  if (!c.rows.length) { toast("Belum ada catatan untuk dikirim.", "warn"); return; }
  const date = S.date, name = "Kas-Ritase-" + date + ".png";
  const cv = drawSheet(c, date);
  const mobile = isMobileDevice();

  const download = (blob) => {
    const a = document.createElement("a");
    a.href = blob ? URL.createObjectURL(blob) : cv.toDataURL("image/png"); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
  };
  /* buka chat tujuan di WhatsApp Web (tanpa pindah dari halaman aplikasi) */
  const openWebChat = () => {
    const w = window.open("https://web.whatsapp.com/send?phone=" + WA_NUM, "_blank");
    if (!w) toast("Pop-up diblokir browser. Izinkan pop-up untuk situs ini, lalu coba lagi.", "warn", 7000);
    return !!w;
  };

  /* ── DESKTOP: gambar disalin ke clipboard, lalu chat dibuka. Tinggal Ctrl+V → Enter ── */
  const desktopFlow = async (blob) => {
    let copied = false;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        copied = true;
      }
    } catch (e) { copied = false; }
    if (!copied) {            /* clipboard tidak didukung / ditolak -> unduh sebagai cadangan */
      try { download(blob); } catch (e) { toast("Gagal membuat gambar: " + (e && e.message), "error", 6000); return; }
    }
    openWebChat();
    toast(copied
      ? "Gambar disalin. Di chat " + WA_NAME + " tekan Ctrl+V, lalu Enter."
      : "Gambar terunduh. Di chat " + WA_NAME + " klik lampiran (+) lalu pilih " + name, "success", 9000);
  };

  cv.toBlob(async (blob) => {
    if (!blob) { try { download(null); } catch (e) {} return; }
    if (mobile) {
      /* HP: menu Bagikan (tidak diubah) */
      try {
        const file = new File([blob], name, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          toast("Pilih WhatsApp, lalu kontak " + WA_NAME, "info", 4000);
          await navigator.share({ files: [file] });
          return;
        }
      } catch (e) { if (e && e.name === "AbortError") return; }
      try { download(blob); } catch (e) { toast("Gagal membuat gambar: " + (e && e.message), "error", 6000); return; }
      const w = window.open("https://wa.me/" + WA_NUM, "_blank"); if (!w) location.href = "https://wa.me/" + WA_NUM;
      toast("Gambar terunduh. Di chat " + WA_NAME + ", ketuk ikon lampiran lalu pilih " + name, "success", 8000);
    } else {
      desktopFlow(blob);
    }
  }, "image/png");
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
  $("kasCalc").addEventListener("click", (e) => Calc.open(e.currentTarget));
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
window.__kas = { Calc, drawSheet, calc, rowsOf, up, num, fmtIn, isKasbon };
