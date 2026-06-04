/**
 * @file settings.js
 * @description Dashboard Core Logic
 */

let db, userData;
let pageHistory = [], currentKat = '', currentDocId = '', currentDocName = '';
let allShared = [], allApprovals = [], currentShareDocId = '';
let pageSettings = { size: 'A4', margin: 'Normal', orientation: 'Portrait' };
let _kontenCache = {}, _menuDataDynamic = [];
let _activeDocData = null; // Menyimpan metadata dokumen yang sedang dibuka

userData = JSON.parse(localStorage.getItem('cimega_user') || '{}');
console.log('Settings: User data loaded', userData);

if (!userData?.role || userData.role === 'admin') {
  console.warn('Settings: User role invalid or admin, redirecting...');
  // Only redirect if NOT in a dev environment OR if it's clear we have no data
  if (!userData?.nama) {
    window.location.href = '../login/login.html';
  }
}

// Identity normalization
if (!userData.roles) {
  userData.roles = userData.role ? [userData.role.toLowerCase().trim().replace(/[\s-]/g, '_')] : ['guru'];
} else if (!Array.isArray(userData.roles)) {
  userData.roles = [userData.roles.toLowerCase().trim().replace(/[\s-]/g, '_')];
} else {
  userData.roles = userData.roles.map(r => r.toLowerCase().trim().replace(/[\s-]/g, '_'));
}
window._userData = userData; // Global access

let _chatUnsub = null, _sharedUnsub = null;

function filterAiTabsByRole() {
  // Implement role-based AI tab visibility if needed in the future
  const roles = userData.roles;
  // Currently, the AI section in dashboard.html only contains one panel (Chatbot).
  // This function is defined to satisfy calls in loadKontenDynamic.
}

// Category metadata
let katMeta = {};

// API bridge
const _api = window.cimegaConfig || window.cimegaAPI;

// Global exports
window.showPage = showPage;
window.goBack = goBack;
window.openDocList = openDocList;
window.openDoc = openDoc;
window.navTo = navTo;
window.navToMenu = navToMenu;
window.doLogout = doLogout;
window.generateWithAI = generateWithAI;

// System autoloader
async function bootSystemAutoloader() {
  console.log('🚀 Autoloader: Memulai sinkronisasi template di latar belakang...');
  try {
    // 1. Load Modul Jalur Logic (.js)
    const moduleFiles = await _api.listFiles('src/features', true);
    for (const file of moduleFiles) {
      if (file.endsWith('.js') && !file.includes('settings.js') && !file.includes('admin/')) {
        if (document.querySelector(`script[src*="${file}"]`)) continue;
        const script = document.createElement('script');
        script.src = `../../features/${file}`;
        document.head.appendChild(script);
      }
    }

    // 2. Load Jalur Template (.html)
    const pageFiles = await _api.listFiles('src/pages', true);
    const templateStore = document.getElementById('universal-template-store');
    if (!templateStore) return;

    // Filter relevant templates to prevent scanning generated documents
    const templateFiles = pageFiles.filter(f => f.endsWith('.html') && !['dashboard/', 'login/', 'admin/', 'bgm/', 'docs/'].some(p => f.includes(p)));

    // Load templates in parallel
    await Promise.all(templateFiles.slice(0, 25).map(async (file) => {
      try {
        const res = await _api.readFile(`src/pages/${file}`);
        if (res.success) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(res.data, 'text/html');
          const content = doc.querySelector('.content') || doc.body;
          if (content) {
            const wrapper = document.createElement('div');
            wrapper.id = `template-${file.replace(/\//g, '-').replace('.html', '')}`;
            wrapper.className = 'autoloader-template';
            wrapper.innerHTML = content.innerHTML;
            templateStore.appendChild(wrapper);
          }
        }
      } catch (e) { }
    }));
    console.log(`✅ Autoloader: Selesai memuat ${templateFiles.length} template.`);
  } catch (err) {
    console.warn('⚠️ Autoloader Partial Failure:', err.message);
  }
}
// Role-based category mapping
const katByRole = {
  guru: [],
  guru_pai: [],
  guru_pjok: [],
  kepsek: [],
  bendahara: [],
  ops: [],
  tu: [],
  pustakawan: [],
  gpk: [],
  ekskul: [],
  koordinator: [],
  fasilitator: [],
};

const KAT_ORDER = [];

function getOrderedKats(roles) {
  const merged = new Set();
  roles.forEach(r => { (katByRole[r] || []).forEach(k => merged.add(k)); });
  return KAT_ORDER.filter(k => merged.has(k));
}

// Data synchronization
let _kontenUnsub = null;
let _katUnsub = null;

function loadKontenDynamic() {
  const { collection, onSnapshot, query, orderBy, where } = window._fb;
  const roles = userData.roles || ['guru'];
  const sekolah = userData.sekolah;

  if (_kontenUnsub) _kontenUnsub();
  if (_katUnsub) _katUnsub();
  if (_chatUnsub) _chatUnsub();
  if (_sharedUnsub) _sharedUnsub();

  let katLoaded = false;
  let kontenLoaded = false;

  const tryRefresh = () => {
    if (katLoaded && kontenLoaded) refreshDashboardUI();
  };

  // Listen Categories
  _katUnsub = onSnapshot(query(collection(db, 'kategori'), orderBy('urutan', 'asc')), snap => {
    snap.forEach(d => {
      const data = d.data();
      katMeta[d.id] = {
        icon: data.icon || '📄',
        title: data.nama,
        desc: data.deskripsi || '',
        urutan: data.urutan || 99,
        visibleTo: data.visibleTo || [] // Simpan konfigurasi visibleTo dari Firestore
      };
    });
    katLoaded = true;
    console.log(`Settings: Kategori loaded (${snap.size} items)`);
    tryRefresh();
  }, err => {
    console.warn("Kat Listener error:", err);
    katLoaded = true; tryRefresh();
  });

  // 2. Listen Konten
  _kontenUnsub = onSnapshot(collection(db, 'konten'), snap => {
    const byKat = {};
    snap.forEach(d => {
      const data = d.data();
      const visible = data.visibleTo || ['guru', 'kepsek', 'bendahara', 'ops'];
      const canSee = roles.some(r => visible.includes(r));
      if (!canSee) return;
      if (!data.kategori || !data.nama) return; // Mencegah munculnya kategori/dokumen "undefined"
      if (!byKat[data.kategori]) byKat[data.kategori] = [];
      byKat[data.kategori].push({ id: d.id, nama: data.nama, ...data });
    });
    _kontenCache = byKat;
    kontenLoaded = true;
    console.log(`Settings: Konten cache updated (${snap.size} docs total)`);
    tryRefresh();
  }, err => {
    console.warn("Konten Listener error:", err);
    kontenLoaded = true; tryRefresh();
  });

  // 3. Listen Shared Docs (Real-time) — dengan error handler agar tidak crash jika sekolah kosong
  if (sekolah) {
    _sharedUnsub = onSnapshot(
      query(collection(db, 'shared_docs'), where('sekolah', '==', sekolah), orderBy('sharedAt', 'desc')),
      snap => {
        allShared = [];
        snap.forEach(d => allShared.push({ id: d.id, ...d.data() }));
        const sharedPage = document.getElementById('page-shared');
        if (sharedPage && sharedPage.classList.contains('active')) renderShared('all');
      },
      err => { console.warn('SharedDocs listener error (non-fatal):', err.message); }
    );
  }
}

function refreshDashboardUI() {
  const roles = userData.roles || ['guru'];

  // Build kategori order dari Firestore visibleTo (bukan hardcoded)
  const allKatIds = Object.keys(katMeta)
    .sort((a, b) => (katMeta[a].urutan || 99) - (katMeta[b].urutan || 99));

  const ordered = allKatIds.filter(katId => {
    const vt = katMeta[katId].visibleTo;
    if (!vt || vt.length === 0) return true;

    // Role Normalization for filtering
    return roles.some(r => {
      const nr = r.toLowerCase().trim();
      return vt.some(v => v.toLowerCase().trim() === nr);
    });
  });

  _menuDataDynamic = [];

  // 1. Tambahkan kategori yang ada di katMeta
  ordered.forEach(katId => {
    const meta = katMeta[katId];
    const docs = _kontenCache[katId] || [];
    if (meta) {
      _menuDataDynamic.push({
        id: katId,
        icon: meta.icon || '📄',
        title: meta.title || katId,
        desc: meta.desc || '',
        items: docs.map(d => d.nama),
        docs: docs
      });
    }
  });

  // 2. Fallback: Tambahkan kategori kustom yang ada di konten tapi tidak ada di kategori
  Object.keys(_kontenCache).forEach(katId => {
    if (!ordered.includes(katId) && !katMeta[katId]) {
      const docs = _kontenCache[katId] || [];
      if (docs.length > 0) {
        // Cek permission dari dokumen pertama di kategori ini
        const d = docs[0];
        const visible = d.visibleTo || ['guru', 'kepsek', 'bendahara', 'ops'];
        const canSee = roles.some(r => visible.includes(r));
        if (canSee) {
          _menuDataDynamic.push({
            id: katId,
            icon: '📁',
            title: katId.replace(/_/g, ' ').toUpperCase(),
            desc: 'Kategori Kustom',
            items: docs.map(d => d.nama),
            docs: docs
          });
        }
      }
    }
  });

  buildSidebar();

  // Async load dynamic modules
  if (window.fetchDynamicModules) {
      window.fetchDynamicModules().then(modules => {
          window._fetchedDynamicModules = modules;
          window._dynamicModulesMap = {};
          modules.forEach(m => window._dynamicModulesMap[m.id] = m);
          if (modules.length > 0) buildSidebar(); // Re-render sidebar if modules exist
      }).catch(err => console.error("Dynamic modules failed to load", err));
  }

  // UI Sync
  if (document.getElementById('page-beranda')?.classList.contains('active')) loadBeranda();
  if (document.getElementById('page-menu')?.classList.contains('active')) renderMenuGrid(_menuDataDynamic);

  filterAiTabsByRole();
}

// Clock
setInterval(() => {
  const el = document.getElementById('topbarTime');
  if (el) el.textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}, 1000);

// Toast
function showToast(type, title, msg) {
  const icons = { success: '✅', error: '❌', warn: '⚠️', info: 'ℹ️' };
  const t = document.createElement('div'); t.className = `toast ${type}`;
  t.innerHTML = `<span style="font-size:16px">${icons[type] || 'ℹ️'}</span><div><strong style="display:block;margin-bottom:1px">${title}</strong>${msg || ''}</div>`;
  const wrap = document.getElementById('toastWrap');
  if (wrap) {
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }
}
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
function openModal(id) { document.getElementById(id)?.classList.add('show'); }

// Navigation
function showPage(id, title) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');
  const tt = document.getElementById('topbarTitle');
  if (tt) tt.textContent = title || id.toUpperCase();
}
function goBack() {
  if (pageHistory.length > 0) { const p = pageHistory.pop(); showPage(p.id, p.title); }
  else showPage('beranda', 'BERANDA');
}
function goBackToList() { showPage('doclist', 'DAFTAR DOKUMEN'); }

// Sidebar
function buildSidebar() {
  const roles = userData.roles || ['guru'];
  const sidebar = document.getElementById('sidebarNav');
  
  if (sidebar) {
      if (window.CimegaRouter) {
          // Use the static 39-module cyber-glass router
          let html = window.CimegaRouter.getSidebarMenuHtml(roles);
          
          // Append kolaborasi & AI
          html += `<div class="nav-section">Kolaborasi</div>
          <div class="nav-item" onclick="navTo(this,'chat','CHAT SEKOLAH',()=>window.CimegaChat.init(db,'page-chat',{tab:'school'}))"><span class="nav-icon">💬</span>Chat Sekolah</div>
          <div class="nav-item" onclick="navTo(this,'sharing','BERBAGI DOKUMEN',()=>window.CimegaSharing.init())"><span class="nav-icon">📤</span>Berbagi Dokumen</div>`;

          if (roles.includes('kepsek')) {
            html += `<div class="nav-item" onclick="navTo(this,'chat','FORUM KEPSEK',()=>window.CimegaChat.init(db,'page-chat',{tab:'kepsek'}))"><span class="nav-icon">🏛️</span>Forum Kepsek</div>`;
          }

          html += `<div class="nav-section">Fitur AI</div>
          <div class="nav-item" onclick="navTo(this,'ai','AI ASISTEN',()=>window.CimegaAIChatbot.renderTo('aiPanel-chat'))"><span class="nav-icon">✨</span>AI Asisten</div>`;

          html += `<div class="nav-section">Lainnya</div>
          <div class="nav-item" onclick="navTo(this,'profil','PROFIL SAYA',loadProfil)"><span class="nav-icon">👤</span>Profil Saya</div>`;
          
          sidebar.innerHTML = html;
      } else {
          sidebar.innerHTML = '<div style="color:var(--danger);padding:10px;">Router Error: Tidak dapat memuat daftar modul 2026/2027.</div>';
      }
  }
}
function navTo(el, pageId, title, fn) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  // Senior Optimization: Reset history to Beranda when switching major sections
  // This prevents infinite breadcrumb growth while keeping the back button useful within modules
  pageHistory = [{ id: 'beranda', title: 'BERANDA' }];
  showPage(pageId, title);
  if (fn) fn();
}
function navToMenu(el, menuId) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  pageHistory = [{ id: 'beranda', title: 'BERANDA' }];

  // Tampilkan halaman administrasi split-view
  showPage('administrasi', 'ADMINISTRASI DIGITAL');

  if (menuId) {
    renderAdmLeftPanel(menuId);
  } else {
    const leftEl = document.getElementById('admLeftList');
    if (leftEl) leftEl.innerHTML = '<div class="adm-empty-state" style="padding:20px;height:auto"><p>Pilih kategori dari sidebar</p></div>';
  }
}

// Split-view Left Panel
function renderAdmLeftPanel(katId) {
  const leftEl = document.getElementById('admLeftList');
  const titleEl = document.getElementById('admPageTitle');
  const subEl = document.getElementById('admPageSub');
  if (!leftEl) return;

  const menu = _menuDataDynamic.find(m => m.id === katId);
  if (!menu) {
    leftEl.innerHTML = '<div class="adm-empty-state" style="padding:20px;height:auto"><p>Kategori tidak ditemukan.</p></div>';
    return;
  }

  if (titleEl) titleEl.textContent = menu.title.toUpperCase();
  if (subEl) subEl.textContent = menu.docs.length + ' administrasi tersedia';

  const renderBody = document.getElementById('admRenderBody');
  const renderTitle = document.getElementById('admRenderTitle');
  const katBadge = document.getElementById('admKatBadge');
  if (renderBody) renderBody.innerHTML = '<div class="adm-empty-state"><div class="icon">📋</div><p>Pilih item administrasi di panel kiri<br>untuk memulai pengerjaan</p></div>';
  if (renderTitle) renderTitle.textContent = 'AREA KERJA';
  if (katBadge) { katBadge.textContent = menu.title; katBadge.style.display = ''; }

  const icons = ['📄', '📝', '📋', '🗒️', '📃', '📑', '🗃️', '📂', '🗂️', '📊'];

  if (menu.docs.length === 0) {
    leftEl.innerHTML = '<div class="adm-empty-state" style="padding:20px;height:auto"><div class="icon" style="font-size:28px;margin-bottom:8px">📭</div><p>Belum ada administrasi<br>di kategori ini.</p></div>';
    return;
  }

  leftEl.innerHTML = menu.docs.map(function(docData, i) {
    var safeName = docData.nama.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    // Embed modul_id dan hasModul sebagai data-attribute untuk akses cepat tanpa re-query
    var hasModul = !!(docData.modul && docData.modul.koding_html) ? '1' : '0';
    var modulBadge = hasModul === '1' ? '<span style="font-size:8px;background:rgba(0,229,255,0.15);color:#00e5ff;padding:1px 5px;border-radius:3px;margin-left:4px;border:1px solid rgba(0,229,255,0.3)">⚡</span>' : '';
    return '<div class="adm-list-item" id="adm-item-' + i + '" data-kat="' + katId + '" data-idx="' + i + '" data-has-modul="' + hasModul + '" onclick="openAdmItem(' + i + ')">' +
      '<span class="adm-list-item-icon">' + icons[i % icons.length] + '</span>' +
      '<span class="adm-list-item-name">' + safeName + modulBadge + '</span>' +
      '</div>';
  }).join('');
}

// Split-view Left Panel click handler
// Signature baru: hanya pakai index (data diambil dari _currentAdmKatId cache)
var _currentAdmKatId = '';
function openAdmItem(itemIndex) {
  // Ambil el dan metadata dari DOM
  var el = document.getElementById('adm-item-' + itemIndex);
  var katId = el ? el.getAttribute('data-kat') : _currentAdmKatId;

  // 1. Set active class
  document.querySelectorAll('.adm-list-item').forEach(function(e) { e.classList.remove('active'); });
  if (el) el.classList.add('active');

  // 2. Ambil data lengkap dari cache _menuDataDynamic
  var menu = _menuDataDynamic.find(function(m) { return m.id === katId; });
  if (!menu) { console.warn('openAdmItem: kategori tidak ada di cache:', katId); return; }
  var docData = menu.docs[itemIndex];
  if (!docData) { console.warn('openAdmItem: doc tidak ada di index:', itemIndex); return; }

  var docName = docData.nama;

  // 3. Update header panel kanan
  var renderTitle = document.getElementById('admRenderTitle');
  if (renderTitle) renderTitle.textContent = docName.toUpperCase();
  var renderBody = document.getElementById('admRenderBody');
  if (renderBody) renderBody.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)"><div class="spinner"></div><p style="margin-top:12px;font-size:11px">Memuat modul...</p></div>';

  // Priority Chain
  // LAYER 0 (TERCEPAT): Cek data.modul.koding_html dari cache konten (ditulis oleh modul_builder.js)
  if (docData.modul && docData.modul.koding_html && docData.modul.koding_html.trim() !== '') {
    console.log('✅ [LAYER 0] Modul ditemukan via cache konten.modul:', docData.id);
    renderDynamicModuleInPanel({
      id: docData.id,
      nama: docData.nama,
      koding_html: docData.modul.koding_html,
      koding_js: docData.modul.koding_js || '',
      ai_prompt: docData.modul.ai_prompt || ''
    });
    return;
  }

  // LAYER 1: Cek _dynamicModulesMap via ID langsung (jika modul sudah di-cache dari fetchDynamicModules)
  if (window._dynamicModulesMap && window._dynamicModulesMap[docData.id]) {
    var modById = window._dynamicModulesMap[docData.id];
    if (modById.koding_html && modById.koding_html.trim() !== '') {
      console.log('✅ [LAYER 1] Modul ditemukan via ID di _dynamicModulesMap:', docData.id);
      renderDynamicModuleInPanel(modById);
      return;
    }
  }

  // LAYER 2: Cek _dynamicModulesMap via NAME MATCHING (fallback jika ID berbeda)
  if (window._dynamicModulesMap) {
    var docNameLower = docName.toLowerCase().trim();
    var matchedMod = null;
    Object.values(window._dynamicModulesMap).forEach(function(m) {
      if (m && m.nama && m.nama.toLowerCase().trim() === docNameLower && m.koding_html) {
        matchedMod = m;
      }
    });
    if (matchedMod) {
      console.log('✅ [LAYER 2] Modul ditemukan via name match:', matchedMod.id || matchedMod.nama);
      renderDynamicModuleInPanel(matchedMod);
      return;
    }
  }

  // LAYER 3 (FALLBACK): Async query ke Firestore modul_dinamis + konten
  renderDocInPanel(katId, docName, docData.id);
}

// Render dynamic module to right panel
function renderDynamicModuleInPanel(modulData) {
  var renderBody = document.getElementById('admRenderBody');
  if (!renderBody) {
    if (window.renderDynamicModule) window.renderDynamicModule(modulData);
    return;
  }

  // Bersihkan skrip & gaya dari modul sebelumnya
  document.querySelectorAll('.dynamic-injected-script, .dynamic-injected-style').forEach(function(el) { el.remove(); });

  var rawHTML = modulData.koding_html || '';
  var extractedStyles = '';

  // Ekstrak CSS dari tag <style> dan suntikkan ke document.head agar tidak disanitasi
  rawHTML = rawHTML.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, function(match, styleContent) {
    extractedStyles += styleContent + '\n';
    return '';
  });

  if (extractedStyles.trim() !== '') {
    var styleEl = document.createElement('style');
    styleEl.id = 'dynamic-modul-style-' + (modulData.id || 'temp');
    styleEl.className = 'dynamic-injected-style';
    styleEl.textContent = extractedStyles;
    document.head.appendChild(styleEl);
    console.log('⚡ CSS Modul Panel [' + modulData.id + '] disuntikkan ke document.head');
  }

  renderBody.innerHTML = '<div class="cyber-panel fade-in" style="height:100%"><div id="dynamic-content-wrapper" style="height:100%">' + rawHTML + '</div></div>';

  window._currentDynamicPrompt = modulData.ai_prompt;

  if (modulData.koding_js) {
    try {
      var scriptEl = document.createElement('script');
      scriptEl.className = 'dynamic-injected-script';
      scriptEl.textContent = '(function() { try { ' + modulData.koding_js + ' console.log("⚡ Modul Panel [' + modulData.id + '] berhasil dimuat."); } catch(err) { console.error("⚠️ Error pada logika Modul:", err); if(window.showToast) window.showToast("error","Logic Error","Terjadi kesalahan pada skrip modul."); } })();';
      document.body.appendChild(scriptEl);
    } catch(e) {
      console.error('Gagal menyuntikkan skrip modul panel:', e);
    }
  }
}

// Render document to right panel
async function renderDocInPanel(katId, docName, kontenId) {
  var renderBody = document.getElementById('admRenderBody');
  if (!renderBody) return;

  renderBody.innerHTML = '<div style="text-align:center;padding:40px;color:var(--muted)"><div class="spinner"></div><p style="margin-top:12px;font-size:11px">Memuat konten...</p></div>';

  try {
    const { collection, query, where, getDocs, doc, getDoc } = window._fb;

    // ── LAYER 0: Direct getDoc modul_dinamis/{kontenId} (O(1), tanpa query scan) ──
    if (kontenId) {
      try {
        const modulSnap = await getDoc(doc(db, 'modul_dinamis', kontenId));
        if (modulSnap.exists()) {
          const modulData = modulSnap.data();
          if (modulData.koding_html && modulData.koding_html.trim() !== '') {
            console.log('✅ [LAYER 0 Async] Modul ditemukan via direct ID:', kontenId);
            // Cache untuk akses berikutnya
            if (!window._dynamicModulesMap) window._dynamicModulesMap = {};
            window._dynamicModulesMap[kontenId] = { id: kontenId, ...modulData };
            renderDynamicModuleInPanel({ id: kontenId, ...modulData });
            return;
          }
        }
      } catch (e0) {
        console.warn('[LAYER 0] getDoc modul_dinamis gagal (non-fatal):', e0.message);
      }
    }

    // ── LAYER 1: Query konten collection + cek field inline koding_html ──
    const kontenSnap = await getDocs(query(
      collection(db, 'konten'),
      where('kategori', '==', katId),
      where('nama', '==', docName.trim())
    ));

    if (!kontenSnap.empty) {
      const kontenDoc = kontenSnap.docs[0];
      const kontenData = kontenDoc.data();

      // Cek koding_html langsung di doc konten (field inline)
      if (kontenData.koding_html && kontenData.koding_html.trim() !== '') {
        console.log('✅ [LAYER 1] koding_html inline di konten doc:', kontenDoc.id);
        renderDynamicModuleInPanel({
          id: kontenDoc.id,
          nama: kontenData.nama || docName,
          koding_html: kontenData.koding_html,
          koding_js: kontenData.koding_js || '',
          ai_prompt: kontenData.ai_prompt || kontenData.prompt || ''
        });
        return;
      }

      // Cek nested field konten.modul.koding_html (format lama modul_builder.js)
      if (kontenData.modul && kontenData.modul.koding_html && kontenData.modul.koding_html.trim() !== '') {
        console.log('✅ [LAYER 1b] koding_html di konten.modul:', kontenDoc.id);
        renderDynamicModuleInPanel({
          id: kontenDoc.id,
          nama: kontenData.nama || docName,
          koding_html: kontenData.modul.koding_html,
          koding_js: kontenData.modul.koding_js || '',
          ai_prompt: kontenData.modul.ai_prompt || ''
        });
        return;
      }
    }

    // ── LAYER 2: Query modul_dinamis by nama ──
    try {
      const modulSnap = await getDocs(query(
        collection(db, 'modul_dinamis'),
        where('nama', '==', docName.trim())
      ));
      if (!modulSnap.empty) {
        const modulDoc = modulSnap.docs[0];
        const modulData = modulDoc.data();
        if (modulData.koding_html && modulData.koding_html.trim() !== '') {
          console.log('✅ [LAYER 2] Modul ditemukan via nama query:', modulDoc.id);
          if (!window._dynamicModulesMap) window._dynamicModulesMap = {};
          window._dynamicModulesMap[modulDoc.id] = { id: modulDoc.id, ...modulData };
          renderDynamicModuleInPanel({ id: modulDoc.id, ...modulData });
          return;
        }
      }
    } catch (e2) {
      console.warn('[LAYER 2] modul_dinamis nama query gagal (non-fatal):', e2.message);
    }

    // ── LAYER 3 (FALLBACK): Tampilkan dokumen default ──
    if (kontenSnap.empty) {
      renderBody.innerHTML = '<div class="adm-empty-state"><div class="icon">📄</div><p>Konten belum tersedia<br><span style="font-size:10px;color:var(--muted)">Hubungi administrator untuk mengisi template</span></p></div>';
      return;
    }

    const d = kontenSnap.docs[0];
    const data = d.data();
    currentDocId = d.id;
    currentDocName = docName;
    currentKat = katId;
    _activeDocData = data;

    const savedContent = data.savedContentByUser?.[userData.id] || data.savedContent || null;

    if (data.components && data.components.length > 0 && !savedContent) {
      var formHtml = data.components.map(function(c) {
        return '<div class="form-group-ai"><label>' + c.label + '</label><textarea id="ai-input-' + c.id + '" placeholder="Masukkan data untuk ' + c.label + '..." class="ai-form-input"></textarea></div>';
      }).join('');
      renderBody.innerHTML = '<div class="doc-form-container"><div style="font-size:11px;color:var(--cyan);letter-spacing:1px;margin-bottom:14px;font-weight:700">✏️ PARAMETER ADMINISTRASI</div>' + formHtml + '<div class="ai-action-bar"><button class="btn-generate-big" id="btnGenerateAI" onclick="generateWithAI()"><span>✨</span> GENERASI DATA AI</button></div><div class="ai-disclaimer">Data diproses oleh AI Gemini · Kurikulum Merdeka 2025/2026</div></div>';
    } else {
      var content = savedContent ||
        (data.template ? data.template.replace(/\n/g, '<br/>') : null) ||
        '<div style="color:var(--muted);text-align:center;padding:30px"><div style="font-size:36px;margin-bottom:12px">📄</div><div>' + docName + '</div><div style="font-size:11px;margin-top:8px">Template belum diisi admin.</div></div>';

      renderBody.innerHTML =
        '<div style="display:flex;flex-direction:column;height:100%;gap:10px">' +
        '<div id="admDocToolbar" style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;gap:6px;flex-wrap:wrap;flex-shrink:0">' +
        '<button class="btn btn-ghost btn-sm" id="admEditBtn" onclick="toggleAdmEdit()">✏️ Edit</button>' +
        '<button class="btn btn-primary btn-sm" id="admSaveBtn" style="display:none" onclick="saveAdmDoc()">💾 Simpan</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="printAdmDoc()">🖨️ Cetak</button>' +
        '<button class="btn btn-ghost btn-sm" onclick="downloadAdmDoc()">⬇️ Unduh</button>' +
        '</div>' +
        '<div id="admDocContent" style="flex:1;overflow-y:auto;background:rgba(255,255,255,0.02);border:1px solid rgba(0,229,255,0.07);border-radius:9px;padding:16px;font-size:13px;line-height:1.8;color:var(--text);min-height:0" contenteditable="false">' + content + '</div>' +
        '</div>';
    }
  } catch (e) {
    console.error('renderDocInPanel Error:', e);
    renderBody.innerHTML = '<div class="adm-empty-state"><div class="icon">⚠️</div><p>Gagal memuat dokumen.<br><span style="font-size:10px">Cek koneksi internet Anda.</span></p></div>';
  }
}

// Right panel actions (edit/save/print/download)

function toggleAdmEdit() {
  const ce = document.getElementById('admDocContent');
  const editBtn = document.getElementById('admEditBtn');
  const saveBtn = document.getElementById('admSaveBtn');
  if (!ce) return;
  const editing = ce.contentEditable === 'true';
  if (editing) {
    ce.contentEditable = 'false';
    ce.style.borderColor = 'rgba(0,229,255,0.07)';
    if (editBtn) editBtn.textContent = '✏️ Edit';
    if (saveBtn) saveBtn.style.display = 'none';
  } else {
    ce.contentEditable = 'true';
    ce.style.borderColor = 'rgba(0,229,255,0.3)';
    ce.focus();
    if (editBtn) editBtn.textContent = '✕ Batal';
    if (saveBtn) saveBtn.style.display = 'inline-flex';
  }
}
async function saveAdmDoc() {
  if (!currentDocId) { showToast('warn', 'Perhatian', 'Dokumen belum ada di database.'); return; }
  const { doc, updateDoc, serverTimestamp } = window._fb;
  const ce = document.getElementById('admDocContent');
  if (!ce) return;
  try {
    const field = 'savedContentByUser.' + userData.id;
    await updateDoc(doc(db, 'konten', currentDocId), { [field]: ce.innerHTML, updatedAt: serverTimestamp() });
    toggleAdmEdit();
    showToast('success', 'Tersimpan', 'Dokumen berhasil disimpan');
  } catch (e) { showToast('error', 'Gagal', e.message); }
}
function printAdmDoc() {
  const ce = document.getElementById('admDocContent');
  if (!ce) return;
  const w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>' + currentDocName + '</title><style>body{font-family:\'Times New Roman\',serif;font-size:12pt;line-height:1.6;color:#000;padding:2cm}</style></head><body>' + ce.innerHTML + '</body></html>');
  w.document.close();
  setTimeout(function() { w.print(); w.close(); }, 400);
}
function downloadAdmDoc() {
  const ce = document.getElementById('admDocContent');
  if (!ce) return;
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + currentDocName + '</title><style>body{font-family:\'Times New Roman\',serif;font-size:12pt;line-height:1.6;padding:2cm}</style></head><body><h2>' + currentDocName + '</h2><hr/>' + ce.innerHTML + '</body></html>';
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = currentDocName + '.html'; a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Diunduh', currentDocName + ' berhasil diunduh');
}

// Expose ke global
window.renderAdmLeftPanel = renderAdmLeftPanel;
window.openAdmItem = openAdmItem;
window.renderDynamicModuleInPanel = renderDynamicModuleInPanel;
window.renderDocInPanel = renderDocInPanel;
window.toggleAdmEdit = toggleAdmEdit;
window.saveAdmDoc = saveAdmDoc;
window.printAdmDoc = printAdmDoc;
window.downloadAdmDoc = downloadAdmDoc;

// Setup User Profile
function setupUser() {
  // Advanced Resilience: Normalize roles and expand specialized roles to base roles
  let rawRoles = userData.roles || (userData.role ? [userData.role] : ['guru']);
  if (!Array.isArray(rawRoles)) rawRoles = [rawRoles];

  const normalized = rawRoles.map(r => String(r).toLowerCase().trim().replace(/[-\s]/g, '_'));

  // Rule-based expansion: ensures specialized roles inherit base permissions
  const expanded = new Set(normalized);
  normalized.forEach(r => {
    if (r.startsWith('guru_')) expanded.add('guru');
    if (r === 'tata_usaha') expanded.add('tu');
    if (r === 'operator' || r.includes('ops')) expanded.add('ops');
  });

  localStorage.setItem('cimega_user_roles_cached', JSON.stringify([...expanded]));
  userData.roles = [...expanded]; // Store in memory

  // Sidebar Identity
  const elSidebarNama = document.getElementById('sidebarNama');
  if (elSidebarNama) elSidebarNama.textContent = userData.nama || '-';

  const elSidebarSekolah = document.getElementById('sidebarSekolah');
  if (elSidebarSekolah) elSidebarSekolah.textContent = userData.sekolah || '-';

  const logoText = document.getElementById('sidebarLogoText');
  if (logoText) {
    logoText.innerHTML = `SDN CIMEGA<span>SMART OFFICE</span>`;
  }

  // Advanced Branding: Dynamic AI Greeting
  const aiGreeting = document.getElementById('aiInitialGreeting');
  if (aiGreeting) aiGreeting.textContent = `Halo! Saya asisten AI untuk kurikulum dan administrasi ${userData.sekolah || 'sekolah Anda'}. Silakan tanya apa saja. 😊`;

  const roleMap = {
    guru: { cls: 'role-guru', label: '👨‍🏫 Guru Kelas' },
    guru_pai: { cls: 'role-guru', label: '🕌 Guru PAI' },
    guru_pjok: { cls: 'role-guru', label: '🏃 Guru PJOK' },
    kepsek: { cls: 'role-kepsek', label: '🏛️ Kepala Sekolah' },
    bendahara: { cls: 'role-bendahara', label: '💰 Bendahara' },
    ops: { cls: 'role-ops', label: '💻 Operator Sekolah' },
    tu: { cls: 'role-ops', label: '🗂️ Tata Usaha' },
    pustakawan: { cls: 'role-guru', label: '📚 Pustakawan' },
    gpk: { cls: 'role-guru', label: '♿ Guru GPK Inklusif' },
    ekskul: { cls: 'role-guru', label: '🎭 Pembina Ekskul' },
    koordinator: { cls: 'role-kepsek', label: '🎯 Koordinator Kokurikuler' },
    fasilitator: { cls: 'role-guru', label: '🌱 Fasilitator Kokurikuler' },
  };

  const rb = document.getElementById('sidebarRole');
  if (rb) {
    // Prioritaskan specialist role jika ada guru_pai/guru_pjok bersama guru kelas
    let activeRoles = [...userData.roles];
    if (activeRoles.includes('guru_pai') || activeRoles.includes('guru_pjok')) {
      activeRoles = activeRoles.filter(r => r !== 'guru');
    }

    if (activeRoles.length === 1) {
      const r = roleMap[activeRoles[0]] || { cls: 'role-guru', label: activeRoles[0].toUpperCase() };
      rb.className = 'user-role-badge ' + r.cls;
      rb.textContent = r.label;
    } else {
      rb.className = 'user-role-badge role-guru';
      rb.textContent = activeRoles.map(r => roleMap[r]?.label || r.toUpperCase()).join(' · ');
    }
  }

  // Identity Discovery
  const elSidebarAssignment = document.getElementById('sidebarAssignment');
  if (elSidebarAssignment) {
    if (userData.teaching_assignments) {
      const { classes, phases } = userData.teaching_assignments;
      let texts = [];
      if (phases?.length) texts.push(...phases);
      if (classes?.length) texts.push('Klompok: ' + classes.join(', '));

      if (texts.length) {
        elSidebarAssignment.innerHTML = `📍 ${texts.join(' · ')}`;
        elSidebarAssignment.style.display = 'block';
      } else {
        elSidebarAssignment.style.display = 'none';
      }
    } else if (userData.wali_kelas) {
      elSidebarAssignment.innerHTML = `📍 Wali Kelas: ${userData.wali_kelas}`;
      elSidebarAssignment.style.display = 'block';
    } else {
      elSidebarAssignment.style.display = 'none';
    }
  }

  // Topbar & Branding
  const elSchoolName = document.getElementById('schoolName');
  if (elSchoolName) elSchoolName.textContent = userData.sekolah || 'Institusi Belum Terdaftar';

  const elSchoolAddr = document.getElementById('schoolAddr');
  if (elSchoolAddr) elSchoolAddr.textContent = userData.alamat || 'Alamat Belum Diatur';

  // ★ WELCOME SEQUENCE & TIME ★
  const elWelcomeName = document.getElementById('welcomeName');
  if (elWelcomeName) elWelcomeName.textContent = 'Selamat Datang, ' + (userData.nama || 'User') + '!';

  const elWelcomeSub = document.getElementById('welcomeSub');
  if (elWelcomeSub) elWelcomeSub.textContent = userData.sekolah || 'Sistem Administrasi Digital';

  const elWelcomeDate = document.getElementById('welcomeDate');
  if (elWelcomeDate) {
    const now = new Date();
    const tgl = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    elWelcomeDate.innerHTML = `${tgl}<br/><span style="font-size:10px;color:var(--cyan)">${jam} WIB</span>`;
  }
}

// ── 6. MENU GRID RENDERING ───────────────────────────────────────
function renderMenuGrid(menus, targetKatId = null) {
  const grid = document.getElementById('menuGrid');
  if (!grid) return;

  if (targetKatId) {
    const found = menus.find(m => m.id === targetKatId);
    if (found) {
      openDocList(targetKatId);
      return;
    }
  }

  const isBendahara = (userData.roles || []).includes('bendahara');
  grid.innerHTML = menus.map(m => {
    const isBendCategory = m.id.startsWith('bend_');
    return `
    <div class="menu-card${isBendCategory ? ' keuangan-highlight' : ''}"
      onclick="openDocList('${m.id}')">
      <div class="menu-card-count">${m.items.length}</div>
      <div class="menu-card-icon">${m.icon}</div>
      <div class="menu-card-title">${m.title}</div>
      <div class="menu-card-desc">${m.desc}</div>
    </div>`;
  }).join('');
}

// ── 7. DOCUMENT LIST NAVIGATION ──────────────────────────────────
function openDocList(katId) {
  try {
    // INTERCEPT: Cek apakah Kategori Administrasi (katId) ini di-override oleh Modul Dinamis
    // Jika ada modul di database dengan ID yang sama dengan ID menu Administrasi (katId)
    if (window._dynamicModulesMap && window._dynamicModulesMap[katId]) {
      console.log('⚡ Mengalihkan menu ke Modul Dinamis:', katId);
      // Cari elemen menu sidebar yang sedang aktif/diklik agar highlight UI tetap sinkron
      const elSidebar = document.querySelector(`.nav-item[onclick*="navToMenu(this,'${katId}')"]`);
      window.navToDynamicModule(elSidebar, katId);
      return;
    }

    const menu = _menuDataDynamic.find(m => m.id === katId);
    if (!menu) {
      console.warn('openDocList: kategori tidak ditemukan →', katId);
      showToast('error', 'Kategori Kosong', 'Kategori ini tidak ditemukan atau belum disinkronkan.');
      return;
    }
    const katTitle = menu.title;
    const items = menu.items;
    currentKat = katId;
    pageHistory.push({ id: 'menu', title: 'ADMINISTRASI' });
    const titleEl = document.getElementById('doclistTitle');
    if (titleEl) {
      const displayTitle = katTitle.split(' ').slice(0, 3).join(' ');
      titleEl.innerHTML = `<span>${displayTitle}</span>`;
    }

    const subEl = document.getElementById('doclistSub');
    if (subEl) subEl.textContent = katTitle + ' · ' + items.length + ' dokumen';

    const grid = document.getElementById('docGrid');
    if (grid) {
      if (items.length === 0) {
        grid.innerHTML = `
          <div style="text-align:center;padding:60px 20px;color:var(--muted)">
            <div style="font-size:48px;margin-bottom:16px">📄</div>
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:8px">${katTitle}</div>
            <div style="font-size:12px;line-height:1.6">Belum ada dokumen tersedia untuk kategori ini.<br>
            Hubungi administrator untuk menambahkan dokumen.</div>
          </div>`;
      } else {
        const icons = ['📄', '📝', '📋', '🗒️', '📃', '📑', '🗃️'];
        grid.innerHTML = items.map((name, i) => {
          // ★ TEMPLATE GENERATION ★
          const safeName = name.replace(/'/g, "&#39;").replace(/"/g, "&quot;");
          const jsName = name.replace(/'/g, "\\'");
          return `
            <div class="doc-item" onclick="openDoc('${katId}', '${jsName}')">
              <div class="doc-item-icon">${icons[i % icons.length]}</div>
              <div style="flex:1;min-width:0">
                <div class="doc-item-name">${safeName}</div>
                <div class="doc-item-meta">${katTitle}</div>
              </div>
              <span style="color:var(--muted);font-size:11px">▶</span>
            </div>`;
        }).join('');
      }
    }
    showPage('doclist', 'DAFTAR DOKUMEN');
  } catch (err) {
    console.error('openDocList Error:', err);
    showToast('error', 'Keamanan Navigasi', 'Terjadi kesalahan saat membuka daftar dokumen.');
  }
}

// ── 8. DOCUMENT VIEWER & EDITOR ──────────────────────────────────
async function openDoc(katId, docName) {
  try {
    // ADDITIONAL INTERCEPT: Jika ternyata admin menghubungkan ID Modul dengan Konten/Dokumen spesifik (bukan kategori)
    // ID dokumen biasanya sulit ditebak karena berupa UID firestore, tapi jika admin menggunakan slug docName sebagai ID modul
    const possibleModuleId = docName.toLowerCase().replace(/\s+/g, '_').replace(/[^\w\-]+/g, '');
    if (window._dynamicModulesMap && window._dynamicModulesMap[possibleModuleId]) {
      console.log('⚡ Mengalihkan dokumen ke Modul Dinamis:', possibleModuleId);
      window.navToDynamicModule(null, possibleModuleId);
      return;
    }
  } catch(e) {}

  currentKat = katId; currentDocName = docName; currentDocId = '';
  pageHistory.push({ id: 'doclist', title: 'DAFTAR DOKUMEN' });
  
  // RESTORE DEFAULT UI: Kembalikan toolbar jika sebelumnya disembunyikan oleh Modul Dinamis
  const actionBars = document.querySelectorAll('.doc-action-bar, .action-bar');
  actionBars.forEach(el => { el.style.display = 'flex'; });
  const docForm = document.getElementById('docFormContainer');
  if (docForm) docForm.style.display = 'block';
  const saveBtn = document.getElementById('saveBtn');
  const editBtn = document.getElementById('editBtn');
  if (saveBtn) saveBtn.style.display = 'block';
  if (editBtn) editBtn.style.display = 'block';

  const titleEl = document.getElementById('docviewTitle');
  if (titleEl) titleEl.textContent = docName;
  const metaEl = document.getElementById('docviewMeta');
  if (metaEl) metaEl.textContent = katId + ' · ' + pageSettings.size + ' ' + pageSettings.orientation;
  const infoEl = document.getElementById('pageInfoLabel');
  if (infoEl) infoEl.textContent = pageSettings.size + ' | ' + pageSettings.margin + ' | ' + pageSettings.orientation;
  
  const contentEl = document.getElementById('docContent');
  const formContainer = document.getElementById('docFormContainer');
  
  if (contentEl) {
    contentEl.contentEditable = 'false';
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.style.display = 'none';
    const editBtn = document.getElementById('editBtn');
    if (editBtn) editBtn.textContent = '✏️ Edit';
    
    // Tampilkan loading state
    contentEl.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted)"><div class="spinner"></div></div>';
    if (formContainer) formContainer.style.display = 'none';
    
    showPage('docview', docName);
    
    try {
      const { collection, query, where, getDocs } = window._fb;
      const q = query(
        collection(db, 'konten'),
        where('kategori', '==', katId),
        where('nama', '==', docName.trim())
      );
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const d = snap.docs[0]; currentDocId = d.id;
        const data = d.data();
        _activeDocData = data; // Cache data aktif
        
        const savedContent = data.savedContentByUser?.[userData.id] || data.savedContent || null;
        
        // ★ LOGIKA GENERATOR UI DINAMIS ★
        if (data.components && data.components.length > 0 && !savedContent) {
          // Jika belum pernah disimpan DAN punya komponen, tampilkan FORM
          renderDynamicForm(data.components);
          if (formContainer) formContainer.style.display = 'block';
          contentEl.style.display = 'none';
          document.getElementById('docToolbar').style.display = 'none';
        } else {
          // Tampilkan Editor Biasa
          if (formContainer) formContainer.style.display = 'none';
          contentEl.style.display = 'block';
          document.getElementById('docToolbar').style.display = 'flex';
          contentEl.innerHTML = savedContent || data.template?.replace(/\n/g, '<br/>') || 
            `<div style="color:var(--muted);text-align:center;padding:36px"><div style="font-size:36px;margin-bottom:12px">📄</div><div style="font-size:13px;color:var(--text);margin-bottom:6px">${docName}</div><div>Template belum diisi admin. Klik <strong>Edit</strong> untuk mulai menulis.</div></div>`;
        }
      } else {
        contentEl.innerHTML = `<div style="color:var(--muted);text-align:center;padding:36px"><div style="font-size:36px;margin-bottom:12px">📄</div><div>Konten belum tersedia dari admin.</div></div>`;
      }
    } catch (e) { 
      console.error('openDoc Error:', e);
      contentEl.innerHTML = '<div style="color:var(--muted);text-align:center;padding:30px">Gagal memuat dokumen.</div>'; 
    }
  }
}

// ── 8.1 DYNAMIC UI RENDERER ───────────────────────────────────────
function renderDynamicForm(components) {
  const formContent = document.getElementById('docFormContent');
  if (!formContent) return;
  
  formContent.innerHTML = components.map(c => `
    <div class="form-group-ai">
      <label>${c.label}</label>
      <textarea id="ai-input-${c.id}" placeholder="Masukkan data untuk ${c.label}..." class="ai-form-input"></textarea>
    </div>
  `).join('');
}

async function generateWithAI() {
  if (!_activeDocData || !_activeDocData.ai_prompt) {
    showToast('error', 'Gagal', 'Prompt AI tidak ditemukan untuk administrasi ini.');
    return;
  }
  
  const genBtn = document.getElementById('btnGenerateAI');
  const formContent = document.getElementById('docFormContent');
  const components = _activeDocData.components;
  
  // 1. Kumpulkan data dari form
  const values = {};
  let isFilled = false;
  components.forEach(c => {
    const el = document.getElementById(`ai-input-${c.id}`);
    values[c.id] = el ? el.value.trim() : '';
    if (values[c.id]) isFilled = true;
  });
  
  if (!isFilled) {
    showToast('warn', 'Input Kosong', 'Mohon isi setidaknya satu kolom pengaturan administrasi.');
    return;
  }
  
  // 2. Pre-processing Prompt (Variable Replacement)
  let finalPrompt = _activeDocData.ai_prompt;
  for (const key in values) {
    finalPrompt = finalPrompt.replace(new RegExp(`{{${key}}}`, 'g'), values[key] || '(Data tidak diisi)');
  }
  
  // 3. Eksekusi AI
  try {
    genBtn.disabled = true;
    genBtn.innerHTML = '<span>⏳</span> PROSES OLEH AI...';
    showToast('info', 'AI Bekerja', 'Mohon tunggu, AI sedang menyusun dokumen legalitas Anda...');
    
    const res = await window.CimegaAI.ask({
      system: "Anda adalah Spesialis Administrasi Sekolah 2025/2026. Susun dokumen dengan rapi, gunakan bahasa formal, dan gunakan format HTML dasar (h3, p, strong) untuk struktur dokumen.",
      messages: [{ role: 'user', content: finalPrompt }]
    });
    
    if (res.success && res.text) {
      // 4. Update UI
      const contentEl = document.getElementById('docContent');
      const formContainer = document.getElementById('docFormContainer');
      const toolbar = document.getElementById('docToolbar');
      
      // Bersihkan teks markdown jika ada
      const cleanedText = res.text.replace(/```html|```/g, '').trim();
      
      contentEl.innerHTML = cleanedText;
      contentEl.style.display = 'block';
      toolbar.style.display = 'flex';
      if (formContainer) formContainer.style.display = 'none';
      
      showToast('success', 'Generasi Selesai', 'Dokumen berhasil disusun oleh AI.');
      
      // Aktifkan mode edit otomatis agar user bisa merapikan
      toggleEdit();
    } else {
      showToast('error', 'Gagal Generasi', res.error || 'Terjadi gangguan pada jalur AI.');
    }
  } catch (err) {
    console.error('generateWithAI Error:', err);
    showToast('error', 'Sistem Sibuk', 'Gagal menghubungi asisten AI.');
  } finally {
    genBtn.disabled = false;
    genBtn.innerHTML = '<span>✨</span> GENERASI DATA AI';
  }
}

// ── 9. CONTENT EDITING & PERSISTENCE ──────────────────────────────
function toggleEdit() {
  const ce = document.getElementById('docContent');
  if (!ce) return;
  const editing = ce.contentEditable === 'true';
  const saveBtn = document.getElementById('saveBtn');
  const editBtn = document.getElementById('editBtn');
  if (editing) {
    ce.contentEditable = 'false';
    if (saveBtn) saveBtn.style.display = 'none';
    if (editBtn) editBtn.textContent = '✏️ Edit';
  } else {
    ce.contentEditable = 'true';
    ce.focus();
    if (saveBtn) saveBtn.style.display = 'inline-flex';
    if (editBtn) editBtn.textContent = '✕ Batal';
  }
}
async function saveDoc() {
  if (!currentDocId) { showToast('warn', 'Perhatian', 'Dokumen belum ada di database. Hubungi admin.'); return; }
  const { doc, updateDoc, serverTimestamp } = window._fb;
  const contentEl = document.getElementById('docContent');
  if (!contentEl) return;
  const content = contentEl.innerHTML;
  try {
    const field = `savedContentByUser.${userData.id}`;
    await updateDoc(doc(db, 'konten', currentDocId), { [field]: content, updatedAt: serverTimestamp() });
    toggleEdit();
    showToast('success', 'Tersimpan', 'Dokumen berhasil disimpan');
  } catch (e) { showToast('error', 'Gagal', e.message); }
}
function fmt(cmd) { document.execCommand(cmd, false, null); }

// ── 10. DOCUMENT DISTRIBUTION (Print/Download) ───────────────────
function downloadDoc() {
  const contentEl = document.getElementById('docContent');
  if (!contentEl) return;
  const content = contentEl.innerHTML;
  const title = currentDocName || 'Dokumen';
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
<style>body{font-family: 'Plus Jakarta Sans', sans-serif;font-size:12pt;line-height:1.6;color:#000;padding:2cm;max-width:21cm;margin:0 auto}</style>
</head><body><h2 style="font-family: 'Plus Jakarta Sans', sans-serif>${title}</h2><hr/>${content}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = title + '.html'; a.click();
  URL.revokeObjectURL(url);
  showToast('success', 'Diunduh', title + ' berhasil diunduh');
}
function printDoc() {
  const contentEl = document.getElementById('docContent');
  if (!contentEl) return;
  const content = contentEl.innerHTML;
  const title = currentDocName || 'Dokumen';
  const w = window.open('', '_blank');
  const margins = { Normal: '2.54cm', Moderate: '1.91cm', Narrow: '1.27cm' };
  const mg = margins[pageSettings.margin] || '2.54cm';
  const sz = pageSettings.size === 'F4' ? '21.59cm 33.02cm' : 'A4';
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>@page{size:${sz};margin:${mg}}body{font-family: 'Plus Jakarta Sans', sans-serif;font-size:12pt;line-height:1.6;color:#000}</style>
</head><body>${content}</body></html>`);
  w.document.close(); setTimeout(() => { w.print(); w.close(); }, 400);
}

// ── 11. PAGE CONFIGURATION ──────────────────────────────────────
function setPageSize(s) {
  pageSettings.size = s;
  ['A4', 'F4'].forEach(k => document.getElementById('ps' + k)?.classList.toggle('active', k === s));
  showToast('info', 'Ukuran Kertas', 'Diatur ke ' + s);
}
function setMargin(m) {
  pageSettings.margin = m;
  ['Normal', 'Moderate', 'Narrow'].forEach(k => document.getElementById('ps' + k)?.classList.toggle('active', k === m));
  showToast('info', 'Margin', 'Diatur ke ' + m);
}
function setOrientation(o) {
  pageSettings.orientation = o;
  ['Portrait', 'Landscape'].forEach(k => document.getElementById('ps' + k)?.classList.toggle('active', k === o));
  showToast('info', 'Orientasi', 'Diatur ke ' + o);
}

async function createSharedDoc() {
  const docName = await window.CyberDialog.prompt("Masukkan Nama Dokumen / File Baru:");
  if (!docName) return;

  currentKat = 'umum';
  currentDocName = docName;
  currentDocId = ''; // Tidak di-save ke konten, hanya untuk dishare

  pageHistory.push({ id: 'shared', title: 'DOKUMEN BERSAMA' });

  const titleEl = document.getElementById('docviewTitle');
  if (titleEl) titleEl.textContent = docName;
  const metaEl = document.getElementById('docviewMeta');
  if (metaEl) metaEl.textContent = 'Dokumen Baru Kustom · ' + pageSettings.size + ' ' + pageSettings.orientation;

  const contentEl = document.getElementById('docContent');
  if (contentEl) {
    contentEl.innerHTML = '<div style="padding:20px;color:var(--text);"><p>Mulai ketik dokumen Anda di sini, atau paste (Ctrl+V) teks/gambar dari luar...</p></div>';
    contentEl.contentEditable = 'true';

    // Hide save disabled message
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) saveBtn.style.display = 'none';

    const editBtn = document.getElementById('editBtn');
    if (editBtn) editBtn.textContent = '✕ Selesai Edit';

    showPage('docview', docName);
    setTimeout(() => contentEl.focus(), 300);
  }
}

// ── 12. DOCUMENT SHARING SYSTEM ──────────────────────────────────
function openShareModal() {
  if (!currentDocName) {
    showToast('warn', 'Petunjuk', '💡 Buka dokumen dari menu Administrasi terlebih dahulu, lalu klik tombol 📤 Bagikan di halaman dokumen.');
    return;
  }
  const nameEl = document.getElementById('shareDocName');
  if (nameEl) nameEl.value = currentDocName;
  const targetSel = document.getElementById('shareTarget');
  if (targetSel) {
    const roles = userData.roles;
    let opts = '<option value="school">Semua di Sekolah</option>';
    if (roles.includes('kepsek')) {
      opts += '<option value="guru">Hanya Guru</option>';
      opts += '<option value="bendahara">Bendahara</option>';
      opts += '<option value="ops">Operator (OPS)</option>';
    } else {
      opts += '<option value="bendahara">Bendahara</option>';
      opts += '<option value="ops">Operator (OPS)</option>';
      opts += '<option value="kepsek">Kepala Sekolah (Pantau)</option>';
      opts += '<option value="approval">Kepala Sekolah (Minta Persetujuan)</option>';
    }
    targetSel.innerHTML = opts;
  }
  openModal('modalShare');
}
async function doShare() {
  const { collection, addDoc, serverTimestamp } = window._fb;
  const targetEl = document.getElementById('shareTarget');
  const noteEl = document.getElementById('shareNote');
  const contentEl = document.getElementById('docContent');
  if (!targetEl || !currentDocName || !contentEl) return;
  const target = targetEl.value;
  const note = noteEl?.value.trim() || '';
  const content = contentEl.innerHTML;
  try {
    const isApproval = target === 'approval';
    await addDoc(collection(db, 'shared_docs'), {
      docName: currentDocName, kategori: currentKat, content, note,
      sharedBy: userData.nama, sharedById: userData.id,
      sekolah: userData.sekolah, target,
      status: isApproval ? 'pending' : 'shared',
      sharedAt: serverTimestamp(), comments: [],
    });
    closeModal('modalShare');
    if (noteEl) noteEl.value = '';
    const msg = target === 'bendahara' ? `Dokumen dikirim ke Bendahara` :
      target === 'ops' ? `Dokumen dikirim ke Operator (OPS)` :
        target === 'approval' ? `Dikirim ke Kepsek untuk persetujuan` :
          target === 'kepsek' ? `Dibagikan ke Kepala Sekolah` :
            target === 'guru' ? `Dibagikan ke semua guru` :
              `Dibagikan ke semua di sekolah`;
    showToast('success', 'Terkirim!', msg);
  } catch (e) { showToast('error', 'Gagal', e.message); }
}

async function loadShared(filter = 'all') {
  renderShared(filter);
}
function filterShared(f) {
  ['all', 'school', 'mine'].forEach(k => {
    document.getElementById('sf' + k.charAt(0).toUpperCase() + k.slice(1))?.classList.toggle('active', k === f);
  });
  renderShared(f);
}
// ★ SHARED DOCS FILTERING ★
function renderShared(filter) {
  const gridEl = document.getElementById('sharedDocsGrid');
  if (!gridEl) return;
  const roles = userData.roles;
  let items = [];
  try {
    items = allShared || [];
    if (filter === 'school') items = items.filter(d => d.sharedById !== userData.id && d.target === 'school');
    if (filter === 'mine') items = items.filter(d => d.sharedById === userData.id);

    if (roles.includes('kepsek')) {
      // keep all
    } else if (roles.includes('bendahara')) {
      items = items.filter(d => d.target === 'bendahara' || d.target === 'school' || d.sharedById === userData.id);
    } else if (roles.includes('ops')) {
      items = items.filter(d => d.target === 'ops' || d.target === 'school' || d.sharedById === userData.id);
    } else {
      items = items.filter(d => d.target === 'school' || d.target === 'guru' || d.sharedById === userData.id);
    }
  } catch (e) {
    console.warn("Error rendering shared docs", e);
    items = [];
  }

  if (items.length === 0) {
    const msg = filter === 'school' ? 'Belum ada dokumen dari rekan' : filter === 'mine' ? 'Anda belum membagikan dokumen' : 'Belum ada dokumen bersama';
    gridEl.innerHTML = `<div style="padding:40px;text-align:center;color:var(--muted);grid-column:1/-1">
      <div style="font-size:32px;margin-bottom:10px">📂</div>
      <p>${msg}</p>
    </div>`;
    return;
  }
  gridEl.innerHTML = items.map(d => `
<div class="card" style="padding:15px;cursor:pointer;transition:transform 0.2s" onclick="openSharedDocDetail('${d.id}','${(d.docName || '').replace(/'/g, "\\'")}','')">
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
    <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,229,255,0.1);display:flex;align-items:center;justify-content:center;font-size:18px">👤</div>
    <span class="badge badge-${d.status === 'shared' ? 'shared' : d.status === 'pending' ? 'pending' : d.status === 'approved' ? 'approved' : 'rejected'}">${d.status === 'shared' ? 'Shared' : d.status === 'pending' ? 'Pending' : d.status === 'approved' ? 'Approved' : 'Rejected'}</span>
  </div>
  <div style="font-weight:700;font-size:13px;color:#fff;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">📄 ${d.docName || '-'}</div>
  <div style="font-size:11px;color:var(--muted)">Oleh: ${d.sharedBy || '-'}</div>
  <div style="font-size:10px;color:var(--cyan);margin-top:8px">${fmtDate(d.sharedAt)}</div>
</div>`).join('');
}

function openSharedDocDetail(id, nama, contentPreview) {
  currentShareDocId = id;
  const d = allShared.find(x => x.id === id) || {};
  const titleEl = document.getElementById('modalDocDetailTitle');
  if (titleEl) titleEl.textContent = '📄 ' + (d.docName || nama);
  const contentEl = document.getElementById('modalDocContent');
  if (contentEl) contentEl.innerHTML = d.content || contentPreview || '<em>Tidak ada konten</em>';
  const commEl = document.getElementById('modalComments');
  if (commEl) commEl.innerHTML = renderComments(d.comments || []);
  openModal('modalDocDetail');
}
function renderComments(comments) {
  if (!comments || comments.length === 0) return '<div style="color:var(--muted);font-size:11px;text-align:center;padding:8px">Belum ada komentar</div>';
  return comments.map(c => `<div class="comment-item"><div class="comment-avatar">👤</div><div class="comment-body"><div class="comment-author">${c.author || '-'}</div><div class="comment-text">${c.text || ''}</div></div></div>`).join('');
}
async function submitComment() {
  const input = document.getElementById('commentInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text || !currentShareDocId) return;
  const { doc, getDoc, updateDoc } = window._fb;
  const snap = await getDoc(doc(db, 'shared_docs', currentShareDocId));
  if (!snap.exists()) return;
  const comments = [...(snap.data().comments || []), { author: userData.nama, text, time: new Date().toISOString() }];
  await updateDoc(doc(db, 'shared_docs', currentShareDocId), { comments });
  const idx = allShared.findIndex(x => x.id === currentShareDocId);
  if (idx > -1) allShared[idx].comments = comments;
  const commEl = document.getElementById('modalComments');
  if (commEl) commEl.innerHTML = renderComments(comments);
  input.value = '';
}
function downloadSharedDoc() {
  const d = allShared.find(x => x.id === currentShareDocId);
  if (!d) return;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${d.docName}</title>
<style>body{font-family: 'Plus Jakarta Sans', sans-serif;font-size:12pt;line-height:1.6;padding:2cm}</style>
</head><body><h2>${d.docName}</h2><p><em>Dibuat oleh: ${d.sharedBy}</em></p><hr/>${d.content}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = d.docName + '.html'; a.click();
  URL.revokeObjectURL(url);
}

// ── BOSP / Bendahara ───────────────────────
async function loadLaporanKeu() {
  const { collection, getDocs, query, where, orderBy } = window._fb;
  const keuDocs = _kontenCache['keuangan'] || [];
  const evalDocs = _kontenCache['evaluasi'] || [];
  const el1 = document.getElementById('statKeuDoc');
  const el2 = document.getElementById('statEvalDoc');
  if (el1) el1.textContent = keuDocs.length;
  if (el2) el2.textContent = evalDocs.length;
  const listEl = document.getElementById('laporanKeuList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const snap = await getDocs(query(collection(db, 'shared_docs'), where('sekolah', '==', userData.sekolah), where('target', '==', 'bendahara'), orderBy('sharedAt', 'desc')));
    if (snap.empty) {
      listEl.innerHTML = '<div class="empty-state"><div class="icon">💰</div><p>Belum ada dokumen keuangan masuk</p></div>';
      return;
    }
    const items = [];
    snap.forEach(d => { items.push({ id: d.id, ...d.data() }); });
    listEl.innerHTML = items.map(d => `
  <div class="approval-card" onclick="openSharedDocDetail('${d.id}','${(d.docName || '').replace(/'/g, "\\'")}','')">
    <div style="font-size:22px">💰</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600;color:var(--text)">${d.docName || '-'}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">dari ${d.sharedBy || '-'} · ${fmtDate(d.sharedAt)}</div>
    </div>
    <span class="badge badge-keuangan">${d.kategori || 'Keuangan'}</span>
  </div>`).join('');
  } catch (e) { listEl.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>Gagal memuat data keuangan</p></div>'; }
}

async function loadMySubmissions() {
  const { collection, getDocs, query, where, orderBy } = window._fb;
  const listEl = document.getElementById('submissionList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const snap = await getDocs(query(collection(db, 'shared_docs'), where('sharedById', '==', userData.id), where('target', 'in', ['kepsek', 'approval']), orderBy('sharedAt', 'desc')));
    if (snap.empty) {
      listEl.innerHTML = '<div class="empty-state"><div class="icon">📬</div><p>Belum ada dokumen dikirim ke Kepsek</p></div>';
      return;
    }
    const sMap = { shared: 'Terkirim', pending: '⏳ Menunggu', approved: '✅ Disetujui', rejected: '❌ Ditolak' };
    listEl.innerHTML = snap.docs.map(d => {
      const data = d.data();
      return `<div class="approval-card">
    <div style="font-size:22px">📄</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600;color:var(--text)">${data.docName}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${data.kategori} · ${fmtDate(data.sharedAt)}</div>
    </div>
    <span class="badge badge-${data.status === 'approved' ? 'approved' : data.status === 'rejected' ? 'rejected' : 'pending'}">${sMap[data.status] || data.status}</span>
  </div>`;
    }).join('');
  } catch (e) { listEl.innerHTML = '<div class="empty-state"><p>Gagal memuat dokumen</p></div>'; }
}

// ── Kepsek Monitoring ──────────────────────
async function loadMonitor() {
  const { collection, getDocs, query, where } = window._fb;
  const listEl = document.getElementById('monitorList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const guruSnap = await getDocs(query(collection(db, 'users'), where('sekolah', '==', userData.sekolah)));
    const sharedSnap = await getDocs(query(collection(db, 'shared_docs'), where('sekolah', '==', userData.sekolah)));
    const allDocs = [];
    sharedSnap.forEach(d => allDocs.push({ id: d.id, ...d.data() }));
    let html = '';
    guruSnap.forEach(gDoc => {
      const g = gDoc.data();
      const roles = g.roles || [g.role];
      if (roles.includes('admin') || roles.includes('kepsek')) return;
      const docs = allDocs.filter(d => d.sharedById === gDoc.id);
      html += `<div class="approval-card" onclick="loadGuruDocs('${gDoc.id}','${g.nama || ''}')">
    <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${roles.includes('bendahara') ? '💰' : '👨‍🏫'}</div>
    <div style="flex:1">
      <div style="font-size:13px;font-weight:600;color:var(--text)">${g.nama || '-'}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${roles.join(' · ')}</div>
    </div>
    <div style="text-align:right">
      <div style="font-family: 'Plus Jakarta Sans', sans-serif;font-size:16px;color:var(--cyan)">${docs.length}</div>
      <div style="font-size:10px;color:var(--muted)">Dokumen</div>
    </div>
  </div>`;
    });
    listEl.innerHTML = html || '<div class="empty-state"><div class="icon">👨‍🏫</div><p>Belum ada data</p></div>';
  } catch (e) { listEl.innerHTML = '<div class="empty-state"><p>Gagal memuat monitor</p></div>'; }
}
async function loadGuruDocs(guruId, guruNama) {
  const { collection, getDocs, query, where, orderBy } = window._fb;
  const listEl = document.getElementById('monitorList');
  if (!listEl) return;
  const snap = await getDocs(query(collection(db, 'shared_docs'), where('sharedById', '==', guruId), orderBy('sharedAt', 'desc')));
  let html = `<div class="back-btn" style="margin-bottom:12px;display:inline-flex;cursor:pointer" onclick="loadMonitor()">← Kembali</div><div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:10px">Dokumen dari ${guruNama}</div>`;
  snap.forEach(d => {
    const data = d.data();
    const sMap = { shared: 'Dibagikan', pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
    html += `<div class="approval-card" onclick="openSharedDocKepsek('${d.id}')">
  <div style="font-size:20px">📄</div>
  <div style="flex:1">
    <div style="font-size:12px;font-weight:600;color:var(--text)">${data.docName}</div>
    <div style="font-size:10px;color:var(--muted);margin-top:2px">${data.kategori} · ${fmtDate(data.sharedAt)}</div>
  </div>
  <span class="badge badge-${data.status === 'approved' ? 'approved' : data.status === 'rejected' ? 'rejected' : 'pending'}">${sMap[data.status] || data.status}</span>
</div>`;
  });
  if (snap.empty) html += '<div class="empty-state"><div class="icon">📄</div><p>Belum ada dokumen</p></div>';
  listEl.innerHTML = html;
}
async function openSharedDocKepsek(docId) {
  const { doc, getDoc } = window._fb;
  const snap = await getDoc(doc(db, 'shared_docs', docId));
  if (!snap.exists()) return;
  const d = { id: docId, ...snap.data() };
  if (!allShared.find(x => x.id === docId)) allShared.push(d);
  currentShareDocId = docId;
  const titleEl = document.getElementById('modalDocDetailTitle');
  if (titleEl) titleEl.textContent = '📄 ' + d.docName;
  const contentEl = document.getElementById('modalDocContent');
  if (contentEl) contentEl.innerHTML = d.content || '<em>Tidak ada konten</em>';
  const commEl = document.getElementById('modalComments');
  if (commEl) commEl.innerHTML = renderComments(d.comments || []);
  openModal('modalDocDetail');
}

async function loadApprovals(statusFilter = 'pending') {
  const { collection, getDocs, query, where, orderBy } = window._fb;
  const listEl = document.getElementById('approvalList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const snap = await getDocs(query(collection(db, 'shared_docs'),
      where('sekolah', '==', userData.sekolah),
      where('target', '==', 'approval'),
      where('status', '==', statusFilter)
    ));
    allApprovals = [];
    snap.forEach(d => allApprovals.push({ id: d.id, ...d.data() }));

    // Manual Sort (Bypass Index)
    allApprovals.sort((a, b) => {
      const ta = a.sharedAt?.seconds || (a.sharedAt instanceof Date ? a.sharedAt.getTime() / 1000 : 0);
      const tb = b.sharedAt?.seconds || (b.sharedAt instanceof Date ? b.sharedAt.getTime() / 1000 : 0);
      return tb - ta;
    });

    if (statusFilter === 'pending') {
      const badge = document.getElementById('approvalBadge');
      if (badge) { badge.style.display = allApprovals.length > 0 ? '' : 'none'; badge.textContent = allApprovals.length; }
    }
    if (allApprovals.length === 0) {
      listEl.innerHTML = `<div class="empty-state"><div class="icon">✅</div><p>Selesai! Tidak ada dokumen ${statusFilter}</p></div>`;
      return;
    }
    listEl.innerHTML = allApprovals.map(d => `
  <div class="approval-card">
    <div style="font-size:22px">📄</div>
    <div style="flex:1;cursor:pointer" onclick="openSharedDocKepsek('${d.id}')">
      <div style="font-size:13px;font-weight:600;color:var(--text)">${d.docName}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${d.sharedBy} · ${fmtDate(d.sharedAt)}</div>
    </div>
    ${d.status === 'pending' ? `<div style="display:flex;gap:6px"><button class="btn btn-success btn-sm" onclick="approveDoc('${d.id}')">✅ Setujui</button><button class="btn btn-danger btn-sm" onclick="rejectDoc('${d.id}')">❌ Tolak</button></div>` : `<span class="badge badge-${d.status}">${d.status}</span>`}
  </div>`).join('');
  } catch (e) { listEl.innerHTML = '<div class="empty-state"><p>Gagal memuat approvals</p></div>'; }
}
function filterApproval(f) {
  ['pending', 'approved', 'rejected'].forEach(k => { document.getElementById('af' + k.charAt(0).toUpperCase() + k.slice(1))?.classList.toggle('active', k === f); });
  loadApprovals(f);
}
async function approveDoc(id) {
  const { doc, updateDoc, serverTimestamp } = window._fb;
  await updateDoc(doc(db, 'shared_docs', id), { status: 'approved', approvedBy: userData.nama, approvedAt: serverTimestamp() });
  loadApprovals('pending');
}
async function rejectDoc(id) {
  const { doc, updateDoc, serverTimestamp } = window._fb;
  await updateDoc(doc(db, 'shared_docs', id), { status: 'rejected', rejectedBy: userData.nama, rejectedAt: serverTimestamp() });
  loadApprovals('pending');
}

async function loadRekap() {
  const { collection, getDocs, query, where } = window._fb;
  const el = document.getElementById('rekapContent');
  if (!el) return;
  el.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const guruSnap = await getDocs(query(collection(db, 'users'), where('sekolah', '==', userData.sekolah)));
    const sharedSnap = await getDocs(query(collection(db, 'shared_docs'), where('sekolah', '==', userData.sekolah)));
    const allDocs = [];
    sharedSnap.forEach(d => allDocs.push({ id: d.id, ...d.data() }));

    // Tally Stats for Rekap
    const stats = {
      total: allDocs.length,
      pending: allDocs.filter(d => d.status === 'pending').length,
      approved: allDocs.filter(d => d.status === 'approved').length,
      rejected: allDocs.filter(d => d.status === 'rejected').length
    };

    let html = `
    <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; margin-bottom:20px;">
      <div class="stat-card" style="background:rgba(0,229,255,0.05)">
        <div style="font-size:10px; color:var(--muted)">TOTAL SHARED</div>
        <div style="font-size:20px; font-weight:700; color:var(--cyan); font-family:'Orbitron'">${stats.total}</div>
      </div>
      <div class="stat-card" style="background:rgba(255,200,0,0.05)">
        <div style="font-size:10px; color:var(--muted)">PENDING</div>
        <div style="font-size:20px; font-weight:700; color:#ffcc00; font-family:'Orbitron'">${stats.pending}</div>
      </div>
      <div class="stat-card" style="background:rgba(0,255,100,0.05)">
        <div style="font-size:10px; color:var(--muted)">DISETUJUI</div>
        <div style="font-size:20px; font-weight:700; color:var(--success); font-family:'Orbitron'">${stats.approved}</div>
      </div>
      <div class="stat-card" style="background:rgba(255,50,50,0.05)">
        <div style="font-size:10px; color:var(--muted)">DITOLAK</div>
        <div style="font-size:20px; font-weight:700; color:var(--danger); font-family:'Orbitron'">${stats.rejected}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">📊 RINCIAN PER KONTRIBUTOR</div></div>
      <div class="card-body">`;

    guruSnap.forEach(gDoc => {
      const g = gDoc.data();
      const roles = g.roles || [g.role];
      if (roles.includes('admin')) return;
      const docs = allDocs.filter(d => d.sharedById === gDoc.id);
      html += `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(0,229,255,0.07)">
    <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--cyan));display:flex;align-items:center;justify-content:center;font-size:16px">👤</div>
    <div style="flex:1"><div style="font-size:12px;font-weight:700;color:#fff">${g.nama || '-'}</div><div style="font-size:10px;color:var(--muted)">${roles.join(' · ')}</div></div>
    <div style="text-align:right"><div style="font-family: 'Plus Jakarta Sans', sans-serif;font-size:16px;color:var(--cyan)">${docs.length}</div><div style="font-size:10px;color:var(--muted)">Dokumen</div></div></div>`;
    });
    el.innerHTML = html + '</div></div>';
  } catch (e) { el.innerHTML = '<div class="empty-state"><p>Gagal memuat rekap</p></div>'; }
}

// ── Dashboard / Beranda ────────────────────
function loadBeranda() {
  const roles = userData.roles || ['guru'];
  const isBendahara = roles.includes('bendahara');
  const isKepsek = roles.includes('kepsek');

  // Re-sync basic info
  setupUser();

  const welcomeAvatar = document.getElementById('welcomeAvatar');
  if (welcomeAvatar) {
    welcomeAvatar.textContent = isKepsek ? '🏛️' : isBendahara ? '💰' : '👨‍🏫';
  }

  // Stats
  const totalDocs = Object.values(_kontenCache).reduce((acc, docs) => acc + docs.length, 0);
  let statsHtml = [
    { icon: '📂', num: _menuDataDynamic.length, label: 'Kategori' },
    { icon: '📄', num: totalDocs, label: 'Total Dokumen' }
  ].map(s => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-num" style="font-family: 'Plus Jakarta Sans', sans-serif>${s.num}</div>
      <div class="stat-label">${s.label}</div>
    </div>`).join('');

  if (isBendahara) {
    statsHtml += `
    <div class="stat-card" style="cursor:pointer;border-color:rgba(255,208,0,0.3)" onclick="navTo(null,'keuangan','KEUANGAN',loadLaporanKeu)">
      <div class="stat-icon">💰</div>
      <div class="stat-num" style="font-family: 'Plus Jakarta Sans', sans-serif>${(_kontenCache['keuangan'] || []).length}</div>
      <div class="stat-label">Keuangan</div>
    </div>`;
  }

  const homeStats = document.getElementById('homeStats');
  if (homeStats) homeStats.innerHTML = statsHtml;

  // Quick Menu (Max 6)
  const quick = document.getElementById('quickMenuHome');
  if (quick) {
    if (_menuDataDynamic.length === 0) {
      quick.innerHTML = '<div style="padding:16px;color:var(--muted);font-size:11px">Belum ada kategori tersedia</div>';
    } else {
      quick.innerHTML = _menuDataDynamic.slice(0, 6).map(m => `
      <div class="recent-item" style="padding:8px;border-radius:6px;margin-bottom:4px;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.02)">
        <div style="font-size:18px">${m.icon}</div>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:#fff">${m.title}</div>
          <div style="font-size:10px;color:var(--muted)">${m.items.length} Dokumen</div>
        </div>
      </div>`).join('');
    }
  }
}

async function loadProfil() {
  const { doc, getDoc } = window._fb;
  try {
    const snap = await getDoc(doc(db, 'users', userData.id));
    if (!snap.exists()) return;
    const data = snap.data();
    const roles = data.roles || [data.role || 'guru'];
    const avEl = document.getElementById('profilAvatar');
    if (avEl) {
      if (data.avatarUrl) {
        avEl.innerHTML = `<img src="${data.avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      } else {
        avEl.innerHTML = roles.includes('bendahara') ? '💰' : roles.includes('kepsek') ? '🏛️' : '👨‍🏫';
      }
    }
    const nameEl = document.getElementById('profilNama');
    if (nameEl) nameEl.textContent = data.nama;
    const badgeEl = document.getElementById('profilRoleBadge');
    if (badgeEl) badgeEl.innerHTML = roles.map(r => `<span class="badge badge-approved" style="margin:2px">${r}</span>`).join('');
    const schEl = document.getElementById('profilSekolah');
    if (schEl) schEl.textContent = data.sekolah;
    const unEl = document.getElementById('profilUsername');
    if (unEl) unEl.textContent = data.username;
    const expEl = document.getElementById('profilExpired');
    if (expEl) {
      const exp = data.expired ? (data.expired.toDate ? data.expired.toDate() : new Date(data.expired)) : null;
      expEl.textContent = exp ? exp.toLocaleDateString('id-ID') : '-';
    }
    const stEl = document.getElementById('profilStatus');
    if (stEl) stEl.innerHTML = `<span class="badge badge-${data.status === 'aktif' ? 'approved' : 'rejected'}">${data.status}</span>`;
  } catch (e) { }
}

/**
 * addAdminLog: Mengirim log aktivitas ke koleksi adminLog agar terlihat oleh Admin
 */
async function addAdminLog(aksi, detail) {
  const { collection, addDoc, serverTimestamp } = window._fb;
  try {
    await addDoc(collection(db, 'adminLog'), {
      admin: userData.nama || 'User',
      aksi: aksi,
      detail: detail,
      time: serverTimestamp()
    });
  } catch (e) { console.warn('Gagal mencatat log admin:', e); }
}

window.toggleUserPass = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  const btn = el.nextElementSibling;
  if (el.type === 'password') {
    el.type = 'text';
    if (btn) btn.textContent = '🔒';
  } else {
    el.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
};

async function changePassword() {
  const oldPass = document.getElementById('oldPassUser')?.value.trim();
  const newPass = document.getElementById('newPassUser')?.value.trim();
  const confirmPass = document.getElementById('confirmPassUser')?.value.trim();

  if (!oldPass || !newPass || !confirmPass) {
    showToast('warn', 'Data Tidak Lengkap', 'Harap isi semua kolom password.');
    return;
  }

  if (newPass !== confirmPass) {
    showToast('error', 'Konfirmasi Gagal', 'Password baru dan konfirmasi tidak sesuai.');
    return;
  }

  const { doc, getDoc, updateDoc, serverTimestamp } = window._fb;
  try {
    const userRef = doc(db, 'users', userData.id);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;

    const data = snap.data();
    if (data.password !== oldPass) {
      showToast('error', 'Gagal', 'Password lama Anda salah.');
      return;
    }

    await updateDoc(userRef, {
      password: newPass,
      updatedAt: serverTimestamp()
    });

    // KIRIM NOTIF/LOG KE ADMIN (Sesuai permintaan USER: perlihatkan password baru)
    await addAdminLog('KEAMANAN (Update)', `User ${userData.nama} (@${userData.username}) mengganti password sendiri menjadi: ${newPass}`);

    showToast('success', 'Berhasil', 'Password Anda telah diperbarui.');

    // Reset form
    document.getElementById('oldPassUser').value = '';
    document.getElementById('newPassUser').value = '';
    document.getElementById('confirmPassUser').value = '';
  } catch (err) {
    showToast('error', 'Gagal', err.message);
  }
}

async function uploadAvatar() {
  const fileInput = document.getElementById('avatarUploadInput');
  const statusEl = document.getElementById('avatarUploadStatus');
  const btn = document.getElementById('btnUploadAvatar');

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    showToast('warn', 'Pilih File', 'Silakan pilih foto terlebih dahulu');
    return;
  }

  const file = fileInput.files[0];
  if (file.size > 2 * 1024 * 1024) {
    showToast('warn', 'File Terlalu Besar', 'Maksimal ukuran foto adalah 2MB');
    return;
  }

  if (!window._supabase) {
    showToast('error', 'Supabase', 'Koneksi penyimpanan tidak tersedia');
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Mengunggah...';
  statusEl.textContent = 'Mengunggah foto ke Supabase...';

  try {
    const ext = file.name.split('.').pop();
    const safeName = `avatar_${userData.id}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await window._supabase.storage
      .from('user-profiles')
      .upload(`avatars/${safeName}`, file, { upsert: true, contentType: file.type });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data: urlData } = window._supabase.storage.from('user-profiles').getPublicUrl(`avatars/${safeName}`);

    const { doc, updateDoc, serverTimestamp } = window._fb;
    await updateDoc(doc(db, 'users', userData.id), {
      avatarUrl: urlData.publicUrl,
      updatedAt: serverTimestamp()
    });

    // Log ke admin
    await addAdminLog('PROFIL', `User ${userData.nama} memperbarui foto profil.`);

    showToast('success', 'Berhasil', 'Foto profil diperbarui!');
    statusEl.textContent = 'Selesai';
    await loadProfil();
  } catch (err) {
    console.error(err);
    showToast('error', 'Gagal Mengunggah', err.message);
    statusEl.textContent = 'Error: ' + err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = '📤 Upload Foto';
    fileInput.value = '';
  }
}

function toggleNotif() { document.getElementById('notifPanel')?.classList.toggle('show'); }
async function loadNotifications() {
  const { collection, getDocs, query, orderBy } = window._fb;
  try {
    const snap = await getDocs(query(collection(db, 'notifications'), orderBy('sentAt', 'desc')));
    const items = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.target === 'all' || userData.roles.includes(data.target)) items.push(data);
    });
    if (items.length > 0) {
      document.getElementById('notifDot')?.classList.add('show');
      const listEl = document.getElementById('notifList');
      if (listEl) listEl.innerHTML = items.slice(0, 8).map(n => `<div class="notif-item"><div style="font-size:12px;font-weight:600;color:var(--text)">${n.title}</div><div style="font-size:11px;color:var(--muted)">${n.message}</div></div>`).join('');
    } else {
      document.getElementById('notifDot')?.classList.remove('show');
      const listEl = document.getElementById('notifList');
      if (listEl) listEl.innerHTML = `<div class="notif-item" style="color:var(--muted);text-align:center;">Belum ada notifikasi</div>`;
    }
  } catch (e) {
    const listEl = document.getElementById('notifList');
    if (listEl) listEl.innerHTML = `<div class="notif-item" style="color:var(--danger);text-align:center;">Gagal memuat notifikasi</div>`;
  }
}

async function checkUpdate() {
  const { doc, getDoc } = window._fb;
  try {
    const appConfig = await window.cimegaAPI.getAppConfig();
    const snap = await getDoc(doc(db, 'appConfig', 'version'));
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.current !== appConfig.appVersion) {
      document.getElementById('updateBanner')?.classList.add('show');
      document.getElementById('updateTitle').textContent = `🚀 Update v${data.current} Tersedia!`;
      window._updateUrl = data.downloadUrl;
    }
  } catch (e) { }
}
function doUpdate() { if (window._updateUrl) window.cimegaAPI.openExternal(window._updateUrl); }
function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}
async function doLogout() {
  if (await window.CyberDialog.confirm('Keluar dari aplikasi?')) {
    // TOTAL SESSION WIPE (Advanced Security)
    // Hanya hapus data sesi (user), jangan hapus kredensial 'Ingat Saya'
    localStorage.removeItem('cimega_user');
    sessionStorage.clear();
    if (window.cimegaAPI?.clearCache) window.cimegaAPI.clearCache();
    window.location.href = '../login/login.html';
  }
}

// ── AI ASISTEN Logic ───────────────────────
let _chatHistory = [];
function switchAiTab(tab, el) {
  document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.ai-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById('aiPanel-' + tab);
  if (panel) panel.style.display = '';
}
async function generateDocAI() {
  const prompt = document.getElementById('docAiPrompt')?.value.trim();
  if (!prompt) return;
  const btn = document.getElementById('btnRunDocAi');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Generating...'; }
  try {
    const res = await window.CimegaAI.ask({
      system: `TUGAS: Membuat konten untuk "${currentDocName}". 
KATEGORI: ${currentKat}.
FORMAT: Output HANYA berupa HTML murni tanpa tag <html>/<body>. Gunakan <h3>, <p>, <ul>, <table> untuk struktur.`,
      messages: [{ role: 'user', content: `Buatkan isi konten berkualitas untuk ${currentDocName}. Instruksi: ${prompt}` }],
      maxTokens: 3000
    });
    const ce = document.getElementById('docContent');
    if (ce && res.text) {
      if (!ce.innerHTML.trim() || ce.innerHTML.includes('Template belum diisi')) ce.innerHTML = res.text;
      else ce.innerHTML += '<br><br>' + res.text;
      closeModal('modalDocAi');
      if (ce.contentEditable !== 'true') toggleEdit();
    }
  } finally { if (btn) { btn.disabled = false; btn.textContent = '🚀 Generate Sekarang'; } }
}
function appendChat(role, text) {
  const el = document.getElementById('chatMessages');
  if (!el) return;
  const div = document.createElement('div'); div.className = 'chat-msg chat-' + role;
  let contentHtml = text;
  if (role === 'ai' && window.marked && !text.includes('ai-loading-dot')) contentHtml = marked.parse(text);
  else if (role === 'user') contentHtml = text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  div.innerHTML = `<div class="chat-bubble"><div>${contentHtml}</div></div>`;
  el.appendChild(div); el.scrollTop = el.scrollHeight;
}
async function sendChat() {
  const input = document.getElementById('aiChatInput');
  const text = input?.value.trim(); if (!text) return;
  input.value = ''; appendChat('user', text);
  _chatHistory.push({ role: 'user', content: text });
  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-msg chat-ai chat-typing';
  typingDiv.innerHTML = `<div class="chat-bubble"><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div><div class="ai-loading-dot"></div></div>`;
  document.getElementById('chatMessages')?.appendChild(typingDiv);
  try {
    const res = await window.CimegaAI.ask({
      system: `DOMAIN: Chat Umum Asisten Administrasi Sekolah.`,
      messages: _chatHistory.slice(-10),
      maxTokens: 2000,
    });
    typingDiv.remove();
    const reply = res.error ? '❌ ' + res.error : res.text;
    appendChat('ai', reply);
    _chatHistory.push({ role: 'assistant', content: reply });
  } catch (e) { typingDiv.remove(); }
}

async function initApp() {
  try {
    const firebaseConfig = window.cimegaConfig?.firebase || await window.cimegaAPI?.getFirebaseConfig();
    if (!firebaseConfig?.apiKey) {
      console.error('Settings: Firebase config null');
      showToast('error', 'Koneksi Gagal', 'Konfigurasi pusat data tidak ditemukan.');
      return;
    }

    const { initializeApp, getApp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
    const fbFs = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    const {
      getFirestore, collection, doc, getDoc, getDocs, addDoc,
      updateDoc, deleteDoc, onSnapshot, query, where, orderBy,
      serverTimestamp, Timestamp, writeBatch, limit
    } = fbFs;

    // ── Safe init Firebase app ────────────────────────────────
    let fbApp;
    try { fbApp = getApp(); } catch (_) { fbApp = initializeApp(firebaseConfig); }
    db = getFirestore(fbApp);

    // Fetch school profile
    let schoolProfile = null;
    if (userData && userData.sekolah) {
      try {
        const schoolDoc = await getDoc(doc(db, 'sekolah', userData.sekolah));
        if (schoolDoc.exists()) {
          schoolProfile = { id: schoolDoc.id, ...schoolDoc.data() };
          window._schoolProfile = schoolProfile;
          console.log('✅ Settings: School profile loaded →', schoolProfile.nama_sekolah);
        }
      } catch (e) {
        console.warn('⚠️ Gagal memuat profil sekolah:', e.message);
      }
    }

    // ── CRITICAL: expose db + helpers ke window._fb ──────────
    // Semua fungsi Firestore harus ada di sini agar loadKontenDynamic() tidak crash
    window._fb = {
      db,
      collection, doc, getDoc, getDocs, addDoc,
      updateDoc, deleteDoc, onSnapshot, query, where, orderBy,
      serverTimestamp, Timestamp, writeBatch, limit
    };
    window.db = db;
    window._userData = userData;

    // Extend db with Firestore compat methods for modular JS compatibility
    if (db && !db.collection) {
      const fs = window._fb;
      db.collection = function(path) {
        const colRef = fs.collection(db, path);
        return {
          doc(docPath) {
            const docRef = fs.doc(db, path, docPath);
            const wrappedDoc = {
              _nativeRef: docRef,
              get() { return fs.getDoc(docRef); },
              set(data, options) { return fs.setDoc(docRef, data, options); },
              update(data) { return fs.updateDoc(docRef, data); },
              delete() { return fs.deleteDoc(docRef); }
            };
            return wrappedDoc;
          },
          add(data) {
            return fs.addDoc(colRef, data);
          },
          where(field, op, val) {
            let queries = [colRef, fs.where(field, op, val)];
            const builder = {
              where(f, o, v) {
                queries.push(fs.where(f, o, v));
                return builder;
              },
              orderBy(f, dir = 'asc') {
                queries.push(fs.orderBy(f, dir));
                return builder;
              },
              limit(num) {
                queries.push(fs.limit(num));
                return builder;
              },
              async get() {
                const q = fs.query(...queries);
                return fs.getDocs(q);
              }
            };
            return builder;
          },
          orderBy(field, dir = 'asc') {
            let queries = [colRef, fs.orderBy(field, dir)];
            const builder = {
              where(f, o, v) {
                queries.push(fs.where(f, o, v));
                return builder;
              },
              orderBy(f, d = 'asc') {
                queries.push(fs.orderBy(f, d));
                return builder;
              },
              limit(num) {
                queries.push(fs.limit(num));
                return builder;
              },
              async get() {
                const q = fs.query(...queries);
                return fs.getDocs(q);
              }
            };
            return builder;
          },
          async get() {
            return fs.getDocs(colRef);
          }
        };
      };
      
      db.doc = function(path) {
        const docRef = fs.doc(db, path);
        return {
          _nativeRef: docRef,
          get() { return fs.getDoc(docRef); },
          set(data, options) { return fs.setDoc(docRef, data, options); },
          update(data) { return fs.updateDoc(docRef, data); },
          delete() { return fs.deleteDoc(docRef); }
        };
      };
      
      db.batch = function() {
        const operations = [];
        return {
          set(docRef, data, options) {
            operations.push({ type: 'set', ref: docRef._nativeRef || docRef, data, options });
          },
          update(docRef, data) {
            operations.push({ type: 'update', ref: docRef._nativeRef || docRef, data });
          },
          delete(docRef) {
            operations.push({ type: 'delete', ref: docRef._nativeRef || docRef });
          },
          async commit() {
            const nativeBatch = fs.writeBatch(db);
            operations.forEach(op => {
              const rawRef = op.ref._nativeRef || op.ref;
              if (op.type === 'set') {
                nativeBatch.set(rawRef, op.data, op.options);
              } else if (op.type === 'update') {
                nativeBatch.update(rawRef, op.data);
              } else if (op.type === 'delete') {
                nativeBatch.delete(rawRef);
              }
            });
            return nativeBatch.commit();
          }
        };
      };
    }

    console.log('✅ Settings: Firebase ready →', firebaseConfig.projectId);

    // ── Setup user dan render sidebar awal SEGERA setelah Firebase siap ──
    // Ini memastikan sidebar tidak kosong bahkan sebelum data Firestore tiba
    setupUser();

    // ── TRIGGER AUTOLOADER ─────────────────────────────────────────────
    // NON-BLOCKING: Jangan await di sini agar dashboard langsung tampil
    bootSystemAutoloader();

    // ── INITIALIZE MODULES ─────────────────────────────────────────────
    if (window.CimegaSharing) window.CimegaSharing.init();

    buildSidebar();
    loadBeranda();

    // ── Mulai listener real-time (akan panggil refreshDashboardUI saat data tiba) ──
    loadKontenDynamic();

    loadNotifications();
    checkUpdate();
    try {
      await CimegaUpdater.init({ owner: 'prabu26dev', repo: 'Cimega_Smart_Office' });
      CimegaUpdater.startChecking(db);
    } catch (e) { }
    try {
      if (userData.roles.includes('kepsek')) {
        const qKepsek = query(collection(db, 'shared_docs'), where('sekolah', '==', userData.sekolah || ''), where('target', '==', 'approval'), where('status', '==', 'pending'));
        const snap = await getDocs(qKepsek);
        if (!snap.empty) { const b = document.getElementById('approvalBadge'); if (b) { b.style.display = ''; b.textContent = snap.size; } }
      }
      if (userData.roles.includes('bendahara')) {
        const qBendahara = query(collection(db, 'shared_docs'), where('sekolah', '==', userData.sekolah || ''), where('target', '==', 'bendahara'), where('status', '==', 'pending'));
        const snap = await getDocs(qBendahara);
        if (!snap.empty) { const b = document.getElementById('submBadge'); if (b) { b.style.display = ''; b.textContent = snap.size; } }
      }
    } catch (bgError) {
      console.warn('Dashboard background sync skipped (non-critical):', bgError.message);
    }

    // ── Inisialisasi Supabase ──────────────────────────────
    try {
      const sbCfg = window.cimegaConfig?.supabase || await window.cimegaAPI?.getSupabaseConfig();
      if (sbCfg?.url && typeof supabase !== 'undefined') {
        window._supabase = supabase.createClient(sbCfg.url, sbCfg.key);
        console.log('✅ Settings: Supabase Ready');
      }
    } catch (e) {
      console.warn('Supabase initialization skipped or failed:', e);
    }
  } catch (err) {
    console.error('initApp Critical Error:', err);
    if (typeof showToast === 'function') {
      showToast('error', 'Sistem Gagal', 'Gagal memuat modul dashboard. Terjadi kesalahan pada sinkronisasi inti.');
    }
    // Attempt reveal anyway to prevent permanent white screen
  }
}

// ★ INITIALIZATION ★
(function () {
        // Instant Reveal: Hide overlay immediately to prevent hanging UI

        // Start Application Services in background
        CimegaMusic.init();
        initApp().catch(e => console.error('InitApp Failed:', e));
      })();

      // EXPOSE TO GLOBAL (Essential for inline event listeners in dashboard.html)
      // EXPOSE TO GLOBAL (Essential for inline event listeners in dashboard.html & admin.html)
      window.navTo = navTo;
      window.navToMenu = navToMenu;
      window.goBack = goBack;
      window.goBackToList = goBackToList;
      window.toggleEdit = toggleEdit;
      window.saveDoc = saveDoc;
      window.fmt = fmt;
      window.downloadDoc = downloadDoc;
      window.printDoc = printDoc;
      window.setPageSize = setPageSize;
      window.setMargin = setMargin;
      window.setOrientation = setOrientation;
      window.openShareModal = openShareModal;
      window.doShare = doShare;
      window.loadShared = loadShared;
      window.openSharedDocDetail = openSharedDocDetail;
      window.submitComment = submitComment;
      window.downloadSharedDoc = downloadSharedDoc;
      window.loadLaporanKeu = loadLaporanKeu;
      window.loadMySubmissions = loadMySubmissions;
      window.loadMonitor = loadMonitor;
      window.loadGuruDocs = loadGuruDocs;
      window.openSharedDocKepsek = openSharedDocKepsek;
      window.loadApprovals = loadApprovals;
      window.filterApproval = filterApproval;
      window.approveDoc = approveDoc;
      window.rejectDoc = rejectDoc;
      window.loadRekap = loadRekap;
      window.loadBeranda = loadBeranda;
      window.loadProfil = loadProfil;
      window.changePassword = changePassword;
      window.uploadAvatar = uploadAvatar;
      window.toggleNotif = toggleNotif;
      window.doUpdate = doUpdate;
      window.doLogout = doLogout;
      window.switchAiTab = switchAiTab;
      window.sendChat = sendChat;
      window.sendSchoolChat = () => window.CimegaChat?.send?.();
      window.generateDocAI = generateDocAI;
      window.openDocAiModal = () => openModal('modalDocAi');
      window.openDoc = openDoc;
      window.openDocList = openDocList;
      window.filterShared = (f) => {
        const filter = typeof f === 'string' ? f : 'all';
        ['all', 'school', 'mine'].forEach(k => {
          document.getElementById('sf' + k.charAt(0).toUpperCase() + k.slice(1))?.classList.toggle('active', k === filter);
        });
        renderShared(filter);
      };
      window.copyAiResult = (id) => { const el = document.getElementById(id); if (el) navigator.clipboard.writeText(el.textContent || '').then(() => showToast('success', 'Tersalin', 'Teks berhasil disalin')); };
      window.saveAiResult = (id, t) => { showToast('info', 'Petunjuk', 'Salin teks lalu tempel di editor Anda'); };
      window.renderShared = renderShared;
      window.loadLog = loadLog;
      window.loadUpdateHistory = loadUpdateHistory;
      window.loadSekolahDropdown = loadSekolahDropdown;

      // ── 20. ADMIN HELPERS (Restored) ───────────────────────────
      async function loadLog() {
        const { collection, query, orderBy, getDocs } = window._fb;
        const container = document.getElementById('logItemsContainer');
        if (!container) return;
        try {
          const snap = await getDocs(query(collection(db, 'logs'), orderBy('timestamp', 'desc')));
          container.innerHTML = snap.docs.map(d => {
            const log = d.data();
            return `<div class="log-item">
        <span class="log-time">${log.timestamp?.toDate().toLocaleString('id-ID') || '-'}</span>
        <span class="log-user">${log.user || 'System'}</span>
        <span class="log-msg">${log.message}</span>
      </div>`;
          }).join('');
          if (snap.empty) container.innerHTML = '<div class="empty-message">Belum ada log.</div>';
        } catch (e) { console.error('loadLog error', e); }
      }

      async function loadUpdateHistory() {
        const { collection, query, orderBy, getDocs } = window._fb;
        const container = document.getElementById('updateHistoryContainer');
        if (!container) return;
        try {
          const snap = await getDocs(query(collection(db, 'updates'), orderBy('version', 'desc')));
          container.innerHTML = snap.docs.map(d => {
            const up = d.data();
            return `<div class="update-item">
        <strong>${up.version}</strong> - ${up.title} (${up.date})
        <ul>${(up.changes || []).map(c => `<li>${c}</li>`).join('')}</ul>
      </div>`;
          }).join('');
          if (snap.empty) container.innerHTML = '<div class="empty-message">Belum ada riwayat update.</div>';
        } catch (e) { console.error('loadUpdateHistory error', e); }
      }

      async function loadSekolahDropdown() {
        const { collection, getDocs } = window._fb;
        const selects = [document.getElementById('schoolSelect'), document.getElementById('filterSchool')];
        try {
          const snap = await getDocs(collection(db, 'sekolah'));
          const html = '<option value="">-- Pilih Sekolah --</option>' + snap.docs.map(d => `<option value="${d.id}">${d.id}</option>`).join('');
          selects.forEach(s => { if (s) s.innerHTML = html; });
        } catch (e) { console.error('loadSekolahDropdown error', e); }
      }

      // ★ SYSTEM LISTENERS ★
      document.addEventListener('click', function (e) {
        const panel = document.getElementById('notifPanel');
        const btn = document.getElementById('notifBtn') || e.target.closest('.notif-bell');
        if (panel && panel.classList.contains('show')) {
          if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
            panel.classList.remove('show');
          }
        }
      });

// ── MESIN INJEKTOR MODUL DINAMIS (FASE 3) ─────────────────────────

/**
 * Fungsi untuk me-render Modul Administrasi dari Database (Admin)
 * @param {Object} modulData - Paket JSON berisi id, nama, html, js, dan prompt
 */
window.renderDynamicModule = function(modulData) {
    if (!modulData) return;

    // 1. GARBAGE COLLECTION: Bersihkan skrip & gaya dari modul sebelumnya
    document.querySelectorAll('.dynamic-injected-script, .dynamic-injected-style').forEach(el => el.remove());
    
    // PENIMPAAN PAKSA (OVERRIDING UI LAMA)
    // Sembunyikan elemen dokumen default (toolbar, edit, update, hapus)
    const actionBars = document.querySelectorAll('.doc-action-bar, .action-bar');
    actionBars.forEach(el => { el.style.display = 'none'; });

    const docForm = document.getElementById('docFormContainer');
    if (docForm) docForm.style.display = 'none';

    const saveBtn = document.getElementById('saveBtn');
    const editBtn = document.getElementById('editBtn');
    if (saveBtn) saveBtn.style.display = 'none';
    if (editBtn) editBtn.style.display = 'none';

    // Pastikan kita bekerja di kontainer aktif
    let container = document.getElementById('page-dynamic');
    if (!container) {
        const mainContent = document.querySelector('.content') || document.querySelector('.main-content') || document.body;
        container = document.createElement('div');
        container.id = 'page-dynamic';
        container.className = 'page active';
        mainContent.appendChild(container);
    }

    // Pastikan halaman dokumen default ditutup agar tidak bentrok
    const docView = document.getElementById('page-docview');
    if (docView) docView.classList.remove('active');
    
    // Tampilkan page-dynamic
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    container.classList.add('active');

    // BERSIHKAN TOTAL kontainer utama sebelum dirender
    container.innerHTML = '';

    // -- EKSTRAKTOR TAG STYLE --
    // Browser seringkali mengabaikan tag <style> jika disuntikkan via innerHTML
    let rawHTML = modulData.koding_html || '';
    let extractedStyles = '';
    
    // Ekstrak isi tag <style>...</style> menggunakan Regex
    const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
    rawHTML = rawHTML.replace(styleRegex, function(match, styleContent) {
        extractedStyles += styleContent + '\n';
        return ''; // Hapus tag style dari HTML murni
    });

    // Tempelkan style yang diekstrak langsung ke document.head
    if (extractedStyles.trim() !== '') {
        const styleEl = document.createElement('style');
        styleEl.id = 'dynamic-modul-style-' + (modulData.id || 'temp');
        styleEl.className = 'dynamic-injected-style';
        styleEl.textContent = extractedStyles;
        document.head.appendChild(styleEl);
        console.log(`⚡ CSS Modul [${modulData.id}] berhasil disuntikkan ke document.head`);
    }

    // 2. RENDER ANTARMUKA (HTML)
    container.innerHTML = `
        <div class="cyber-panel fade-in">
            <div class="cyber-header">
                <h2 class="orbitron-title">${(modulData.nama || 'Modul Dinamis').toUpperCase()}</h2>
                <div style="font-size: 10px; color: var(--muted); margin-top: 5px;">Modul ID: ${modulData.id || ''}</div>
            </div>
            <div id="dynamic-content-wrapper">
                ${rawHTML}
            </div>
        </div>
    `;

    // Simpan prompt ke memori global sementara untuk modul ini
    window._currentDynamicPrompt = modulData.ai_prompt;

    // 3. SANDBOXING & EKSEKUSI JAVASCRIPT
    if (modulData.koding_js) {
        try {
            const scriptEl = document.createElement('script');
            scriptEl.className = 'dynamic-injected-script';
            
            // Membungkus JS dalam IIFE agar terisolasi dan tidak bentrok antar modul
            scriptEl.textContent = `
                (function() {
                    try {
                        ${modulData.koding_js}
                        console.log("⚡ Modul Logic [${modulData.id}] berhasil dimuat.");
                    } catch(err) {
                        console.error("⚠️ Error pada logika Modul [${modulData.id}]:", err);
                        if(window.showToast) window.showToast('error', 'Logic Error', 'Terjadi kesalahan pada skrip internal modul ini.');
                    }
                })();
            `;
            document.body.appendChild(scriptEl);
        } catch(e) {
            console.error("Gagal menyuntikkan skrip modul:", e);
        }
    }
};

/**
 * PROMPT PARSER (Mesin Penerjemah Variabel AI)
 * Fungsi ini dipanggil dari dalam tombol di HTML Modul Anda (misal: onclick="executeDynamicPrompt(this)")
 */
window.executeDynamicPrompt = async function(btnElement) {
    if (!window._currentDynamicPrompt) {
        if(window.showToast) window.showToast('error', 'Gagal', 'Instruksi AI (Prompt) tidak ditemukan pada modul ini.');
        return;
    }

    // Ubah status tombol agar tidak dispam
    const originalText = btnElement ? btnElement.innerHTML : 'GENERATE';
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = '⏳ MENGANALISIS...';
    }

    try {
        // 4. PARSER: Ganti variabel {{id_input}} dengan nilai ketikan user
        let finalPrompt = window._currentDynamicPrompt.replace(/\{\{([^}]+)\}\}/g, function(match, elementId) {
            const el = document.getElementById(elementId.trim());
            // Jika elemen berupa checkbox/radio
            if (el && (el.type === 'checkbox' || el.type === 'radio')) {
                return el.checked ? (el.value || 'Ya') : 'Tidak';
            }
            // Jika elemen input teks/select biasa
            return el ? el.value : match; 
        });

        console.log("🚀 Mengirim Prompt Dinamis ke AI:\n", finalPrompt);
        
        if(window.showToast) window.showToast('info', 'AI Bekerja', 'Memproses dokumen sesuai parameter...');

        // Di sini Anda memanggil fungsi utama Gemini Anda
        // Contoh: const hasil = await window.CimegaAI.ask({ system: "...", messages: [{role:'user', content: finalPrompt}] });
        
        // Simulasi sukses
        setTimeout(() => {
            if(window.showToast) window.showToast('success', 'Selesai', 'AI berhasil memproses dokumen!');
        }, 2000);

    } catch (e) {
        console.error("AI Generation Error:", e);
        if(window.showToast) window.showToast('error', 'Gagal', 'Sistem AI mengalami gangguan.');
    } finally {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = originalText;
        }
    }
};

// ── FUNGSI FETCH MODUL DINAMIS & NAVIGASI ──

window.fetchDynamicModules = async function() {
    const roles = typeof userData !== 'undefined' ? (userData.roles || ['guru']) : ['guru'];
    
    if (!window._fb || !window.db) {
        console.warn("Database tidak tersedia untuk fetch modul dinamis.");
        return [];
    }

    const { collection, getDocs, query } = window._fb;
    const fetchedModules = [];

    try {
        // Menggunakan filter lokal untuk menghindari error Missing Index di Firebase
        const q = query(collection(window.db, 'modul_dinamis'));
        const snapshot = await getDocs(q);

        snapshot.forEach(function(docSnap) {
            const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
            // ★ KRITIS: Selalu embed doc.id agar name matching bisa bekerja
            const fullData = Object.assign({ id: docSnap.id }, data);
            const hasAccess = fullData.akses_role && fullData.akses_role.some(function(r) { return roles.includes(r); });
            if (hasAccess || roles.includes('admin')) {
                fetchedModules.push(fullData);
                console.log('📦 Modul dimuat:', fullData.id, '| nama:', fullData.nama, '| has_html:', !!fullData.koding_html);
            }
        });

        console.log('✅ Total modul dinamis ter-cache:', fetchedModules.length, '(role:', roles.join(', ') + ')');
        return fetchedModules;
    } catch (error) {
        console.error('❌ Gagal mengambil modul dinamis:', error);
        if(window.showToast) window.showToast('warn', 'Koneksi Lemah', 'Gagal memuat modul dinamis, mode offline aktif.');
        return [];
    }
};

window.navToDynamicModule = function(el, moduleId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');

    const mod = window._dynamicModulesMap ? window._dynamicModulesMap[moduleId] : null;
    const tt = document.getElementById('topbarTitle');

    // Jika halaman administrasi split-view sedang aktif, render ke panel kanan
    const admPage = document.getElementById('page-administrasi');
    const renderBody = document.getElementById('admRenderBody');
    const renderTitle = document.getElementById('admRenderTitle');

    if (admPage && admPage.classList.contains('active') && renderBody) {
        // Render ke panel kanan split-view (tidak menimpa seluruh halaman)
        if (renderTitle && mod) renderTitle.textContent = (mod.nama || 'MODUL DINAMIS').toUpperCase();
        if (tt && mod) tt.textContent = (mod.nama || 'MODUL DINAMIS').toUpperCase();
        if (mod) {
            if (window.renderDynamicModuleInPanel) {
                window.renderDynamicModuleInPanel(mod);
            } else {
                window.renderDynamicModule(mod);
            }
        }
        return;
    }

    // Fallback: tampilkan page-dynamic sebagai full-view
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    let target = document.getElementById('page-dynamic');

    if (!target || target.parentNode === document.body) {
        if (target) target.remove();
        const mainContent = document.querySelector('.content') || document.getElementById('mainContent') || document.body;
        target = document.createElement('div');
        target.id = 'page-dynamic';
        target.className = 'page';
        mainContent.appendChild(target);
    }

    target.classList.add('active');

    if (tt && mod) {
        tt.textContent = (mod.nama || 'MODUL DINAMIS').toUpperCase();
    } else if (tt) {
        tt.textContent = 'MODUL DINAMIS';
    }

    if (mod) {
        window.renderDynamicModule(mod);
    }
};