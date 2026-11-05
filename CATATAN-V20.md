# UangRitase v20 — hitungan mundur sesi admin 30 detik
- Sesi admin sekarang 30 detik (sebelumnya 5 menit). Berubah: app.js, app.css, index.html, sw.js.
- Timer dihitung dari waktu nyata (bukan hitung -1 per detik), jadi tidak macet/lambat saat browser menahan timer.
- Tampilan: dial HUD (30 tick, arc neon, titik penunjuk), angka detik besar, bacaan 00:SS.d, bar sisa waktu.
- Warna: biru (normal) -> kuning (<=15 dtk) -> merah berdenyut (<=8 dtk).
- Saat jendela Edit/Hapus terbuka timer berhenti dan dial menampilkan "JEDA". Setiap simpan data, timer kembali ke 30 detik.
- Mode lite (PC lemah): animasi dekoratif otomatis mati.
- Mengubah durasi: ganti angka `URS=30` di app.js.
