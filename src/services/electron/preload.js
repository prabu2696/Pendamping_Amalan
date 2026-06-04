// ============================================================
// CIMEGA SMART OFFICE — preload.js (v1.0.0 SECURE)
// sandbox: false di main.js → require() bekerja di preload
//
// ARSITEKTUR:
//   preload.js  → expose CONFIG (plain objects, tidak ada Firebase class)
//                 + IPC wrappers (arrow functions) termasuk getMusicList()
//   renderer    → load Firebase SDK dari CDN (gstatic.com diizinkan)
//
// WHY NOT EXPOSE SDK VIA BRIDGE:
//   contextBridge memakai structured-clone. Firebase SDK functions
//   mengandung Symbol & circular refs → "An object could not be cloned"
// ============================================================
const path = require('path');
const fs   = require('fs');

// ── 0. dotenv sebagai mekanisme PERTAMA (paling cepat) ─────────
try {
  // dotenv tersedia di node_modules (sudah terpasang bersama firebase-admin)
  require('dotenv').config({ path: require('path').join(__dirname, '.env') });
  console.log('✅ PRELOAD v1.0.0: dotenv.config() berhasil');
} catch (_) {
  // dotenv tidak tersedia — fallback ke parsing manual di bawah
  console.warn('⚠️ PRELOAD v1.0.0: dotenv tidak tersedia, pakai parser manual');
}

// ── 1. Baca .env dengan fallback manual (jika dotenv tidak lengkap) ────
let envLoaded = false;
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(process.cwd(), '.env'),
];
for (const ep of envPaths) {
  if (fs.existsSync(ep)) {
    // Baca manual agar tidak bergantung pada dotenv di dist
    const lines = fs.readFileSync(ep, 'utf-8').split(/\r?\n/);
    lines.forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const idx = line.indexOf('=');
      if (idx > 0) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val; // Tidak timpa yang sudah ada
      }
    });
    console.log(`✅ PRELOAD v1.0.0: .env (manual fallback) → ${ep}`);
    envLoaded = true;
    break;
  }
}
if (!envLoaded) {
  console.error('❌ PRELOAD: .env tidak ditemukan! (dicari di:', envPaths.join(', ') + ')');
}

// ── Fallback: coba dotenv jika tersedia (package.json dep) ────────
try {
  require('dotenv').config();
} catch(_) { /* dotenv tidak diinstall, tidak masalah — sudah baca manual */ }

const { contextBridge, ipcRenderer } = require('electron');

// ── 2. Bangun Firebase Config dari process.env ───────────────
const firebaseConfig = {
  apiKey:            process.env.FIREBASE_API_KEY            || '',
  authDomain:        process.env.FIREBASE_AUTH_DOMAIN        || '',
  projectId:         process.env.FIREBASE_PROJECT_ID         || '',
  storageBucket:     process.env.FIREBASE_STORAGE_BUCKET     || '',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId:             process.env.FIREBASE_APP_ID             || '',
  measurementId:     process.env.FIREBASE_MEASUREMENT_ID     || '',
};

if (!firebaseConfig.apiKey) {
  console.error('❌ PRELOAD FATAL: FIREBASE_API_KEY kosong! Cek .env');
} else {
  console.log(`✅ PRELOAD v1.0.0: Config OK → [${firebaseConfig.projectId}]`);
}

// ── 3. Expose window.cimegaConfig ────────────────────────────
// HANYA plain objects & arrow function wrappers — NO Firebase classes
try {
  contextBridge.exposeInMainWorld('cimegaConfig', {
    // Static config objects (serializable)
    firebase: Object.freeze({ ...firebaseConfig }),
    supabase: Object.freeze({
      url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
    }),
    // SECURITY FIX v1.0.0: gemini.key DIHAPUS dari bridge publik.
    // Raw API key tidak boleh diakses dari renderer — gunakan IPC geminiAsk() saja.
    // gemini: Object.freeze({ key: ... }), ← DIHAPUS

    // IPC wrappers
    // onSyncComplete: menggunakan once untuk menghindari listener duplikat
    onSyncComplete: (cb) => {
      ipcRenderer.once('sync-complete', (_e, s) => cb(s));
    },
    getBootStatus:       ()   => ipcRenderer.invoke('get-boot-status'),
    openExternal:        (u)  => ipcRenderer.invoke('open-external', u),

    // ── GEMINI AI (CimegaAI.ask → ai_helper.js) ─────────────────
    geminiAsk: (payload) => ipcRenderer.invoke('gemini-ask', payload),

    // Musik via IPC
    musicInit:           ()   => ipcRenderer.invoke('music-init'),
    musicGetState:       ()   => ipcRenderer.invoke('music-get-state'),
    musicNext:           ()   => ipcRenderer.invoke('music-next'),
    musicPrev:           ()   => ipcRenderer.invoke('music-prev'),
    musicToggleMute:     ()   => ipcRenderer.invoke('music-toggle-mute'),
    onMusicStateChanged: (cb) => ipcRenderer.on('music-state-changed', (_e, d) => cb(d)),
    onMusicFrequencyChanged: (cb) => ipcRenderer.on('music-frequency', (_e, d) => cb(d)),

    // Daftar file musik lokal dari folder assets_music (via IPC)
    getMusicList:        ()            => ipcRenderer.invoke('get-music-list'),
    // ── SIMPAN / HAPUS / BACA LOKAL (Upload Musik tanpa cloud) ──
    musicSaveLocal:      (p)           => ipcRenderer.invoke('music-save-local', p),
    musicDeleteLocal:    (p)           => ipcRenderer.invoke('music-delete-local', p),
    musicReadFile:       (p)           => ipcRenderer.invoke('music-read-file', p),

    // ── AUTO UPDATER (updater.js) ────────────────────────────────
    checkGithubUpdate:      (opts) => ipcRenderer.invoke('check-github-update', opts),
    downloadUpdate:         (opts) => ipcRenderer.invoke('download-update', opts),
    installUpdate:          (opts) => ipcRenderer.invoke('install-update', opts),
    onDownloadProgress:     (cb)   => ipcRenderer.on('update-download-progress', (_e, d) => cb(d)),
    removeDownloadListener: ()     => ipcRenderer.removeAllListeners('update-download-progress'),

    // ── SYSTEM: Dynamic Resource Discovery (Autoloader) ─────────
    listFiles: (p, rec = false) => ipcRenderer.invoke('system:list-files', { subPath: p, recursive: rec }),
    readFile:  (p)              => ipcRenderer.invoke('system:read-file', { subPath: p }),

    // ── SECURITY: In-Memory Session Key (school_key tidak di localStorage) ──
    setSessionKey:   (key) => ipcRenderer.invoke('session-set-key', key),
    getSessionKey:   ()    => ipcRenderer.invoke('session-get-key'),
    clearSessionKey: ()    => ipcRenderer.invoke('session-clear-key'),

    // ── VOICE & LOGGING (Pusat Kendali) ──────────────────────────
    ttsGenerate: (payload) => ipcRenderer.invoke('tts-generate', payload),
    logToTerminal: (msg, type = 'INFO') => ipcRenderer.invoke('system:log', { msg, type }),

    // ── ★ BARU v2.0: Document Generation (Aman via Main Process) ──
    // Menggantikan document_service.js yang pakai require() di renderer
    generatePDF:     (htmlContent, fileName, options = {}) => ipcRenderer.invoke('doc:generate-pdf', { htmlContent, fileName, ...options }),
    saveHTML:        (htmlContent, fileName) => ipcRenderer.invoke('doc:save-html', { htmlContent, fileName }),
    openFile:        (filePath)             => ipcRenderer.invoke('doc:open-file', filePath),
    openOutputDir:   ()                     => ipcRenderer.invoke('doc:open-output-dir'),
    listOutputDocs:  ()                     => ipcRenderer.invoke('doc:list-output'),
    openCallWindow:  (opts)                 => ipcRenderer.invoke('call:open-window', opts),
    getScreenSources: ()                    => ipcRenderer.invoke('screen:get-sources'),
  });
  console.log('✅ PRELOAD v1.0.0 SECURE: window.cimegaConfig exposed');
} catch (e) {
  console.error('❌ PRELOAD: window.cimegaConfig GAGAL expose:', e.message);
}

// ── 4. Legacy: window.cimegaAPI (backward compat) ───────────
// @deprecated v1.0.0 — Gunakan window.cimegaConfig sebagai primary bridge.
// cimegaAPI dipertahankan hanya untuk file lama yang belum dimigrasi.
// Semua shared scripts (music.js, updater.js, ai_helper.js) sudah
// menggunakan pola: const _api = window.cimegaConfig || window.cimegaAPI;
// Hapus blok ini SETELAH semua renderer diverifikasi pakai cimegaConfig.
try {
  contextBridge.exposeInMainWorld('cimegaAPI', {
    getFirebaseConfig: () => Promise.resolve({ ...firebaseConfig }),
    getSupabaseConfig: () => Promise.resolve({
      url: process.env.SUPABASE_URL      || '',
      key: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '',
    }),
    getAppConfig:      () => Promise.resolve({
      appVersion: process.env.APP_VERSION || '1.0.0',
    }),
    openExternal:      (u) => ipcRenderer.invoke('open-external', u),
    getMusicList:      ()  => ipcRenderer.invoke('get-music-list'),
    // ── SIMPAN / HAPUS / BACA LOKAL ──────────────────────────────
    musicSaveLocal:    (p) => ipcRenderer.invoke('music-save-local', p),
    musicDeleteLocal:  (p) => ipcRenderer.invoke('music-delete-local', p),
    musicReadFile:     (p) => ipcRenderer.invoke('music-read-file', p),

    // ── GEMINI AI (dipakai oleh ai_helper.js → CimegaAI.ask) ────
    geminiAsk: (payload) => ipcRenderer.invoke('gemini-ask', payload),

    // Musik wrapper (backward compat dengan music.js v1.0.0)
    musicInit:           ()   => ipcRenderer.invoke('music-init'),
    musicNext:           ()   => ipcRenderer.invoke('music-next'),
    musicPrev:           ()   => ipcRenderer.invoke('music-prev'),
    musicToggleMute:     ()   => ipcRenderer.invoke('music-toggle-mute'),
    onMusicStateChanged: (cb) => ipcRenderer.on('music-state-changed', (_e, d) => cb(d)),
    onMusicFrequencyChanged: (cb) => ipcRenderer.on('music-frequency', (_e, d) => cb(d)),

    // ── AUTO UPDATER (dipakai oleh updater.js) ───────────────────
    checkGithubUpdate:      (opts) => ipcRenderer.invoke('check-github-update', opts),
    downloadUpdate:         (opts) => ipcRenderer.invoke('download-update', opts),
    installUpdate:          (opts) => ipcRenderer.invoke('install-update', opts),
    onDownloadProgress:     (cb)   => ipcRenderer.on('update-download-progress', (_e, d) => cb(d)),
    removeDownloadListener: ()     => ipcRenderer.removeAllListeners('update-download-progress'),

    // ── SECURITY: In-Memory Session Key ────────────────────────────
    setSessionKey:   (key) => ipcRenderer.invoke('session-set-key', key),
    getSessionKey:   ()    => ipcRenderer.invoke('session-get-key'),
    clearSessionKey: ()    => ipcRenderer.invoke('session-clear-key'),
    openCallWindow:  (opts) => ipcRenderer.invoke('call:open-window', opts),
    getScreenSources: ()    => ipcRenderer.invoke('screen:get-sources'),
  });
  console.log('✅ PRELOAD v1.0.0 SECURE: window.cimegaAPI exposed');
} catch (e) {
  console.error('❌ PRELOAD: window.cimegaAPI GAGAL expose:', e.message);
}

console.log('✅ PRELOAD SECURE: Bridge siap — Firebase CDN, Gemini AI, Auto-Updater, Session Key Store aktif.');

// ═══════════════════════════════════════════════════════════
// RENDERER ERROR BRIDGE — Kirim semua error ke terminal Main
// ═══════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {

  // 1. Tangkap window.onerror (JS runtime errors)
  window.addEventListener('error', (event) => {
    ipcRenderer.send('renderer:error', {
      message: event.message || String(event.error),
      source:  event.filename  || '',
      line:    event.lineno    || 0,
      col:     event.colno     || 0,
      stack:   event.error?.stack || '',
    });
  });

  // 2. Tangkap Promise rejections yang tidak di-handle
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    ipcRenderer.send('renderer:unhandled-rejection', {
      reason: reason?.message || String(reason),
      stack:  reason?.stack   || '',
    });
  });

  // 3. Intercept console.error & console.warn dari renderer → terminal
  const _origError = console.error.bind(console);
  const _origWarn  = console.warn.bind(console);

  console.error = (...args) => {
    _origError(...args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    ipcRenderer.send('renderer:error', { message: msg, source: 'console.error', line: 0, col: 0, stack: '' });
  };

  console.warn = (...args) => {
    _origWarn(...args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    ipcRenderer.send('renderer:warn', msg);
  };

  // 4. Performance mode injection
  if (process.argv.includes('--entry-level')) {
    document.body.classList.add('entry-level-mode');
  }
});
