# v32 — Akhir pekan (Sabtu + Minggu) digabung
Tampilan BREAKDOWN Online: Sabtu & Minggu dijadikan SATU periode, judul "14 & 15 November 2026".
Senin–Jumat tetap harian. Data di Firebase TIDAK diubah / dipindah (tetap per tanggal); hanya tampilan & hitungan yang digabung.

Aturan gabungan
- Baris: semua baris Sabtu + Minggu, urut jam input. Baris BARU disimpan di tanggal Sabtu. Edit/hapus baris lama tetap ke tanggal asalnya.
- Uang diterima: angka Sabtu (angka Minggu dianggap sisa lanjutan, tidak dijumlah). Sabtu kosong -> pakai Minggu.
- Fisik uang: angka Minggu (hitungan terakhir); kosong -> Sabtu.
- Total diserahkan, Sisa, Selisih: dihitung otomatis dari gabungan.
- Tombol panah: Jumat -> (Sabtu & Minggu) -> Senin. Memilih tanggal Minggu di kalender juga membuka periode gabungan.
- Rekap bulan: Sabtu+Minggu = 1 baris ("14–15", Sab–Min). Bila melewati pergantian bulan (mis. 31 Okt & 1 Nov) dihitung di bulan Sabtunya.
- Riwayat: gabungan riwayat Sabtu + Minggu.
- Gambar WhatsApp: judul "14 & 15 Nopember 2026", nama file Kas-Ritase-2026-11-14_15.png/jpg. Salin teks ikut judul gabungan.
- Aturan Firebase TIDAK perlu diubah.
File berubah: kas.js, kas.css, sw.js (VERSION v32-akhirpekan agar HP memperbarui otomatis)
