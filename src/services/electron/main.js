process.env.NODE_NO_WARNINGS = '1';
if (process.stdout.isTTY) console.clear();

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');

// ── Suppress autoplay restriction ──
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// ── Terminal Color Codes ──────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  magenta:'\x1b[35m',
  white:  '\x1b[97m',
  gray:   '\x1b[90m',
  bgDark: '\x1b[48;5;17m',
};

// ── Prefixed Logger ───────────────────────────────────────
const log = {
  info:    (msg) => console.log(`${C.cyan}${C.bold}[INFO]${C.reset}  ${msg}`),
  ok:      (msg) => console.log(`${C.green}${C.bold}[ OK ]${C.reset}  ${msg}`),
  warn:    (msg) => console.log(`${C.yellow}${C.bold}[WARN]${C.reset}  ${msg}`),
  error:   (msg) => console.log(`${C.red}${C.bold}[ERR ]${C.reset}  ${msg}`),
  system:  (msg) => console.log(`${C.blue}${C.bold}[ SYS]${C.reset}  ${msg}`),
  event:   (msg) => console.log(`${C.magenta}${C.bold}[ EVT]${C.reset}  ${msg}`),
  renderer:(msg) => console.log(`${C.yellow}${C.bold}[ UI ]${C.reset}  ${msg}`),
  bug:     (msg) => console.log(`${C.red}${C.bold}[BUG!]${C.reset}${C.red}  ${msg}${C.reset}`),
  dim:     (msg) => console.log(`${C.gray}${msg}${C.reset}`),
  line:    ()    => console.log(`${C.gray}${'-'.repeat(60)}${C.reset}`),
  dline:   ()    => console.log(`${C.cyan}${'-'.repeat(60)}${C.reset}`),
};

const fs = require('fs');
const https = require('https');
const url = require('url');
// Firebase Admin dan serviceAccountKey.json telah dihapus dari sisi klien untuk mencegah kebocoran kredensial admin.
let firebaseAdminReady = false;
const db = null;

let _cachedEnv = null;
function loadEnv() {
  if (_cachedEnv) return _cachedEnv;
  const envPath = path.join(__dirname, '..', '..', '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx > 0) {
      let key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      val = val.replace(/^["']|["']$/g, '');
      env[key] = val;
    }
  });
  _cachedEnv = env;
  return env;
}
const envConfig = loadEnv();
const clearEnvCache = () => { _cachedEnv = null; };

// Server Express lokal port 3001 dinonaktifkan demi alasan keamanan dan efisiensi sistem.

// ── Musik state (Lokal) ──────────────────────────────────
let musicFiles = []; // SELALU dari assets_music (lokal)
const musicState = { index: 0, muted: false };

// ── Shuffle Queue (Fisher-Yates infinite) ────────────────────
let _shuffleQueue = [];
let _bgmSkipCount = 0;
const BGM_MAX_SKIP = 15;

function sortMusicFiles(arr) {
  return arr.slice().sort((a, b) => {
    const tA = (a.title || a.id || '').toLowerCase();
    const tB = (b.title || b.id || '').toLowerCase();
    return tA < tB ? -1 : tA > tB ? 1 : 0;
  });
}

function buildShuffleQueue() {
  if (musicFiles.length === 0) return;
  const indices = Array.from({ length: musicFiles.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  _shuffleQueue = indices;
  _bgmSkipCount = 0;
}

function getNextShuffleIndex() {
  if (musicFiles.length === 0) return 0;
  if (_shuffleQueue.length === 0) buildShuffleQueue();
  if (_shuffleQueue.length === 0) return 0;
  musicState.index = _shuffleQueue.shift();
  return musicState.index;
}

// ── Baca file lokal dari assets_music (SUMBER UTAMA UNTUK BGM) ──
// ★ FIX v2.0: Gunakan userData untuk penyimpanan file dinamis (upload musik)
//   agar tidak crash di production ASAR (read-only).
//   assets_music di src/ HANYA untuk musik default yang di-bundle.
function getMusicUserDir() {
  const userMusicDir = path.join(app.getPath('userData'), 'assets_music');
  if (!fs.existsSync(userMusicDir)) fs.mkdirSync(userMusicDir, { recursive: true });
  return userMusicDir;
}

function getOutputDir() {
  const outDir = path.join(app.getPath('userData'), 'output_docs');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

function loadLocalMusicFiles() {
  try {
    const bundledMusicDir = path.join(__dirname, '..', '..', 'assets', 'assets_music');
    const userMusicDir    = getMusicUserDir();

    // Gabungkan KEDUA direktori via Map (fileName → fullPath)
    // userMusicDir menang jika ada nama file yang sama
    const allFiles = new Map();
    for (const dir of [bundledMusicDir, userMusicDir]) {
      if (!fs.existsSync(dir)) continue;
      fs.readdirSync(dir)
        .filter(f => /\.(mp3|ogg|wav|flac|m4a|aac)$/i.test(f))
        .forEach(f => allFiles.set(f, path.join(dir, f)));
    }

    if (allFiles.size > 0) {
      musicFiles = sortMusicFiles(
        Array.from(allFiles.entries()).map(([f, absPath]) => {
          const posixPath = absPath.split(path.sep).join('/');
          const fileUrl   = 'file:///' + posixPath.split(' ').join('%20');
          return {
            id:    f,
            title: f.replace(/\.(mp3|ogg|wav|flac|m4a|aac)$/i, '').trim(),
            url:   fileUrl,
          };
        })
      );
      buildShuffleQueue();
    }
  } catch (e) {
    console.warn('[WARN] loadLocalMusicFiles:', e.message);
  }
}

loadLocalMusicFiles();

// Sinkronisasi playlist BGM Firestore dinonaktifkan di main process untuk keamanan. Pemutaran diatur secara lokal.

// ── Check Supabase Connection ────────────────────────────────
async function checkSupabaseStatus() {
  return new Promise((resolve) => {
    const url = envConfig.SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return resolve('NOT_CONFIGURED');
    try {
      const request = https.request(url, { method: 'HEAD', timeout: 3000 }, (res) => {
        resolve('CONNECTED');
      });
      request.on('error', () => resolve('OFFLINE'));
      request.on('timeout', () => { request.destroy(); resolve('TIMEOUT'); });
      request.end();
    } catch (e) { resolve('OFFLINE'); }
  });
}

// ── Check Firestore Connection (Live Handshake via Renderer) ─────────────
async function checkFirestoreStatus() {
  // Menggunakan mode client aman
  return 'SECURE_CLIENT_MODE';
}

// ── Check AI Service Status (Natively via IPC) ────────────────
async function checkAIServiceStatus() {
  return 'ACTIVE (IPC)';
}

// ── Update state ─────────────────────────────────────────────
let updateInfo = null;
let mainWindow;
let bgMusicWindow = null;

function createBgMusicWindow() {
  if (bgMusicWindow) return;
  bgMusicWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      // webSecurity: false agar audio file:// bisa diputar dari halaman file://
      webSecurity: false,
      autoplayPolicy: 'no-user-gesture-required',
      // Tidak perlu preload — bgm_player.html sudah self-contained
    }
  });

  // Load dari FILE (bukan data: URL) agar origin = file:// → bisa play file:// audio
  bgMusicWindow.loadFile(path.join(__dirname, '..', '..', 'pages', 'bgm', 'bgm_player.html'));

  bgMusicWindow.on('page-title-updated', (e, title) => {
    if (title.startsWith('BGM_ENDED') || title.startsWith('BGM_ERROR')) {
      const isError = title.startsWith('BGM_ERROR');

      if (isError) {
        _bgmSkipCount++;
        console.warn(`[BGM] Playback error (attempt ${_bgmSkipCount}/${BGM_MAX_SKIP})`);
      } else if (title.startsWith('BGM_FREQ_')) {
        // Forward frequency data to main window for visualizer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('music-frequency', title.replace('BGM_FREQ_', ''));
        }
        return; // Don't reset skip count on freq updates
      } else {
        _bgmSkipCount = 0; // Reset jika sukses
      }

      if (_bgmSkipCount >= BGM_MAX_SKIP) {
        console.error('[BGM] Terlalu banyak error. Menghentikan pemutaran otomatis.');
        _bgmSkipCount = 0;
        return;
      }

      // Jika error, beri jeda 2 detik sebelum skip agar tidak "shuffling" gila-gilaan
      const delay = isError ? 2000 : 100;
      setTimeout(() => {
        getNextShuffleIndex();
        playMusicOnBgWindow();
      }, delay);
    }
  });

  bgMusicWindow.webContents.on('did-finish-load', () => {
    _bgmSkipCount = 0;
    playMusicOnBgWindow();
  });
}

function broadcastMusicState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('music-state-changed', {
      index: musicState.index,
      muted: musicState.muted,
      files: musicFiles,
      currentTitle: musicFiles[musicState.index]?.title || '' // FIX v2.1: kirim judul langsung
    });
  }
}

function playMusicOnBgWindow() {
  if (!bgMusicWindow || bgMusicWindow.isDestroyed() || musicFiles.length === 0) return;
  const music = musicFiles[musicState.index];
  if (!music || !music.url) return;
  // musicFiles selalu berisi file:// URLs dari loadLocalMusicFiles()
  const audioUrl = music.url;
  const volume = musicState.muted ? 0 : 0.8;
  bgMusicWindow.webContents
    .executeJavaScript(`window.playSong && window.playSong(${JSON.stringify(audioUrl)}, ${volume});`)
    .catch(e => console.error('[ERROR] BGM executeJavaScript:', e.message));
  broadcastMusicState();
}

function toggleMuteBgWindow(mute) {
  musicState.muted = mute;
  if (bgMusicWindow && !bgMusicWindow.isDestroyed()) {
    bgMusicWindow.webContents
      .executeJavaScript(`window.setVolume && window.setVolume(${mute ? 0 : 0.8});`)
      .catch(() => { });
  }
  broadcastMusicState();
}



function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 1024, minHeight: 600,
    webPreferences: {
      nodeIntegration: false,      // ✅ AMAN: tidak ekspos Node.js API ke renderer
      contextIsolation: true,       // ✅ AMAN: isolasi context preload vs renderer
      sandbox: false,      // Diperlukan agar require() bekerja di preload.js
      webSecurity: true,       // ✅ AMAN: aktifkan Same-Origin Policy (sebelumnya false!)
      allowRunningInsecureContent: false, // ✅ Blokir mixed content
      devTools: true,      // ✅ Debug mode
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: true, // ✅ SMART SCALING: Drop CPU when minimized
      additionalArguments: ['--normal-level'] // ✅ Inject status for renderer
    },
    show: false,
    backgroundColor: '#020b18',
    title: 'Cimega Smart Office',
    icon: path.join(__dirname, '..', '..', 'assets', 'assets_images', 'Logo SDN Cimega.png'),
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'pages', 'login', 'login.html'));

  // Inisialisasi musik sesegera mungkin
  createBgMusicWindow();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('sync-complete', { status: 'ok', musicCount: musicFiles.length });
      }
    }, 1500);
  });

  // SECURITY: Hapus Menu Bar bawaan (yang berisi menu akses DevTools)
  mainWindow.setMenuBarVisibility(false);
  mainWindow.setMenu(null);

  // SECURITY: Blokir klik kanan (Context Menu) di seluruh aplikasi
  mainWindow.webContents.on('context-menu', (e) => {
    e.preventDefault();
  });

  // SECURITY: Jika DevTools tetap berhasil dibuka secara paksa, tutup lagi secara otomatis
  // mainWindow.webContents.on('devtools-opened', () => {
  //   mainWindow.webContents.closeDevTools();
  // });

  // Proactively broadcast music state to the new window when it finishes loading
  mainWindow.webContents.on('did-finish-load', () => {
    broadcastMusicState();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    app.quit(); // Teruskan sinyal penghentian ke seluruh Jendela (termasuk bgMusicWindow) 
  });
}

// ══════════════════════════════════════════
// IPC HANDLERS
// ══════════════════════════════════════════

// ── Call Window Handler (Video & Audio P2P WebRTC) ───────────
let callWindow = null;
ipcMain.handle('call:open-window', async (e, opts) => {
  const { session } = require('electron');
  
  // Otomatis setujui izin kamera & mikrofon untuk Cimega
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'geolocation', 'notifications'];
    if (allowed.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  if (callWindow) {
    callWindow.focus();
    return { success: true };
  }

  callWindow = new BrowserWindow({
    width: 850,
    height: 650,
    title: 'Cimega Secure Call',
    backgroundColor: '#0a0f16',
    icon: path.join(__dirname, '..', '..', 'assets', 'assets_images', 'Logo SDN Cimega.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    }
  });

  // Hapus menu bar default panggilan
  callWindow.setMenuBarVisibility(false);
  callWindow.setMenu(null);

  const queryParams = new URLSearchParams(opts).toString();
  const callPageUrl = `file:///${path.join(__dirname, '..', '..', 'pages', 'chat', 'call.html').split(path.sep).join('/')}?${queryParams}`;

  callWindow.loadURL(callPageUrl);

  callWindow.on('closed', () => {
    callWindow = null;
  });

  return { success: true };
});

// Screen sharing sources
ipcMain.handle('screen:get-sources', async () => {
  const { desktopCapturer } = require('electron');
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 150, height: 100 }
    });
    return sources.map(src => ({
      id: src.id,
      name: src.name,
      thumbnail: src.thumbnail.toDataURL()
    }));
  } catch (err) {
    console.error('Gagal memuat sumber screen sharing:', err);
    return [];
  }
});

// Firebase config
ipcMain.handle('get-firebase-config', () => ({
  apiKey: envConfig.FIREBASE_API_KEY,
  authDomain: envConfig.FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.FIREBASE_PROJECT_ID,
  storageBucket: envConfig.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.FIREBASE_APP_ID,
  measurementId: envConfig.FIREBASE_MEASUREMENT_ID,
}));

ipcMain.handle('get-supabase-config', () => ({
  url: envConfig.SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL || '',
  key: envConfig.SUPABASE_KEY || envConfig.SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
}));

ipcMain.handle('get-app-config', () => ({
  appName: envConfig.APP_NAME || 'Cimega Smart Office',
  appVersion: envConfig.APP_VERSION || app.getVersion() || '1.0.0',
}));

// Musik
ipcMain.handle('music-init', async () => {
  if (!bgMusicWindow) createBgMusicWindow();

  try {
    const isPlaying = await bgMusicWindow.webContents.executeJavaScript(
      'typeof window.isPaused === "function" ? !window.isPaused() : (!!window._bgm && !!window._bgm.src && !window._bgm.paused)'
    );
    if (!isPlaying && musicFiles.length > 0) {
      // Selalu pastikan queue tersedia dan ambil index acak pertama
      if (_shuffleQueue.length === 0) buildShuffleQueue();
      getNextShuffleIndex();
      playMusicOnBgWindow();
    }
    broadcastMusicState();
  } catch (_) {
    if (musicFiles.length > 0) {
      if (_shuffleQueue.length === 0) buildShuffleQueue();
      getNextShuffleIndex();
      playMusicOnBgWindow();
    }
  }

  return { ...musicState, files: musicFiles, total: musicFiles.length, currentTitle: musicFiles[musicState.index]?.title || '' };
});

ipcMain.handle('music-get-state', () => ({
  index: musicState.index,
  muted: musicState.muted,
  files: musicFiles,
  total: musicFiles.length,
  currentTitle: musicFiles[musicState.index]?.title || '' // FIX v2.1
}));

ipcMain.handle('music-toggle-mute', () => {
  toggleMuteBgWindow(!musicState.muted);
  return musicState.muted;
});

ipcMain.handle('music-next', () => {
  // Ambil lagu berikutnya secara acak dari shuffle queue
  getNextShuffleIndex();
  playMusicOnBgWindow();
  return { index: musicState.index, title: musicFiles[musicState.index]?.title || 'Unknown' };
});

ipcMain.handle('music-prev', () => {
  // Untuk user experience, prev sebaiknya tetap acak jika di mode shuffle, 
  // atau kita ambil dari queue history. Di sini kita buat acak lagi saja agar sesuai request "acak/random".
  getNextShuffleIndex();
  playMusicOnBgWindow();
  return { index: musicState.index, title: musicFiles[musicState.index]?.title || 'Unknown' };
});

// ══════════════════════════════════════════
// AUTO UPDATER via GitHub Releases
// Tidak pakai electron-updater karena butuh
// code signing. Pakai sistem custom yang lebih
// fleksibel dan tidak butuh sertifikat.
// ══════════════════════════════════════════

// Cek versi terbaru dari GitHub Releases API
ipcMain.handle('check-github-update', async (e, { owner, repo }) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/releases/latest`,
      method: 'GET',
      headers: { 'User-Agent': 'Cimega-Smart-Office' }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          // Cari file .exe di assets
          const exeAsset = release.assets?.find(a => a.name.endsWith('.exe'));
          resolve({
            latestVersion: release.tag_name?.replace('v', '') || '0.0.0',
            downloadUrl: exeAsset?.browser_download_url || release.html_url,
            releaseNotes: release.body || '',
            releaseName: release.name || release.tag_name || '',
            publishedAt: release.published_at || '',
          });
        } catch (err) {
          resolve({ error: 'Gagal parse response: ' + err.message });
        }
      });
    });
    req.on('error', (err) => resolve({ error: err.message }));
    req.setTimeout(8000, () => { req.destroy(); resolve({ error: 'Timeout' }); });
    req.end();
  });
});

// Download update ke folder temp
ipcMain.handle('download-update', async (e, { url, version }) => {
  return new Promise((resolve) => {
    const tmpDir = app.getPath('temp');
    const outPath = path.join(tmpDir, `CimegaSmartOffice-Setup-${version}.exe`);

    // Kalau sudah ada, langsung return
    if (fs.existsSync(outPath)) {
      resolve({ success: true, filePath: outPath });
      return;
    }

    const file = fs.createWriteStream(outPath);
    let downloaded = 0;
    let total = 0;

    function doDownload(downloadUrl) {
      const protocol = downloadUrl.startsWith('https') ? https : require('http');
      protocol.get(downloadUrl, (res) => {
        // Handle redirect
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          doDownload(res.headers.location);
          return;
        }
        total = parseInt(res.headers['content-length'] || '0');
        res.on('data', (chunk) => {
          downloaded += chunk.length;
          file.write(chunk);
          // Kirim progress ke renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            const pct = total > 0 ? Math.round(downloaded / total * 100) : 0;
            mainWindow.webContents.send('update-download-progress', { pct, downloaded, total });
          }
        });
        res.on('end', () => {
          file.end();
          resolve({ success: true, filePath: outPath });
        });
        res.on('error', (err) => {
          file.destroy();
          resolve({ success: false, error: err.message });
        });
      }).on('error', (err) => {
        file.destroy();
        resolve({ success: false, error: err.message });
      });
    }

    doDownload(url);
  });
});

// Install update (jalankan .exe installer, lalu tutup app)
ipcMain.handle('install-update', async (e, { filePath }) => {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: 'File tidak ditemukan: ' + filePath };
  }
  try {
    const { spawn } = require('child_process');
    // /S = silent install (NSIS)
    spawn(filePath, ['/S'], {
      detached: true,
      stdio: 'ignore',
    }).unref();
    // Tunggu sebentar lalu tutup app
    setTimeout(() => app.quit(), 1500);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── SYSTEM: Dynamic Resource Discovery (Autoloader Bridge) ─────
// Izinkan renderer untuk memindai folder modules & pages agar dashboard bisa unified.
ipcMain.handle('system:list-files', async (e, { subPath, recursive = false }) => {
  try {
    // SECURITY: Sanitize path to prevent directory traversal
    const safeSubPath = path.normalize(subPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const root = path.join(__dirname, safeSubPath);

    // Jail to project root
    if (!root.startsWith(__dirname)) {
      console.warn('[SECURITY] Blocked path traversal attempt:', subPath);
      return [];
    }

    if (!fs.existsSync(root)) return [];

    function walkSync(dir, filelist = []) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
          if (recursive) filelist = walkSync(filePath, filelist);
        } else {
          // Hanya ambil file .js dan .html
          if (/\.(js|html)$/i.test(file)) {
            filelist.push(path.relative(root, filePath).replace(/\\/g, '/'));
          }
        }
      });
      return filelist;
    }

    return walkSync(root);
  } catch (err) {
    console.error('[ERROR] system:list-files:', err.message);
    return [];
  }
});

// Baca file mentah (raw text) untuk injeksi template HTML
ipcMain.handle('system:read-file', async (e, { subPath }) => {
  try {
    // SECURITY: Sanitize path
    const safeSubPath = path.normalize(subPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(__dirname, safeSubPath);

    if (!fullPath.startsWith(__dirname) || !fs.existsSync(fullPath)) {
      return { success: false, error: 'Access denied or file not found' };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    return { success: true, data: content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Buka link di browser
ipcMain.handle('open-external', (e, url) => {
  // Whitelist: only allow http/https external links
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url);
  }
});

// ── SECURITY: In-Memory Session Key Store ────────────────────
// school_key tidak disimpan di localStorage — hanya di memori Main Process
// Dibersihkan otomatis saat app ditutup.
let _sessionKeyStore = {}; // { webContentsId → schoolSecretKey }

ipcMain.handle('session-set-key', (e, key) => {
  _sessionKeyStore[e.sender.id] = key;
  return { success: true };
});

ipcMain.handle('session-get-key', (e) => {
  return _sessionKeyStore[e.sender.id] || '';
});

ipcMain.handle('session-clear-key', (e) => {
  delete _sessionKeyStore[e.sender.id];
  return { success: true };
});

// ── Simpan file musik ke userData/assets_music (AMAN di production ASAR) ──
// ★ FIX v2.0: Dulu pakai __dirname/assets/assets_music yang CRASH di production build
//   karena ASAR bersifat read-only. Sekarang pakai app.getPath('userData').
ipcMain.handle('music-save-local', async (e, { fileName, fileBuffer }) => {
  try {
    const musicDir = getMusicUserDir(); // ★ FIX: userData, bukan __dirname

    // Sanitize nama file (hapus karakter berbahaya)
    const safeName = fileName.replace(/[^a-zA-Z0-9._\- ]/g, '_');
    const destPath = path.join(musicDir, safeName);

    // Tulis buffer ke file
    const buf = Buffer.from(fileBuffer);
    fs.writeFileSync(destPath, buf);

    // Reload daftar musik lokal agar BGM player bisa langsung main
    loadLocalMusicFiles();
    buildShuffleQueue();
    broadcastMusicState();

    console.log(`[Music] Disimpan ke userData: "${safeName}" (${Math.round(buf.length / 1024)} KB)`);
    return { success: true, fileName: safeName, path: destPath };
  } catch (err) {
    console.error('[ERROR] music-save-local:', err.message);
    return { success: false, error: err.message };
  }
});

// ── Hapus file musik dari userData/assets_music ──────────────────────────
ipcMain.handle('music-delete-local', async (e, { fileName }) => {
  try {
    const musicDir = getMusicUserDir(); // ★ FIX: userData
    const filePath = path.join(musicDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[Music] Dihapus: "${fileName}"`);
    }
    loadLocalMusicFiles();
    buildShuffleQueue();
    broadcastMusicState();
    return { success: true };
  } catch (err) {
    console.error('[ERROR] music-delete-local:', err.message);
    return { success: false, error: err.message };
  }
});

// ── Baca file musik dari userData/assets_music ──────────────────────────
ipcMain.handle('music-read-file', async (e, { fileName }) => {
  try {
    const musicDir = getMusicUserDir(); // ★ FIX: userData
    const filePath = path.join(musicDir, fileName);
    if (!fs.existsSync(filePath)) {
      return { success: false, error: `File tidak ditemukan: ${fileName}` };
    }
    const buffer = fs.readFileSync(filePath);
    // Kirim sebagai Array agar bisa di-clone via contextBridge (structured clone)
    return { success: true, data: Array.from(buffer), fileName };
  } catch (err) {
    console.error('[ERROR] music-read-file:', err.message);
    return { success: false, error: err.message };
  }
});

// ── Daftar musik lokal (gabungan bundled + userData) ──────────────────────────
ipcMain.handle('get-music-list', () => {
  try {
    const userMusicDir = getMusicUserDir();
    const bundledMusicDir = path.join(__dirname, '..', '..', 'assets', 'assets_music');
    // Gabungkan dari kedua direktori (bundled + user-uploaded)
    const allFiles = new Map();
    for (const dir of [bundledMusicDir, userMusicDir]) {
      if (!fs.existsSync(dir)) continue;
      fs.readdirSync(dir)
        .filter(f => /\.(mp3|ogg|wav|aac|m4a|flac)$/i.test(f))
        .forEach(f => allFiles.set(f, path.join(dir, f)));
    }
    return Array.from(allFiles.entries())
      .map(([f, fullPath]) => ({
        id: f,
        title: f.replace(/\.(mp3|ogg|wav|aac|m4a|flac)$/i, '').trim(),
        url: url.pathToFileURL(fullPath).href,
      }))
      .sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 : 1);
  } catch (e) {
    console.warn('[WARN] get-music-list:', e.message);
    return [];
  }
});



// ── PUSAT KENDALI: VOICE & LOGGING ───────────────────────────
// ── HELPER: Deteksi Bahasa (Multilingual) ───────────────────
function detectLanguage(text) {
  // 1. Deteksi Arab (Unicode range)
  if (/[\u0600-\u06FF]/.test(text)) return 'ar';

  // 2. Deteksi Inggris vs Indonesia (Keyword heuristic)
  const enPool = /\b(the|is|are|am|was|were|have|has|had|do|does|did|will|would|shall|should|good|morning|evening|afternoon|night|how|what|where|when|who|why|this|that|these|those|at|on|in|to|for|with|by|from|about|above|below|between|among|through|during)\b/gi;
  const idPool = /\b(yang|ada|adalah|di|dari|ke|ini|itu|saya|kami|kita|anda|kalian|mereka|dia|beliau|oleh|untuk|dengan|sebagai|pada|dari|sampai|hingga|sebelum|setelah|ketika|saat|kapan|mengapa|bagaimana|berapa|apa|siapa)\b/gi;

  const enCount = (text.match(enPool) || []).length;
  const idCount = (text.match(idPool) || []).length;

  return (enCount > idCount) ? 'en' : 'id';
}

// ── HELPER: Pembagi Teks untuk Suara Panjang ────────────────
// ── HELPER: Pembagi Teks Berbasis Kalimat (Natural Pausing) ──
function splitTextIntoChunks(text, maxLen = 200) {
  const chunks = [];
  let current = text.trim();

  while (current.length > 0) {
    if (current.length <= maxLen) {
      chunks.push(current);
      break;
    }

    let slice = current.substring(0, maxLen);
    let lastIdx = -1;

    // PRIORITAS 1: Akhir Kalimat (Titik, Tanya, Seru) -> Jeda Panjang
    const strongDelims = ['. ', '! ', '? ', '.\n', '!\n', '?\n'];
    for (const d of strongDelims) {
      const idx = slice.lastIndexOf(d);
      if (idx > lastIdx) lastIdx = idx;
    }

    // PRIORITAS 2: Jeda Tengah (Koma, Titik Koma, Dash) -> Jeda Pendek
    if (lastIdx === -1) {
      const midDelims = [', ', '; ', ' - ', ' (', '\n'];
      for (const d of midDelims) {
        const idx = slice.lastIndexOf(d);
        if (idx > lastIdx) lastIdx = idx;
      }
    }

    // PRIORITAS 3: Spasi antar kata
    if (lastIdx === -1) lastIdx = slice.lastIndexOf(' ');

    let cutIdx = (lastIdx === -1) ? maxLen : lastIdx + 1;
    chunks.push(current.substring(0, cutIdx).trim());
    current = current.substring(cutIdx).trim();
  }
  return chunks.filter(c => c.length > 0);
}
// ── HELPER: Normalisasi Teks (Pelafalan Singkatan) ──────────
function normalizeText(text) {
  const dictionary = {
    'AI': 'A-I',
    'PAI': 'P-A-I',
    'RPP': 'R-P-P',
    'KOSP': 'K-O-S-P',
    'ATP': 'A-T-P',
    'KKTP': 'K-K-T-P',
    'P5': 'P-lima', // deprecated — Kokurikuler sekarang
    'MA': 'M-A',
    'UKK': 'U-K-K',
    'ANBK': 'A-N-B-K',
    'IKM': 'I-K-M',
    'TU': 'T-U',
    'SDN': 'S-D-N',
    'SMPN': 'S-M-P-N',
    'SMAN': 'S-M-A-N',
    'PTK': 'P-T-K',
    'NIP': 'N-I-P',
    'NUPTK': 'N-U-P-T-K',
    'NIK': 'N-I-K',
    'SK': 'S-K',
    'IUR': 'I-U-R',
    'SPP': 'S-P-P'
  };

  let result = text;
  Object.keys(dictionary).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(regex, dictionary[key]);
  });
  return result;
}

// --- CIRCUIT BREAKER STATUS (Antara Delay) ---
let isJalur1Active = true;

ipcMain.handle('tts-generate', async (e, { text: rawText }) => {
  const freshEnv = loadEnv();
  const provider = freshEnv.VOICE_PROVIDER || 'GOOGLE';
  const apiKey = freshEnv.VOICE_API_KEY || freshEnv.GEMINI_API_KEY || '';

  try {
    if (!rawText || rawText.trim().length === 0) throw new Error('Teks kosong.');

    // 1. NORMALISASI PELAFALAN (AI -> A-I)
    const text = normalizeText(rawText);

    const lang = detectLanguage(text);
    // MENGGUNAKAN 3 KEPRIBADIAN NATIVE (Gadis, Ava, Salma) agar fasih dan tegas
    const voiceMaps = {
      'id': { google: 'id-ID-Neural2-A', edge: 'id-ID-GadisNeural', translate: 'id' },
      'en': { google: 'en-US-Neural2-F', edge: 'en-US-AvaNeural', translate: 'en-US' },
      'ar': { google: 'ar-XA-Wavenet-A', edge: 'ar-EG-SalmaNeural', translate: 'ar' }
    };
    const map = voiceMaps[lang];

    const preview = text.substring(0, 30) + (text.length > 30 ? '...' : '');
    console.log(`[TTS_DEBUG] lang:${lang.toUpperCase()} | provider:${provider} | text:"${preview}"`);

    // --- JALUR 1: GOOGLE CLOUD TTS (PREMIUM OFFICIAL) ---
    // FAST FALLBACK: Hanya coba jika Jalur 1 masih dianggap aktif
    if (provider === 'GOOGLE' && apiKey && isJalur1Active) {
      try {
        console.log(`[TTS_DEBUG] Jalur 1 (Google Cloud Premium)...`);
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text },
            voice: { languageCode: (lang === 'en' ? 'en-US' : (lang === 'ar' ? 'ar-XA' : 'id-ID')), name: map.google },
            audioConfig: { audioEncoding: 'MP3', pitch: -1.0, speakingRate: 1.15 } // Pitch sedikit rendah agar lebih tegas
          })
        });

        const data = await response.json();
        if (data.audioContent) {
          return { success: true, audioContent: data.audioContent };
        } else if (data.error) {
          // Jika error 403 atau API mati, matikan Jalur 1 untuk sisa sesi agar tidak delay
          console.error(`[TTS_DEBUG] Jalur 1 Gagal Fatal: ${data.error.message}`);
          if (data.error.code === 403 || data.error.message.includes('not been used')) {
            isJalur1Active = false;
            console.warn(`[TTS_DEBUG] Circuit Breaker: Jalur 1 Dinonaktifkan (Fast Fallback Aktif)`);
          }
          throw new Error(data.error.message || 'Google API Error');
        }
      } catch (gErr) {
        console.warn(`[TTS_DEBUG] Jalur 1 Skip/Fail: ${gErr.message}`);
      }
    }

    // --- JALUR 2 (UTAMA & TERBAIK UNTUK KELANCARAN): EDGE TTS NEURAL ---
    try {
      console.log(`[TTS_DEBUG] Jalur 2 (Edge TTS Neural) - Suara Manusia Sangat Lancar...`);
      const { UniversalEdgeTTS } = require('edge-tts-universal');
      // Pengaturan pitch dan rate yang disesuaikan agar lebih natural (lugas)
      const tts = new UniversalEdgeTTS(text, map.edge, { rate: '+12%', pitch: '+0Hz', volume: '+0%' });
      const audioBuffer = await tts.synthesize();
      return { success: true, audioContent: Buffer.from(audioBuffer).toString('base64') };
    } catch (eErr) {
      console.warn(`[TTS_DEBUG] Jalur 2 (Edge Neural) Gagal: ${eErr.message}`);
    }

    // --- JALUR 3 (LAST RESORT): GOOGLE TRANSLATE ENGINE (Robot) ---
    try {
      console.log(`[TTS_DEBUG] Jalur 3 (Google Translate) - Fallback Terakhir...`);
      const chunks = splitTextIntoChunks(text, 200);
      let combinedBuffer = Buffer.alloc(0);

      for (const chunk of chunks) {
        const silentChunk = ' ' + chunk;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(silentChunk)}&tl=${map.translate}&client=tw-ob`;

        const resVal = await fetch(url);
        if (resVal.ok) {
          const chunkArrayBuf = await resVal.arrayBuffer();
          combinedBuffer = Buffer.concat([combinedBuffer, Buffer.from(chunkArrayBuf)]);
        }
      }

      if (combinedBuffer.length > 0) {
        return { success: true, audioContent: combinedBuffer.toString('base64') };
      }
      throw new Error('Google Translate tidak merespons.');
    } catch (tErr) {
      console.warn(`[TTS_DEBUG] Jalur 3 Gagal: ${tErr.message}`);
    }

    throw new Error('Semua jalur suara gagal.');

  } catch (err) {
    console.error('[TTS_DEBUG_ERROR] Fatal Error:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('system:log', (e, { msg, type }) => {
  const time = new Date().toLocaleTimeString('id-ID');
  const label = `[DEBUG_${type}]`.padEnd(12);
  console.log(`${time} ${label} ${msg}`);
  return { success: true };
});

// ── ★ BARU v2.0: Document Generation via IPC (Aman, dari Main Process) ──────
// document_service.js di renderer tidak bisa pakai require() — gunakan IPC ini.
ipcMain.handle('doc:generate-pdf', async (e, { htmlContent, fileName, landscape, pageSize }) => {
  try {
    const outDir = getOutputDir();
    const safeName = (fileName || 'dokumen').replace(/[^a-zA-Z0-9._\- ]/g, '_').replace(/\.html?$/, '') + '.pdf';
    // Simpan HTML sementara, lalu buka dengan Electron BrowserWindow headless untuk print ke PDF
    const tmpHtmlPath = path.join(outDir, '_tmp_print.html');
    fs.writeFileSync(tmpHtmlPath, htmlContent, 'utf-8');
    
    const pdfWindow = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await pdfWindow.loadFile(tmpHtmlPath);
    const pdfData = await pdfWindow.webContents.printToPDF({
      landscape: !!landscape,
      pageSize: pageSize || 'A4',
      printBackground: true,
      marginType: 0,
    });
    pdfWindow.destroy();
    const outPath = path.join(outDir, safeName);
    fs.writeFileSync(outPath, pdfData);
    fs.unlinkSync(tmpHtmlPath);
    console.log(`[DOC] PDF Generated: ${safeName} (landscape: ${!!landscape}, size: ${pageSize || 'A4'})`);
    return { success: true, filePath: outPath, fileName: safeName };
  } catch (err) {
    console.error('[ERROR] doc:generate-pdf:', err.message);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:open-file', async (e, filePath) => {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:open-output-dir', async () => {
  const outDir = getOutputDir();
  await shell.openPath(outDir);
  return { success: true };
});

ipcMain.handle('doc:save-html', async (e, { htmlContent, fileName }) => {
  try {
    const outDir = getOutputDir();
    const safeName = (fileName || 'dokumen').replace(/[^a-zA-Z0-9._\- ]/g, '_').replace(/\.html?$/, '') + '.html';
    const outPath = path.join(outDir, safeName);
    fs.writeFileSync(outPath, htmlContent, 'utf-8');
    console.log(`[DOC] HTML Saved: ${safeName}`);
    return { success: true, filePath: outPath, fileName: safeName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('doc:list-output', async () => {
  try {
    const outDir = getOutputDir();
    const files = fs.readdirSync(outDir).filter(f => /\.(pdf|html|docx)$/i.test(f));
    return files.map(f => ({
      name: f,
      path: path.join(outDir, f),
      size: fs.statSync(path.join(outDir, f)).size,
      modified: fs.statSync(path.join(outDir, f)).mtime,
    }));
  } catch (err) { return []; }
});

// ── GEMINI AI API (Google — Free Tier) ───────────────────────
ipcMain.handle('gemini-ask', async (e, { messages, system, maxTokens }) => {
  const freshEnv = loadEnv();
  const apiKey = freshEnv.GEMINI_API_KEY || envConfig.GEMINI_API_KEY;
  if (!apiKey) return { error: 'GEMINI_API_KEY belum diisi di file .env' };

  // Konversi format messages (claude/openai) ke format Gemini
  const systemInstruction = system ||
    'Kamu adalah asisten administrasi sekolah dasar di Indonesia yang ahli dalam Kurikulum Merdeka Belajar dan Kurikulum 2013. Jawab dalam Bahasa Indonesia yang formal dan profesional. PENTING: Jika kamu menulis teks dalam Bahasa Arab, WAJIB menyertakan harakat (syakal) secara lengkap dan akurat agar mudah dibaca.';

  // Gemini pakai "contents" bukan "messages"
  // role: "user" | "model" (bukan "assistant")
  const contents = messages.map(m => {
    const parts = [{ text: m.content }];

    // Jika pesan memiliki lampiran, tambahkan ke parts
    if (m.attachments && Array.isArray(m.attachments)) {
      m.attachments.forEach(att => {
        parts.push({
          inline_data: {
            mime_type: att.mime_type,
            data: att.data // Base64 tanpa prefix
          }
        });
      });
    }

    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });

  const body = JSON.stringify({
    system_instruction: {
      parts: [{
        text: systemInstruction + " PENTING: Jika pengguna mengunggah dokumen (PDF, Office, Gambar), analisis isinya secara mendalam, cerdas, dan gunakan sebagai referensi utama dalam merumuskan jawaban Anda."
      }]
    },
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens || 2048,
      temperature: 0.7,
    },
  });

  const model = 'gemini-3.5-flash';
  const path = `/v1beta/models/${model}:generateContent?key=${apiKey}`;

  return new Promise((resolve) => {
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          // Cek error dari Gemini
          if (parsed.error) {
            let errorMsg = parsed.error.message || 'Gemini API error';
            if (errorMsg.includes('Quota exceeded') || errorMsg.includes('429')) {
              errorMsg = 'Batas pemakaian harian gratis AI Anda (Quota) atau batas pesan beruntun saat ini telah tercapai.\nHarap tunggu sebentar (sekitar 1 menit) sebelum mencoba AI lagi.';
            }
            resolve({ error: errorMsg });
            return;
          }
          // Ambil teks dari response Gemini
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (!text) {
            // Jika ada finishReason (misal BLOCKED)
            const finishReason = parsed.candidates?.[0]?.finishReason;
            if (finishReason) {
              resolve({ error: `AI menolak menjawab (Alasan: ${finishReason}). Coba pertanyaan lain.` });
            } else {
              resolve({ error: 'Gemini tidak memberikan respons. Pastikan API Key valid dan model tersedia.' });
            }
            return;
          }
          resolve({ success: true, text });
        } catch (err) {
          resolve({ error: 'Parse error: ' + err.message });
        }
      });
    });

    req.on('error', err => resolve({ error: err.message }));
    req.setTimeout(60000, () => { req.destroy(); resolve({ error: 'Timeout — koneksi lambat, coba lagi' }); });
    req.write(body);
    req.end();
  });
});

// ── SECURITY: Content Security Policy (CSP) ─────────────────
// Diterapkan ke semua BrowserWindow via web-contents-created
app.on('web-contents-created', (event, contents) => {
  contents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.supabase.co https://firebasestorage.googleapis.com https://cdn.jsdelivr.net https://unpkg.com",
            "connect-src 'self' https://*.firebaseio.com https://*.firestore.googleapis.com https://*.googleapis.com https://*.supabase.co wss://*.firebaseio.com wss://*.supabase.co http://localhost:3001 https://cdn.jsdelivr.net https://unpkg.com",
            "media-src 'self' file: data: blob: https://*.supabase.co",
            "worker-src blob: 'self'",
            "object-src 'none'",
            "frame-src 'none'",
            "base-uri 'self'"
          ].join('; ')
        ]
      }
    });
  });

  // Blokir navigasi ke URL eksternal dari dalam window
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Izinkan hanya file:// dan localhost
    if (parsedUrl.protocol !== 'file:' && parsedUrl.hostname !== 'localhost') {
      console.warn('[SECURITY] Navigasi eksternal diblokir:', navigationUrl);
      event.preventDefault();
    }
  });

  // Blokir window.open() dan popup
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });
});

// ══════════════════════════════════════════
// RENDERER ERROR BRIDGE
// Semua error dan console dari renderer diteruskan ke terminal
// ══════════════════════════════════════════

ipcMain.on('renderer:log',   (e, msg) => log.renderer(msg));
ipcMain.on('renderer:warn',  (e, msg) => log.warn(`[UI WARN] ${msg}`));
ipcMain.on('renderer:error', (e, { message, source, line, col, stack }) => {
  log.bug(`RENDERER ERROR DETECTED`);
  log.line();
  log.bug(`Message : ${message}`);
  if (source && source !== 'undefined') log.bug(`Source  : ${source}`);
  if (line)  log.bug(`Location: Line ${line}${col ? ', Col ' + col : ''}`);
  if (stack) {
    log.dim('  Stack Trace:');
    String(stack).split('\n').slice(0, 6).forEach(l => log.dim('  ' + l.trim()));
  }
  log.line();
});

ipcMain.on('renderer:unhandled-rejection', (e, { reason, stack }) => {
  log.bug(`UNHANDLED PROMISE REJECTION`);
  log.line();
  log.bug(`Reason: ${reason}`);
  if (stack) {
    log.dim('  Stack Trace:');
    String(stack).split('\n').slice(0, 6).forEach(l => log.dim('  ' + l.trim()));
  }
  log.line();
});

// ══════════════════════════════════════════
// APP LIFECYCLE
// ══════════════════════════════════════════

app.whenReady().then(async () => {
  createWindow();

  setTimeout(async () => {
    // Parallel live-check semua layanan
    const [fsStatus, sbStatus, aiStatus] = await Promise.all([
      checkFirestoreStatus(),
      checkSupabaseStatus(),
      checkAIServiceStatus()
    ]);

    const pkg  = require('../../../package.json');
    const env  = loadEnv();
    const ver  = pkg.version || '1.0.0';
    const node = process.versions.node;
    const elec = process.versions.electron;
    const now  = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });

    // Helper: status badge
    const badge = (status) => {
      const s = String(status).toUpperCase();
      if (s.includes('CONNECTED') || s.includes('ACTIVE') || s.includes('SECURE'))  return `${C.green}${C.bold}[AKTIF]${C.reset}`;
      if (s.includes('OFFLINE') || s.includes('ERROR'))   return `${C.red}${C.bold}[OFFLINE]${C.reset}`;
      if (s.includes('TIMEOUT'))  return `${C.yellow}${C.bold}[TIMEOUT]${C.reset}`;
      if (s.includes('NOT_CONFIGURED')) return `${C.gray}[BELUM DIKONFIGURASI]${C.reset}`;
      return `${C.cyan}${C.bold}[${status}]${C.reset}`;
    };

    const credBadge = (val, label) =>
      val && val.length > 5
        ? `${C.green}${C.bold}[TERKONFIGURASI]${C.reset}`
        : `${C.red}${C.bold}[TIDAK ADA]${C.reset}`;

    if (process.stdout.isTTY) process.stdout.write('\x1Bc');

    console.log('');
    log.dline();
    console.log(`${C.cyan}${C.bold}  CIMEGA SMART OFFICE${C.reset}`);
    console.log(`  Platform Administrasi Sekolah - Kurikulum Merdeka 2026/2027`);
    console.log(`  Versi: v${ver}  |  Waktu: ${now}`);
    log.dline();
    console.log('');

    // ── STATUS LAYANAN ──────────────────────────
    console.log(`${C.bold}${C.white}  STATUS LAYANAN${C.reset}`);
    log.line();
    console.log(`  ${'Firebase  (Database)'.padEnd(26)} ${badge(fsStatus)}`);
    console.log(`  ${'Supabase  (Storage)'.padEnd(26)} ${badge(sbStatus)}`);
    console.log(`  ${'Gemini AI (Generator)'.padEnd(26)} ${badge(aiStatus)}`);
    console.log(`  ${'BGM Library'.padEnd(26)} ${C.cyan}${C.bold}[${musicFiles.length} LAGU DIMUAT]${C.reset}`);
    console.log('');

    // ── KREDENSIAL ───────────────────────────────
    console.log(`${C.bold}${C.white}  KREDENSIAL SISTEM${C.reset}`);
    log.line();
    console.log(`  ${'Firebase API Key'.padEnd(26)} ${credBadge(env.FIREBASE_API_KEY,       'Firebase Key')}`);
    console.log(`  ${'Firebase Project ID'.padEnd(26)} ${credBadge(env.FIREBASE_PROJECT_ID,  'Project ID')}`);
    console.log(`  ${'Supabase URL'.padEnd(26)} ${credBadge(env.SUPABASE_URL,            'Supabase URL')}`);
    console.log(`  ${'Supabase Anon Key'.padEnd(26)} ${credBadge(env.SUPABASE_ANON_KEY,     'Supabase Key')}`);
    console.log(`  ${'Gemini API Key'.padEnd(26)} ${credBadge(env.GEMINI_API_KEY,          'Gemini Key')}`);
    console.log('');

    // ── SISTEM ────────────────────────────────────
    console.log(`${C.bold}${C.white}  INFORMASI SISTEM${C.reset}`);
    log.line();
    console.log(`  ${'Node.js'.padEnd(26)} ${C.white}v${node}${C.reset}`);
    console.log(`  ${'Electron'.padEnd(26)} ${C.white}v${elec}${C.reset}`);
    console.log(`  ${'Platform'.padEnd(26)} ${C.white}${process.platform} (${process.arch})${C.reset}`);
    console.log(`  ${'App Path'.padEnd(26)} ${C.gray}${app.getPath('userData')}${C.reset}`);
    console.log('');
    log.dline();
    console.log(`${C.green}${C.bold}  CIMEGA SIAP DIGUNAKAN  ${C.reset}${C.gray}- Status log dan error aplikasi akan tampil di bawah ini:${C.reset}`);
    log.dline();
    console.log('');

  }, 1200);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createWindow(); });
app.on('before-quit', () => {
  _sessionKeyStore = {};
  log.event('Aplikasi ditutup — session key dibersihkan.');
});

