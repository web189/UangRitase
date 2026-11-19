# v35 — Offline & update otomatis diperkuat + password admin tidak lagi tampil

Hasil uji (browser sungguhan, service worker aktif)
- Kunjungan pertama online -> 22 file tersimpan -> tutup internet -> buka / refresh / #kas / ?query: semua terbuka, kas & kartu kunci tampil, tanpa error.
- File diubah di server saat online -> halaman berikutnya langsung memakai versi baru (jaringan dulu, maks. 3,5 dtk, lalu simpanan).
- Dibuka saat OFFLINE lalu internet kembali -> pembaruan terdeteksi otomatis dan halaman dimuat ulang (aman: tidak memuat ulang saat kas sedang dikirim / diedit).

Perbaikan
1. index.html: daftar file yang dipantau (kas.js, kas.css, sw.js ...) dulu tertimpa ur.js -> sekarang digabung ulang, plus penjaga "kas sedang dikirim/diedit".
2. ur.js: "sidik" versi disimpan permanen (localStorage pwa_sig). Dulu bila halaman dibuka offline, pengecekan online pertama hanya mencatat baseline sehingga pembaruan tidak terdeteksi.
3. sw.js (v35-offline): ikon 512 + maskable ikut disimpan untuk offline.
4. Toast sekali: "Siap dipakai offline" saat simpanan selesai.
5. KEAMANAN: layar Login Admin menampilkan email + password admin ke publik -> teks dihapus. GANTI PASSWORD ADMIN di Firebase Console -> Authentication -> Users (password lama sudah terlanjur terlihat orang).

File berubah: index.html, ur.js, sw.js
