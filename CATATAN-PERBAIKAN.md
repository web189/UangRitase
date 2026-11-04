# Catatan perbaikan (PWA Windows 7 + versi ringan)

## Cara pasang di GitHub
1. Hapus isi lama repo, lalu upload SEMUA isi folder ini (termasuk `sw.js`, `manifest.json`, folder `vendor/` dan `fonts/`).
2. Tunggu GitHub Pages selesai (1-2 menit), buka situsnya sekali saat online.

## Di setiap PC (WAJIB sekali, karena ID aplikasi berubah)
1. Buka `chrome://apps`, klik kanan aplikasi lama, Hapus. Hapus juga shortcut desktop lama (termasuk yang berakhiran "(1)").
2. Buka situsnya di Chrome, klik tombol "Pasang/Instal Aplikasi" (atau ikon instal di kolom alamat).
3. Windows 7 butuh Chrome/Edge versi 109 (terakhir yang mendukung Win 7).

## Update otomatis
Setiap file diperiksa saat aplikasi dibuka; bila ada versi baru, halaman memuat ulang sendiri.
Jika mengedit file langsung di GitHub, tidak perlu mengubah apa pun di sw.js.

## Mode ringan Jadwal Admin
Otomatis di Windows XP-8 / PC spek rendah. Paksa: tambahkan ?lite=1 di alamat, matikan: ?lite=0.
