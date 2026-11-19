# v34 — Libur nasional digabung + buka kunci 3 menit

- Libur nasional di hari kerja digabung dengan HARI SEBELUMNYA, satu periode, satu rekap, satu kunci.
  Contoh 2026: Kamis 24 + Jumat 25 Des (Natal) -> "24 & 25 Desember 2026", terkunci Sabtu 26 Des 08.30.
  Senin libur -> Sabtu + Minggu + Senin, terkunci Selasa 08.30. Sabtu+Minggu tetap terkunci Senin 08.30.
- Daftar libur NASIONAL 2026 & 2027 sudah bawaan (tanpa cuti bersama). Tambah / batalkan tanggal lewat Firebase:
  Realtime Database -> Data -> node "libur" -> tambah anak  "2026-12-31": "Libur"  (nilai false = batalkan libur bawaan).
- Buka kunci = 3 menit, lalu terkunci otomatis. Tombol "Kunci lagi" bisa ditekan siapa saja saat sedang terbuka.
- Rekap bulan, riwayat, gambar WhatsApp, salin teks ikut judul gabungan (mis. "24 & 25 Desember 2026").
- Aturan Firebase: salin ISI firebase-rules-kas.json utuh -> Rules -> Publish.
File berubah: kas.js, kas.css, sw.js, firebase-rules-kas.json
