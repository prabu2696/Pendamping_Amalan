# 📱 Pendamping Amalan Digital — Android & Web App 🤲

Aplikasi Islami komprehensif berstandar **Rasm Utsmani Kemenag RI (Font LPMQ Isep Misbah)** yang mencakup:
- **Modul Wirid, Tawasul & Doa Rezeki (31 Slide Interaktif)**
- **Jadwal Shalat Akurat Kemenag RI & Alarm Latar Belakang**
- **Kompas Arah Kiblat 3D Interaktif**
- **Tasbih Digital Minimalis dengan Respon Haptik & Audio**
- **Universal Search Amalan & Doa**
- **Pembaruan Otomatis (OTA Server) via Capacitor Updater + Supabase + Firestore**

---

## 🏛️ Arsitektur Proyek: Single Source of Truth (Sistem Tunggal)

Untuk menjaga konsistensi antara pengembangan dengan AI, Web, dan **Android Studio**, proyek ini menggunakan prinsip **Satu Sumber Kebenaran (*Single Source of Truth*)**:

1. **`index.html` (Master Source File di Root)**:
   - Seluruh penambahan fitur, perubahan UI/UX, logic JavaScript, style CSS, dan data amalan **wajib dikerjakan pada file `index.html` di folder root**.
2. **Sinkronisasi Otomatis**:
   - Menjalankan `npm run sync` (atau `npm run push`) akan menyinkronkan kode dari Master Root ke folder distribusi `www/` dan folder native Android `android/app/src/main/assets/public/` secara instan.
3. **Android Studio**:
   - Saat Anda melakukan **Run (▶)** atau **Build APK** di Android Studio, Android Studio akan otomatis membaca aset yang sudah 100% tersinkronisasi.

---

## 📂 Struktur Direktori Proyek

```
Pendamping_Amalan_Digital/
├── index.html                   # 🌟 MASTER SOURCE FILE (Pusat Segala Kode)
├── .env                         # 🔒 Kredensial Rahasia & API Key (Terlindungi di .gitignore)
├── .env.example                 # 📋 Template Variabel Lingkungan
├── assets/                      # 🎨 Aset Media & Font Aplikasi
│   ├── images/                  # Berkas Gambar & Logo
│   │   ├── Logo_Pesantren.png   # Logo Brand Pesantren
│   │   └── islamic_dome_bg.jpg  # Background Header Islami
│   ├── audio/                   # Berkas Audio MP3 Adzan & Tarhim Resmi
│   │   ├── adzan_bayati_fahmi.mp3
│   │   ├── adzan_kurdi_mishary.mp3
│   │   ├── adzan_madinah_qassas.mp3
│   │   ├── adzan_mekkah_zahrani.mp3
│   │   ├── adzan_subuh_bahanan.mp3
│   │   ├── adzan_subuh_kurdi_mishary.mp3
│   │   └── tarhim_hushariy.mp3
│   └── fonts/                   # Font Resmi LPMQ Kemenag RI
│       └── LPMQ-IsepMisbah.ttf
├── scripts/                     # ⚡ Skrip Otomatisasi & Sinkronisasi
│   ├── sync_android.js          # Skrip Sinkronisasi Master Root -> www & Android
│   └── push_ota.js              # Skrip Upload OTA (Membaca Kredensial dari .env)
├── www/                         # Folder Distribusi Web (Auto-Generated)
├── android/                     # Project Native Android Studio (Capacitor)
├── capacitor.config.json        # Konfigurasi Capacitor
└── package.json                 # Dependency & NPM Scripts
```

---

## 🔒 Keamanan & Environment Variables (.env)

Seluruh kunci rahasia (*secret API keys*) untuk Supabase Storage dan Firebase Firestore **tersimpan aman di file `.env` di folder root** dan tidak pernah terekspos ke dalam file client `index.html`:

```ini
# Supabase Storage (OTA ZIP Bucket)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
SUPABASE_BUCKET_NAME=ota-updates

# Firebase / Cloud Firestore (Metadata)
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=...
FIREBASE_PROJECT_ID=...
```

* File `.env` dan file kunci privat sudah terdaftar di `.gitignore` sehingga tidak akan pernah bocor ke git publik.
* File `index.html` bersih 100% dari hardcoded API key privat.

---

## 🛠️ Perintah Utama (NPM Scripts)

| Perintah | Deskripsi |
| :--- | :--- |
| `npm run sync` | **Menyinkronkan** seluruh file master root ke folder `www/` dan folder `android` lalu menjalankan `cap sync`. |
| `npm run push` | **Menaikkan versi build OTA**, memaketkan ZIP update, mengunggah ke Supabase & Firestore menggunakan kredensial `.env`, dan menyinkronkan aset Android. |
| `npm start` | Menjalankan server lokal pratinjau browser pada port lokal. |

---

## 🔄 Pembaruan Tanpa Install Ulang (Server OTA)

Aplikasi telah dilengkapi sistem **Over-The-Air (OTA) Update**:
1. Lakukan pembaruan kode di `index.html`.
2. Jalankan `npm run push`.
3. Buka aplikasi di HP, ketuk tombol **🔄 Update** di Beranda.
4. Aplikasi akan mengunduh paket update baru dan me-reload tanpa perlu install ulang file APK!

---

## 📜 Hak Cipta & Pengembang
© 2026 **Pendamping Amalan Digital** — *Developed by Prabu26.dev*
