# UangRitase v18 — Sistem Offline & Auto-Update

## Cara pasang
Timpa semua file di repo dengan isi ZIP ini. Yang berubah: `sw.js`, `pwa.js`, `style-v17.css` (tambahan di akhir).
Tidak perlu hapus cache — versi lama dibersihkan otomatis.

## Yang baru
1. **Update atomik** — semua file inti diunduh & dibandingkan dulu, baru diganti SEKALIGUS.
   Tidak ada lagi campuran file lama + baru. Sinyal putus di tengah jalan → simpanan lama tetap utuh.
2. **Daftar file otomatis** — file lokal yang dipanggil `index.html` (js/css/gambar) ikut disimpan & dipantau.
   Menambah file baru di index.html tidak perlu edit `PRECACHE` lagi.
3. **Self-heal** — file yang gagal tersimpan dicoba lagi otomatis. "Siap offline" hanya tampil bila SEMUA file ada.
4. **Saat internet kembali** — Background Sync memeriksa pembaruan walau tab/aplikasi sudah ditutup
   (Chrome/Edge). Periodic Sync memeriksa tiap ±12 jam (aplikasi terpasang). Cadangan: event `online`,
   tab aktif kembali, dan tiap 20 menit.
5. **Tanpa update palsu** — ETag sama → lewati; ETag beda → isi dicocokkan (SHA-1).
6. **Penyimpanan permanen** — meminta `navigator.storage.persist()` agar browser tidak menghapus data offline.
7. **Panel di footer** — "Siap offline · 16 file (895 KB) · dicek 11.10" + tombol *Periksa pembaruan*
   dan *Perbaiki offline* (simpan ulang semua dari nol).

## Cara merilis versi baru
- Edit file seperti biasa lalu upload. Pengguna online akan otomatis menerima (muat ulang diam-diam
  saat aman, atau banner "Versi baru siap").
- Ubah `BUILD` di `sw.js` bila ingin memaksa pemasangan ulang total (mis. mengganti nama file atau daftar `PRECACHE`).

## Batasan
- Background/Periodic Sync hanya ada di Chrome/Edge (tidak di Safari/iOS & Firefox); di sana update tetap
  berjalan saat aplikasi dibuka.
- Data harga: salinan terakhir dari Firebase (localStorage). Login admin & ubah data butuh internet.
- Windows 7 (Chrome/Edge 109): tetap didukung (kode ES5).
