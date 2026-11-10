# UangRitase v21 — BREAKDOWN Online

## Yang baru
- Bagian **BREAKDOWN Online** (di bawah "Data Lainnya", atau tombol kuning di header / menu **Kas** di dock HP / alamat `#kas`).
- **Harian**: pilih tanggal (‹ ›, kalender, atau "Hari ini"). Isi *Nama → No PO / keterangan → Jumlah*, tekan Enter berturut-turut, baris langsung masuk dan form siap untuk input berikutnya.
  - Tiap baris bisa **Edit** (ikon pensil) dan **Hapus** (ikon sampah, ada tombol *Pulihkan* 7 detik).
  - Keterangan yang diawali `KASBON` otomatis berwarna merah, seperti di lembar Excel.
  
- **Angka otomatis (bergembok, tidak bisa diubah):** Total diserahkan, Sisa uang, Selisih, dan seluruh Rekap bulan.
  Yang diinput manual hanya: baris-baris catatan, *Uang diterima*, dan *Fisik uang*.
- **Rekap bulan**: tabel per tanggal (diterima, diserahkan, sisa, fisik, selisih) + total bulan. Ketuk baris untuk membuka harinya.
- **Riwayat**: setiap tambah / edit / hapus / pulihkan / ubah uang diterima / ubah fisik uang tercatat dengan **tanggal, jam (WIB), nama penginput**, dan isi sebelum → sesudah. Riwayat tidak bisa diubah atau dihapus.
- Tanpa login. Kolom "Nama penginput" (tersimpan di perangkat) ikut tercatat di riwayat.
- Realtime: perubahan dari HP/PC lain muncul langsung.

## Wajib: pasang aturan Firebase
Tanpa langkah ini kas akan menolak menyimpan ("Ditolak server").
1. Firebase Console → Realtime Database → **Rules**.
2. Ganti seluruh isi dengan `firebase-rules-kas.json` → **Publish**.
   (Aturan `ritase`, `dms`, `btb`, `history` dibuat sama persis dengan yang sekarang; hanya `kas` dan `kasLog` yang baru.)

## File
- Baru: `kas.js`, `kas.css`, `firebase-rules-kas.json`
- Diubah: `index.html` (section, kartu header, dock), `sw.js` (versi v21 + daftar cache), `manifest.json` (shortcut Kas)
- Tidak diubah: `app.js`, `ur.js`, `app.css`, folder `vendor/`

## Struktur data
`kas/{YYYY-MM}/{DD}` = `{ diterima, fisik, rows:{ id:{nama,po,jumlah,ts,by} } }`
`kasLog/{YYYY-MM}/{DD}/{id}` = `{ act, detail, by, ts }`

## Ganti nomor / nama tujuan WhatsApp
Bagian atas `kas.js`: `WA_NAME` dan `WA_NUM` (format 62…, tanpa + dan tanpa 0 di depan).

## Perubahan v22 (tampilan BREAKDOWN Online)
- Kolom "Nama penginput" dihapus; diganti tombol **Cetak BKB Manual** (buka tab baru ke https://web189.github.io/E-Book/index.html#/dms-manual). Riwayat kini mencatat penginput sebagai "Tamu".
- Tata letak dirombak: satu alur (tanggal → kartu ringkasan → form → daftar) yang sama untuk HP, HP mode desktop, tablet, dan PC.
- Ringan untuk Windows 7: tanpa blur, tanpa bayangan besar, animasi minimal.
