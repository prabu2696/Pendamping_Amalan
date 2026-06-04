// router.js - Super-Blueprint Router & UI Generator
// Menggantikan sistem modul_dinamis Firebase yang tidak aman.
window.CimegaRouter = {
  modules: [
    // === 1. GURU (13 Modul) ===
    { id: 'g_cp_tp_atp', title: 'Pemetaan CP, TP, ATP', kategori: 'Perencanaan Pembelajaran', roles: ['guru'], icon: '🗺️', desc: 'Pemetaan otomatis berdasarkan Fase' },
    { id: 'g_prota_promes', title: 'Prota & Promes', kategori: 'Perencanaan Pembelajaran', roles: ['guru'], icon: '📅', desc: 'Program Tahunan dan Semester 2026/2027' },
    { id: 'g_modul_ajar', title: 'Generator Modul Ajar', kategori: 'Perencanaan Pembelajaran', roles: ['guru'], icon: '📚', desc: 'RPP Plus Kurikulum Merdeka' },
    { id: 'g_kokurikuler', title: 'Modul Kokurikuler', kategori: 'Perencanaan Pembelajaran', roles: ['guru'], icon: '🌱', desc: 'Penguatan karakter siswa' },
    
    { id: 'g_asesmen_diag', title: 'Asesmen Diagnostik', kategori: 'Asesmen & Penilaian', roles: ['guru'], icon: '🩺', desc: 'Kognitif & Non-Kognitif' },
    { id: 'g_gen_soal', title: 'Generator Soal Lengkap', kategori: 'Asesmen & Penilaian', roles: ['guru'], icon: '📝', desc: 'Pilihan ganda, essay, AKM' },
    { id: 'g_kisi_soal', title: 'Kisi-Kisi & Analisis Soal', kategori: 'Asesmen & Penilaian', roles: ['guru'], icon: '📊', desc: 'Otomatis dari generator soal' },
    { id: 'g_buku_nilai', title: 'Buku Nilai Digital', kategori: 'Asesmen & Penilaian', roles: ['guru'], icon: '📓', desc: 'Input sumatif & formatif' },
    
    { id: 'g_jurnal', title: 'Jurnal Mengajar Harian', kategori: 'Harian & Pelaporan', roles: ['guru'], icon: '📖', desc: 'Catatan agenda kelas harian' },
    { id: 'g_absensi', title: 'Absensi Siswa', kategori: 'Harian & Pelaporan', roles: ['guru'], icon: '✅', desc: 'Daftar hadir otomatis' },
    { id: 'g_anekdotal', title: 'Catatan Anekdotal', kategori: 'Harian & Pelaporan', roles: ['guru'], icon: '👁️', desc: 'Observasi perilaku siswa' },
    { id: 'g_remedial', title: 'Remedial & Pengayaan', kategori: 'Harian & Pelaporan', roles: ['guru'], icon: '📈', desc: 'Program tindak lanjut' },
    { id: 'g_rapor', title: 'Generator Rapor', kategori: 'Harian & Pelaporan', roles: ['guru'], icon: '🎓', desc: 'Cetak Rapor Akademik & Karakter' },

    // === 2. KEPALA SEKOLAH (8 Modul) ===
    { id: 'k_kosp', title: 'Generator KOSP', kategori: 'Manajerial & Perencanaan', roles: ['kepsek'], icon: '🏛️', desc: 'Kurikulum Operasional Sekolah' },
    { id: 'k_rkjm_rkt', title: 'RKJM & RKT', kategori: 'Manajerial & Perencanaan', roles: ['kepsek'], icon: '🎯', desc: 'Rencana Kerja Jangka Menengah & Tahunan' },
    { id: 'k_sk_tugas', title: 'SK Pembagian Tugas', kategori: 'Kepegawaian', roles: ['kepsek'], icon: '📜', desc: 'SK Mengajar & Tenaga Kependidikan' },
    { id: 'k_supervisi', title: 'Supervisi Akademik', kategori: 'Pengawasan', roles: ['kepsek'], icon: '🔍', desc: 'Instrumen Observasi Kelas' },
    { id: 'k_pkg', title: 'Penilaian Kinerja Guru (PKG)', kategori: 'Pengawasan', roles: ['kepsek'], icon: '⭐', desc: 'Kalkulasi nilai otomatis' },
    { id: 'k_buku_pembinaan', title: 'Buku Pembinaan', kategori: 'Pengawasan', roles: ['kepsek'], icon: '🤝', desc: 'Catatan pembinaan staf' },
    { id: 'k_eds', title: 'Evaluasi Diri Sekolah (EDS)', kategori: 'Evaluasi', roles: ['kepsek'], icon: '🏢', desc: 'Tindak lanjut Rapor Pendidikan' },
    { id: 'k_gen_sk', title: 'Generator SK Bebas', kategori: 'Manajerial & Perencanaan', roles: ['kepsek'], icon: '📄', desc: 'Pembuatan SK Kepanitiaan' },

    // === 3. TATA USAHA (9 Modul) ===
    { id: 't_buku_induk', title: 'Buku Induk Siswa', kategori: 'Administrasi Siswa', roles: ['tu'], icon: '🗃️', desc: 'Database utama siswa' },
    { id: 't_mutasi', title: 'Buku Mutasi Siswa', kategori: 'Administrasi Siswa', roles: ['tu'], icon: '🔄', desc: 'Pencatatan siswa masuk/keluar' },
    { id: 't_agenda_surat', title: 'Agenda Surat Masuk/Keluar', kategori: 'Administrasi Persuratan', roles: ['tu'], icon: '📬', desc: 'Arsip surat menyurat' },
    { id: 't_ekspedisi', title: 'Buku Ekspedisi', kategori: 'Administrasi Persuratan', roles: ['tu'], icon: '🚚', desc: 'Pencatatan pengiriman dokumen' },
    { id: 't_kepegawaian', title: 'Administrasi Kepegawaian', kategori: 'Administrasi Pegawai', roles: ['tu'], icon: '👨‍💼', desc: 'Buku DUK & Data Guru' },
    { id: 't_inventaris', title: 'Manajemen Inventaris (KIB)', kategori: 'Sarana & Prasarana', roles: ['tu'], icon: '🖥️', desc: 'Kartu Inventaris Barang' },
    { id: 't_penghapusan', title: 'Buku Penghapusan Barang', kategori: 'Sarana & Prasarana', roles: ['tu'], icon: '🗑️', desc: 'Aset yang dihapus/rusak' },
    { id: 't_gen_surat', title: 'Pelayanan Surat Otomatis', kategori: 'Administrasi Persuratan', roles: ['tu'], icon: '✉️', desc: 'Suket Aktif, Pindah, dll' },
    { id: 't_notulen', title: 'Buku Notulen Rapat', kategori: 'Administrasi Umum', roles: ['tu'], icon: '✍️', desc: 'Catatan hasil rapat dinas' },

    // === 4. BENDAHARA (6 Modul) ===
    { id: 'b_rkas', title: 'RKAS', kategori: 'Perencanaan Keuangan', roles: ['bendahara'], icon: '💰', desc: 'Rencana Anggaran Sekolah' },
    { id: 'b_bku', title: 'Buku Kas Umum (BKU)', kategori: 'Pembukuan', roles: ['bendahara'], icon: '📘', desc: 'Penerimaan & Pengeluaran' },
    { id: 'b_bantu_kas', title: 'Buku Pembantu Kas & Bank', kategori: 'Pembukuan', roles: ['bendahara'], icon: '🏦', desc: 'Detail transaksi bank' },
    { id: 'b_bantu_pajak', title: 'Buku Pembantu Pajak', kategori: 'Pembukuan', roles: ['bendahara'], icon: '🧾', desc: 'Pencatatan PPN/PPh' },
    { id: 'b_spj', title: 'SPJ Generator', kategori: 'Pelaporan', roles: ['bendahara'], icon: '📑', desc: 'Surat Pertanggungjawaban' },
    { id: 'b_lra', title: 'Laporan Realisasi Anggaran', kategori: 'Pelaporan', roles: ['bendahara'], icon: '📊', desc: 'Grafik serapan anggaran' },

    // === 5. OPERATOR SEKOLAH (5 Modul) ===
    { id: 'o_user_role', title: 'Manajemen Pengguna & Role', kategori: 'Sistem & Data', roles: ['ops', 'admin'], icon: '👥', desc: 'Pengaturan akun & multi-jabatan' },
    { id: 'o_kalender', title: 'Setup Tahun Ajaran & Kalender', kategori: 'Sistem & Data', roles: ['ops', 'admin'], icon: '📅', desc: 'Kalender akademik aktif' },
    { id: 'o_profil', title: 'Pengaturan Profil Sekolah', kategori: 'Sistem & Data', roles: ['ops', 'admin'], icon: '🏫', desc: 'Identitas, logo, kop surat' },
    { id: 'o_sync', title: 'Modul Sinkronisasi Dapodik', kategori: 'Sistem & Data', roles: ['ops', 'admin'], icon: '☁️', desc: 'Import/Export data' },
    { id: 'o_backup', title: 'Database Backup & Recovery', kategori: 'Sistem & Data', roles: ['ops', 'admin'], icon: '💾', desc: 'Pencadangan lokal/cloud' }
  ],

  getSidebarMenuHtml(userRoles) {
    if (!userRoles || userRoles.length === 0) userRoles = ['guru'];
    
    // Normalisasi role (lowercase)
    const normalizedRoles = userRoles.map(r => r.toLowerCase().trim());
    
    // Filter modul yang boleh dilihat
    const allowedModules = this.modules.filter(m => {
      return m.roles.some(mr => normalizedRoles.includes(mr.toLowerCase().trim()));
    });

    // Kelompokkan berdasarkan kategori
    const byCategory = {};
    allowedModules.forEach(m => {
      if (!byCategory[m.kategori]) byCategory[m.kategori] = [];
      byCategory[m.kategori].push(m);
    });

    let html = `<div class="nav-section">Menu Utama</div>
    <div class="nav-item active" id="nav-beranda" onclick="navTo(this,'beranda','BERANDA',loadBeranda)"><span class="nav-icon">🏠</span>Beranda</div>`;

    Object.keys(byCategory).forEach(kat => {
      html += `<div class="nav-section">${kat.toUpperCase()}</div>`;
      byCategory[kat].forEach(m => {
        html += `<div class="nav-item" onclick="window.CimegaRouter.openModule('${m.id}', this)"><span class="nav-icon">${m.icon}</span><span style="flex:1;font-size:11px;line-height:1.2">${m.title}</span></div>`;
      });
    });

    return html;
  },

  // Membuka modul dan memuat berkas-berkas JavaScript-nya secara dinamis (Lazy Loading)
  openModule(id, navElement) {
    // UI Navigation Highlight
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(navElement) navElement.classList.add('active');
    
    const mod = this.modules.find(m => m.id === id);
    if(!mod) return;

    showPage('doclist', mod.title.toUpperCase());
    const renderBody = document.getElementById('admRenderBody');
    if(!renderBody) return;

    // Animasi Loading Inisialisasi
    renderBody.innerHTML = `
      <div class="cyber-loading" style="display:flex;">
         <div class="cyber-spinner"></div>
         <div class="cyber-loading-text">INITIALIZING MODULE: ${mod.id.toUpperCase()}_v2026...</div>
      </div>
    `;

    setTimeout(async () => {
      try {
        // Load file core dan UI dinamis untuk modul yang bersangkutan
        await this.loadModuleScripts(mod.id);
        this.renderModuleUI(mod, renderBody);
      } catch (err) {
        console.error('[CimegaRouter] Dynamic script loading failed:', err);
        renderBody.innerHTML = `
          <div class="cyber-container fade-in" style="padding:40px; text-align:center; color:var(--red); border:1px solid rgba(255,0,0,0.2);">
            <div style="font-size:32px; margin-bottom:10px;">⚠️</div>
            <h3 style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:700;">Gagal Memuat Modul</h3>
            <p style="font-size:11px; margin-top:10px; color:rgba(255,255,255,0.6); font-family:monospace;">${err.message}</p>
          </div>
        `;
      }
    }, 400);
  },

  // Fungsi untuk memuat berkas Core & UI dari subfolder secara on-demand
  async loadModuleScripts(modId) {
    const hasCustomUI = ['g_absensi', 'g_jurnal', 'g_modul_ajar', 'g_gen_soal', 'g_rapor', 't_gen_surat'].includes(modId);
    if (hasCustomUI) return Promise.resolve();

    const pascalName = this.toPascalCase(modId.replace(/^[gktbo]_/, ''));
    if (window[`${pascalName}Core`] && window[`${pascalName}UI`]) {
      return Promise.resolve();
    }

    // Tentukan folder berdasarkan prefiks role
    let roleDir = 'guru';
    if (modId.startsWith('k_')) roleDir = 'kepsek';
    else if (modId.startsWith('t_')) roleDir = 'tu';
    else if (modId.startsWith('b_')) roleDir = 'bendahara';
    else if (modId.startsWith('o_')) roleDir = 'ops';

    const baseName = modId.replace(/^[gktbo]_/, '');
    const corePath = `../../features/dashboard/modules/${roleDir}/${baseName}_core.js`;
    const uiPath = `../../features/dashboard/modules/${roleDir}/${baseName}_ui.js`;

    return Promise.all([
      this.injectScript(corePath),
      this.injectScript(uiPath)
    ]);
  },

  injectScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Gagal memuat berkas script: ${src}`));
      document.body.appendChild(script);
    });
  },

  toPascalCase(str) {
    return str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  },

  renderModuleUI(mod, container) {
    const db = window.db || window._fb?.db;
    const userProfile = window._userData;
    const schoolProfile = window._schoolProfile || { nama_sekolah: userProfile?.sekolah || 'SD Negeri Cimega', tahun_ajaran: '2026/2027' };

    // Check if the module has a custom UI implementation (Statically Loaded)
    if (mod.id === 'g_absensi' && window.AbsensiUI) {
      container.innerHTML = `<div id="g_absensi-container"></div>`;
      window.AbsensiCore.init(db, userProfile, schoolProfile);
      return;
    }
    if (mod.id === 'g_jurnal' && window.JurnalMengajarUI) {
      container.innerHTML = `<div id="g_jurnal-container"></div>`;
      window.JurnalMengajarCore.init(db, userProfile, schoolProfile);
      window.JurnalMengajarUI.renderForm(userProfile);
      return;
    }
    if (mod.id === 'g_modul_ajar' && window.ModulAjarUI) {
      container.innerHTML = `<div id="g_modul_ajar-container" style="height: 100%;"></div>`;
      window.ModulAjarCore.init(db, userProfile, schoolProfile);
      window.ModulAjarUI.renderForm('g_modul_ajar-container');
      return;
    }
    if (mod.id === 'g_gen_soal' && window.GeneratorSoalUI) {
      container.innerHTML = `<div id="g_gen_soal-container" style="height: 100%;"></div>`;
      window.GeneratorSoalUI.init(db, userProfile, schoolProfile);
      window.GeneratorSoalUI.renderForm('g_gen_soal-container');
      return;
    }
    if (mod.id === 'g_rapor' && window.NilaiRaporUI) {
      container.innerHTML = `<div id="g_rapor-container" style="height: 100%;"></div>`;
      window.NilaiRaporUI.renderForm('g_rapor-container');
      return;
    }
    if (mod.id === 't_gen_surat' && window.GeneratorSurat) {
      container.innerHTML = `<div id="t_gen_surat-container" style="height: 100%;"></div>`;
      window.GeneratorSurat.renderForm('t_gen_surat-container');
      return;
    }

    // Untuk 35 modul administrasi dinamis yang baru saja dimuat berkas terpisahnya
    const pascalName = this.toPascalCase(mod.id.replace(/^[gktbo]_/, ''));
    
    if (window[`${pascalName}Core`] && window[`${pascalName}UI`]) {
      const containerId = `${mod.id}-container`;
      container.innerHTML = `<div id="${containerId}" style="height: 100%;"></div>`;
      
      // Inisialisasi logic core dan render form-nya
      window[`${pascalName}Core`].init(db, userProfile, schoolProfile);
      window[`${pascalName}UI`].renderForm(containerId);
    } else {
      container.innerHTML = `
        <div class="cyber-container fade-in" style="padding:40px; text-align:center; color:var(--cyan); border:1px solid rgba(0,229,255,0.2);">
          <div style="font-size:32px; margin-bottom:10px;">⚙️</div>
          <h3 style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:700;">Modul Tidak Siap</h3>
          <p style="font-size:11px; margin-top:10px; color:rgba(255,255,255,0.6);">Gagal meresolusi komponen GUI/Core: window.${pascalName}UI / window.${pascalName}Core</p>
        </div>
      `;
    }
  },

  // === DYNAMIC PREVIEW ENGINE FOR AI CHAT AGENT PROMPTS ===
  renderGenericAIResult(title, content, exportType = 'word') {
    showPage('doclist', title.toUpperCase());
    const renderBody = document.getElementById('admRenderBody');
    if (!renderBody) return;

    const isExcel = exportType === 'excel' || content.includes('</table>') || content.includes('</th>') || content.includes('</td>');

    const exportButtonHtml = isExcel
      ? `<button class="cyber-button" onclick="window.CimegaRouter.exportGenericExcel('${title}')">
           <span>📊</span> Ekspor Excel (.xls)
         </button>`
      : `<button class="cyber-button" onclick="window.CimegaRouter.exportGenericWord('${title}')">
           <span>📝</span> Ekspor Word (.doc)
         </button>`;

    renderBody.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">✨</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3); font-family:'Plus Jakarta Sans', sans-serif;">PRATINJAU DOKUMEN CHAT</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px; font-family:'Plus Jakarta Sans', sans-serif;">Dihasilkan langsung dari prompt obrolan AI</span>
                 </div>
             </div>
         </div>

         <div style="flex:1; display:flex; gap:20px; overflow:hidden; margin-bottom:15px;">
            <!-- Panel Kiri: Text Markdown Editor -->
            <div style="flex:1; display:flex; flex-direction:column; background:rgba(255,255,255,0.01); border:1px solid rgba(0,229,255,0.15); border-radius:8px; padding:12px;">
               <div style="font-size:11px; text-transform:uppercase; color:#00e5ff; font-weight:600; margin-bottom:8px; display:flex; justify-content:space-between; font-family:'Plus Jakarta Sans', sans-serif;">
                  <span>📝 Editor Dokumen (Dapat diedit langsung)</span>
                  <span>MODE MARKDOWN</span>
               </div>
               <textarea id="generic-ai-editor" class="cyber-input" style="flex:1; width:100%; height:100%; font-family: 'Courier New', Courier, monospace; font-size:13px; line-height:1.6; resize:none; background:rgba(0,0,0,0.35); border-color:rgba(0,229,255,0.2); color:#e0f0ff;" oninput="window.CimegaRouter.updateGenericAIPreview()">${content.trim()}</textarea>
            </div>

            <!-- Panel Kanan: Live Print Preview -->
            <div style="flex:1; display:flex; flex-direction:column; background:rgba(255,255,255,0.01); border:1px solid rgba(0,229,255,0.15); border-radius:8px; padding:12px; overflow:hidden;">
               <div style="font-size:11px; text-transform:uppercase; color:#ff00ff; font-weight:600; margin-bottom:8px; font-family:'Plus Jakarta Sans', sans-serif;">
                  <span>👁️ Tampilan Cetak / Pratinjau Dokumen</span>
               </div>
               <div id="generic-ai-preview" style="flex:1; background:#fff; color:#000; border-radius:4px; padding:30px; overflow-y:auto; box-sizing:border-box; font-family: 'Times New Roman', Times, serif; line-height:1.6;" class="custom-scrollbar"></div>
            </div>
         </div>

         <div style="padding-top:20px; border-top:1px solid rgba(0,229,255,0.15); display:flex; gap:15px; justify-content:flex-end; align-items:center;">
             <div style="display:flex; gap:10px;">
                 <button class="cyber-button" onclick="window.CimegaRouter.saveGenericDoc('${title}')">
                     <span>💾</span> Simpan Dokumen
                 </button>
                 ${exportButtonHtml}
                 <button class="cyber-button primary" onclick="window.CimegaRouter.printGenericDoc('${title}', ${isExcel})">
                     <span>🖨️</span> Cetak / PDF
                 </button>
             </div>
         </div>
      </div>
    `;

    this.updateGenericAIPreview();
  },

  updateGenericAIPreview() {
    const editor = document.getElementById('generic-ai-editor');
    const preview = document.getElementById('generic-ai-preview');
    if (!editor || !preview) return;

    const mdText = editor.value;
    let htmlContent = '';
    if (typeof marked === 'function') {
      htmlContent = marked(mdText);
    } else if (window.marked && typeof window.marked.parse === 'function') {
      htmlContent = window.marked.parse(mdText);
    } else {
      htmlContent = mdText.replace(/\n/g, '<br>');
    }

    const schoolProfile = window._schoolProfile || { nama_sekolah: 'SD Negeri Cimega', tahun_ajaran: '2026/2027', alamat: 'Tasikmalaya', npsn: '20219876' };
    const kop = `
      <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; font-weight: normal; line-height: 1.2;">PEMERINTAH KABUPATEN TASIKMALAYA</h2>
        <h1 style="margin: 3px 0; font-size: 16px; text-transform: uppercase; font-weight: bold; line-height: 1.2;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
        <h1 style="margin: 3px 0; font-size: 18px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; line-height: 1.2;">${schoolProfile.nama_sekolah}</h1>
        <p style="margin: 2px 0; font-size: 11px; font-style: italic;">Alamat: ${schoolProfile.alamat || 'Cimega'} | NPSN: ${schoolProfile.npsn || '-'}</p>
      </div>
    `;

    let signatureHtml = '';
    if (!mdText.toLowerCase().includes('kepala sekolah') && !mdText.toLowerCase().includes('tanda tangan')) {
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      signatureHtml = `
        <div style="margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; font-family: 'Times New Roman', Times, serif;">
          <div style="text-align: center; width: 200px;">
            <p style="margin: 0;">Mengetahui,</p>
            <p style="margin: 0; font-weight: bold;">Kepala Sekolah</p>
            <div style="height: 60px;"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">${schoolProfile.kepala_sekolah || '_____________________'}</p>
            <p style="margin: 0;">NIP. ${schoolProfile.nip_kepsek || '_____________________'}</p>
          </div>
          <div style="text-align: center; width: 200px;">
            <p style="margin: 0;">Tasikmalaya, ${today}</p>
            <p style="margin: 0; font-weight: bold;">Pembuat Dokumen</p>
            <div style="height: 60px;"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">${window._userData?.displayName || 'Guru/Staf'}</p>
            <p style="margin: 0;">NIP. ${window._userData?.nip || '_____________________'}</p>
          </div>
        </div>
      `;
    }

    preview.innerHTML = `
      <div style="background:#fff; color:#000; padding:10px; box-sizing:border-box;">
        ${kop}
        <div style="font-size:12px; line-height:1.6; text-align:justify; color:#000;">
          ${htmlContent}
        </div>
        ${signatureHtml}
      </div>
    `;
  },

  async saveGenericDoc(title) {
    const editor = document.getElementById('generic-ai-editor');
    if (!editor) return;
    const db = window.db || window._fb?.db;
    const userProfile = window._userData;
    const schoolProfile = window._schoolProfile || { nama_sekolah: 'SD Negeri Cimega' };
    if (!db) {
      window.showToast?.('error', 'Koneksi Gagal', 'Database tidak terhubung.');
      return;
    }

    try {
      await db.collection('administrasi_docs').add({
        modId: 'g_chat_generated',
        title: title,
        content: editor.value,
        createdAt: new Date().toISOString(),
        userId: userProfile?.uid || 'guest',
        userName: userProfile?.displayName || 'Staf',
        schoolId: userProfile?.schoolId || 'cimega_master',
        schoolName: schoolProfile.nama_sekolah,
        status: 'Aktif'
      });
      window.showToast?.('success', 'Tersimpan', 'Dokumen berhasil diarsipkan ke database.');
    } catch (e) {
      window.showToast?.('error', 'Gagal Menyimpan', e.message);
    }
  },

  async exportGenericWord(title) {
    const preview = document.getElementById('generic-ai-preview');
    if (!preview) return;
    const api = window.cimegaConfig || window.cimegaAPI;
    if (!api || !api.saveHTML) return;

    try {
      const docHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: A4 portrait; margin: 2.54cm; }
            body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
            h1, h2, h3, h4 { font-family: 'Times New Roman', Times, serif; color: #000; margin-top: 15px; margin-bottom: 8px; }
            h1 { font-size: 18pt; text-align: center; }
            h2 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 3px; }
            p { margin-bottom: 10px; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            table, th, td { border: 1px solid #000; }
            th, td { padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${preview.innerHTML}
        </body>
        </html>
      `;
      const fileName = `${title.replace(/ /g, '_')}_${Date.now()}.doc`;
      const res = await api.saveHTML(docHtml, fileName);
      if (res && res.success) {
        window.showToast?.('success', 'Word Berhasil', 'Dokumen disimpan.');
        if (api.openFile) await api.openFile(res.filePath);
      }
    } catch (e) {
      window.showToast?.('error', 'Gagal', e.message);
    }
  },

  async exportGenericExcel(title) {
    const preview = document.getElementById('generic-ai-preview');
    if (!preview) return;
    const api = window.cimegaConfig || window.cimegaAPI;
    if (!api || !api.saveHTML) return;

    try {
      const xlsHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; }
            table { border-collapse: collapse; margin-top: 15px; width: 100%; }
            table, th, td { border: 0.5pt solid #000; }
            th { background-color: #1a73e8; color: #ffffff; font-weight: bold; padding: 6px; text-align: center; }
            td { padding: 5px; text-align: left; }
          </style>
        </head>
        <body>
          ${preview.innerHTML}
        </body>
        </html>
      `;
      const fileName = `${title.replace(/ /g, '_')}_${Date.now()}.xls`;
      const res = await api.saveHTML(xlsHtml, fileName);
      if (res && res.success) {
        window.showToast?.('success', 'Excel Berhasil', 'Spreadsheet disimpan.');
        if (api.openFile) await api.openFile(res.filePath);
      }
    } catch (e) {
      window.showToast?.('error', 'Gagal', e.message);
    }
  },

  async printGenericDoc(title, isExcel) {
    const preview = document.getElementById('generic-ai-preview');
    if (!preview) return;
    const api = window.cimegaConfig || window.cimegaAPI;
    if (!api || !api.generatePDF) return;

    try {
      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; color: #000; background: #fff; line-height: 1.6; font-size: 12pt; }
            h1, h2, h3, h4 { color: #000; margin-top: 15px; margin-bottom: 8px; }
            h1 { font-size: 18pt; text-align: center; }
            h2 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 3px; }
            p { margin-bottom: 10px; text-align: justify; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
            table, th, td { border: 1px solid #000; }
            th, td { padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${preview.innerHTML}
        </body>
        </html>
      `;
      const res = await api.generatePDF(printHtml, `${title.replace(/ /g, '_')}_${Date.now()}`, { landscape: isExcel });
      if (res && res.success) {
        window.showToast?.('success', 'PDF Selesai', 'Dokumen berhasil diekspor.');
        if (api.openFile) await api.openFile(res.filePath);
      }
    } catch (e) {
      window.showToast?.('error', 'Gagal Cetak', e.message);
    }
  }
};
