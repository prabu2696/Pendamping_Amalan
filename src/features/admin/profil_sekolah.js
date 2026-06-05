/**
 * @file profil_sekolah.js
 * @description Modul Setup Profil & Identitas Sekolah
 */

const ProfilSekolah = {

  // DB State
  _db: null,
  _storage: null,
  _schoolId: null,
  _currentData: {},

  // Init
  init(db, schoolId) {
    this._db = db;
    this._schoolId = schoolId || 'default';
    this._loadAndRender();
  },

  // Fetch data
  async _loadAndRender() {
    try {
      const doc = await this._db
        .collection('schools')
        .doc(this._schoolId)
        .get();
      this._currentData = doc.exists ? doc.data() : {};
      this._populateForm(this._currentData);
      console.log('[ProfilSekolah] Data loaded:', Object.keys(this._currentData).length, 'fields');
    } catch (err) {
      console.error('[ProfilSekolah] Load error:', err);
      window.showToast?.('error', 'Gagal Memuat', 'Tidak dapat memuat profil sekolah: ' + err.message);
    }
  },

  // Populate UI
  _populateForm(data) {
    const fields = [
      'nama_sekolah', 'npsn', 'nss', 'jenjang', 'akreditasi',
      'alamat', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'kode_pos',
      'no_telp', 'email_sekolah', 'website',
      'nama_kepsek', 'nip_kepsek',
      'tahun_ajaran',
      'tgl_mulai_sem1', 'tgl_akhir_sem1',
      'tgl_mulai_sem2', 'tgl_akhir_sem2',
      'nama_dinas', 'nama_pemerintah_daerah'
    ];

    fields.forEach(field => {
      const el = document.getElementById(`ps-${field}`);
      if (el && data[field] !== undefined) el.value = data[field];
    });

    // Render image previews
    if (data.logo_url) this._showImagePreview('ps-logo-preview', data.logo_url);
    if (data.ttd_kepsek_url) this._showImagePreview('ps-ttd-preview', data.ttd_kepsek_url);
    if (data.stempel_url) this._showImagePreview('ps-stempel-preview', data.stempel_url);

    this._updateKopPreview(data);
  },

  // Setup image preview
  _showImagePreview(previewId, url) {
    const el = document.getElementById(previewId);
    if (!el) return;
    el.innerHTML = `<img src="${url}" style="max-height:80px; max-width:200px; border-radius:8px; border:1px solid rgba(0,229,255,0.3);" onerror="this.parentElement.innerHTML='<span style=color:#ff4466>Gagal load gambar</span>'">`;
  },

  // Render document header preview
  _updateKopPreview(data) {
    const preview = document.getElementById('ps-kop-preview');
    if (!preview) return;

    const logoUrl = data.logo_url || '';
    const logoHtml = logoUrl
      ? `<img src="${logoUrl}" style="height:72px;width:72px;object-fit:contain;" onerror="this.style.display='none'">`
      : `<div style="width:72px;height:72px;border:2px solid rgba();border-radius:8px;display:flex;align-items:center;justify-content:center;color:#5a8aaa;font-size:10px;">Logo</div>`;

    preview.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;padding:16px;background:white;border-radius:8px;color:#111;">
        ${logoHtml}
        <div style="flex:1;text-align:center;border-bottom:3px double #111;padding-bottom:8px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;">${data.nama_pemerintah_daerah || 'PEMERINTAH DAERAH'}</div>
          <div style="font-size:10px;">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
          <div style="font-size:13px;font-weight:bold;text-transform:uppercase;">${data.nama_dinas || 'NAMA DINAS PENDIDIKAN'}</div>
          <div style="font-size:15px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">${data.nama_sekolah || 'NAMA SEKOLAH'}</div>
          <div style="font-size:10px;margin-top:2px;">${data.alamat || 'Alamat sekolah'}, ${data.kecamatan || ''}, ${data.kabupaten || ''}</div>
          <div style="font-size:10px;">Telp: ${data.no_telp || '-'} | Email: ${data.email_sekolah || '-'}</div>
        </div>
      </div>
    `;
  },

  // Storage upload handler
  async _uploadImage(file, bucket, fileName) {
    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const sbConfig = await api.getBootStatus?.() || {};

      // DataURL fallback
      if (!window._supabase) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve({ url: e.target.result, type: 'dataurl' });
          reader.readAsDataURL(file);
        });
      }

      const { data, error } = await window._supabase.storage
        .from(bucket)
        .upload(`school_assets/${this._schoolId}/${fileName}`, file, { upsert: true });

      if (error) throw error;

      const { data: urlData } = window._supabase.storage
        .from(bucket)
        .getPublicUrl(`school_assets/${this._schoolId}/${fileName}`);

      return { url: urlData.publicUrl, type: 'supabase' };
    } catch (err) {
      // DataURL fallback on error
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ url: e.target.result, type: 'dataurl' });
        reader.readAsDataURL(file);
      });
    }
  },

  // Handle file input changes
  async handleFileUpload(inputId, previewId, fieldName, bucket = 'school-assets') {
    const input = document.getElementById(inputId);
    if (!input || !input.files[0]) return;

    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) {
      window.showToast?.('warn', 'File Terlalu Besar', 'Maksimum ukuran file adalah 2MB.');
      return;
    }

    window.showToast?.('info', 'Mengupload...', 'Sedang menyimpan gambar...');

    const { url } = await this._uploadImage(file, bucket, fieldName + '_' + Date.now() + '.' + file.name.split('.').pop());
    this._currentData[fieldName + '_url'] = url;
    this._showImagePreview(previewId, url);
    this._updateKopPreview(this._currentData);

    window.showToast?.('success', 'Upload Berhasil', 'Gambar berhasil disimpan.');
  },

  // Save form data to DB
  async save() {
    const fields = [
      'nama_sekolah', 'npsn', 'nss', 'jenjang', 'akreditasi',
      'alamat', 'desa', 'kecamatan', 'kabupaten', 'provinsi', 'kode_pos',
      'no_telp', 'email_sekolah', 'website',
      'nama_kepsek', 'nip_kepsek',
      'tahun_ajaran',
      'tgl_mulai_sem1', 'tgl_akhir_sem1',
      'tgl_mulai_sem2', 'tgl_akhir_sem2',
      'nama_dinas', 'nama_pemerintah_daerah'
    ];

    const data = { ...this._currentData };
    fields.forEach(field => {
      const el = document.getElementById(`ps-${field}`);
      if (el) data[field] = el.value.trim();
    });

    // Validation
    if (!data.nama_sekolah) {
      window.showToast?.('warn', 'Data Kurang', 'Nama sekolah wajib diisi.');
      return;
    }
    if (!data.nama_kepsek) {
      window.showToast?.('warn', 'Data Kurang', 'Nama Kepala Sekolah wajib diisi.');
      return;
    }

    data.updated_at = new Date().toISOString();

    try {
      window.showToast?.('info', 'Menyimpan...', 'Sedang menyimpan profil sekolah...');
      await this._db.collection('schools').doc(this._schoolId).set(data, { merge: true });
      this._currentData = data;
      this._updateKopPreview(data);
      window.showToast?.('success', 'Tersimpan!', 'Profil sekolah berhasil disimpan. Data ini akan digunakan di semua dokumen yang di-generate.');
      console.log('[ProfilSekolah] Saved successfully.');
    } catch (err) {
      console.error('[ProfilSekolah] Save error:', err);
      window.showToast?.('error', 'Gagal Menyimpan', err.message);
    }
  },

  // Public getter
  getData() {
    return { ...this._currentData };
  },

  // Render document header template
  buildKopSuratHTML(options = {}) {
    const d = this._currentData;
    const logoHtml = d.logo_url
      ? `<img src="${d.logo_url}" style="height:80px;width:80px;object-fit:contain;">`
      : '';

    return `
      <div style="display:flex;align-items:center;gap:16px;padding-bottom:8px;border-bottom:3px double #111;margin-bottom:16px;">
        ${logoHtml}
        <div style="flex:1;text-align:center;">
          <div style="font-size:11pt;font-weight:bold;">${d.nama_pemerintah_daerah || ''}</div>
          <div style="font-size:10pt;">DINAS PENDIDIKAN DAN KEBUDAYAAN</div>
          <div style="font-size:10pt;">${d.nama_dinas || ''}</div>
          <div style="font-size:14pt;font-weight:bold;text-transform:uppercase;">${d.nama_sekolah || ''}</div>
          <div style="font-size:9pt;">${d.alamat || ''}, Kec. ${d.kecamatan || ''}, ${d.kabupaten || ''}, ${d.provinsi || ''} ${d.kode_pos || ''}</div>
          <div style="font-size:9pt;">Telp: ${d.no_telp || '-'} | Email: ${d.email_sekolah || '-'}${d.website ? ' | Web: ' + d.website : ''}</div>
          ${d.npsn ? `<div style="font-size:9pt;">NPSN: ${d.npsn}${d.nss ? ' | NSS: ' + d.nss : ''}</div>` : ''}
        </div>
      </div>
    `;
  },

  // Render signature template
  buildTtdKepsekHTML(options = {}) {
    const d = this._currentData;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const tglTtd = options.tanggal || today;
    const lokasiTtd = options.lokasi || d.kabupaten || 'Kabupaten';

    return `
      <div style="text-align:right;margin-top:32px;">
        <div>${lokasiTtd}, ${tglTtd}</div>
        <div style="margin-top:8px;">Kepala Sekolah,</div>
        ${d.ttd_kepsek_url
          ? `<img src="${d.ttd_kepsek_url}" style="height:64px;margin:8px 0;">`
          : '<div style="height:64px;"></div>'}
        ${d.stempel_url
          ? `<img src="${d.stempel_url}" style="position:absolute;opacity:0.4;height:80px;margin-top:-40px;">`
          : ''}
        <div style="font-weight:bold;text-decoration:underline;">${d.nama_kepsek || '___________________'}</div>
        <div>${d.nip_kepsek ? 'NIP. ' + d.nip_kepsek : ''}</div>
      </div>
    `;
  }

};

// Expose globally
window.ProfilSekolah = ProfilSekolah;
console.log('✅ ProfilSekolah v2.0 loaded.');
