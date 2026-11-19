/* ==========================================================================
   KAS RITASE HARIAN  (kas.js)
   --------------------------------------------------------------------------
   • Siapa saja boleh input / edit / hapus baris — tanpa login — SELAMA tanggalnya belum terkunci.
   • KUNCI OTOMATIS (v33): periode terkunci pukul 08.30 WIB di hari berikutnya (Sab+Min → Senin 08.30).
     Setelah terkunci hanya admin yang bisa membuka (sementara), dan pembukaan tercatat di Riwayat.
   • Setiap perubahan dicatat di riwayat (append-only) lengkap dengan tanggal + jam.
   • Angka otomatis (total diserahkan, sisa uang, selisih, rekap) dihitung program,
     tampil bergembok, dan tidak bisa diubah.
   • Realtime lewat Firebase Realtime Database (koneksi dipakai bersama app.js).

   Struktur data:
     kas/{YYYY-MM}/{DD} = { diterima, fisik, rows:{ <id>:{nama,po,jumlah,ts,by,eby?,ets?} } }
     kasLog/{YYYY-MM}/{DD}/<id> = { act, detail, by, ts }
     kasOpen/{YYYY-MM}/{DD}     = { until, by, ts }   ← pembukaan kunci sementara oleh admin (DD = tanggal acuan periode)
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
  clock: '<svg class="ksv" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  lock: '<svg class="ksv ksv-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>'
};

const pd = (s) => { const p = s.split("-").map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2] || 1)); };
const fd = (d) => d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
const addDays = (s, n) => { const d = pd(s); d.setUTCDate(d.getUTCDate() + n); return fd(d); };
const addMonths = (ym, n) => { const p = ym.split("-").map(Number); const d = new Date(Date.UTC(p[0], p[1] - 1 + n, 1)); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1); };
const titleDate = (s) => { const d = pd(s); return pad(d.getUTCDate()) + " " + MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear(); };
const dowOf = (s) => DAYS[pd(s).getUTCDay()];

/* ───────── PERIODE: akhir pekan + libur nasional dilihat sebagai SATU periode ─────────
   Data di database tetap per tanggal (tidak ada migrasi). Yang digabung hanya tampilan, hitungan & kunci.
   Aturan periode:
     • Senin – Jumat biasa : 1 hari = 1 periode.
     • Sabtu + Minggu       : 1 periode (kunci Senin 08.30).
     • Libur nasional pada hari kerja (Senin – Jumat) ikut digabung dengan HARI SEBELUMNYA.
         Contoh: Jumat 25 Des 2026 libur -> periode "24 & 25 Desember" (Kamis + Jumat), kunci Sabtu 26 Des 08.30.
         Senin libur -> Sabtu + Minggu + Senin (kunci Selasa 08.30).
     • Baris           : semua baris periode, urut jam input. Baris baru disimpan di tanggal PERTAMA periode.
     • Uang diterima   : angka tanggal pertama yang terisi (angka berikutnya dianggap sisa lanjutan, tidak dijumlah).
     • Fisik uang      : angka tanggal terakhir yang terisi (hitungan paling akhir). */
const HOL_BASE = {
  /* Libur NASIONAL (tanpa cuti bersama) — SKB 3 Menteri 2026 & 2027. Tambah / batalkan lewat node "libur" di Firebase. */
  "2026-01-01": "Tahun Baru", "2026-01-16": "Isra Mikraj", "2026-02-17": "Imlek", "2026-03-19": "Nyepi", "2026-03-21": "Idulfitri", "2026-03-22": "Idulfitri",
  "2026-04-03": "Wafat Yesus Kristus", "2026-04-05": "Paskah", "2026-05-01": "Hari Buruh", "2026-05-14": "Kenaikan Yesus Kristus", "2026-05-27": "Iduladha",
  "2026-05-31": "Waisak", "2026-06-01": "Hari Lahir Pancasila", "2026-06-16": "Tahun Baru Islam", "2026-08-17": "Hari Kemerdekaan", "2026-08-25": "Maulid Nabi", "2026-12-25": "Natal",
  "2027-01-01": "Tahun Baru", "2027-01-05": "Isra Mikraj", "2027-02-06": "Imlek", "2027-03-08": "Nyepi", "2027-03-10": "Idulfitri", "2027-03-11": "Idulfitri",
  "2027-03-26": "Wafat Yesus Kristus", "2027-03-28": "Paskah", "2027-05-01": "Hari Buruh", "2027-05-06": "Kenaikan Yesus Kristus", "2027-05-17": "Iduladha",
  "2027-05-20": "Waisak", "2027-06-01": "Hari Lahir Pancasila", "2027-06-06": "Tahun Baru Islam", "2027-08-15": "Maulid Nabi", "2027-08-17": "Hari Kemerdekaan",
  "2027-12-25": "Natal", "2027-12-26": "Isra Mikraj"
};
let HOL = Object.assign({}, HOL_BASE);
const isHol = (s) => !!HOL[s];
const dowN = (s) => pd(s).getUTCDay();
function periodOf(s) {
  let a = s, b = s;
  for (let n = 0; n < 10; n++) {
    let ch = false;
    const wa = dowN(a);
    if (wa === 0 || (wa >= 1 && wa <= 5 && isHol(a))) { a = addDays(a, -1); ch = true; }       /* Minggu ikut Sabtu; libur hari kerja ikut hari sebelumnya */
    const nb = addDays(b, 1), wn = dowN(nb);
    if ((wn === 0 && dowN(b) === 6) || (wn >= 1 && wn <= 5 && isHol(nb))) { b = nb; ch = true; }
    if (!ch) break;
  }
  const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(d);
  return out;
}
const joinList = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " & " + a[a.length - 1]);
function titleList(ds, mn) {
  const P = ds.map(pd), y = P[0].getUTCFullYear(), m = P[0].getUTCMonth();
  const dd = (d) => pad(d.getUTCDate());
  if (ds.length === 1) return dd(P[0]) + " " + mn(m) + " " + y;
  if (P.some((d) => d.getUTCFullYear() !== y)) return joinList(P.map((d) => dd(d) + " " + mn(d.getUTCMonth()) + " " + d.getUTCFullYear()));
  if (P.some((d) => d.getUTCMonth() !== m)) return joinList(P.map((d) => dd(d) + " " + mn(d.getUTCMonth()))) + " " + y;
  return joinList(P.map(dd)) + " " + mn(m) + " " + y;
}
const titlePeriod = (ds) => titleList(ds, (m) => MONTHS[m]);
const dowPeriod = (ds) => joinList(ds.map(dowOf));
const fileTag = (ds) => ds[0] + (ds.length > 1 ? "_" + (ds[0].slice(0, 7) === ds[ds.length - 1].slice(0, 7) ? ds[ds.length - 1].slice(8) : ds[ds.length - 1]) : "");
const holNote = (ds) => { const n = ds.filter((d) => isHol(d) && dowN(d) >= 1 && dowN(d) <= 5).map((d) => HOL[d]).filter((v, i, a) => typeof v === "string" && a.indexOf(v) === i); return n.length ? "Libur nasional: " + n.join(", ") : ""; };
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
/* gabungkan data beberapa tanggal (Sabtu, Minggu) menjadi satu "hari" semu.
   list = [[tanggal, dataHari], …]. Mengembalikan {day, src, msrc}:
   src[id] = tanggal asal baris (untuk edit/hapus), msrc[field] = tanggal tempat angka disimpan. */
function mergeDays(list) {
  const day = { rows: {} }, src = {}, msrc = {};
  list.forEach((p) => {
    const r = (p[1] && p[1].rows) || {};
    Object.keys(r).forEach((id) => { if (r[id] && typeof r[id] === "object") { day.rows[id] = r[id]; src[id] = p[0]; } });
  });
  const pick = (f, order) => {
    for (let i = 0; i < order.length; i++) { const d = order[i][1]; if (d && typeof d[f] === "number") { day[f] = d[f]; msrc[f] = order[i][0]; return; } }
    msrc[f] = list[0][0];                       /* kosong: kalau diisi, disimpan di tanggal Sabtu */
  };
  pick("diterima", list);
  pick("fisik", list.slice().reverse());
  return { day, src, msrc };
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
  date: "", dates: [], month: "", tab: "day", touched: false,      /* date = tanggal acuan (Sabtu bila akhir pekan), dates = 1 atau 2 tanggal */
  day: undefined, srvMap: {}, src: {}, msrc: {}, pend: {}, conn: false, fromCache: false, cacheAt: 0, cacheT: null,
  monthData: undefined, edge: undefined, logs: undefined,
  editId: null, dirty: false, undo: null,
  open: undefined, openC: null, lkKey: "", lkPrev: "", lkAdm: false, lkPend: false, lkChoose: false, lkWhy: ""
};
const un = { month: null, open: null, libur: null };
const unOff = (k) => { if (un[k]) { try { un[k](); } catch { /* */ } un[k] = null; } };
let undoTimer = null;

const nowMs = () => Date.now() + offset;
const todayWIB = () => fd(new Date(nowMs() + 7 * 3600e3));
/* Periode AKTIF = periode paling lama yang belum terkunci (maks. satu periode sebelum hari ini).
   Contoh: Jumat 20 Nov 04.37 -> Kamis 19 Nov masih terbuka sampai 08.30 -> tampil 19 Nov; setelah 08.30 otomatis pindah ke 20 Nov. */
function activePeriod() {
  const cur = periodOf(todayWIB()), prev = periodOf(addDays(cur[0], -1));
  return nowMs() < lockAtOf(prev) ? prev : cur;
}
function followActive(notify) {
  if (S.touched || S.tab !== "day" || S.editId || !S.dates.length) return;
  const a = activePeriod();
  if (a[0] === S.date) return;
  const from = titlePeriod(S.dates);
  setDate(a[0]);
  if (notify) toast("Periode " + from + " sudah terkunci. Beralih ke " + titlePeriod(S.dates) + ".", "info", 4800);
}
const who = () => (lsGet("kas_who", "") || "Tamu").slice(0, 24);

/* ───────── firebase ───────── */
function listen(kind, path, cb) {
  if (un[kind]) { try { un[kind](); } catch { /* */ } un[kind] = null; }
  if (!db) return;
  un[kind] = onValue(ref(db, path), (snap) => cb(snap.val(), null), (err) => {
    toast(errMsg(err), "error", 7000);
    cb(null, err);
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
  return true;                       /* offline pun boleh: perubahan masuk antrean di HP */
}
function guard(p) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 12000))]);
}

/* ───────── OFFLINE: simpanan data + antrean kirim otomatis ─────────
   • Setiap hari yang pernah dibuka online disimpan di HP (localStorage) → tetap tampil saat offline.
   • Setiap perubahan (tambah / edit / hapus / uang diterima / fisik) MASUK ANTREAN dulu,
     langsung tampil di layar, lalu dikirim ke server. Antrean tahan ditutup / dimuat ulang.
   • Begitu server terjangkau lagi, antrean dikirim otomatis berurutan (aman diulang: id sama = hasil sama). */
const OB_KEY = "kas_outbox_v1", CACHE_PFX = "kas_day_", MON_PFX = "kas_mon_";
let outbox = [], flushing = false, flushTimer = null, lastWarn = 0, wasPending = false, queuedOffline = false;
try { const a = JSON.parse(lsGet(OB_KEY, "[]")); if (Array.isArray(a)) outbox = a.filter((o) => o && o.k && o.date); } catch { /* */ }

const live = () => !!db && S.conn === true && (typeof navigator === "undefined" || navigator.onLine !== false);
function saveOutbox() { lsSet(OB_KEY, JSON.stringify(outbox)); paintNet(); }
const mkLog = (act, detail) => ({ act, detail: trunc(detail, 190), by: who(), ts: nowMs() });

function cacheWrite(prefix, key, v) {
  lsSet(prefix + key, JSON.stringify({ t: nowMs(), v }));
  if (Math.random() < 0.15) {            /* simpan paling banyak 45 hari / 12 bulan terakhir */
    try {
      const keep = prefix === CACHE_PFX ? 45 : 12, all = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(prefix) === 0) { let t = 0; try { t = JSON.parse(localStorage.getItem(k)).t || 0; } catch { /* */ } all.push([k, t]); }
      }
      all.sort((x, y) => y[1] - x[1]).slice(keep).forEach((x) => { try { localStorage.removeItem(x[0]); } catch { /* */ } });
    } catch { /* */ }
  }
}
function cacheRead(prefix, key) {
  try { const o = JSON.parse(lsGet(prefix + key, "null")); return o && o.v ? o : null; } catch { return null; }
}

/* tampilan = data server + perubahan yang masih antre */
function overlay(base, date) {
  const ops = outbox.filter((o) => o.date === date);
  if (!ops.length) return base;
  const day = JSON.parse(JSON.stringify(base || {}));
  day.rows = day.rows || {};
  ops.forEach((o) => {
    if (o.k === "set") day.rows[o.id] = o.row;
    else if (o.k === "del") delete day.rows[o.id];
    else if (o.k === "money") { if (o.val == null) delete day[o.field]; else day[o.field] = o.val; }
  });
  return day;
}
function rebuild() {
  if (!S.dates.length || !S.dates.every((d) => S.srvMap[d] !== undefined)) return;     /* tunggu semua tanggal periode */
  const m = mergeDays(S.dates.map((d) => [d, overlay(S.srvMap[d], d)]));
  S.day = m.day; S.src = m.src; S.msrc = m.msrc;
  S.pend = {};
  outbox.forEach((o) => { if (S.dates.indexOf(o.date) > -1 && o.k === "set") S.pend[o.id] = 1; });
}

function enqueue(op) {
  /* gabungkan perubahan beruntun pada baris / kolom yang sama (riwayat tetap lengkap) */
  const same = (o) => o.date === op.date && (op.k === "money" ? (o.k === "money" && o.field === op.field) : (o.k !== "money" && o.id === op.id));
  const prev = outbox.filter(same);
  op.logs = prev.reduce((a, o) => a.concat(o.logs || []), []).concat(op.logs || []);
  outbox = outbox.filter((o) => !same(o));
  outbox.push(op);
  saveOutbox(); rebuild(); onDay();
  if (!live()) queuedOffline = true;
  if (!live() && Date.now() - lastWarn > 4000) { lastWarn = Date.now(); toast("Tersimpan di HP. Dikirim otomatis saat online.", "info", 2800); }
  flush();
}

async function flush() {
  if (flushing || !outbox.length || !live()) return;
  flushing = true; wasPending = true; paintNet();
  try {
    while (outbox.length && live()) {
      const o = outbox[0], base = dayPath(o.date);
      try {
        if (o.k === "set") await guard(set(ref(db, base + "/rows/" + o.id), o.row));
        else if (o.k === "del") await guard(remove(ref(db, base + "/rows/" + o.id)));
        else if (o.k === "money") await guard(set(ref(db, base + "/" + o.field), o.val == null ? null : o.val));
        (o.logs || []).forEach((l) => { push(ref(db, logPath(o.date)), { act: l.act, detail: l.detail, by: l.by, ts: l.ts }).catch(() => {}); });
        outbox.shift(); saveOutbox();
      } catch (e) {
        if (e && e.code === "PERMISSION_DENIED") { outbox.shift(); saveOutbox(); toast(errMsg(e), "error", 8000); continue; }
        break;                                   /* jaringan bermasalah: coba lagi nanti, antrean tetap aman */
      }
    }
  } finally { flushing = false; rebuild(); onDay(); paintNet(); }
  if (outbox.length) { clearTimeout(flushTimer); flushTimer = setTimeout(flush, 8000); }
  else if (wasPending) { wasPending = false; if (queuedOffline) { queuedOffline = false; toast("Semua perubahan sudah tersinkron ke server.", "success", 2600); } }
}

/* ───────── penanda status (online / offline / antrean) ───────── */
function paintNet() {
  const el = $("kasNet"); 
  const n = outbox.length, off = typeof navigator !== "undefined" && navigator.onLine === false;
  let cls, txt, sub = "", btn = false;
  if (off) { cls = "is-off"; txt = n ? "Offline · " + n + " perubahan menunggu dikirim" : "Offline · data tersimpan di HP"; sub = S.fromCache && S.cacheAt ? "data terakhir " + clock(S.cacheAt) : ""; }
  else if (!db || S.conn !== true) { cls = "is-sync"; txt = n ? "Menyambung · " + n + " perubahan menunggu" : "Menyambung ke server…"; }
  else if (flushing) { cls = "is-sync"; txt = "Mengirim " + n + " perubahan…"; }
  else if (n) { cls = "is-sync"; txt = n + " perubahan belum terkirim"; btn = true; }
  else { cls = "is-on"; txt = "Online · tersinkron"; sub = "realtime"; }
  if (el) {
    el.className = "kas-net " + cls;
    $("kasNetTxt").textContent = txt; $("kasNetSub").textContent = sub;
    $("kasNetGo").hidden = !btn;
  }
  try { window.dispatchEvent(new CustomEvent("kas:net", { detail: { pending: n, live: live(), flushing } })); } catch { /* */ }
}
const clock = (ts) => { const d = new Date((ts || 0) + 7 * 3600e3); return pad(d.getUTCHours()) + "." + pad(d.getUTCMinutes()); };

const rowTxt = (r) => [r.nama, r.po, "Rp " + rp(r.jumlah)].filter(Boolean).join(" · ");

/* ───────── KUNCI OTOMATIS 08.30 WIB ─────────
   • Periode (1 hari, Sabtu+Minggu, atau hari kerja + libur nasional sesudahnya) terkunci pukul 08.30 WIB di HARI BERIKUTNYA
     setelah hari terakhir periode:  Senin → Selasa 08.30 · … · Jumat → Sabtu 08.30 · Sabtu+Minggu → Senin 08.30 · 24+25 Des → 26 Des 08.30.
   • Terkunci = tidak bisa tambah / edit / hapus / pulihkan / ubah uang diterima & fisik.
   • Buka kunci: wajib login admin. Terbuka UNLOCK_MIN (3) menit; disimpan di kasOpen/… sehingga semua perangkat ikut terbuka,
     lalu kunci pasang lagi otomatis. Siapa saja boleh menekan "Kunci lagi" lebih awal. Pembukaan & penguncian tercatat di Riwayat (kasLog).
   • Waktu memakai jam server (offset Firebase), bukan jam HP. */
const UNLOCK_MIN = 3, LOCK_MIN = 8 * 60 + 30, WIB = 7 * 3600e3, RING = 2 * Math.PI * 26;
const openPath = (s) => "kasOpen/" + s.slice(0, 7) + "/" + s.slice(8, 10);
const lockAtOf = (ds) => pd(addDays(ds[ds.length - 1], 1)).getTime() - WIB + LOCK_MIN * 60e3;
const winStartOf = (ds) => pd(ds[0]).getTime() - WIB;
const isAdmin = () => !!document.body && document.body.classList.contains("admin-mode");
const fmtLk = (ms) => { const d = new Date(ms + WIB); return DAYS[d.getUTCDay()].slice(0, 3) + ", " + d.getUTCDate() + " " + MON3[d.getUTCMonth()] + " · " + pad(d.getUTCHours()) + "." + pad(d.getUTCMinutes()) + " WIB"; };
function parts(ms) {
  let s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);
  return { d, h, m, s: s - m * 60 };
}
function lockState() {
  const now = nowMs(), at = lockAtOf(S.dates), o = S.open !== undefined ? S.open : S.openC;
  const until = o && typeof o.until === "number" ? o.until : 0;
  /* hitung mundur hanya tampil untuk periode yang sudah berjalan (bukan tanggal depan) DAN sudah ada isi — otomatis muncul saat baris pertama dicatat */
  if (now < at) return { mode: "auto", at, left: at - now, total: Math.max(1, at - winStartOf(S.dates)), show: S.dates[0] <= todayWIB() && !!(S.day && S.day.rows && Object.keys(S.day.rows).length) };
  if (until > now) return { mode: "open", at, until, left: until - now, total: Math.max(1, until - (Number(o.ts) || until - 36e5)), by: o.by || "Admin" };
  return { mode: "locked", at, checking: S.open === undefined && S.openC == null && live() };
}
const isLocked = () => lockState().mode === "locked";
function denyLocked() { toast("Tanggal ini sudah terkunci otomatis. Buka kunci lewat login admin.", "warn", 3800); }
async function adminWho() {
  try {
    const m = await import("./vendor/fb-auth.js");
    const u = m.getAuth(initializeApp(CFG)).currentUser, e = u && u.email;
    if (e) return ("Admin " + e.split("@")[0]).slice(0, 24);
  } catch { /* */ }
  return "Admin";
}

const LK_SVG = '<svg class="lk-svg" viewBox="0 0 24 24" aria-hidden="true"><path class="lk-sh" d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><circle class="lk-dot" cx="12" cy="15.2" r="1.1"/></svg>';
const lkKey = (st) => st.mode + (st.show === false ? "-" : "") + (st.checking ? "?" : "") + (isAdmin() ? "A" : "") + (S.lkChoose ? "C" : "");

function lockHTML(st) {
  const adm = isAdmin();
  const u = (id, t) => '<span class="lk-u"><b id="' + id + '">00</b><i>' + t + '</i></span>';
  const cd = '<div class="lk-clock" id="lkClock" aria-hidden="true"><span class="lk-u lk-d" id="lkD" hidden><b id="lkDn">0</b><i>hari</i></span>' +
    u("lkH", "jam") + '<span class="lk-c">:</span>' + u("lkM", "mnt") + '<span class="lk-c">:</span>' + u("lkS", "dtk") + '</div>';
  const ring = '<div class="lk-ring"><svg viewBox="0 0 60 60" aria-hidden="true"><circle class="lk-tr" cx="30" cy="30" r="26"/><circle class="lk-pg" id="lkPg" cx="30" cy="30" r="26"/></svg><span class="lk-ic">' + LK_SVG + '</span></div>';
  let h;
  if (st.mode === "auto") {
    h = ring + '<div class="lk-main"><span class="lk-eb">Terkunci otomatis dalam</span>' + cd + '<span class="lk-sub">Kunci: ' + esc(fmtLk(st.at)) + (holNote(S.dates) ? '<br><em class="lk-hol">' + esc(holNote(S.dates)) + ' · digabung</em>' : '') + '</span></div>' +
      '<p class="lk-hint" id="lkHint"></p>';
  } else if (st.mode === "open") {
    h = ring + '<div class="lk-main"><span class="lk-eb">Dibuka sementara · kunci lagi dalam</span>' + cd + '<span class="lk-sub">oleh ' + esc(st.by) + ' · s/d ' + esc(clock(st.until)) + ' WIB</span></div>' +
      '<div class="lk-act"><button type="button" class="lk-btn" data-lk="relock">' + IC.lock + '<span>Kunci lagi</span></button></div>' +
      '<p class="lk-hint" id="lkHint"></p>';
  } else {
    h = ring + '<div class="lk-main"><span class="lk-eb">' + (st.checking ? "Memeriksa status kunci…" : "Terkunci otomatis") + '</span>' +
      '<b class="lk-title">Tanggal ini sudah dikunci</b><span class="lk-sub">Sejak ' + esc(fmtLk(st.at)) + '</span></div>' +
      (S.lkChoose ? "" : '<div class="lk-act"><button type="button" class="lk-btn pri" data-lk="unlock">' + IC.user + '<span>' + (adm ? "Buka kunci" : "Buka kunci (admin)") + '</span></button></div>') +
      '<p class="lk-hint">Tambah, edit, hapus &amp; ubah uang diterima / fisik ditutup. Membuka kunci (' + UNLOCK_MIN + ' menit) wajib login admin dan tercatat di Riwayat.</p>';
    if (S.lkChoose && adm) {
      h += '<div class="lk-pick"><b>Buka kunci ' + UNLOCK_MIN + ' menit</b><span class="lk-sub">Setelah itu terkunci otomatis. Bisa dikunci lagi lebih awal.</span>' +
        '<input id="lkWhy" class="lk-why" maxlength="80" autocomplete="off" placeholder="Alasan (opsional), mis. koreksi salah input" value="' + esc(S.lkWhy) + '">' +
        '<div class="lk-pick-a"><button type="button" class="lk-btn" data-lk="cancel">Batal</button><button type="button" class="lk-btn pri" data-lk="confirm">' + IC.ok + '<span>Buka ' + UNLOCK_MIN + ' menit</span></button></div></div>';
    }
  }
  return h;
}

function applyLock() {
  const host = $("lkHost"); if (!host) return;
  const st = lockState(), key = lkKey(st), lock = st.mode === "locked";
  if (key !== S.lkKey) {
    if (S.lkPrev === "auto" && st.mode === "locked") toast("Tanggal " + titlePeriod(S.dates) + " terkunci otomatis (08.30 WIB).", "warn", 4200);
    S.lkKey = key; S.lkPrev = st.mode;
    host.innerHTML = st.show === false ? "" : '<section class="lk lk-' + st.mode + '" id="lkCard" data-ph="calm" role="status">' + lockHTML(st) + '</section>';
    const pg = $("lkPg"); if (pg) pg.style.strokeDasharray = RING.toFixed(2);
    const root = $("kdRoot"); if (root) root.classList.toggle("is-locked", lock);
    ["kaNama", "kaPo", "kaAmt"].forEach((id) => { const e = $(id); if (e) e.disabled = lock; });
    const sb = document.querySelector(".kd-addbtn"); if (sb) sb.disabled = lock;
    ["ksTerima", "ksFisik"].forEach((id) => { const e = $(id); if (e) e.readOnly = lock; });
    if (lock && S.editId) { S.editId = null; renderList(); }
    if (S.lkChoose) { const w = $("lkWhy"); if (w) w.addEventListener("input", () => { S.lkWhy = w.value; }); }
  }
  paintCount(st);
}
const HINT = { calm: "Input, edit & hapus masih terbuka.", warn: "Kurang dari 3 jam — selesaikan & cek input Anda.", hot: "Hampir terkunci! Simpan perubahan sekarang." };
let tickFlip = false;
function paintCount(st) {
  const card = $("lkCard"); if (!card || st.mode === "locked") return;
  const p = parts(st.left), setT = (id, v) => { const e = $(id); if (e && e.textContent !== v) { e.textContent = v; return e; } return null; };
  const sEl = setT("lkS", pad(p.s)); setT("lkM", pad(p.m)); setT("lkH", pad(p.h));
  if (sEl) { tickFlip = !tickFlip; sEl.className = tickFlip ? "ta" : "tb"; }
  const d = $("lkD"); if (d) { d.hidden = p.d < 1; setT("lkDn", String(p.d)); }
  const pg = $("lkPg"); if (pg) pg.style.strokeDashoffset = (RING * (1 - Math.max(0, Math.min(1, st.left / st.total)))).toFixed(2);
  const ph = st.mode === "open" ? (st.left <= 60e3 ? "hot" : "calm") : st.left <= 1800e3 ? "hot" : st.left <= 3 * 3600e3 ? "warn" : "calm";
  if (card.dataset.ph !== ph) card.dataset.ph = ph;
  const ht = $("lkHint");
  if (ht) { const t = st.mode === "open" ? (ph === "hot" ? "Kunci terpasang lagi sebentar lagi. Simpan perubahan sekarang." : "Kunci dibuka " + UNLOCK_MIN + " menit — tambah, edit & hapus diizinkan.") : HINT[ph]; if (ht.textContent !== t) ht.textContent = t; }
}
function lkTick() {
  if (!document.hidden) followActive(true);                 /* kunci jatuh -> tampilan pindah ke periode berikutnya */
  if (document.hidden || S.tab !== "day" || !$("lkHost") || !S.dates.length) return;
  if (lkKey(lockState()) !== S.lkKey) applyLock(); else paintCount(lockState());
}

async function onLockClick(e) {
  const b = e.target.closest("[data-lk]"); if (!b) return;
  const a = b.dataset.lk;
  if (a === "unlock") {
    if (!isAdmin()) {
      S.lkPend = true; setTimeout(() => { S.lkPend = false; }, 90000);
      toast("Login admin dulu untuk membuka kunci.", "info", 3200);
      const ab = $("adminBtn"); if (ab) ab.click();
    } else { S.lkChoose = true; applyLock(); }
  } else if (a === "cancel") { S.lkChoose = false; S.lkWhy = ""; applyLock(); }
  else if (a === "confirm") doUnlock(b);
  else if (a === "relock") doRelock(b);
}
async function doUnlock(btn) {
  if (!isAdmin()) { toast("Sesi admin sudah berakhir. Login lagi.", "warn", 3500); S.lkChoose = false; applyLock(); return; }
  if (!db || !live()) { toast("Perlu internet untuk membuka kunci.", "warn", 3500); return; }
  const date = S.date, titl = titlePeriod(S.dates), mins = UNLOCK_MIN, why = String(S.lkWhy || "").replace(/\s+/g, " ").trim();
  if (btn) btn.disabled = true;
  const by = await adminWho(), ts = nowMs(), until = ts + mins * 60e3;
  try { await guard(set(ref(db, openPath(date)), { until, by, ts })); }
  catch (e) {
    if (btn) btn.disabled = false;
    toast(e && e.code === "PERMISSION_DENIED" ? "Ditolak server. Pastikan masih login admin dan aturan database v33 (kasOpen) sudah dipublikasikan." : errMsg(e), "error", 8000);
    return;
  }
  push(ref(db, logPath(date)), { act: "buka", detail: trunc("Kunci dibuka " + mins + " menit (s/d " + clock(until) + " WIB) untuk " + titl + (why ? " · " + why : ""), 190), by, ts })
    .catch(() => toast("Kunci terbuka, tetapi riwayat gagal tercatat. Periksa aturan database (kasLog: buka/kunci).", "warn", 7000));
  S.lkChoose = false; S.lkWhy = "";
  toast("Kunci dibuka " + mins + " menit. Terkunci lagi otomatis.", "success", 3000);
}
async function doRelock(btn) {
  if (!db || !live()) { toast("Perlu internet untuk memasang kunci.", "warn", 3500); return; }
  const date = S.date, titl = titlePeriod(S.dates);
  if (btn) btn.disabled = true;
  const by = isAdmin() ? await adminWho() : who(), ts = nowMs();
  try { await guard(set(ref(db, openPath(date)), null)); }
  catch (e) { if (btn) btn.disabled = false; toast(e && e.code === "PERMISSION_DENIED" ? "Ditolak server. Publikasikan aturan database v34 terbaru." : errMsg(e), "error", 6000); return; }
  push(ref(db, logPath(date)), { act: "kunci", detail: trunc("Kunci dikunci manual sebelum waktunya untuk " + titl, 190), by, ts }).catch(() => {});
  toast("Kunci dipasang kembali.", "success", 2400);
}
function watchAdmin() {
  S.lkAdm = isAdmin();
  if (!window.MutationObserver || !document.body) return;
  new MutationObserver(() => {
    const a = isAdmin(); if (a === S.lkAdm) return;
    S.lkAdm = a;
    if (a && S.lkPend) { S.lkPend = false; S.lkChoose = isLocked(); }
    if (!a) S.lkChoose = false;
    applyLock();
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

/* ───────── aksi data ───────── */
async function addRow(nama, po, jumlah) {
  if (isLocked()) { denyLocked(); return false; }
  if (!ready()) return false;
  const date = S.date, row = { nama, po, jumlah, ts: nowMs(), by: who() };
  const id = push(ref(db, dayPath(date) + "/rows")).key;
  enqueue({ k: "set", date, id, row, logs: [mkLog("tambah", rowTxt(row))] });
  rememberWords(nama, po);
  return true;
}
async function saveRow(id, nama, po, jumlah) {
  if (isLocked()) { denyLocked(); return false; }
  if (!ready()) return false;
  const date = S.src[id] || S.date, old = ((S.day && S.day.rows) || {})[id];       /* simpan di tanggal asal baris */
  if (!old) { toast("Baris ini sudah dihapus orang lain.", "warn"); return true; }
  if (old.nama === nama && old.po === po && Number(old.jumlah) === jumlah) return true;
  const row = Object.assign({}, old, { nama, po, jumlah, eby: who(), ets: nowMs() });
  enqueue({ k: "set", date, id, row, logs: [mkLog("edit", trunc(rowTxt(old), 90) + "  →  " + trunc(rowTxt(row), 90))] });
  rememberWords(nama, po);
  return true;
}
async function delRow(id) {
  if (isLocked()) { denyLocked(); return; }
  if (!ready()) return;
  const date = S.src[id] || S.date, old = ((S.day && S.day.rows) || {})[id];
  if (!old) return;
  enqueue({ k: "del", date, id, logs: [mkLog("hapus", rowTxt(old))] });
  showUndo({ date, id, row: old });
}
async function undoDel() {
  const u = S.undo; if (!u) return;
  if (isLocked()) { hideUndo(); denyLocked(); return; }
  if (!ready()) return;
  hideUndo();
  enqueue({ k: "set", date: u.date, id: u.id, row: u.row, logs: [mkLog("pulih", rowTxt(u.row))] });
  toast("Baris dipulihkan", "success", 2200);
}
async function setMoney(field, label, raw) {
  if (isLocked()) { denyLocked(); onDay(); return; }
  if (!ready()) return;
  const date = S.msrc[field] || S.date, d = digits(raw);       /* angka disimpan di tanggal tempat nilainya berasal */
  const prev = S.day && typeof S.day[field] === "number" ? S.day[field] : null;
  const val = d === "" ? null : parseInt(d, 10);
  if (val === prev) return;
  enqueue({ k: "money", date, field, val, logs: [mkLog(field, label + ": " + (prev == null ? "kosong" : "Rp " + rp(prev)) + "  →  " + (val == null ? "kosong" : "Rp " + rp(val)))] });
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
        '<div class="kas-net is-sync" id="kasNet" role="status" aria-live="polite"><span class="kn-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="b1" d="M5 19v-3"/><path class="b2" d="M10 19v-6"/><path class="b3" d="M15 19V9"/><path class="b4" d="M20 19V5"/><circle class="of" cx="12" cy="12" r="7.5"/><path class="sl" d="M6.7 6.7l10.6 10.6"/></svg></span><span class="kn-tx"><b id="kasNetTxt">Menyambung…</b><small id="kasNetSub"></small></span><button class="kn-go" id="kasNetGo" type="button" hidden>Kirim sekarang</button></div>' +
        '<div class="kas-tools">' +
          '<div class="kas-tabs" role="tablist" aria-label="Tampilan kas">' +
            '<button type="button" role="tab" data-tab="day" aria-selected="true">Harian</button>' +
            '<button type="button" role="tab" data-tab="rekap" aria-selected="false">Rekap bulan</button>' +
            '<button type="button" role="tab" data-tab="log" aria-selected="false">Riwayat</button>' +
          '</div>' +
          '<div class="kas-quick">' +
          '<button class="kbtn kbtn-ghost" type="button" id="kasToday">Hari ini</button>' +
          '<button class="kbtn kbtn-icon" type="button" id="kasCalc" aria-label="Kalkulator" title="Kalkulator">' + IC.calc + '</button>' +
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
  $("kasDow").textContent = dowPeriod(S.dates) + (S.dates.indexOf(todayWIB()) > -1 ? " · hari ini" : "");
  $("kasTitle").textContent = titlePeriod(S.dates);
  $("kasTitle").classList.toggle("is-wk", S.dates.length > 1);
  $("kasPick").value = S.date;
  $("kasRoot").dataset.tab = S.tab;
  document.querySelectorAll(".kas-tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === S.tab ? "true" : "false"));
}

function setDate(date, byUser) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const dates = periodOf(date), anchor = dates[0];
  if (byUser) S.touched = anchor !== activePeriod()[0];       /* memilih periode aktif = tetap mengikuti otomatis */     /* Minggu / Sabtu → periode Sabtu+Minggu; hari lain → 1 hari */
  S.date = anchor; S.dates = dates; S.day = undefined; S.srvMap = {}; S.src = {}; S.msrc = {};
  S.fromCache = false; S.cacheAt = 0; S.pend = {}; S.logs = undefined; S.editId = null; S.dirty = false;
  setHead();
  /* status kunci (dibuka admin?) untuk periode ini */
  if (un.open) { try { un.open(); } catch { /* */ } un.open = null; }
  S.open = undefined; S.lkChoose = false; S.lkKey = "";
  try { S.openC = JSON.parse(lsGet("kas_open_" + anchor, "null")); } catch { S.openC = null; }
  if (db) un.open = onValue(ref(db, openPath(anchor)), (snap) => {
    if (S.date !== anchor) return;
    S.open = snap.val() || null; lsSet("kas_open_" + anchor, JSON.stringify(S.open)); applyLock();
  }, () => { if (S.date === anchor) { S.open = null; applyLock(); } });      /* aturan kasOpen belum dipasang: anggap tidak ada pembukaan */
  clearTimeout(S.cacheT);
  for (let i = dates.length; i < 10; i++) unOff("day" + i);
  dates.forEach((d, i) => {
    listen("day" + i, dayPath(d), (v, err) => {
      if (S.dates[i] !== d) return;
      if (err && S.srvMap[d] !== undefined) return;         /* galat: jangan timpa data yang sudah tampil */
      S.srvMap[d] = v || {}; S.fromCache = false;
      if (!err) cacheWrite(CACHE_PFX, d, S.srvMap[d]);
      rebuild(); onDay();
    });
  });
  /* belum ada jawaban server (offline / lambat) → tampilkan simpanan di HP */
  S.cacheT = setTimeout(() => {
    if (S.date !== anchor) return;
    const off = typeof navigator !== "undefined" && navigator.onLine === false;
    let used = false, at = 0;
    dates.forEach((d) => {
      if (S.srvMap[d] !== undefined) return;
      const c = cacheRead(CACHE_PFX, d);
      if (!c && !off) return;                               /* online tanpa simpanan: tunggu server */
      S.srvMap[d] = c ? c.v : {}; used = true; if (c && (!at || c.t < at)) at = c.t;
    });
    if (!used) return;
    S.fromCache = true; S.cacheAt = at;
    rebuild(); onDay(); paintNet();
  }, (typeof navigator !== "undefined" && navigator.onLine === false) ? 0 : 1800);
  if (S.tab === "day") onDay();
  applyLock();
  if (S.tab === "log") listenLog();
}
function listenLog() {
  S.logs = {};
  renderLog();
  for (let i = S.dates.length; i < 10; i++) unOff("log" + i);
  S.dates.forEach((d, i) => listen("log" + i, logPath(d), (v) => { if (S.dates[i] !== d) return; S.logs[d] = v || {}; renderLog(); }));
}

function setTab(tab) {
  S.tab = tab;
  if (tab !== "log") for (let i = 0; i < 10; i++) unOff("log" + i);
  if (tab !== "rekap") { unOff("month"); for (let i = 0; i < 4; i++) unOff("edge" + i); }
  setHead();
  if (tab === "day") renderDayShell(true);
  if (tab === "rekap") { S.month = S.date.slice(0, 7); renderRekapShell(); }
  if (tab === "log") listenLog();
}

/* ───────── TAMPILAN HARIAN ───────── */
function renderDayShell() {
  const v = $("kasView"); if (!v) return;
  const amtIn = (id, ph) => '<div class="amt"><span>Rp</span><input id="' + id + '" inputmode="numeric" enterkeyhint="done" placeholder="' + ph + '"></div>';
  v.innerHTML =
    '<div class="kd" id="kdRoot">' +
      '<div class="kd-mini" id="kdMini"><span>Sisa uang</span><b id="kmSisa">Rp 0</b><small id="kmInfo"></small></div>' +
      '<div class="kd-side">' +
        '<div id="lkHost"></div>' +
        '<section class="kk" id="kkBox" aria-label="Ringkasan kas">' +
          '<div class="kk-c kk-sisa"><span class="k">Sisa uang ' + IC.lock + '</span><b id="ksSisa">Rp 0</b><div class="kk-prog" aria-hidden="true"><i id="ksProg"></i></div><small id="ksPct"></small></div>' +
          '<div class="kk-c kk-terima"><label for="ksTerima">Uang diterima</label>' + amtIn("ksTerima", "0") + '</div>' +
          '<div class="kk-c kk-total"><span class="k">Total diserahkan ' + IC.lock + '</span><b id="ksTotal">Rp 0</b><small id="ksCount">0 baris</small></div>' +
          '<div class="kk-c kk-fisik"><label for="ksFisik">Fisik uang</label>' + amtIn("ksFisik", "Hasil hitung") + '</div>' +
          '<div class="kk-c kk-diff none" id="ksDiff"><span class="k">Selisih ' + IC.lock + '</span><b id="ksSel">—</b><em id="ksTag"></em></div>' +
        '</section>' +
      '</div>' +
      '<datalist id="kasNames"></datalist><datalist id="kasPos"></datalist>' +
      '<div class="kd-main">' +
        '<form class="kd-add" id="kdAdd" autocomplete="off" novalidate>' +
          '<div class="kd-add-h"><b>Catat baru</b><span>Enter = pindah ke kolom berikutnya</span></div>' +
          '<div class="kf kf-nama"><label for="kaNama">Nama</label><input id="kaNama" list="kasNames" maxlength="60" autocapitalize="characters" enterkeyhint="next" placeholder="Driver / TKBM"></div>' +
          '<div class="kf kf-po"><label for="kaPo">No PO / keterangan</label><input id="kaPo" list="kasPos" maxlength="60" autocapitalize="characters" enterkeyhint="next" placeholder="mis. KASBON"></div>' +
          '<div class="kf kf-amt"><label for="kaAmt">Jumlah</label>' + amtIn("kaAmt", "0") + '</div>' +
          '<button class="kd-addbtn" type="submit">' + IC.plus + '<span>Tambah baris</span></button>' +
          '<p class="kd-err" id="kaErr" role="alert"></p>' +
          '<p class="kd-lockmsg">' + IC.lock + '<span>Terkunci — input ditutup. Buka kunci lewat login admin.</span></p>' +
        '</form>' +
        '<div class="kd-bar"><b id="kdCount">Catatan hari ini</b>' +
          '<div class="kd-bar-a">' +
            '<button class="kbtn kbtn-wa" type="button" id="ksWa"><i class="fab fa-whatsapp"></i><span>Kirim ke <span class="wa-w">WhatsApp </span>' + esc(WA_NAME) + '</span></button>' +
            '<button class="kbtn kbtn-ghost" type="button" id="ksCopy">' + IC.copy + '<span>Salin teks</span></button>' +
          '</div></div>' +
        '<p class="ks-hint"><span class="h-m">Dikirim sebagai gambar lewat menu Bagikan.</span><span class="h-d">Di komputer, tombol ini hanya mengunduh gambar JPG ke folder Download.</span></p>' +
        '<div class="kd-listhead" aria-hidden="true"><span>#</span><span>Nama</span><span>No PO / keterangan</span><span>Jumlah</span><span></span></div>' +
        '<div class="kd-list" id="kdList"></div>' +
      '</div>' +
    '</div>';
  { const root = $("kasRoot"); if (root) { root.classList.remove("is-m", "is-d"); root.classList.add(isMobileDevice() ? "is-m" : "is-d"); } }

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
    if (isLocked()) { denyLocked(); return; }
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
  $("lkHost").addEventListener("click", onLockClick);
  S.lkKey = "";
  onDay();
  applyLock();
}

function onDay() {
  if (S.tab !== "day" || !$("kdList")) return;
  const c = calc(S.day);
  renderSummary(c);
  if (S.editId) { S.dirty = true; } else renderList(c);
  fillSuggest();
  applyLock();            /* kartu hitung mundur muncul otomatis begitu ada baris pertama */
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
  const pr = $("ksProg"), pc = $("ksPct");
  if (pr && pc) {
    if (c.diterima > 0) {
      const pct = Math.max(0, Math.min(100, Math.round(c.total / c.diterima * 100)));
      pr.style.width = (c.sisa < 0 ? 100 : pct) + "%";
      pc.textContent = c.sisa < 0 ? "Melebihi uang diterima" : pct + "% dari uang diterima sudah diserahkan";
    } else { pr.style.width = "0"; pc.textContent = "Isi uang diterima untuk melihat penggunaan"; }
  }
  const d = $("ksDiff"), sel = $("ksSel"), tag = $("ksTag");
  d.classList.remove("ok", "less", "more", "none");
  if (c.selisih == null) { d.classList.add("none"); sel.textContent = "—"; tag.textContent = "isi fisik dulu"; }
  else if (c.selisih === 0) { d.classList.add("ok"); sel.textContent = "Rp 0"; tag.textContent = "Cocok"; }
  else if (c.selisih < 0) { d.classList.add("less"); sel.textContent = "−Rp " + rp(-c.selisih); tag.textContent = "Uang kurang"; }
  else { d.classList.add("more"); sel.textContent = "Rp " + rp(c.selisih); tag.textContent = "Uang lebih"; }
}

const hueOf = (t) => { let h = 0; const x = String(t || "?"); for (let i = 0; i < x.length; i++) h = (h * 31 + x.charCodeAt(i)) % 360; return h; };
function rowView(r, i) {
  const k = isKasbon(r.po), pend = S.pend && S.pend[r.id];
  return '<div class="kr' + (k ? " is-kasbon" : "") + (pend ? " is-pending" : "") + '" data-id="' + esc(r.id) + '">' +
    '<span class="kr-no">' + (i + 1) + '</span>' +
    '<span class="kr-nama"><i class="kr-av" style="--h:' + hueOf(r.nama) + '">' + esc(String(r.nama || "?").charAt(0)) + '</i><b>' + esc(r.nama) + '</b>' + (pend ? '<i class="kr-pend" title="Menunggu dikirim ke server">' + IC.clock + '<span>menunggu</span></i>' : '') + '</span>' +
    '<span class="kr-po">' + (r.po ? '<em>' + esc(r.po) + '</em>' : '<i class="kr-none">—</i>') + '</span>' +
    '<span class="kr-amt"><small>Rp</small><b>' + rp(r.jumlah) + '</b></span>' +
    '<span class="kr-act">' +
      '<i class="kr-lk" title="Terkunci">' + IC.lock + '</i>' +
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
  el.innerHTML = c.rows.map((r, i) => (S.editId === r.id ? rowEdit(r, i) : rowView(r, i))).join("") +
    '<div class="kd-foot"><span>Total ' + c.rows.length + ' baris</span><b>Rp ' + rp(c.total) + '</b></div>';
  S.dirty = false;
}

function onListClick(e) {
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "focus") { const n = $("kaNama"); if (n) { n.focus(); if (n.scrollIntoView) n.scrollIntoView({ block: "center" }); } return; }
  const rowEl = b.closest(".kr"), id = rowEl && rowEl.dataset.id, act = b.dataset.act;
  if (isLocked() && (act === "edit" || act === "del" || act === "save")) { denyLocked(); return; }
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
function drawSheet(c, dates) {
  dates = Array.isArray(dates) ? dates : [dates];
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
  const mn = (m) => (m === 10 ? "Nopember" : MONTHS[m]);      /* ejaan lembar Excel lama */
  const title = titleList(dates, mn);

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

/* HP / tablet = layar sentuh -> menu Bagikan. Komputer (Windows 7 dll) = unduh gambar JPG saja. */
function isMobileDevice() {
  try { if (navigator.userAgentData && navigator.userAgentData.mobile) return true; } catch (e) { /* */ }
  try { if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches && (navigator.maxTouchPoints || 0) > 0) return true; } catch (e) { /* */ }
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
}

/* simpan Blob / data-URL sebagai file (aman untuk Chrome lama) */
function saveFile(blob, dataUrl, filename) {
  const a = document.createElement("a");
  const url = blob ? URL.createObjectURL(blob) : dataUrl;
  a.href = url; a.download = filename; a.style.display = "none";
  document.body.appendChild(a); a.click();
  setTimeout(() => { try { document.body.removeChild(a); if (blob) URL.revokeObjectURL(url); } catch (e) { /* */ } }, 1500);
}

function sendWA() {
  if (S.day === undefined) { toast("Data belum dimuat. Tunggu sebentar.", "warn"); return; }
  const c = calc(S.day);
  if (!c.rows.length) { toast("Belum ada catatan untuk dikirim.", "warn"); return; }
  const dates = S.dates.slice(), date = fileTag(dates);
  let cv;
  try { cv = drawSheet(c, dates); } catch (e) { toast("Gagal membuat gambar: " + (e && e.message), "error", 6000); return; }

  /* ── KOMPUTER: unduh JPG saja. Tidak membuka WhatsApp, tidak menyalin apa pun. ── */
  if (!isMobileDevice()) {
    const jpg = "Kas-Ritase-" + date + ".jpg";
    try {
      cv.toBlob((blob) => {
        try {
          if (blob) saveFile(blob, null, jpg);
          else saveFile(null, cv.toDataURL("image/jpeg", 0.92), jpg);
          toast("Gambar tersimpan: " + jpg + " (folder Download)", "success", 5000);
        } catch (e) { toast("Gagal mengunduh gambar: " + (e && e.message), "error", 6000); }
      }, "image/jpeg", 0.92);
    } catch (e) {
      try { saveFile(null, cv.toDataURL("image/jpeg", 0.92), jpg); toast("Gambar tersimpan: " + jpg, "success", 5000); }
      catch (e2) { toast("Gagal mengunduh gambar: " + (e2 && e2.message), "error", 6000); }
    }
    return;
  }

  /* ── HP: menu Bagikan (tidak diubah) ── */
  const name = "Kas-Ritase-" + date + ".png";
  cv.toBlob(async (blob) => {
    if (!blob) { try { saveFile(null, cv.toDataURL("image/png"), name); } catch (e) { /* */ } return; }
    try {
      const file = new File([blob], name, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        toast("Pilih WhatsApp, lalu kontak " + WA_NAME, "info", 4000);
        await navigator.share({ files: [file] });
        return;
      }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { saveFile(blob, null, name); } catch (e) { toast("Gagal membuat gambar: " + (e && e.message), "error", 6000); return; }
    const w = window.open("https://wa.me/" + WA_NUM, "_blank"); if (!w) location.href = "https://wa.me/" + WA_NUM;
    toast("Gambar terunduh. Di chat " + WA_NAME + ", ketuk ikon lampiran lalu pilih " + name, "success", 8000);
  }, "image/png");
}

async function copyReport() {
  const c = calc(S.day), L = [];
  L.push("*KAS RITASE — " + dowPeriod(S.dates) + ", " + titlePeriod(S.dates) + "*");
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
  S.monthData = undefined; S.edge = {}; renderRekap();
  const mc = cacheRead(MON_PFX, S.month);
  if (mc && !live()) { S.monthData = mc.v; renderRekap(); }
  listen("month", "kas/" + S.month, (v, err) => { if (err && S.monthData !== undefined) return; S.monthData = v || {}; if (!err) cacheWrite(MON_PFX, S.month, S.monthData); renderRekap(); });
  /* periode terakhir bulan ini bisa menjangkau tanggal bulan depan (akhir pekan / libur) → ikut dibaca */
  const last = addDays(addMonths(S.month, 1) + "-01", -1), eds = periodOf(last).filter((d) => d.slice(0, 7) !== S.month);
  S.edge = {};
  for (let i = eds.length; i < 4; i++) unOff("edge" + i);
  eds.forEach((d, i) => listen("edge" + i, dayPath(d), (v) => { S.edge[d] = v || {}; renderRekap(); }));
}
function renderRekap() {
  const el = $("kmBody"); if (!el) return;
  if (S.monthData === undefined) { el.innerHTML = live() ? '<div class="kd-empty">Memuat rekap…</div>' : '<div class="kd-empty"><b>Rekap belum tersimpan di HP</b><span>Buka rekap bulan ini sekali saat online. Setelah itu bisa dilihat tanpa internet.</span></div>'; return; }
  const days = Object.keys(S.monthData).filter((d) => /^\d{2}$/.test(d)).sort();
  const edgeHas = Object.keys(S.edge || {}).some((d) => S.edge[d] && Object.keys(S.edge[d]).length);
  if (!days.length && !edgeHas) { el.innerHTML = '<div class="kd-empty"><b>Belum ada catatan di ' + esc(monthTitle(S.month)) + '.</b><span>Buka tab Harian dan mulai input.</span></div>'; return; }
  /* susun periode (akhir pekan / libur digabung = 1 baris). Periode ikut bulan tanggal PERTAMA-nya. */
  const last = addDays(addMonths(S.month, 1) + "-01", -1);
  const dayData = (date) => date.slice(0, 7) === S.month ? S.monthData[date.slice(8, 10)] : (S.edge || {})[date];
  const periods = [], seen = {};
  let moved = "";
  days.forEach((dd) => {
    const ds = periodOf(S.month + "-" + dd);
    if (ds[0].slice(0, 7) !== S.month) { moved = ds[0].slice(0, 7); return; }       /* tgl 1 hari Minggu: ikut Sabtu bulan lalu */
    if (!seen[ds[0]]) { seen[ds[0]] = 1; periods.push(ds); }
  });
  { const lp = periodOf(last); if (edgeHas && lp[0].slice(0, 7) === S.month && !seen[lp[0]]) { seen[lp[0]] = 1; periods.push(lp); } }
  periods.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!periods.length) { el.innerHTML = '<div class="kd-empty"><b>Catatan ' + esc(monthTitle(S.month)) + ' digabung ke rekap ' + esc(monthTitle(moved || S.month)) + '.</b><span>Akhir pekan / libur yang melewati pergantian bulan dihitung di bulan tanggal pertamanya.</span></div>'; return; }
  let tD = 0, tS = 0, tN = 0, nDay = 0;
  const trs = periods.map((ds) => {
    const m = mergeDays(ds.map((d) => [d, dayData(d)]));
    const c = calc(m.day); tD += c.diterima; tS += c.total; tN += c.rows.length; nDay += ds.filter((d) => dayData(d)).length;
    const cls = c.selisih == null ? "none" : c.selisih === 0 ? "ok" : c.selisih < 0 ? "less" : "more";
    const sel = c.selisih == null ? "—" : c.selisih === 0 ? "Cocok" : (c.selisih < 0 ? "−" : "+") + rp(Math.abs(c.selisih));
    const th = ds.length > 1 ? Number(ds[0].slice(8, 10)) + "–" + Number(ds[ds.length - 1].slice(8, 10)) : String(Number(ds[0].slice(8, 10))), sm = ds.length > 1 ? dowOf(ds[0]).slice(0, 3) + "–" + dowOf(ds[ds.length - 1]).slice(0, 3) : dowOf(ds[0]).slice(0, 3);
    return '<tr data-date="' + ds[0] + '" tabindex="0"' + (ds.length > 1 ? ' class="is-wk"' : '') + '><th scope="row"><b>' + th + '</b><small>' + sm + '</small></th>' +
      '<td>' + rp(c.diterima) + '</td><td>' + rp(c.total) + '<small>' + c.rows.length + ' baris</small></td>' +
      '<td class="kt-sisa">' + (c.sisa < 0 ? "−" : "") + rp(Math.abs(c.sisa)) + '</td>' +
      '<td>' + (c.fisik == null ? "—" : rp(c.fisik)) + '</td><td class="kt-sel ' + cls + '">' + sel + '</td></tr>';
  }).join("");
  el.innerHTML =
    '<div class="kt-wrap"><table class="kt"><thead><tr><th>Tgl</th><th>Diterima</th><th>Diserahkan</th><th>Sisa</th><th>Fisik</th><th>Selisih</th></tr></thead>' +
    '<tbody>' + trs + '</tbody>' +
    '<tfoot><tr><th>' + nDay + ' hari</th><td>' + rp(tD) + ' ' + IC.lock + '</td><td>' + rp(tS) + ' ' + IC.lock + '<small>' + tN + ' baris</small></td><td class="kt-sisa">' + (tD - tS < 0 ? "−" : "") + rp(Math.abs(tD - tS)) + ' ' + IC.lock + '</td><td></td><td></td></tr></tfoot></table></div>' +
    '<p class="kt-hint">Geser tabel ke kanan untuk melihat semua kolom.</p>' +
    '<p class="ks-note">' + IC.lock + '<span>Semua angka rekap dihitung otomatis dari data harian. Ketuk satu baris untuk membuka harinya. Sabtu &amp; Minggu serta libur nasional digabung jadi satu baris.</span></p>';
}

/* ───────── RIWAYAT ───────── */
const ACT = { tambah: ["Tambah", "ok"], edit: ["Edit", "warn"], hapus: ["Hapus", "bad"], pulih: ["Pulihkan", "info"], diterima: ["Uang diterima", "viol"], fisik: ["Fisik uang", "viol"], buka: ["Buka kunci", "viol"], kunci: ["Kunci", "warn"] };
function renderLog() {
  const v = $("kasView"); if (!v) return;
  if (S.logs === undefined || S.dates.some((d) => S.logs[d] === undefined)) { v.innerHTML = live() ? '<div class="kd-empty">Memuat riwayat…</div>' : '<div class="kd-empty"><b>Riwayat butuh internet</b><span>Tampil otomatis begitu koneksi kembali.</span></div>'; return; }
  const items = [];
  S.dates.forEach((d) => { const lg = S.logs[d]; if (lg) Object.keys(lg).forEach((id) => items.push(Object.assign({ id }, lg[id]))); });
  items.splice(0, items.length, ...items.filter((x) => x && x.ts).sort((a, b) => b.ts - a.ts));
  if (!items.length) { v.innerHTML = '<div class="kd-empty"><b>Belum ada riwayat di tanggal ' + esc(titlePeriod(S.dates)) + '.</b><span>Setiap tambah, edit, dan hapus akan tercatat di sini beserta jamnya.</span></div>'; return; }
  v.innerHTML = '<p class="kh-sum">' + items.length + ' perubahan pada kas ' + esc(titlePeriod(S.dates)) + '. Riwayat tidak bisa diubah atau dihapus.</p><ol class="kh">' +
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
    const ds = S.dates;           /* dari akhir pekan: mundur → Jumat, maju → Senin */
    setDate(b.dataset.act === "prev" ? addDays(ds[0], -1) : addDays(ds[ds.length - 1], 1), true);
  });
  const pick = $("kasPick");
  pick.addEventListener("change", () => { if (pick.value) setDate(pick.value, true); });
  pick.addEventListener("click", () => { try { pick.showPicker && pick.showPicker(); } catch { /* */ } });
  $("kasCalc").addEventListener("click", (e) => Calc.open(e.currentTarget));
  $("kasToday").addEventListener("click", () => { setTab("day"); setDate(activePeriod()[0], true); });
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
  S.dates = activePeriod(); S.date = S.dates[0];
  wire();
  setHead();
  watchAdmin();
  renderDayShell();
  try {
    db = getDatabase(initializeApp(CFG));
    onValue(ref(db, ".info/serverTimeOffset"), (s) => {
      offset = Number(s.val()) || 0;
      followActive(false);
    });
    onValue(ref(db, ".info/connected"), (s) => { S.conn = !!s.val(); paintNet(); if (S.conn) flush(); });
    window.addEventListener("online", () => { paintNet(); setTimeout(flush, 800); });
    window.addEventListener("offline", paintNet);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) { paintNet(); flush(); } });
    setInterval(() => { if (outbox.length) flush(); }, 20000);
    onValue(ref(db, "libur"), (snap) => {                    /* tambahan / pembatalan libur nasional dari admin (opsional) */
      const v = snap.val() || {}, h = Object.assign({}, HOL_BASE);
      Object.keys(v).forEach((d) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return; if (v[d] === false) delete h[d]; else h[d] = typeof v[d] === "string" ? v[d] : "Libur nasional"; });
      if (JSON.stringify(h) === JSON.stringify(HOL)) return;
      HOL = h;
      if (S.tab === "rekap") renderRekap();
      if (S.date && periodOf(S.date).join() !== S.dates.join() && !S.editId) setDate(S.date);
    }, () => { /* aturan "libur" belum dipasang: pakai daftar bawaan */ });
    setInterval(lkTick, 1000);                              /* hitung mundur kunci (berhenti saat tab disembunyikan) */
    document.addEventListener("visibilitychange", () => { if (!document.hidden) lkTick(); });
    const go = $("kasNetGo"); if (go) go.addEventListener("click", flush);
    window.__kasBusy = () => flushing || !!S.editId;
    paintNet();
    setDate(S.date);
  } catch (e) {
    console.warn("[Kas] Firebase tidak termuat:", e && e.message);
    $("kdList").innerHTML = '<div class="kd-empty"><b>Belum tersambung ke server.</b><span>Cek koneksi internet lalu muat ulang halaman.</span></div>';
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

/* untuk pengujian */
window.__kas = { lockState, lockAtOf, S, outbox: () => outbox, overlay, Calc, drawSheet, calc, rowsOf, up, num, fmtIn, isKasbon };
