// ================================================================
// src/features/dashboard/generator_soal/generator_soal_ui.js
// UI Logic: DOM interaction, HTML parsing, form handling
// ================================================================

window.GeneratorSoalUI = {
  
  init(db, userProfile, schoolProfile) {
    if (window.GeneratorSoalCore) {
      window.GeneratorSoalCore.init(db, userProfile, schoolProfile);
    }
    this._setupAutoFill();
  },

  renderForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">📝</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3)">Generator Soal Lengkap</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px;">Asesmen & Penilaian</span>
                 </div>
             </div>
             <div style="font-size:11px; font-weight:700; color:#0b0e14; background:linear-gradient(90deg, #00e5ff, #0099ff); padding:6px 12px; border-radius:20px; box-shadow: 0 0 15px rgba(0,229,255,0.4)">T.A 2026/2027</div>
         </div>
         
         <div style="flex:1; overflow-y:auto; padding-right:15px;" class="custom-scrollbar">
             <!-- Mode Buttons -->
             <div style="display:flex; gap:10px; margin-bottom: 20px;">
                <button id="gs-mode-gui" class="gs-mode-btn active" data-mode="gui" style="padding: 8px 16px; background: rgba(0,229,255,0.15); border: 1px solid var(--cyan); color: var(--cyan); border-radius: 6px; cursor: pointer; font-size: 12px;" onclick="window.GeneratorSoalUI.switchMode('gui')">🎛 Form Input</button>
                <button id="gs-mode-prompt" class="gs-mode-btn" data-mode="prompt" style="padding: 8px 16px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--muted); border-radius: 6px; cursor: pointer; font-size: 12px;" onclick="window.GeneratorSoalUI.switchMode('prompt')">✨ AI Prompt</button>
             </div>

             <!-- GUI Mode Form -->
             <div id="gs-gui-section" class="cyber-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                 <div class="cyber-group">
                     <label class="cyber-label">Jenis Asesmen</label>
                     <select id="gs-jenis" class="cyber-select" required>
                         <option value="Asesmen Formatif">Asesmen Formatif</option>
                         <option value="Asesmen Sumatif (Materi)">Asesmen Sumatif (Lingkup Materi)</option>
                         <option value="Asesmen Akhir Semester">Asesmen Akhir Semester (SAS)</option>
                         <option value="Asesmen Diagnostik Kognitif">Asesmen Diagnostik Kognitif</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Mata Pelajaran</label>
                     <select id="gs-mapel" class="cyber-select" required>
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
                     <select id="gs-kelas" class="cyber-select" required>
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
                     <label class="cyber-label">Semester</label>
                     <select id="gs-semester" class="cyber-select" required>
                         <option value="1">Semester 1 (Ganjil)</option>
                         <option value="2">Semester 2 (Genap)</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Bahasa Pengantar</label>
                     <input id="gs-bahasa" class="cyber-input" type="text" value="Indonesia" required />
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Tingkat Kesulitan: <span id="gs-kesulitan-label" style="color:var(--cyan); font-weight:bold;">🟡 Sedang</span></label>
                     <input id="gs-kesulitan" class="cyber-input" type="range" min="0" max="100" value="50" oninput="window.GeneratorSoalUI.updateKesulitanLabel()" style="margin-top:10px;" />
                 </div>

                 <!-- Questions Composition -->
                 <div class="cyber-group" style="grid-column: 1 / -1; background:rgba(0,229,255,0.02); border:1px solid rgba(0,229,255,0.1); border-radius:8px; padding:15px;">
                     <label class="cyber-label" style="margin-bottom:12px; color:var(--cyan);">📊 Komposisi Soal</label>
                     <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px;">
                         <div style="display:flex; align-items:center; gap:8px;">
                             <label style="font-size:11px; width:120px;">Pilihan Ganda</label>
                             <input id="gs-jml-pg" class="cyber-input" type="number" min="0" value="10" style="width:70px; text-align:center; padding:4px;" />
                             <select id="gs-opsi-pg" class="cyber-select" style="width:60px; padding:4px;">
                                 <option value="3">3 Opsi</option>
                                 <option value="4" selected>4 Opsi</option>
                                 <option value="5">5 Opsi</option>
                             </select>
                         </div>
                         <div style="display:flex; align-items:center; gap:8px;">
                             <label style="font-size:11px; width:120px;">Benar / Salah</label>
                             <input id="gs-jml-bs" class="cyber-input" type="number" min="0" value="0" style="width:70px; text-align:center; padding:4px;" />
                         </div>
                         <div style="display:flex; align-items:center; gap:8px;">
                             <label style="font-size:11px; width:120px;">Menjodohkan</label>
                             <input id="gs-jml-mj" class="cyber-input" type="number" min="0" value="0" style="width:70px; text-align:center; padding:4px;" />
                         </div>
                         <div style="display:flex; align-items:center; gap:8px;">
                             <label style="font-size:11px; width:120px;">Isian Singkat</label>
                             <input id="gs-jml-is" class="cyber-input" type="number" min="0" value="5" style="width:70px; text-align:center; padding:4px;" />
                         </div>
                         <div style="display:flex; align-items:center; gap:8px;">
                             <label style="font-size:11px; width:120px;">Uraian / Essay</label>
                             <input id="gs-jml-ur" class="cyber-input" type="number" min="0" value="5" style="width:70px; text-align:center; padding:4px;" />
                         </div>
                     </div>
                 </div>

                 <!-- Options -->
                 <div class="cyber-group" style="grid-column: 1 / -1; display:flex; gap:20px; flex-wrap:wrap; margin-top:5px;">
                     <label class="cyber-check-label"><input id="gs-kunci" type="checkbox" checked> 🔑 Kunci Jawaban</label>
                     <label class="cyber-check-label"><input id="gs-pedoman" type="checkbox" checked> 📝 Pedoman Penilaian</label>
                     <label class="cyber-check-label"><input id="gs-kop" type="checkbox" checked> 🏢 Kop Surat Sekolah</label>
                     <label class="cyber-check-label"><input id="gs-acak" type="checkbox"> 🔀 Acak Urutan Soal</label>
                 </div>

                 <div class="cyber-group" style="grid-column: 1 / -1;">
                     <label class="cyber-label">Materi Pembelajaran / Batasan Topik</label>
                     <textarea id="gs-materi" class="cyber-input" rows="3" placeholder="Contoh: Pecahan senilai, menyederhanakan pecahan, membandingkan pecahan kelas 4..." required></textarea>
                 </div>
             </div>

             <!-- Prompt Mode Form -->
             <div id="gs-prompt-section" style="display:none; flex-direction:column; gap:15px;">
                 <div class="cyber-group">
                     <label class="cyber-label">Ketikkan Instruksi Soal Custom (AI)</label>
                     <textarea id="gs-prompt-input" class="cyber-input" rows="6" placeholder="Contoh: Buat 10 soal pilihan ganda tentang gaya gerak dan gaya otot untuk kelas 4 SD beserta kunci jawaban..." style="background:rgba(255,0,255,0.02); border-color:rgba(255,0,255,0.2)"></textarea>
                 </div>
             </div>

             <!-- Result Area -->
             <div id="gs-result-area" style="margin-top:25px;"></div>
         </div>
         
         <div style="padding-top:20px; border-top:1px solid rgba(0,229,255,0.15); margin-top:15px; display:flex; gap:15px; justify-content:flex-end;">
             <button class="cyber-button" onclick="window.GeneratorSoalUI.saveDraft()">
                 <span style="opacity:0.8">💾</span> Simpan Draft
             </button>
             <button id="gs-btn-generate" class="cyber-button primary" style="box-shadow: 0 0 20px rgba(0,229,255,0.3); padding: 12px 24px; font-size:13px;" onclick="window.GeneratorSoalUI.generateFromGUI()">
                 <span>✨</span> Susun Soal Otomatis
             </button>
             <button id="gs-btn-generate-prompt" class="cyber-button primary" style="box-shadow: 0 0 20px rgba(0,229,255,0.3); padding: 12px 24px; font-size:13px; display:none;" onclick="window.GeneratorSoalUI.generateFromPrompt()">
                 <span>✨</span> Buat via AI Prompt
             </button>
         </div>
      </div>
    `;

    this._setupAutoFill();
  },

  switchMode(mode) {
    const guiBtn = document.getElementById('gs-mode-gui');
    const promptBtn = document.getElementById('gs-mode-prompt');
    const guiSec = document.getElementById('gs-gui-section');
    const promptSec = document.getElementById('gs-prompt-section');
    const genGuiBtn = document.getElementById('gs-btn-generate');
    const genPromptBtn = document.getElementById('gs-btn-generate-prompt');

    if (mode === 'gui') {
      guiBtn.className = 'gs-mode-btn active';
      guiBtn.style.background = 'rgba(0,229,255,0.15)';
      guiBtn.style.color = 'var(--cyan)';
      guiBtn.style.borderColor = 'var(--cyan)';

      promptBtn.className = 'gs-mode-btn';
      promptBtn.style.background = 'rgba(255,255,255,0.05)';
      promptBtn.style.color = 'var(--muted)';
      promptBtn.style.borderColor = 'var(--border)';

      guiSec.style.display = 'grid';
      promptSec.style.display = 'none';
      genGuiBtn.style.display = 'inline-block';
      genPromptBtn.style.display = 'none';
    } else {
      promptBtn.className = 'gs-mode-btn active';
      promptBtn.style.background = 'rgba(255,0,255,0.15)';
      promptBtn.style.color = '#ff55ff';
      promptBtn.style.borderColor = '#ff55ff';

      guiBtn.className = 'gs-mode-btn';
      guiBtn.style.background = 'rgba(255,255,255,0.05)';
      guiBtn.style.color = 'var(--muted)';
      guiBtn.style.borderColor = 'var(--border)';

      guiSec.style.display = 'none';
      promptSec.style.display = 'flex';
      genGuiBtn.style.display = 'none';
      genPromptBtn.style.display = 'inline-block';
    }
  },

  _setupAutoFill() {
    const kelasEl = document.getElementById('gs-kelas');
    const mapelEl = document.getElementById('gs-mapel');
    if (!kelasEl || !mapelEl) return;
    
    const user = window.GeneratorSoalCore?.userProfile;
    if (user?.wali_kelas) kelasEl.value = user.wali_kelas;
    if (user?.mapel_utama) {
      const found = Array.from(mapelEl.options).find(o => o.value === user.mapel_utama);
      if (found) mapelEl.value = user.mapel_utama;
    }
  },

  async generateFromGUI() {
    if (window.GeneratorSoalCore?.isGenerating) return;

    const jenisAsesmen = document.getElementById('gs-jenis')?.value;
    const kelas = document.getElementById('gs-kelas')?.value;
    const semester = document.getElementById('gs-semester')?.value;
    const mapel = document.getElementById('gs-mapel')?.value;
    const materi = document.getElementById('gs-materi')?.value?.trim();
    const bahasa = document.getElementById('gs-bahasa')?.value || 'Indonesia';

    const jmlPG = parseInt(document.getElementById('gs-jml-pg')?.value || '0');
    const opsiPG = parseInt(document.getElementById('gs-opsi-pg')?.value || '4');
    const jmlBS = parseInt(document.getElementById('gs-jml-bs')?.value || '0');
    const jmlMJ = parseInt(document.getElementById('gs-jml-mj')?.value || '0');
    const jmlIS = parseInt(document.getElementById('gs-jml-is')?.value || '0');
    const jmlUR = parseInt(document.getElementById('gs-jml-ur')?.value || '0');
    const totalSoal = jmlPG + jmlBS + jmlMJ + jmlIS + jmlUR;

    const sertakanKunci = document.getElementById('gs-kunci')?.checked;
    const sertakanPedoman = document.getElementById('gs-pedoman')?.checked;
    const sertakanKop = document.getElementById('gs-kop')?.checked;
    const acakSoal = document.getElementById('gs-acak')?.checked;

    const slider = document.getElementById('gs-kesulitan');
    const kesulitanVal = slider ? parseInt(slider.value) : 50;
    const pctMudah = Math.max(0, 100 - kesulitanVal * 2);
    const pctSedang = kesulitanVal < 50 ? 100 - pctMudah : Math.max(0, 200 - kesulitanVal * 2);
    const pctSulit = Math.max(0, kesulitanVal * 2 - 100);

    if (!jenisAsesmen || !kelas || !semester || !mapel || !materi) {
      window.showToast?.('warn', 'Data Belum Lengkap', 'Lengkapi semua field wajib.');
      return;
    }
    if (totalSoal === 0) {
      window.showToast?.('warn', 'Komposisi Kosong', 'Tentukan jumlah minimal satu jenis soal.');
      return;
    }
    if (totalSoal > 100) {
      window.showToast?.('warn', 'Batas Terlampaui', 'Maksimal 100 soal per generate.');
      return;
    }

    const komposisi = [];
    if (jmlPG > 0) komposisi.push(`${jmlPG} Pilihan Ganda (${opsiPG} opsi)`);
    if (jmlBS > 0) komposisi.push(`${jmlBS} Benar/Salah`);
    if (jmlMJ > 0) komposisi.push(`${jmlMJ} Menjodohkan`);
    if (jmlIS > 0) komposisi.push(`${jmlIS} Isian Singkat`);
    if (jmlUR > 0) komposisi.push(`${jmlUR} Uraian`);

    let tingkatLabel = 'Sedang';
    if (kesulitanVal < 30) tingkatLabel = 'Mudah';
    else if (kesulitanVal > 70) tingkatLabel = 'Sulit';
    else if (kesulitanVal <= 45) tingkatLabel = 'Mudah-Sedang';
    else if (kesulitanVal >= 55) tingkatLabel = 'Sedang-Sulit';

    this._showGeneratingState(true);

    try {
      const params = {
        jenisAsesmen, kelas, semester, mapel, materi, bahasa,
        komposisi, totalSoal, sertakanKunci, sertakanPedoman, acakSoal,
        kesulitanVal, pctMudah, pctSedang, pctSulit, tingkatLabel, sertakanKop
      };
      
      const res = await window.GeneratorSoalCore.generateSoal(params);
      this._renderResult(res.text);
      window.showToast?.('success', 'Berhasil', `${totalSoal} soal disiapkan.`);
    } catch (err) {
      console.error(err);
      window.showToast?.('error', 'Gagal', err.message);
    } finally {
      this._showGeneratingState(false);
    }
  },

  async generateFromPrompt() {
    const promptEl = document.getElementById('gs-prompt-input');
    const prompt = promptEl?.value?.trim();
    if (!prompt) {
      window.showToast?.('warn', 'Prompt Kosong', 'Ketik instruksi terlebih dahulu.');
      return;
    }
    if (window.GeneratorSoalCore?.isGenerating) return;

    this._showGeneratingState(true);

    try {
      const sertakanKop = document.getElementById('gs-kop')?.checked;
      const res = await window.GeneratorSoalCore.generateFromPromptStr(prompt, sertakanKop);
      this._renderResult(res.text);
      window.showToast?.('success', 'Berhasil', 'Soal dari prompt siap.');
    } catch (err) {
      window.showToast?.('error', 'Gagal', err.message);
    } finally {
      this._showGeneratingState(false);
    }
  },

  _renderResult(text) {
    const resultArea = document.getElementById('gs-result-area');
    if (!resultArea) return;

    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^=== (.*?) ===/gm, '<h3 style="color:#00e5ff;border-bottom:1px solid rgba(0,229,255,0.3);padding-bottom:4px;margin:20px 0 12px;">$1</h3>')
      .replace(/^(\d+)\. /gm, '<br><strong>$1.</strong> ')
      .replace(/^   [a-e]\. /gm, '<br>&nbsp;&nbsp;&nbsp;&nbsp;')
      .replace(/\n/g, '<br>');

    resultArea.innerHTML = `
      <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:20px;line-height:1.8;font-size:12px;color:#ddeeff;white-space:pre-wrap;font-family: 'Plus Jakarta Sans', sans-serif;max-height:500px;overflow-y:auto;">
        ${html}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
        <button onclick="GeneratorSoal.downloadPDF()" style="padding:10px 20px;background:linear-gradient(135deg,rgba(255,68,102,0.3),rgba(200,0,50,0.2));border:1px solid rgba(255,68,102,0.5);color:#ff6688;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;">🖨 Cetak / PDF</button>
        <button onclick="GeneratorSoal.regenerate()" style="padding:10px 20px;background:rgba(255,170,0,0.15);border:1px solid rgba(255,170,0,0.4);color:#ffaa00;border-radius:8px;cursor:pointer;font-size:12px;">🔄 Ulang</button>
        <button onclick="GeneratorSoal.saveDraft()" style="padding:10px 20px;background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--cyan);border-radius:8px;cursor:pointer;font-size:12px;">💾 Draft</button>
        <button onclick="GeneratorSoal.editResult()" style="padding:10px 20px;background:rgba(170,85,255,0.15);border:1px solid rgba(170,85,255,0.4);color:#bb77ff;border-radius:8px;cursor:pointer;font-size:12px;">✏ Edit</button>
      </div>`;

    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  async downloadPDF() {
    try {
      window.showToast?.('info', 'Membuat PDF...', 'Tunggu sebentar...');
      const fileName = await window.GeneratorSoalCore.downloadPDF();
      window.showToast?.('success', 'PDF Siap!', \`File: \${fileName}\`);
    } catch (err) {
      window.showToast?.('error', 'Gagal', err.message);
    }
  },

  regenerate() {
    const activeMode = document.querySelector('.gs-mode-btn.active')?.dataset?.mode;
    if (activeMode === 'prompt') this.generateFromPrompt();
    else this.generateFromGUI();
  },

  async saveDraft() {
    try {
      await window.GeneratorSoalCore.saveDraft();
      window.showToast?.('success', 'Tersimpan', 'Masuk ke Arsip Soal.');
    } catch (err) {
      window.showToast?.('error', 'Gagal', err.message);
    }
  },

  editResult() {
    const resultArea = document.getElementById('gs-result-area');
    const lastRes = window.GeneratorSoalCore?.lastResult;
    if (!resultArea || !lastRes) return;

    resultArea.innerHTML = `
      <textarea id="gs-edit-area" style="width:100%;min-height:400px;background:rgba(0,0,0,0.4);border:1px solid rgba(0,229,255,0.3);border-radius:10px;padding:16px;color:#ddeeff;font-family: 'Plus Jakarta Sans', sans-serif;font-size:12px;line-height:1.8;resize:vertical;">${lastRes.text}</textarea>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button onclick="GeneratorSoal.applyEdit()" style="padding:10px 20px;background:rgba(0,229,255,0.2);border:1px solid var(--cyan);border-radius:8px;color:var(--cyan);cursor:pointer;">✅ Terapkan</button>
        <button onclick="GeneratorSoal._renderResult(GeneratorSoalCore.lastResult.text)" style="padding:10px 20px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--muted);cursor:pointer;">↩ Batal</button>
      </div>`;
  },

  applyEdit() {
    const edited = document.getElementById('gs-edit-area')?.value;
    if (edited !== undefined && window.GeneratorSoalCore?.lastResult) {
      window.GeneratorSoalCore.lastResult.text = edited;
      this._renderResult(edited);
    }
  },

  _showGeneratingState(isLoading) {
    const btnGUI = document.getElementById('gs-btn-generate');
    const btnPrompt = document.getElementById('gs-btn-generate-prompt');
    const loadingEl = document.getElementById('gs-loading');

    if (btnGUI) btnGUI.disabled = isLoading;
    if (btnPrompt) btnPrompt.disabled = isLoading;
    if (loadingEl) loadingEl.style.display = isLoading ? 'flex' : 'none';

    if (isLoading) {
      const resultArea = document.getElementById('gs-result-area');
      if (resultArea) resultArea.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--cyan);">
          <div style="font-size:32px;animation:spin 2s linear infinite;display:inline-block;">⚙</div>
          <div style="margin-top:12px;font-size:14px;">Menyusun soal...</div>
          <div style="color:var(--muted);font-size:11px;margin-top:6px;">Butuh 15-60 detik...</div>
        </div>`;
    }
  },

  updateKesulitanLabel() {
    const slider = document.getElementById('gs-kesulitan');
    const label = document.getElementById('gs-kesulitan-label');
    if (!slider || !label) return;

    const val = parseInt(slider.value);
    let text = '';
    if (val < 20) text = '😊 Sangat Mudah';
    else if (val < 40) text = '🟢 Mudah';
    else if (val < 60) text = '🟡 Sedang';
    else if (val < 80) text = '🟠 Sulit';
    else text = '🔴 Sangat Sulit';

    label.textContent = text;
  }
};

// Backwards compatibility alias
window.GeneratorSoal = window.GeneratorSoalUI;
console.log('✅ GeneratorSoalUI loaded.');
