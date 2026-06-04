# Cimega Smart Office 🏛️💻

**Cimega Smart Office** adalah platform administrasi sekolah terintegrasi kelas enterprise yang dirancang khusus untuk mendukung implementasi **Kurikulum Merdeka (Tahun Ajaran 2026/2027)**. 

Dibangun dengan wrapper desktop **Electron** dan arsitektur modular yang responsif, aplikasi ini menggabungkan pengelolaan dokumen administrasi sekolah, kecerdasan buatan (AI) terisolasi, serta sistem komunikasi terenkripsi langsung (audio, video, chat, dan screen sharing) ala WhatsApp di dalam satu aplikasi terpadu.

---

## 🚀 Fitur Utama & Kegunaan

### 1. Sistem Komunikasi & Panggilan Terenkripsi (WhatsApp-like)
Aplikasi ini dilengkapi dengan modul komunikasi real-time berbasis WebRTC untuk menghilangkan ketergantungan pada aplikasi pihak ketiga (seperti WhatsApp Web) yang membebani memori laptop.
- **Panggilan Suara & Video P2P**: Jaringan panggilan mesh WebRTC langsung antar-perangkat laptop dengan enkripsi standar industri (**DTLS-SRTP**).
- **Maksimal 32 User**: Mendukung panggilan grup instansi dan forum kepala sekolah secara bersamaan.
- **Screen Sharing (Berbagi Layar)**: Fitur membagikan tampilan layar atau jendela aktif saat video call berlangsung untuk asistensi visual antar-staf. Dilengkapi dialog pemilih layar modern beserta screenshot preview.
- **Pesan Pribadi (1-on-1)**: Seluruh staf kini dapat melakukan obrolan teks dan panggilan pribadi yang diisolasi ketat.
- **Komunikasi Lintas Instansi Khusus Kepsek**: Kepala sekolah dapat berkolaborasi lintas sekolah via Forum Kepsek maupun panggilan privat, sedangkan staf biasa dibatasi hanya di dalam sekolah mereka.
- **Nada Dering Pintar (Web Audio API)**: Menghasilkan nada dering keluar/masuk secara dinamis tanpa aset file MP3 eksternal, bebas dari pemblokiran autoplay browser.
- **Indikator Panggilan Aktif**: Tombol call otomatis menyala hijau pulsing ketika ada panggilan grup yang sedang berjalan, memungkinkan pengguna lain langsung bergabung (*join*).

### 2. Otomasi Administrasi Sekolah (35+ Modul)
Sistem administrasi terintegrasi yang terbagi berdasarkan peran pengguna (*role-based*):
- **Modul Guru**: Absensi Siswa Harian, Jurnal Mengajar Harian, Penyusun Modul Ajar (KMDL), Pembuat Soal Ujian (HOTS/MOTS/LOTS), Capaian Pembelajaran (CP/TP/ATP).
- **Modul Kepala Sekolah**: Evaluasi Diri Sekolah (EDS), Rencana Kegiatan & Anggaran Sekolah (RKAS), Rapor Pendidikan Digital, Pelayanan Surat Keluar.
- **Modul Tata Usaha**: Buku Agenda Surat Keluar/Masuk, Pengelolaan Arsip Dinamis, Inventaris Barang Sekolah.
- **Modul Bendahara**: Buku Kas Umum (BKU), RKAS Keuangan, Laporan Realisasi Anggaran (LRA).
- **Modul Operator**: Pengelolaan Data Dapodik, Sarana Prasarana (Sarpras).
- **Layout Cetak Dinamis**: Konfigurasi otomatis portrait/landscape PDF untuk tabel data lebar (Excel) vs naskah formal (Word) agar dokumen siap cetak tanpa pengeditan manual.

### 3. Asisten AI Terintegrasi & Sandboxed (Gemini 3.5 Flash)
- **Generasi Dokumen Via Obrolan**: Pengguna tingkat lanjut cukup memasukkan perintah prompt alami. AI akan otomatis membuatkan draf dokumen.
- **Tombol Cetak Instan**: Jika obrolan AI mendeteksi tabel atau naskah terstruktur, tombol pratinjau cetak akan muncul di gelembung obrolan, mengarahkan pengguna ke *split-screen editor* A4 untuk ekspor ke Word, Excel, atau PDF.
- **Filter Pre-Cleaning Klien**: Menyaring kata-kata sampah, perintah jailbreak, dan kueri non-sekolah sebelum dikirim ke API Gemini untuk **menghemat 100% biaya token** yang tidak perlu.

### 4. Sistem Keamanan & Proteksi Kode (Enterprise Hardening)
- **Komparibilitas Multi-Tenant**: Data obrolan dan dokumen diisolasi ketat berdasarkan kode sekolah (`school_id`).
- **Eliminasi Kredensial Kritis**: Seluruh kunci server admin (`serviceAccountKey.json`) dan pustaka `firebase-admin` telah dihapus dari kode klien. Semua operasi database menggunakan Firebase Client Web SDK yang diotentikasi melalui Firebase Auth dan dibatasi oleh Firestore Security Rules.
- **Kompilasi Biner V8 (Bytenode)**: Berkas backend utama (`main.js` dan `preload.js`) dikompilasi menjadi bytecode biner (`main.jsc` dan `preload.jsc`) untuk mencegah dekompresi biner (`asar extract`) dan rekayasa balik.
- **Obfuscation Frontend**: Kode frontend diacak menggunakan enkripsi heksadesimal dengan proteksi anti-debugging dan anti-beautify aktif.

### 5. Adaptive Performance Optimizer
- **Smart Auto-Scaling**: Mendeteksi spesifikasi hardware laptop. Jika dijalankan pada perangkat berspesifikasi rendah (*entry-level*), aplikasi otomatis menyederhanakan grafis, mematikan visualizer berat, dan membatasi resolusi video call demi kelancaran performa laptop.
- **BGM Player**: Pemutar musik latar belakang (BGM) lokal berbasis folder `assets_music` dengan shuffle queue cerdas.

---

## 🛠️ Teknologi yang Digunakan

1. **Frontend**: Vanilla HTML5, CSS3 (Premium Cyber-Glass & Cyberpunk Theme), dan Vanilla JavaScript.
2. **Desktop Wrapper**: Electron Framework (Isolasi konteks aman, komunikasi IPC, sandboxing).
3. **Database & Auth**: Firebase Firestore (Web SDK v10) & Firebase Authentication.
4. **Penyimpanan Aset**: Supabase Storage (cimega-cloud bucket).
5. **Real-time P2P Media**: WebRTC Mesh Topology (STUN Servers, SDP handshakes via Firestore).
6. **Penguat Suara**: Web Audio API (Synthesized Ringtones) & SpeechSynthesis TTS.
7. **Keamanan Build**: Bytenode (V8 Compiler) & JavaScript Obfuscator.

---

## 📂 Struktur Direktori Proyek
*(Silakan merujuk ke file `daftar_struktur.txt` di root folder untuk peta folder secara terperinci)*

- `src/assets/`: Berkas aset statis (gambar logo sekolah, musik default).
- `src/features/`: Modul core logic dan UI berdasarkan peran (absensi, rapor, surat, dll.).
- `src/pages/`: Halaman HTML renderer (login, dashboard, chat, call window).
- `src/services/`: Berkas layanan (koneksi Firebase/Supabase, Electron IPC preload/main, chatbot AI).
- `src/utils/`: Utilitas build, pengaman bytecode, dan pengoptimal performa.

---

## 💻 Cara Menjalankan & Membangun Aplikasi

### Prasyarat
- Node.js (versi terbaru direkomendasikan, minimal v18)
- NPM

### 1. Instalasi Dependensi
Jalankan perintah berikut di terminal direktori proyek:
```bash
npm install
```

### 2. Mengisi Konfigurasi Lingkungan
Buat file bernama `.env` di root folder proyek dan isi kredensial berikut:
```env
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
FIREBASE_MESSAGING_SENDER_ID=your_firebase_sender_id
FIREBASE_APP_ID=your_firebase_app_id
FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### 3. Menjalankan Aplikasi dalam Mode Pengembangan (Dev)
Untuk memicu Electron dan menjalankan asisten virtual lokal:
```bash
npm start
```

### 4. Membangun Installer Produksi yang Aman (Windows)
Untuk mengompilasi javascript backend menjadi biner `.jsc` anti-decompile, mengacak kode frontend, dan membungkus aplikasi menjadi berkas installer `.exe`:
```bash
npm run build:win
```
Hasil biner terenkripsi dan installer resmi akan tersimpan di dalam folder `dist/`.

---

## 🔒 Lisensi & Keamanan
Aplikasi ini dikembangkan untuk kebutuhan internal pengelolaan sekolah SDN Cimega dan instansi terafiliasi. Dilarang mendistribusikan ulang atau mengekstrak kode sumber aplikasi tanpa izin tertulis dari tim pengembang Cimega Smart Office.
