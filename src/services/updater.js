// ============================================
// CIMEGA SMART OFFICE - services/updater.js
// Simpan ke: src/services/updater.js
//
// Cara pakai di halaman manapun:
//   <script src="../../services/updater.js"></script>
//   CimegaUpdater.init({ owner:'namaGithub', repo:'namaRepo' });
// ============================================

const CimegaUpdater = (() => {

  let config = {
    owner: '',      // ← nama akun GitHub Anda
    repo: '',      // ← nama repo GitHub Anda
    checkInterval: 30 * 60 * 1000, // cek tiap 30 menit
  };

  let currentVersion = '1.0.0';
  let updateAvailable = null;
  let downloadedPath = null;
  let isDownloading = false;

  // FIX v1.0.0: helper fallback bridge API (cimegaConfig = primary, cimegaAPI = legacy)
  function _api() { return window.cimegaConfig || window.cimegaAPI; }

  // ── Buat overlay popup ──────────────────
  function createPopup() {
    if (document.getElementById('cimegaUpdaterPopup')) return;
    const el = document.createElement('div');
    el.id = 'cimegaUpdaterPopup';
    el.innerHTML = `
      <style>
        #cimegaUpdaterPopup {
          position: fixed; inset: 0; background: rgba(0,0,0,0.75);
          z-index: 99999; display: none; align-items: center; justify-content: center;
          backdrop-filter: blur(6px); font-family: 'Plus Jakarta Sans', sans-serif;
        }
        #cimegaUpdaterPopup.show { display: flex; }
        .upd-box {
          background: #041428; border: 1px solid rgba(0,229,255,0.3);
          border-radius: 18px; padding: 32px; width: 100%; max-width: 460px;
          position: relative; animation: upd-in .35s cubic-bezier(0.16,1,0.3,1);
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        }
        @keyframes upd-in { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .upd-box::before,.upd-box::after {
          content:''; position:absolute; width:18px; height:18px;
          border-color:#00e5ff; border-style:solid; opacity:.6;
        }
        .upd-box::before { top:-1px;left:-1px;border-width:2px 0 0 2px;border-radius:6px 0 0 0 }
        .upd-box::after  { bottom:-1px;right:-1px;border-width:0 2px 2px 0;border-radius:0 0 6px 0 }
        .upd-icon { font-size:48px; text-align:center; margin-bottom:16px; }
        .upd-title { font-family: 'Plus Jakarta Sans', sans-serif; font-size:16px; font-weight:700;
          color:#fff; text-align:center; margin-bottom:6px; letter-spacing:1px; }
        .upd-ver { text-align:center; margin-bottom:14px; }
        .upd-ver .old { font-size:12px; color:#5a8aaa; }
        .upd-ver .arrow { font-size:14px; color:#00e5ff; margin:0 8px; }
        .upd-ver .new { font-family: 'Plus Jakarta Sans', sans-serif; font-size:14px; color:#00e5ff; font-weight:700; }
        .upd-notes {
          background:rgba(0,229,255,0.04); border:1px solid rgba(0,229,255,0.1);
          border-radius:10px; padding:12px 14px; margin-bottom:18px;
          font-size:12px; color:#5a8aaa; line-height:1.6; max-height:120px; overflow-y:auto;
        }
        .upd-progress { margin-bottom:18px; display:none; }
        .upd-progress.show { display:block; }
        .upd-progress-label { font-size:11px; color:#5a8aaa; margin-bottom:6px; display:flex; justify-content:space-between; }
        .upd-progress-bar { background:rgba(0,229,255,0.08); border-radius:20px; height:8px; overflow:hidden; }
        .upd-progress-fill { height:100%; background:linear-gradient(90deg,#0066ff,#00e5ff);
          border-radius:20px; transition:width .3s; width:0%; }
        .upd-actions { display:flex; gap:10px; }
        .upd-btn { flex:1; padding:13px; border-radius:10px; border:none; cursor:pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size:11px; font-weight:700; letter-spacing:2px;
          transition:all .2s; }
        .upd-btn-primary { background:linear-gradient(135deg,#0044cc,#0066ff,#00aaff);
          background-size:200%; color:#fff; animation:grad 3s ease infinite; }
        @keyframes grad { 0%,100%{background-position:0%} 50%{background-position:100%} }
        .upd-btn-primary:hover { transform:translateY(-2px); box-shadow:0 6px 20px rgba(0,102,255,.5); }
        .upd-btn-primary:disabled { opacity:.5; cursor:not-allowed; transform:none; }
        .upd-btn-skip { background:rgba(0,229,255,0.06); color:#5a8aaa;
          border:1px solid rgba(0,229,255,0.15); }
        .upd-btn-skip:hover { background:rgba(0,229,255,0.12); color:#e0f4ff; }
        .upd-force-note { text-align:center; font-size:11px; color:#ff8899;
          margin-bottom:14px; padding:8px 12px; background:rgba(255,68,102,0.08);
          border:1px solid rgba(255,68,102,0.2); border-radius:8px; }
        .upd-spinner { display:inline-block; width:12px; height:12px;
          border:2px solid rgba(255,255,255,0.3); border-top-color:#fff;
          border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; margin-right:6px; }
        @keyframes spin { to{transform:rotate(360deg)} }
      </style>
      <div class="upd-box">
        <div class="upd-icon" id="updIcon">🚀</div>
        <div class="upd-title" id="updTitle">UPDATE TERSEDIA</div>
        <div class="upd-ver">
          <span class="old" id="updOldVer">v1.0.0</span>
          <span class="arrow">→</span>
          <span class="new" id="updNewVer">v1.1.0</span>
        </div>
        <div class="upd-force-note" id="updForceNote" style="display:none">
          ⚠ Update ini wajib diinstal untuk melanjutkan menggunakan aplikasi
        </div>
        <div class="upd-notes" id="updNotes">Versi baru tersedia.</div>
        <div class="upd-progress" id="updProgress">
          <div class="upd-progress-label">
            <span id="updProgressLabel">Mengunduh...</span>
            <span id="updProgressPct">0%</span>
          </div>
          <div class="upd-progress-bar">
            <div class="upd-progress-fill" id="updProgressFill"></div>
          </div>
        </div>
        <div class="upd-actions">
          <button class="upd-btn upd-btn-skip" id="updSkipBtn" onclick="CimegaUpdater.skip()">Nanti</button>
          <button class="upd-btn upd-btn-primary" id="updMainBtn" onclick="CimegaUpdater.startUpdate()">
            ⬇️ UPDATE SEKARANG
          </button>
        </div>
      </div>`;
    document.body.appendChild(el);
  }

  function showPopup() {
    createPopup();
    document.getElementById('cimegaUpdaterPopup').classList.add('show');
  }
  function hidePopup() {
    const el = document.getElementById('cimegaUpdaterPopup');
    if (el) el.classList.remove('show');
  }

  // ── Isi konten popup ─────────────────────
  function fillPopup(info, forceUpdate) {
    document.getElementById('updOldVer').textContent = 'v' + currentVersion;
    document.getElementById('updNewVer').textContent = 'v' + info.latestVersion;
    document.getElementById('updNotes').innerHTML = (info.releaseNotes || 'Tidak ada catatan.').replace(/\n/g, '<br/>');
    document.getElementById('updForceNote').style.display = forceUpdate ? '' : 'none';
    document.getElementById('updSkipBtn').style.display = forceUpdate ? 'none' : '';
    document.getElementById('updTitle').textContent = forceUpdate ? 'UPDATE WAJIB' : 'UPDATE TERSEDIA';
    document.getElementById('updIcon').textContent = forceUpdate ? '⚠️' : '🚀';
    document.getElementById('updMainBtn').disabled = false;
    document.getElementById('updMainBtn').innerHTML = '⬇️ UPDATE SEKARANG';
    document.getElementById('updProgress').classList.remove('show');
  }

  // ── Update progress bar ──────────────────
  function updateProgress(pct, downloaded, total) {
    document.getElementById('updProgress').classList.add('show');
    document.getElementById('updProgressFill').style.width = pct + '%';
    document.getElementById('updProgressPct').textContent = pct + '%';
    const dlMB = (downloaded / 1024 / 1024).toFixed(1);
    const ttMB = total > 0 ? (total / 1024 / 1024).toFixed(1) + ' MB' : '...';
    document.getElementById('updProgressLabel').textContent = `Mengunduh... ${dlMB} MB / ${ttMB}`;
  }

  // ── Cek update dari Firebase + GitHub ───
  async function checkUpdate(db, force = false) {
    try {
      if (!db || !window._fb) return;
      const { doc, getDoc } = window._fb;

      // Ambil versi dari Firestore (yang di-push admin)
      const snap = await getDoc(doc(db, 'appConfig', 'version'));
      if (!snap.exists()) return;

      const serverData = snap.data();
      const serverVer = serverData.current || '1.0.0';
      const forceUpdate = serverData.forceUpdate || false;
      const githubOwner = serverData.githubOwner || config.owner;
      const githubRepo = serverData.githubRepo || config.repo;

      if (!isNewerVersion(serverVer, currentVersion) && !force) return;

      // Versi di Firestore lebih baru → cek GitHub untuk URL download
      let downloadUrl = serverData.downloadUrl || '';
      let releaseNotes = serverData.notes || '';

      // Kalau ada GitHub config, cek GitHub Releases untuk info lebih lengkap
      if (githubOwner && githubRepo) {
        const ghInfo = await _api().checkGithubUpdate({
          owner: githubOwner,
          repo: githubRepo,
        });
        if (!ghInfo.error) {
          downloadUrl = ghInfo.downloadUrl || downloadUrl;
          releaseNotes = ghInfo.releaseNotes || releaseNotes;
        }
      }

      updateAvailable = {
        latestVersion: serverVer,
        downloadUrl,
        releaseNotes,
        forceUpdate,
      };

      fillPopup(updateAvailable, forceUpdate);
      showPopup();

    } catch (e) {
      console.warn('CimegaUpdater: gagal cek update:', e.message);
    }
  }

  // ── Mulai download & install ─────────────
  async function startUpdate() {
    if (!updateAvailable || isDownloading) return;
    if (!updateAvailable.downloadUrl) {
      await _api().openExternal('https://github.com/' + config.owner + '/' + config.repo + '/releases/latest');
      return;
    }

    isDownloading = true;
    const btn = document.getElementById('updMainBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="upd-spinner"></span>MENGUNDUH...';
    document.getElementById('updSkipBtn').style.display = 'none';
    document.getElementById('updProgress').classList.add('show');

    // Dengarkan progress dari main process
    _api().onDownloadProgress((data) => {
      updateProgress(data.pct, data.downloaded, data.total);
    });

    const result = await _api().downloadUpdate({
      url: updateAvailable.downloadUrl,
      version: updateAvailable.latestVersion,
    });

    _api().removeDownloadListener();
    isDownloading = false;

    if (!result.success) {
      btn.disabled = false;
      btn.innerHTML = '⬇️ COBA LAGI';
      document.getElementById('updProgressLabel').textContent = '❌ Gagal: ' + result.error;
      return;
    }

    downloadedPath = result.filePath;
    btn.disabled = false;
    btn.innerHTML = '✅ INSTALL SEKARANG';
    btn.onclick = () => CimegaUpdater.installNow();
    document.getElementById('updProgressLabel').textContent = '✅ Unduhan selesai! Klik Install untuk melanjutkan.';
    document.getElementById('updProgressFill').style.width = '100%';
    document.getElementById('updProgressPct').textContent = '100%';
  }

  // ── Install ──────────────────────────────
  async function installNow() {
    if (!downloadedPath) return;
    const btn = document.getElementById('updMainBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="upd-spinner"></span>MENGINSTAL...';
    document.getElementById('updProgressLabel').textContent = 'Memulai installer, aplikasi akan ditutup...';

    await _api().installUpdate({ filePath: downloadedPath });
  }

  // ── Skip ─────────────────────────────────
  function skip() {
    hidePopup();
    isDownloading = false;
    // Jika force update, tidak bisa skip — logout paksa
    if (updateAvailable?.forceUpdate) {
      localStorage.removeItem('cimega_user');
      window.location.href = window.location.href.includes('admin')
        ? '../login/login.html'
        : '../login/login.html';
    }
  }

  // ── Bandingkan versi ─────────────────────
  function isNewerVersion(remote, local) {
    const parse = v => v.replace(/[^0-9.]/g, '').split('.').map(Number);
    const r = parse(remote), l = parse(local);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      const rv = r[i] || 0, lv = l[i] || 0;
      if (rv > lv) return true;
      if (rv < lv) return false;
    }
    return false;
  }

  // ── Public API ───────────────────────────
  async function init(cfg) {
    Object.assign(config, cfg || {});
    createPopup();

    // Ambil versi lokal
    try {
      const appConfig = await _api().getAppConfig();
      currentVersion = appConfig.appVersion || '1.0.0';
    } catch (e) { }
  }

  // Panggil ini setelah Firebase db siap
  function startChecking(db) {
    // Cek langsung saat pertama kali
    setTimeout(() => checkUpdate(db), 3000);
    // Cek berkala
    setInterval(() => checkUpdate(db), config.checkInterval);
  }

  return { init, startChecking, skip, startUpdate, installNow };
})();
