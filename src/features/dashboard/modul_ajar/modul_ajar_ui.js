// src/features/dashboard/modul_ajar/modul_ajar_ui.js

const ModulAjarUI = {
  _isGenerating: false,

  init() {
    this._autoFillFromProfile();
  },

  renderForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">📚</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3)">Generator Modul Ajar (KMDL)</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px;">Perencanaan Pembelajaran</span>
                 </div>
             </div>
             <div style="font-size:11px; font-weight:700; color:#0b0e14; background:linear-gradient(90deg, #00e5ff, #0099ff); padding:6px 12px; border-radius:20px; box-shadow: 0 0 15px rgba(0,229,255,0.4)">T.A 2026/2027</div>
         </div>
         
         <div style="flex:1; overflow-y:auto; padding-right:15px;" class="custom-scrollbar">
             <!-- Mode Buttons -->
             <div style="display:flex; gap:10px; margin-bottom: 20px;">
                <button id="ma-mode-gui" class="ma-mode-btn active" data-mode="gui" style="padding: 8px 16px; background: rgba(0,229,255,0.15); border: 1px solid var(--cyan); color: var(--cyan); border-radius: 6px; cursor: pointer; font-size: 12px;" onclick="window.ModulAjarUI.switchMode('gui')">🎛 Form Input</button>
                <button id="ma-mode-prompt" class="ma-mode-btn" data-mode="prompt" style="padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; cursor: pointer; font-size: 12px;" onclick="window.ModulAjarUI.switchMode('prompt')">✨ AI Prompt</button>
             </div>

             <!-- GUI Mode Form -->
             <div id="ma-gui-section" class="cyber-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                 <div class="cyber-group">
                     <label class="cyber-label">Mata Pelajaran</label>
                     <select id="ma-mapel" class="cyber-select" required>
                         <option value="">-- Pilih Mata Pelajaran --</option>
                         <option value="Pendidikan Agama dan Budi Pekerti">Pendidikan Agama dan Budi Pekerti</option>
                         <option value="Pendidikan Pancasila">Pendidikan Pancasila</option>
                         <option value="Bahasa Indonesia">Bahasa Indonesia</option>
                         <option value="Matematika">Matematika</option>
                         <option value="IPAS">IPAS (Fase B/C)</option>
                         <option value="Seni dan Budaya">Seni dan Budaya</option>
                         <option value="PJOK">PJOK</option>
                         <option value="Bahasa Inggris">Bahasa Inggris</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Kelas</label>
                     <select id="ma-kelas" class="cyber-select" onchange="window.ModulAjarUI.syncFaseFromKelas()" required>
                         <option value="">-- Pilih Kelas --</option>
                         <option value="1">Kelas 1</option>
                         <option value="2">Kelas 2</option>
                         <option value="3">Kelas 3</option>
                         <option value="4">Kelas 4</option>
                         <option value="5">Kelas 5</option>
                         <option value="6">Kelas 6</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Fase</label>
                     <select id="ma-fase" class="cyber-select" required>
                         <option value="">-- Pilih Fase --</option>
                         <option value="A">Fase A (Kelas 1-2)</option>
                         <option value="B">Fase B (Kelas 3-4)</option>
                         <option value="C">Fase C (Kelas 5-6)</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Alokasi Waktu</label>
                     <input id="ma-alokasi" class="cyber-input" type="text" placeholder="Contoh: 2 x 35 Menit" required/>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Jumlah Pertemuan</label>
                     <input id="ma-pertemuan" class="cyber-input" type="number" min="1" value="1" required/>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Model Pembelajaran (KMDL Deep Learning)</label>
                     <select id="ma-model" class="cyber-select">
                         <option value="Mindful Learning">Mindful Learning (Fokus & Kesadaran)</option>
                         <option value="Meaningful Learning">Meaningful Learning (Bermakna & Relevan)</option>
                         <option value="Joyful Learning">Joyful Learning (Menyenangkan & Aktif)</option>
                         <option value="PBL">Problem Based Learning (PBL)</option>
                         <option value="PjBL">Project Based Learning (PjBL)</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Target Peserta Didik</label>
                     <select id="ma-target" class="cyber-select">
                         <option value="Peserta didik reguler">Peserta didik reguler</option>
                         <option value="Peserta didik dengan kesulitan belajar">Peserta didik dengan kesulitan belajar</option>
                         <option value="Peserta didik pencapaian tinggi">Peserta didik pencapaian tinggi</option>
                     </select>
                 </div>
                 <div class="cyber-group" style="display:flex; align-items:center;">
                     <label class="cyber-check-label" style="margin-top:20px;">
                         <input id="ma-abk" type="checkbox" />
                         <span>Akomodasi ABK (Diferensiasi Khusus)</span>
                     </label>
                 </div>
                 <div class="cyber-group" style="grid-column: 1 / -1;">
                     <label class="cyber-label">Capaian Pembelajaran (CP) / Elemen</label>
                     <textarea id="ma-elemen" class="cyber-input" rows="2" placeholder="Tuliskan elemen CP atau deskripsi Capaian Pembelajaran..." required></textarea>
                 </div>
                 <div class="cyber-group" style="grid-column: 1 / -1;">
                     <label class="cyber-label">Tujuan Pembelajaran (TP)</label>
                     <textarea id="ma-tp" class="cyber-input" rows="2" placeholder="Tuliskan tujuan pembelajaran yang ingin dicapai..." required></textarea>
                 </div>
                 <div class="cyber-group" style="grid-column: 1 / -1;">
                     <label class="cyber-label">Media & Sumber Belajar</label>
                     <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-top: 8px;">
                         <label class="cyber-check-label"><input type="checkbox" name="ma-media" value="Buku Teks Utama" checked> 📘 Buku Teks Utama</label>
                         <label class="cyber-check-label"><input type="checkbox" name="ma-media" value="Laptop & Proyektor"> 💻 Laptop & Proyektor</label>
                         <label class="cyber-check-label"><input type="checkbox" name="ma-media" value="LKPD Digital"> 📄 Lembar Kerja (LKPD)</label>
                         <label class="cyber-check-label"><input type="checkbox" name="ma-media" value="Alat Peraga Konkret"> ⚙️ Alat Peraga Konkret</label>
                         <label class="cyber-check-label"><input type="checkbox" name="ma-media" value="Video Interaktif"> 🎥 Video Interaktif</label>
                     </div>
                 </div>
             </div>

             <!-- Prompt Mode Form -->
             <div id="ma-prompt-section" style="display:none; flex-direction:column; gap:15px;">
                 <div class="cyber-group">
                     <label class="cyber-label">Ketikkan Kebutuhan Modul Ajar (Custom AI)</label>
                     <textarea id="ma-prompt-input" class="cyber-input" rows="6" placeholder="Contoh: Buat modul ajar Matematika kelas 4 tentang pecahan senilai menggunakan metode Joyful Learning dengan game kartu angka..." style="background:rgba(255,0,255,0.02); border-color:rgba(255,0,255,0.2)"></textarea>
                 </div>
             </div>

             <!-- Result Area -->
             <div id="ma-result-area" style="margin-top:25px;"></div>
         </div>
         
         <div style="padding-top:20px; border-top:1px solid rgba(0,229,255,0.15); margin-top:15px; display:flex; gap:15px; justify-content:flex-end;">
             <button class="cyber-button" onclick="window.ModulAjarCore.saveDraft()">
                 <span style="opacity:0.8">💾</span> Simpan Draft
             </button>
             <button id="ma-btn-generate" class="cyber-button primary" style="box-shadow: 0 0 20px rgba(0,229,255,0.3); padding: 12px 24px; font-size:13px;" onclick="window.ModulAjarUI.generateFromGUI()">
                 <span>✨</span> Buat Modul Ajar (KMDL)
             </button>
             <button id="ma-btn-generate-prompt" class="cyber-button primary" style="box-shadow: 0 0 20px rgba(0,229,255,0.3); padding: 12px 24px; font-size:13px; display:none;" onclick="window.ModulAjarUI.generateFromPrompt()">
                 <span>✨</span> Buat via AI Prompt
             </button>
         </div>
      </div>
    `;

    this._autoFillFromProfile();
  },

  switchMode(mode) {
    const guiBtn = document.getElementById('ma-mode-gui');
    const promptBtn = document.getElementById('ma-mode-prompt');
    const guiSec = document.getElementById('ma-gui-section');
    const promptSec = document.getElementById('ma-prompt-section');
    const genGuiBtn = document.getElementById('ma-btn-generate');
    const genPromptBtn = document.getElementById('ma-btn-generate-prompt');

    if (mode === 'gui') {
      guiBtn.className = 'ma-mode-btn active';
      guiBtn.style.background = 'rgba(0,229,255,0.15)';
      guiBtn.style.color = 'var(--cyan)';
      guiBtn.style.borderColor = 'var(--cyan)';

      promptBtn.className = 'ma-mode-btn';
      promptBtn.style.background = 'rgba(255,255,255,0.05)';
      promptBtn.style.color = 'var(--muted)';
      promptBtn.style.borderColor = 'var(--border)';

      guiSec.style.display = 'grid';
      promptSec.style.display = 'none';
      genGuiBtn.style.display = 'inline-block';
      genPromptBtn.style.display = 'none';
    } else {
      promptBtn.className = 'ma-mode-btn active';
      promptBtn.style.background = 'rgba(255,0,255,0.15)';
      promptBtn.style.color = '#ff55ff';
      promptBtn.style.borderColor = '#ff55ff';

      guiBtn.className = 'ma-mode-btn';
      guiBtn.style.background = 'rgba(255,255,255,0.05)';
      guiBtn.style.color = 'var(--muted)';
      guiBtn.style.borderColor = 'var(--border)';

      guiSec.style.display = 'none';
      promptSec.style.display = 'flex';
      genGuiBtn.style.display = 'none';
      genPromptBtn.style.display = 'inline-block';
    }
  },

  _autoFillFromProfile() {
    const user = window.ModulAjarCore?._userProfile;
    if (!user) return;

    const mapelEl = document.getElementById('ma-mapel');
    const kelasEl = document.getElementById('ma-kelas');
    const faseEl = document.getElementById('ma-fase');

    if (mapelEl && user.mapel_utama) {
      const opt = Array.from(mapelEl.options).find(o => o.value === user.mapel_utama);
      if (opt) mapelEl.value = user.mapel_utama;
    }
    if (kelasEl && user.wali_kelas) kelasEl.value = user.wali_kelas;

    if (faseEl && kelasEl?.value) {
      this.syncFaseFromKelas();
    }
  },

  syncFaseFromKelas() {
    const kelasEl = document.getElementById('ma-kelas');
    const faseEl = document.getElementById('ma-fase');
    if (!kelasEl || !faseEl) return;
    const tk = parseInt(kelasEl.value);
    if (tk <= 2) faseEl.value = 'A';
    else if (tk <= 4) faseEl.value = 'B';
    else faseEl.value = 'C';
  },

  generateFromGUI() {
    if (this._isGenerating) return;

    const mapel = document.getElementById('ma-mapel')?.value;
    const kelas = document.getElementById('ma-kelas')?.value;
    const fase = document.getElementById('ma-fase')?.value;
    const elemen = document.getElementById('ma-elemen')?.value?.trim();
    const tp = document.getElementById('ma-tp')?.value?.trim();
    
    if (!mapel || !kelas || !fase || !elemen || !tp) {
      window.showToast?.('warn', 'Data Belum Lengkap', 'Harap isi mapel, kelas, fase, elemen, dan TP.');
      return;
    }

    const data = {
      mapel, kelas, fase, elemen, tp,
      alokasi: document.getElementById('ma-alokasi')?.value?.trim(),
      jmlPertemuan: document.getElementById('ma-pertemuan')?.value || '1',
      modelPem: document.getElementById('ma-model')?.value,
      targetPD: document.getElementById('ma-target')?.value,
      adaABK: document.getElementById('ma-abk')?.checked,
      mediaList: Array.from(document.querySelectorAll('input[name="ma-media"]:checked')).map(el => el.value)
    };

    window.ModulAjarCore.generateFromGUI(
      data,
      () => this._setGenerating(true),
      (text) => {
        this._setGenerating(false);
        this._renderResult(text);
        window.showToast?.('success', 'Berhasil', 'Modul Ajar dibuat.');
      },
      (err) => {
        this._setGenerating(false);
        window.showToast?.('error', 'Gagal Generate', err.message);
      }
    );
  },

  generateFromPrompt() {
    if (this._isGenerating) return;
    const prompt = document.getElementById('ma-prompt-input')?.value?.trim();
    if (!prompt) {
      window.showToast?.('warn', 'Prompt Kosong', 'Ketik instruksi terlebih dahulu.');
      return;
    }

    window.ModulAjarCore.generateFromPrompt(
      prompt,
      () => this._setGenerating(true),
      (text) => {
        this._setGenerating(false);
        this._renderResult(text);
        window.showToast?.('success', 'Berhasil', 'Hasil dari prompt ditampilkan.');
      },
      (err) => {
        this._setGenerating(false);
        window.showToast?.('error', 'Gagal Generate', err.message);
      }
    );
  },

  regenerate() {
    const mode = document.querySelector('.ma-mode-btn.active')?.dataset?.mode;
    mode === 'prompt' ? this.generateFromPrompt() : this.generateFromGUI();
  },

  _renderResult(text) {
    const resultArea = document.getElementById('ma-result-area');
    if (!resultArea) return;

    const html = text
      .replace(/## (.*?)(\n|$)/g, '<h3 style="color:#00e5ff;border-bottom:1px solid rgba(0,229,255,0.2);padding-bottom:4px;margin:20px 0 10px;font-size:13px;letter-spacing:0.5px;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- /gm, '• ')
      .replace(/\n/g, '<br>');

    resultArea.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:20px;line-height:1.8;font-size:12px;color:#ddeeff;max-height:560px;overflow-y:auto;">
        ${html}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
        <button onclick="window.ModulAjarCore.downloadPDF()"
          style="padding:10px 20px;background:linear-gradient(135deg,rgba(255,68,102,0.3),rgba(200,0,50,0.2));border:1px solid rgba(255,68,102,0.5);color:#ff6688;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
          🖨 Cetak / Download PDF
        </button>
        <button onclick="window.showToast?.('info', 'Info', 'Fitur Word segera tersedia.')"
          style="padding:10px 20px;background:rgba(0,102,255,0.15);border:1px solid rgba(0,102,255,0.4);color:#66aaff;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">
          📄 Download Word (.docx)
        </button>
        <button onclick="window.ModulAjarUI.regenerate()"
          style="padding:10px 20px;background:rgba(255,170,0,0.15);border:1px solid rgba(255,170,0,0.4);color:#ffaa00;border-radius:8px;cursor:pointer;font-size:12px;">
          🔄 Generate Ulang
        </button>
        <button onclick="window.ModulAjarCore.saveDraft()"
          style="padding:10px 20px;background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--cyan);border-radius:8px;cursor:pointer;font-size:12px;">
          💾 Simpan Draft
        </button>
      </div>`;

    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  _setGenerating(isLoading) {
    this._isGenerating = isLoading;
    const btn = document.getElementById('ma-btn-generate');
    const btnP = document.getElementById('ma-btn-generate-prompt');
    if (btn) btn.disabled = isLoading;
    if (btnP) btnP.disabled = isLoading;

    if (isLoading) {
      const resultArea = document.getElementById('ma-result-area');
      if (resultArea) resultArea.innerHTML = `
        <div style="text-align:center;padding:60px;color:var(--cyan);">
          <div style="font-size:40px;animation:spin 2s linear infinite;display:inline-block;">⚙</div>
          <div style="margin-top:16px;font-size:14px;">AI sedang menyusun Modul Ajar...</div>
          <div style="color:var(--muted);font-size:11px;margin-top:8px;">Proses ini memerlukan 30-90 detik</div>
        </div>`;
    }
  }
};

window.ModulAjarUI = ModulAjarUI;
