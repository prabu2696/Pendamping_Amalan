# 📱 Pendamping Amalan Digital — Amalan Rezeki & Munajat Hajat 🤲

**Pendamping Amalan Digital** adalah aplikasi web & tasbih digital interaktif yang dirancang khusus untuk mendampingi ibadah harian, pembacaan tawasul silsilah, perisai diri, dan zikir menderaskan rezeki secara khusyuk, rapi, dan teratur.

Aplikasi ini dikembangkan oleh **Prabu26.dev** dengan standar penulisan **Rasm Utsmani Kemenag RI** menggunakan font resmi **LPMQ Isep Misbah**.

---

## 🚀 Fitur Utama

### 1. **Teks Utsmani Standar Kemenag RI (Font LPMQ Isep Misbah)**
- Menggunakan berkas font resmi `LPMQ-IsepMisbah.ttf` dari Kementerian Agama Republik Indonesia.
- Dilengkapi dengan tanda tajwid khas Mushaf Standar Indonesia seperti **Mim Iqlab (`ۢ`)**, **Badal Kasrah (`ـٖ`)**, dan penulisan harakat yang tajam dan nyaman dibaca.

### 2. **Jeda Nafas Tanda Baca (*Waqaf / Breathed Pauses*)**
- Seluruh bacaan (Istighfar, Syahadat, Shalawat, Ayat Kursi, Āmanar Rasūl, Shalawat Nariyah, Shalawat Ibrahimiyah, Tawasul 1-11, hingga Doa Rezeki) dilengkapi **koma Arab (`،`)** dan **koma Latin (`,`)** pada setiap klausa frasa.
- Pembaca dapat mengambil nafas dengan tenang dan teratur tanpa merasa dipaksa membaca kalimat panjang sekaligus.
- Tanda bintang (`✦`) digunakan secara khusus sebagai penutup ayat Al-Qur'an atau bait doa utama.

### 3. **Tasbih Digital Presisi dengan Respon Haptik**
- Penghitung tasbih otomatis dengan target bacaan dinamis (11×, 7×, 313×, 113×, dll.).
- Dilengkapi efek getar (*vibration*) dan *ripple animation* per ketukan.
- **Tata Letak Navigasi Terkunci**: Tombol `< Prev` dan `Next >` tetap stabil di pinggir kanan-kiri layar, sementara counter tasbih digital berada tepat di tengah secara simetris.

### 4. **Struktur 31 Slide Amalan Lengkap**

- **I. Adab & Persiapan**: Panduan Shalat Taubat, Shalat Tahajud & Witir, Shalat Dhuha, serta Sayyidul Istighfar.
- **II. Muqaddimah**: Pembersihan Diri (Istighfar 3x, Syahadat 3x, Shalawat 3x, Tahlil 3x, Takbir 3x).
- **III. Benteng Diri & Keberkahan**:
  - Surah Al-Fatihah, Al-Ikhlas, Al-Falaq, An-Nas, Al-Qadr.
  - Ayat Kursi (QS. Al-Baqarah: 163 & 255).
  - Āmanar Rasūl (QS. Al-Baqarah: 284–286).
  - Dzikir Penutup Pagar.
  - Dalil Al-Ahzab 56 & Shalawat Nariyah (dengan transliterasi wasal `muhammadil-ladzii`).
  - Shalawat Ibrahimiyah.
- **IV. Tawasul Lengkap (11 Silsilah)**:
  1. Rasulullah SAW, Keluarga, Istri, Keturunan, & Ahli Bait.
  2. Sahabat Khulafaur Rasyidin (Abu Bakar, Umar, Utsman, Ali RA).
  3. Tabi'in, Tabi'ut Tabi'in, & Imam Madzhab (Rahimahumullahu Ta'ala).
  4. Para Malaikat Muqarrabin & Karubiyyin (Jibril, Mikail, Israfil, Izrail).
  5. Para Nabi & Rasul (Nabi Khidir, Ilyas, Idris, Sulaiman, Daud, Ibrahim, Musa, Isa AS).
  6. Sultanul Auliya Syekh Abdul Qadir Al-Jilani (dengan susunan ijazah silsilah lengkap).
  7. Penyusun Kitab Hikmah (Imam Ahmad bin Ali Al-Buni & Ahmad Dairabi Al-Kabir).
  8. Wali Songo Nusantara (`قَدَّسَ اللّٰهُ أَسْرَارَهُمْ`).
  9. Muassis Nahdlatul Ulama (Hadhratus Syaikh KH Hasyim Asy'ari).
  10. Orang Tua, Kakek-Nenek, & Para Guru.
  11. Pemberi Ijazah Amalan (Ust. Rais Fajar Shiddiq & Aang Haji Lili Cibitik).
- **V. Inti Amalan**:
  - Sholawat Adrikni (11×)
  - Sholawat Ismul A'dhom (7×)
  - Zikir Kelimpahan Rezeki: *Yaa Ghaniyyu Yaa Mughnii* (313×)
  - Zikir Pembuka Jalan: *Yaa Fattaahu Yaa Razzaaq* (113×)
  - Doa Gabungan Utama Rezeki (1×)
- **VI. Munajat Penutup**: Munajat Hajat Pribadi.

---

## 📂 Berkas Proyek

```
Pendamping_Amalan_Digital/
├── index.html                 # Aplikasi Web Standalone 31 Slide + Tasbih Digital
├── Logo_Pesantren.png         # Logo resmi instansi
├── public/
│   └── fonts/
│       └── LPMQ-IsepMisbah.ttf # Font Resmi Kemenag RI
├── package.json               # Konfigurasi npm & metadata proyek
├── .gitignore                 # Konfigurasi file terabaikan git
└── README.md                  # Dokumentasi resmi proyek
```

---

## 💻 Cara Menjalankan

Aplikasi ini berbasis **Single Page Web Application (SPA)** murni tanpa dependensi compiler yang rumit:

1. Cukup buka berkas `index.html` langsung di browser laptop/HP Anda.
2. Atau jalankan server lokal sederhana:
   ```bash
   npx serve .
   ```

---

## 📜 Hak Cipta & Pengembang

© 2026 **Pendamping Amalan Digital**  
*Developed by Prabu26.dev*
