# v37 — Tanggal aktif otomatis + offline atomik

1. Tampilan BREAKDOWN Online membuka periode AKTIF = periode paling lama yang belum terkunci.
   Jumat 20 Nov 04.37 -> tampil 19 Nov (terbuka sampai 08.30). Pukul 08.30 -> otomatis pindah ke 20 Nov + pemberitahuan.
   Sabtu 04.00 -> tampil Jumat. Senin 06.00 -> tampil Sabtu & Minggu. Senin 08.30 -> Senin.
   Tombol "Hari ini" = periode aktif. Bila Anda memilih tanggal lain sendiri, tampilan tidak dipindah paksa.
2. Offline: begitu internet kembali, service worker menyegarkan SEMUA file kode sekaligus (atomik) -> simpanan offline selalu satu versi utuh.
   Periodic Background Sync (PWA terpasang di Chrome) menyegarkan simpanan tiap ~12 jam walau aplikasi tidak dibuka.
File berubah: kas.js, sw.js (v37-aktif-offline), index.html
