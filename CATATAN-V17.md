# UangRitase v17 — catatan

## Cara pasang
Timpa semua file di repo GitHub (web189/UangRitase) dengan isi ZIP ini, lalu hapus file CSS lama
(style.css, style-v9..v13.css) — sekarang cukup `style-v17.css`.

## Yang baru
- Tampilan baru "Aurora HUD" (HP & PC), satu CSS saja, tanpa blur berat.
- Mode hemat otomatis (`html.lite`) di Windows 7 / PC lemah: animasi dimatikan.
- Offline: seluruh file + ikon + font + Firebase disimpan di perangkat; data harga terakhir
  disimpan di localStorage dan langsung tampil. Lencana Online/Offline di atas.
- Update otomatis: saat online, file dicek ke server; bila berubah muncul "Versi baru siap"
  (atau muat ulang diam-diam). Tidak perlu hapus cache.
- Tombol pasang (ikon ponsel+panah): kartu hero, app bar (PC), dock bawah (HP).
- Ubah/hapus data admin diblokir dengan pesan jelas saat offline.

## Catatan
- Ubah `BUILD` di sw.js hanya bila ingin memaksa simpanan diganti total.
- `notif-trading.min.js` = promo pihak developer; hapus baris <script>-nya di index.html bila tidak ingin.
- Sumber data/password Firebase tidak diubah.
