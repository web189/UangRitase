# v33 — Kunci otomatis 08.30 + hitung mundur (BREAKDOWN Online)

Aturan kunci (jam server, WIB)
- Senin–Kamis: terkunci besok pukul 08.30 (mis. 18 Nov -> 19 Nov 08.30).
- Jumat: terkunci Sabtu 08.30.
- Sabtu + Minggu (satu periode): terkunci Senin 08.30.
- Terkunci = tambah, edit, hapus, pulihkan, uang diterima & fisik uang semuanya ditutup. Kirim WA / salin teks / rekap tetap bisa.

Buka kunci
- Tombol "Buka kunci (admin)" -> login admin -> pilih lama (15 mnt / 30 mnt / 1 jam / 3 jam) + alasan opsional.
- Terbuka di semua perangkat (disimpan di kasOpen), lalu terkunci lagi otomatis saat waktunya habis. Admin bisa "Kunci lagi" kapan saja.
- Tercatat di tab Riwayat: "Buka kunci" / "Kunci" lengkap nama admin, jam, lama, alasan.

Tampilan
- Kartu hitung mundur: cincin sisa waktu + jam:menit:detik. Hijau -> kuning (<3 jam) -> merah berdenyut (<30 menit). Saat terkunci gembok "menutup". Ungu saat dibuka admin.
- Ringan: 1 pembaruan/detik, berhenti saat tab disembunyikan, hormati "kurangi animasi".

WAJIB: publikasikan ulang firebase-rules-kas.json di Firebase Console -> Realtime Database -> Rules
(menambah node kasOpen dan aksi riwayat 'buka' / 'kunci'). Tanpa itu tombol buka kunci ditolak server.

Catatan keamanan: penguncian dijalankan di aplikasi (jam server). Aturan Firebase tidak bisa menghitung tanggal, jadi orang yang
sengaja memodifikasi aplikasi masih bisa menulis langsung ke database. Untuk penguncian di sisi server perlu Cloud Function / struktur data tanggal angka.

File berubah: kas.js, kas.css, sw.js (v33-kunci), firebase-rules-kas.json
