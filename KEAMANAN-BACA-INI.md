# Catatan Keamanan — UangRitase

## 1. Sudah diperbaiki di paket ini
- **Hint password admin dihapus** dari `index.html` (dulu ada teks
  "Demo: admin@uangritase.com / Admin@2026" yang terlihat siapa saja lewat
  "View Source"). Kalau `Admin@2026` masih password asli yang dipakai,
  **segera ganti passwordnya di Firebase Console → Authentication → Users.**
- **Penguncian percobaan login** ditambahkan di `app.js`: setelah 5 kali
  salah, form login admin dikunci 30 detik. Ini lapisan tambahan saja —
  Firebase Auth sendiri sudah otomatis membatasi percobaan brute-force
  di sisi server (`auth/too-many-requests`).

## 2. Soal Security Rules Firebase (`ritase`, `dms`, `history`)
Rules yang kamu kirim **sudah benar dan aman**:
- `ritase` & `dms`: siapa saja boleh **baca** (read `true`) — memang perlu,
  karena ini web harga publik. **Tulis** dikunci hanya untuk email admin.
- `history`: baca & tulis sama-sama dikunci untuk yang sudah login.

Jadi rules bukan sumber masalah. Email peringatan "Security Rules
mengizinkan siapa saja baca/tulis" yang kamu terima itu **untuk project
Firebase lain** (`uang-ritase-aqua`), bukan project `uangritase` yang
dipakai website ini — beda nama project, beda database. Kemungkinan besar
itu project percobaan lama dengan rules default yang tidak pernah dipakai;
aman dibiarkan Google nonaktifkan otomatis kalau memang tidak dipakai lagi.

## 3. Opsional — perkuat rules jadi berbasis UID
File `firebase-rules-recommended-uid.json` di paket ini adalah versi yang
lebih kuat: mengganti pengecekan `auth.token.email == '...'` menjadi
`auth.uid == '...'`. Alasannya: kalau suatu saat akun email itu dihapus lalu
ada orang lain mendaftar ulang dengan email yang sama, versi email-based
otomatis memberi dia akses admin. Versi UID tidak bisa begitu karena UID
unik permanen per akun, tidak bisa dipakai ulang.

**Cara pakai:**
1. Buka Firebase Console → Authentication → Users.
2. Klik user `admin@uangritase.com`, salin nilai **User UID**-nya.
3. Buka file `firebase-rules-recommended-uid.json`, ganti semua tulisan
   `GANTI_DENGAN_UID_ADMIN` dengan UID tadi.
4. Paste isinya ke Firebase Console → Realtime Database → Rules → Publish.

Tidak wajib — rules yang sekarang (email-based) sudah cukup aman untuk
kondisi normal. Ini cuma lapisan ekstra kalau mau lebih ketat.

## 4. Yang normal & tidak perlu dikhawatirkan
`apiKey` Firebase yang terlihat di `app.js` (`AIzaSyDth7...`) **bukan
rahasia** — itu memang didesain untuk terlihat publik di aplikasi client-side
Firebase manapun. Keamanan sebenarnya ada di Security Rules + Authentication,
bukan di menyembunyikan apiKey ini.
