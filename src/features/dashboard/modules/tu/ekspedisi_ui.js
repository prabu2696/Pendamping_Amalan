// ekspedisi_ui.js - UI rendering for Buku Ekspedisi
window.EkspedisiUI = {
  schema: [
  {
    "type": "text",
    "label": "Nama Dokumen Dikirim",
    "placeholder": "Contoh: Laporan Pertanggungjawaban BOS Tahap 1",
    "required": true
  },
  {
    "type": "text",
    "label": "Tujuan Pengiriman",
    "placeholder": "Contoh: Korwil Bidang Pendidikan Kecamatan",
    "required": true
  },
  {
    "type": "date",
    "label": "Tanggal Kirim",
    "required": true
  },
  {
    "type": "text",
    "label": "Nama Kurir / Penerima",
    "placeholder": "Contoh: Ahmad Kurir / Ibu Cici Staf Korwil",
    "required": true
  }
],
  container: null,
  formHtmlBackup: '',

  renderForm(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    const fieldsHtml = this.schema.map((field, idx) => {
      const fieldId = `field_t_ekspedisi_${idx}`;
      let inputHtml = '';
      if (field.type === 'select') {
        const optionsHtml = field.options.map(opt => `<option>\${opt}</option>`).join('');
        inputHtml = `
          <select id="\${fieldId}" class="cyber-select" data-label="\${field.label}" \${field.required ? 'required' : ''}>
            <option value="">-- Pilih \${field.label} --</option>
            \${optionsHtml}
          </select>
        `;
      } else if (field.type === 'textarea') {
        inputHtml = `
          <textarea id="\${fieldId}" class="cyber-input" placeholder="\${field.placeholder || ''}" data-label="\${field.label}" \${field.required ? 'required' : ''}></textarea>
        `;
      } else if (field.type === 'number') {
        inputHtml = `
          <input id="\${fieldId}" type="number" class="cyber-input" placeholder="\${field.placeholder || ''}" data-label="\${field.label}" \${field.required ? 'required' : ''}/>
        `;
      } else if (field.type === 'date') {
        inputHtml = `
          <input id="\${fieldId}" type="date" class="cyber-input" data-label="\${field.label}" \${field.required ? 'required' : ''}/>
        `;
      } else {
        inputHtml = `
          <input id="\${fieldId}" type="text" class="cyber-input" placeholder="\${field.placeholder || ''}" data-label="\${field.label}" \${field.required ? 'required' : ''}/>
        `;
      }
      const gridStyle = field.type === 'textarea' ? 'grid-column: 1 / -1;' : '';
      return `
        <div class="cyber-group" style="\${gridStyle}">
          <label class="cyber-label">\${field.label} \${field.required ? '<span style="color:#00e5ff">*</span>' : ''}</label>
          \${inputHtml}
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">🚚</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3); font-family:'Plus Jakarta Sans', sans-serif;">\${'Buku Ekspedisi'}</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px; font-family:'Plus Jakarta Sans', sans-serif;">\${'Administrasi Persuratan'}</span>
                 </div>
             </div>
             <div style="font-size:11px; font-weight:700; color:#0b0e14; background:linear-gradient(90deg, #00e5ff, #0099ff); padding:6px 12px; border-radius:20px; box-shadow: 0 0 15px rgba(0,229,255,0.4); font-family:'Plus Jakarta Sans', sans-serif;">T.A 2026/2027</div>
         </div>
         
         <div style="flex:1; overflow-y:auto; padding-right:15px;" class="custom-scrollbar">
             <div style="background:rgba(255,255,255,0.02); border-left:3px solid #00e5ff; padding:12px 15px; border-radius:0 8px 8px 0; color:#a0c0d0; font-size:12px; margin-bottom:25px; line-height:1.6; font-family:'Plus Jakarta Sans', sans-serif;">
                 \${'Pencatatan pengiriman dokumen'}. Isi formulir parameter di bawah ini. Semua field yang memiliki label menyala (*) wajib diisi sebelum eksekusi AI Deep Learning Cimega dimulai.
             </div>
             
             <div class="cyber-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                 \${fieldsHtml}
             </div>
             
             <div class="cyber-group" style="margin-top:30px; grid-column: 1 / -1;">
                <label class="cyber-label" style="display:flex; align-items:center; gap:8px;">
                     <span style="color:#ff00ff">⚡</span> Instruksi AI Tambahan (Prompt Tuning)
                </label>
                <textarea id="prompt_tuning_t_ekspedisi" class="cyber-input" placeholder="Berikan instruksi kustom kepada AI. Contoh: Buat gaya bahasa santai namun formal, sertakan tabel penilaian di akhir dokumen..." style="background:rgba(255,0,255,0.02); border-color:rgba(255,0,255,0.2)"></textarea>
             </div>
         </div>
         
         <div style="padding-top:20px; border-top:1px solid rgba(0,229,255,0.15); margin-top:15px; display:flex; gap:15px; justify-content:flex-end;">
             <button class="cyber-button" onclick="window.EkspedisiUI.saveDraft()">
                 <span style="opacity:0.8">💾</span> Simpan Draft
             </button>
             <button class="cyber-button primary" style="box-shadow: 0 0 20px rgba(0,229,255,0.3); padding: 12px 24px; font-size:13px;" onclick="window.EkspedisiUI.executeAI()">
                 <span>✨</span> Eksekusi Administrasi
             </button>
         </div>
      </div>
    `;

    // Load draft otomatis
    window.EkspedisiCore.loadDraft().then(draft => {
      if (draft && draft.payloadData) {
        this.schema.forEach((field, idx) => {
          const el = document.getElementById(`field_t_ekspedisi_\${idx}`);
          if (el && draft.payloadData[field.label] !== undefined) {
            el.value = draft.payloadData[field.label];
          }
        });
        const pTuning = document.getElementById('prompt_tuning_t_ekspedisi');
        if (pTuning && draft.payloadData['_userPrompt']) {
          pTuning.value = draft.payloadData['_userPrompt'];
        }
        window.showToast?.('info', 'Draft Dimuat', 'Draft formulir Anda sebelumnya otomatis dipulihkan.');
      }
    }).catch(e => console.warn('[EkspedisiUI] Failed to load draft:', e));
  },

  gatherInputs() {
    const payloadData = {};
    let isValid = true;
    this.schema.forEach((field, idx) => {
      const el = document.getElementById(`field_t_ekspedisi_\${idx}`);
      if (el) {
        const val = el.value.trim();
        if (field.required && !val) {
          isValid = false;
          el.style.borderColor = 'rgba(255, 0, 0, 0.5)';
        } else {
          el.style.borderColor = '';
        }
        payloadData[field.label] = val;
      }
    });
    const userPrompt = document.getElementById('prompt_tuning_t_ekspedisi')?.value.trim() || '';
    return { payloadData, userPrompt, isValid };
  },

  async saveDraft() {
    const { payloadData, userPrompt } = this.gatherInputs();
    try {
      await window.EkspedisiCore.saveDraft(payloadData, userPrompt);
      window.showToast?.('success', 'Draft Tersimpan', 'Draft formulir berhasil disimpan.');
    } catch (e) {
      window.showToast?.('error', 'Gagal', e.message);
    }
  },

  async executeAI() {
    const { payloadData, userPrompt, isValid } = this.gatherInputs();
    if (!isValid) {
      window.showToast?.('warning', 'Validasi Gagal', 'Harap isi semua kolom wajib!');
      return;
    }

    this.formHtmlBackup = this.container.innerHTML;

    this.container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding:40px; background: rgba(11, 14, 20, 0.85);">
        <div class="cyber-loading" style="display:flex; flex-direction:column; gap:20px;">
          <div class="cyber-spinner" style="width:80px; height:80px; border-width:4px; margin:0 auto;"></div>
          <div class="cyber-loading-text" style="font-size:16px; font-weight:700; letter-spacing:3px; color:#00e5ff; text-shadow:0 0 10px rgba(0,229,255,0.4)">
            MEMULAI GENERATOR KOGNITIF AI v3.5
          </div>
          <div style="color:rgba(255,255,255,0.6); font-size:12px; max-width:450px; line-height:1.6; margin:0 auto; font-family:'Plus Jakarta Sans', sans-serif;" id="ai-loading-step">
            Menganalisis parameter form...
          </div>
        </div>
      </div>
    `;

    const stepText = document.getElementById('ai-loading-step');
    const steps = [
      'Menyinkronkan profil sekolah & kurikulum...',
      'Menghubungkan ke Gemini 3.5 Flash Engine...',
      'Menerima data dokumen...'
    ];
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepText && steps[stepIdx]) {
        stepText.textContent = steps[stepIdx];
        stepIdx++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    window.EkspedisiCore.executeAI(
      payloadData,
      userPrompt,
      () => {},
      (text) => {
        clearInterval(interval);
        this.renderResult(text, this.formHtmlBackup, payloadData);
      },
      (err) => {
        clearInterval(interval);
        window.showToast?.('error', 'Gagal', err.message);
        this.container.innerHTML = this.formHtmlBackup;
      }
    );
  },

  renderResult(text, formHtmlBackup, payloadData) {
    const isExcelModule = 'excel' === 'excel';
    const exportButtonHtml = isExcelModule
      ? `<button class="cyber-button" onclick="window.EkspedisiUI.exportExcel()">
           <span>📊</span> Ekspor Excel (.xls)
         </button>`
      : `<button class="cyber-button" onclick="window.EkspedisiUI.exportWord()">
           <span>📝</span> Ekspor Word (.doc)
         </button>`;

    this.container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">✨</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3); font-family:'Plus Jakarta Sans', sans-serif;">PREVIEW EDITOR: \${'Buku Ekspedisi'}</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px; font-family:'Plus Jakarta Sans', sans-serif;">HASIL GENERASI AI DOKUMEN</span>
                 </div>
             </div>
         </div>

         <div style="flex:1; display:flex; gap:20px; overflow:hidden; margin-bottom:15px;">
            <div style="flex:1; display:flex; flex-direction:column; background:rgba(255,255,255,0.01); border:1px solid rgba(0,229,255,0.15); border-radius:8px; padding:12px;">
               <div style="font-size:11px; text-transform:uppercase; color:#00e5ff; font-weight:600; margin-bottom:8px; display:flex; justify-content:space-between; font-family:'Plus Jakarta Sans', sans-serif;">
                  <span>📝 Editor Dokumen (Dapat diedit langsung)</span>
                  <span>MODE MARKDOWN</span>
               </div>
               <textarea id="ai-result-editor" class="cyber-input" style="flex:1; width:100%; height:100%; font-family: 'Courier New', Courier, monospace; font-size:13px; line-height:1.6; resize:none; background:rgba(0,0,0,0.35); border-color:rgba(0,229,255,0.2); color:#e0f0ff;" oninput="window.EkspedisiUI.updatePreview()">\${text.trim()}</textarea>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; background:rgba(255,255,255,0.01); border:1px solid rgba(0,229,255,0.15); border-radius:8px; padding:12px; overflow:hidden;">
               <div style="font-size:11px; text-transform:uppercase; color:#ff00ff; font-weight:600; margin-bottom:8px; font-family:'Plus Jakarta Sans', sans-serif;">
                  <span>👁️ Tampilan Cetak / Pratinjau Dokumen</span>
               </div>
               <div id="ai-result-preview" style="flex:1; background:#fff; color:#000; border-radius:4px; padding:30px; overflow-y:auto; box-sizing:border-box; font-family: 'Times New Roman', Times, serif; line-height:1.6;" class="custom-scrollbar"></div>
            </div>
         </div>

         <div style="padding-top:20px; border-top:1px solid rgba(0,229,255,0.15); display:flex; gap:15px; justify-content:space-between; align-items:center;">
             <button class="cyber-button" onclick="window.EkspedisiUI.restoreForm()">
                 <span>←</span> Edit Parameter
             </button>
             <div style="display:flex; gap:10px;">
                 <button class="cyber-button" onclick="window.EkspedisiUI.saveFinalDocument()">
                     <span>💾</span> Simpan Dokumen
                 </button>
                 \${exportButtonHtml}
                 <button class="cyber-button primary" onclick="window.EkspedisiUI.printDocument()">
                     <span>🖨️</span> Cetak / PDF
                 </button>
             </div>
         </div>
      </div>
    `;

    this.updatePreview();
  },

  restoreForm() {
    this.container.innerHTML = this.formHtmlBackup;
  },

  updatePreview() {
    const editor = document.getElementById('ai-result-editor');
    const preview = document.getElementById('ai-result-preview');
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

    const schoolProfile = window.EkspedisiCore.schoolProfile;
    const kop = `
      <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; font-family: 'Times New Roman', Times, serif;">
        <h2 style="margin: 0; font-size: 14px; text-transform: uppercase; font-weight: normal; line-height: 1.2;">PEMERINTAH KABUPATEN TASIKMALAYA</h2>
        <h1 style="margin: 3px 0; font-size: 16px; text-transform: uppercase; font-weight: bold; line-height: 1.2;">DINAS PENDIDIKAN DAN KEBUDAYAAN</h1>
        <h1 style="margin: 3px 0; font-size: 18px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px; line-height: 1.2;">\${schoolProfile.nama_sekolah}</h1>
        <p style="margin: 2px 0; font-size: 11px; font-style: italic;">Alamat: \${schoolProfile.alamat || 'Cimega'} | NPSN: \${schoolProfile.npsn || '-'}</p>
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
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">\${schoolProfile.kepala_sekolah || '_____________________'}</p>
            <p style="margin: 0;">NIP. \${schoolProfile.nip_kepsek || '_____________________'}</p>
          </div>
          <div style="text-align: center; width: 200px;">
            <p style="margin: 0;">Tasikmalaya, \${today}</p>
            <p style="margin: 0; font-weight: bold;">Pembuat Dokumen</p>
            <div style="height: 60px;"></div>
            <p style="margin: 0; font-weight: bold; text-decoration: underline;">\${window._userData?.displayName || 'Guru/Staf'}</p>
            <p style="margin: 0;">NIP. \${window._userData?.nip || '_____________________'}</p>
          </div>
        </div>
      `;
    }

    preview.innerHTML = `
      <div style="background:#fff; color:#000; padding:10px; box-sizing:border-box;">
        \${kop}
        <div style="font-size:12px; line-height:1.6; text-align:justify; color:#000;">
          \${htmlContent}
        </div>
        \${signatureHtml}
      </div>
    `;
  },

  async saveFinalDocument() {
    const editor = document.getElementById('ai-result-editor');
    if (!editor) return;
    try {
      await window.EkspedisiCore.saveFinalDocument(editor.value);
      window.showToast?.('success', 'Tersimpan', 'Dokumen berhasil diarsipkan ke database.');
    } catch (e) {
      window.showToast?.('error', 'Gagal', e.message);
    }
  },

  async exportWord() {
    const preview = document.getElementById('ai-result-preview');
    if (!preview) return;
    const api = window.cimegaConfig || window.cimegaAPI;
    if (!api || !api.saveHTML) return;

    try {
      const docHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4 portrait;
              margin: 2.54cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 12pt;
              line-height: 1.6;
              color: #000;
            }
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
          \${preview.innerHTML}
        </body>
        </html>
      `;
      const cleanFileName = 'Buku_Ekspedisi';
      const fileName = \`\${cleanFileName}_\${Date.now()}.doc\`;
      const res = await api.saveHTML(docHtml, fileName);
      if (res && res.success) {
        window.showToast?.('success', 'Word Berhasil', 'Dokumen disimpan.');
        if (api.openFile) await api.openFile(res.filePath);
      }
    } catch (e) {
      window.showToast?.('error', 'Gagal Ekspor Word', e.message);
    }
  },

  async exportExcel() {
    const preview = document.getElementById('ai-result-preview');
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
          \${preview.innerHTML}
        </body>
        </html>
      `;
      const cleanFileName = 'Buku_Ekspedisi';
      const fileName = \`\${cleanFileName}_\${Date.now()}.xls\`;
      const res = await api.saveHTML(xlsHtml, fileName);
      if (res && res.success) {
        window.showToast?.('success', 'Excel Berhasil', 'Spreadsheet disimpan.');
        if (api.openFile) await api.openFile(res.filePath);
      }
    } catch (e) {
      window.showToast?.('error', 'Gagal Ekspor Excel', e.message);
    }
  },

  async printDocument() {
    const preview = document.getElementById('ai-result-preview');
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
            body { 
              font-family: 'Times New Roman', Times, serif; 
              padding: 40px; 
              color: #000; 
              background: #fff; 
              line-height: 1.6; 
              font-size: 12pt; 
            }
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
          \${preview.innerHTML}
        </body>
        </html>
      `;
      const cleanFileName = 'Buku_Ekspedisi';
      const res = await api.generatePDF(printHtml, \`\${cleanFileName}_\${Date.now()}\`, { landscape: false });
      if (res && res.success) {
        window.showToast?.('success', 'PDF Selesai', 'Dokumen berhasil diekspor.');
        if (api.openFile) await api.openFile(res.filePath);
      }
    } catch (e) {
      window.showToast?.('error', 'Gagal Cetak', e.message);
    }
  }
};
