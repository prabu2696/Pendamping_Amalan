window.GeneratorSurat = window.GeneratorSurat || {};

Object.assign(window.GeneratorSurat, {
  renderForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">✉️</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3)">Pelayanan Surat Otomatis</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px;">Administrasi Persuratan</span>
                 </div>
             </div>
             <div style="font-size:11px; font-weight:700; color:#0b0e14; background:linear-gradient(90deg, #00e5ff, #0099ff); padding:6px 12px; border-radius:20px; box-shadow: 0 0 15px rgba(0,229,255,0.4)">T.A 2026/2027</div>
         </div>
         
         <div style="flex:1; display:flex; gap:20px; overflow:hidden;">
             <!-- Form Parameters (Left) -->
             <div style="flex:1; overflow-y:auto; padding-right:10px;" class="custom-scrollbar">
                 <div class="cyber-group">
                     <label class="cyber-label">Jenis Surat</label>
                     <select id="surat-jenis" class="cyber-select" onchange="GeneratorSurat.onJenisChange()" required>
                         <option value="">-- Memuat Jenis Surat... --</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Nomor Surat</label>
                     <input id="surat-nomor-display" class="cyber-input" type="text" readonly />
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Tanggal Surat</label>
                     <input id="surat-tanggal" class="cyber-input" type="date" required />
                 </div>
                 
                 <!-- Student Select Section (Conditional) -->
                 <div id="surat-siswa-section" class="cyber-group" style="display:none;">
                     <label class="cyber-label">Pilih Siswa</label>
                     <select id="surat-siswa-select" class="cyber-select" onchange="GeneratorSurat.preview()">
                         <option value="">-- Memuat Daftar Siswa... --</option>
                     </select>
                 </div>

                 <!-- Extra Dynamic Fields -->
                 <div id="surat-extra-fields" style="margin-top:15px;"></div>
             </div>

             <!-- Live Preview (Right) -->
             <div style="flex:1.2; display:flex; flex-direction:column; background:rgba(0,0,0,0.2); border:1px solid rgba(0,229,255,0.15); border-radius:10px; padding:15px; overflow:hidden;">
                 <div style="color:var(--cyan); font-weight:700; font-size:12px; border-bottom:1px solid rgba(0,229,255,0.15); padding-bottom:8px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                     <span>🔎 LIVE PREVIEW SURAT</span>
                     <button onclick="GeneratorSurat.downloadPDF()" style="padding:4px 12px; background:linear-gradient(135deg,rgba(0,229,255,0.25),rgba(0,102,255,0.2)); border:1px solid var(--cyan); color:var(--cyan); border-radius:6px; font-size:10px; font-weight:bold; cursor:pointer;">🖨 Cetak PDF</button>
                 </div>
                 <div id="surat-preview" style="flex:1; overflow-y:auto; padding:15px; background:#fff; color:#000; border-radius:6px;" class="custom-scrollbar">
                     <div style="color:#888; text-align:center; padding-top:100px;">Pilih jenis surat untuk melihat preview.</div>
                 </div>
             </div>
         </div>
      </div>
    `;

    // Set default date to today
    const dateInput = document.getElementById('surat-tanggal');
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

    // Initialize core values
    if (window.GeneratorSurat) {
      window.GeneratorSurat.init(window.db || window._fb?.db, window._userData, window._schoolProfile);
      window.GeneratorSurat.renderJenisSuratOptions();
      window.GeneratorSurat.onJenisChange();
    }
  },

  _updateNomorSuratDisplay() {
    const el = document.getElementById('surat-nomor-display');
    if (el && this._schoolProfile) {
      const now = new Date();
      const bulanRomawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][now.getMonth()];
      const tahun = now.getFullYear();
      const kode = this._schoolProfile.kode_surat || 'SD-CIM';
      el.value = `421.2/${String(this._nomorSuratCounter).padStart(3,'0')}/${kode}/${bulanRomawi}/${tahun}`;
    }
  },

  renderJenisSuratOptions() {
    const el = document.getElementById('surat-jenis');
    if (!el) return;
    el.innerHTML = Object.entries(this.JENIS_SURAT)
      .map(([key, val]) => `<option value="${key}">${val.label}</option>`)
      .join('');
  },

  onJenisChange() {
    const jenis = document.getElementById('surat-jenis')?.value;
    const config = this.JENIS_SURAT[jenis];
    if (!config) return;

    const siswaSection = document.getElementById('surat-siswa-section');
    if (siswaSection) siswaSection.style.display = config.perlu_siswa ? 'block' : 'none';

    const extraFields = document.getElementById('surat-extra-fields');
    if (extraFields) {
      extraFields.innerHTML = config.fields.map(field => this._renderField(field)).join('');
    }

    this.preview();
  },

  _renderField(fieldName) {
    const labels = {
      keperluan: 'Keperluan Surat',
      tujuan: 'Ditujukan Kepada',
      sekolah_tujuan: 'Nama Sekolah Tujuan',
      alasan: 'Alasan Pindah',
      keperluan_tugas: 'Keperluan Penugasan',
      nama_guru: 'Nama Guru yang Ditugaskan',
      nip_guru: 'NIP (jika ada)',
      jabatan_guru: 'Jabatan',
      tujuan_tugas: 'Tujuan / Instansi',
      tanggal_tugas: 'Tanggal Pelaksanaan',
      kepada: 'Kepada Yth.',
      perihal_rapat: 'Perihal Rapat',
      hari_tanggal: 'Hari/Tanggal',
      waktu: 'Waktu',
      tempat: 'Tempat',
      acara: 'Agenda Rapat',
      tujuan_instansi: 'Nama Instansi / Lembaga Tujuan'
    };
    const isTextarea = ['keperluan', 'alasan', 'acara'].includes(fieldName);
    const label = labels[fieldName] || fieldName;

    if (isTextarea) {
      return `<div style="margin-bottom:12px;">
        <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">${label}</label>
        <textarea id="sf-${fieldName}" rows="2" placeholder="${label}..."
          style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;resize:vertical;" oninput="GeneratorSurat.preview()"></textarea>
      </div>`;
    }
    return `<div style="margin-bottom:12px;">
      <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">${label}</label>
      <input id="sf-${fieldName}" type="${fieldName.includes('tanggal') ? 'date' : 'text'}" placeholder="${label}..."
        style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;" oninput="GeneratorSurat.preview()">
    </div>`;
  },

  _renderStudentSelector() {
    const el = document.getElementById('surat-siswa-select');
    if (!el) return;
    el.innerHTML = '<option value="">-- Pilih Siswa --</option>' +
      this._students.map(s => `<option value="${s.id}">${s.nama_lengkap} (Kelas ${s.kelas || s.rombel_id || '?'} | NISN: ${s.nisn || '-'})</option>`).join('');
  },

  _getSelectedStudent() {
    const id = document.getElementById('surat-siswa-select')?.value;
    return this._students.find(s => s.id === id) || null;
  },

  preview() {
    const jenis = document.getElementById('surat-jenis')?.value;
    const config = this.JENIS_SURAT[jenis];
    if (!config) return;

    const siswa = config.perlu_siswa ? this._getSelectedStudent() : null;
    const data = this._buildData(siswa);
    const html = config.template(data);

    const previewEl = document.getElementById('surat-preview');
    if (previewEl) previewEl.innerHTML = html;
  },

  _buildData(siswa) {
    const sp = this._schoolProfile || {};
    const now = new Date();
    const tanggalSurat = document.getElementById('surat-tanggal')?.value || now.toISOString().split('T')[0];
    const tglFormatted = new Date(tanggalSurat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    return {
      nama_sekolah: sp.nama_sekolah || 'SEKOLAH DASAR NEGERI CIMEGA',
      alamat: sp.alamat || '',
      kabupaten: sp.kabupaten || '',
      no_telp: sp.no_telp || '-',
      npsn: sp.npsn || '-',
      nama_kepsek: sp.nama_kepsek || '',
      nip_kepsek: sp.nip_kepsek || '',
      tahun_ajaran: sp.tahun_ajaran || '2025/2026',
      nomor_surat: document.getElementById('surat-nomor-display')?.value || '421.2/001/SD-CIM/I/2026',
      tanggal_surat: tglFormatted,
      kota: sp.kabupaten || '',
      nama_siswa: siswa?.nama_lengkap || '...',
      nisn: siswa?.nisn || '-',
      kelas: siswa?.kelas || siswa?.rombel_id || '-',
      tempat_lahir: siswa?.tempat_lahir || '-',
      tanggal_lahir: siswa?.tanggal_lahir
        ? new Date(siswa.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
        : '-',
      nama_ortu: siswa?.nama_ayah || siswa?.nama_ortu || '-',
      alamat_siswa: siswa?.alamat || '-',
      agama: siswa?.agama || 'Islam',
      keperluan: document.getElementById('sf-keperluan')?.value || '[keperluan]',
      tujuan: document.getElementById('sf-tujuan')?.value || 'yang bersangkutan',
      sekolah_tujuan: document.getElementById('sf-sekolah_tujuan')?.value || '[nama sekolah tujuan]',
      alasan: document.getElementById('sf-alasan')?.value || '[alasan pindah]',
      nama_guru: document.getElementById('sf-nama_guru')?.value || '[nama guru]',
      nip_guru: document.getElementById('sf-nip_guru')?.value || '',
      jabatan_guru: document.getElementById('sf-jabatan_guru')?.value || 'Guru Kelas',
      tujuan_tugas: document.getElementById('sf-tujuan_tugas')?.value || '[tujuan]',
      tanggal_tugas: document.getElementById('sf-tanggal_tugas')?.value
        ? new Date(document.getElementById('sf-tanggal_tugas').value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : '[tanggal]',
      keperluan_tugas: document.getElementById('sf-keperluan_tugas')?.value || '[keperluan tugas]',
      kepada: document.getElementById('sf-kepada')?.value || '[Pimpinan/Ketua]',
      perihal_rapat: document.getElementById('sf-perihal_rapat')?.value || '[Perihal Rapat]',
      hari_tanggal: document.getElementById('sf-hari_tanggal')?.value || '[Hari, Tanggal]',
      waktu: document.getElementById('sf-waktu')?.value || '[Waktu]',
      tempat: document.getElementById('sf-tempat')?.value || '[Tempat]',
      acara: document.getElementById('sf-acara')?.value || '[Agenda rapat]',
      tujuan_instansi: document.getElementById('sf-tujuan_instansi')?.value || '[Instansi Tujuan]',
    };
  }
});
