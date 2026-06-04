window.GeneratorSurat = window.GeneratorSurat || {};

Object.assign(window.GeneratorSurat, {
  _db: null,
  _userProfile: null,
  _schoolProfile: null,
  _students: [],
  _nomorSuratCounter: 1,

  init(db, userProfile, schoolProfile) {
    this._db = db;
    this._userProfile = userProfile;
    this._schoolProfile = schoolProfile;
    this._loadStudents();
    this._loadNomorSurat();
  },

  async _loadStudents() {
    try {
      const snap = await this._db.collection('students')
        .where('school_id', '==', this._schoolProfile?.id || 'default')
        .where('status', '==', 'aktif')
        .orderBy('nama_lengkap')
        .get();
      this._students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._renderStudentSelector();
    } catch (err) {
      console.warn('[GeneratorSurat] Load students:', err.message);
    }
  },

  async _loadNomorSurat() {
    try {
      const doc = await this._db.collection('settings').doc('surat_counter').get();
      this._nomorSuratCounter = (doc.exists ? doc.data().counter : 0) + 1;
      this._updateNomorSuratDisplay();
    } catch (_) {}
  },

  async downloadPDF() {
    const jenis = document.getElementById('surat-jenis')?.value;
    const config = this.JENIS_SURAT[jenis];
    if (!config) return;

    const siswa = config.perlu_siswa ? this._getSelectedStudent() : null;
    if (config.perlu_siswa && !siswa) {
      window.showToast?.('warn', 'Pilih Siswa', 'Pilih siswa terlebih dahulu untuk membuat surat ini.');
      return;
    }

    const data = this._buildData(siswa);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${config.template(data)}</body></html>`;

    try {
      window.showToast?.('info', 'Membuat PDF...', '');
      const api = window.cimegaConfig || window.cimegaAPI;
      const nomor = data.nomor_surat.replace(/\//g, '-');
      const res = await api.generatePDF(html, `Surat_${config.label.replace(/ /g,'_')}_${nomor}`);
      if (res.success) {
        window.showToast?.('success', 'PDF Siap!', res.fileName);
        await api.openFile(res.filePath);
        this._saveToAgenda(data, config.label, res.filePath);
      } else throw new Error(res.error);
    } catch (err) {
      window.showToast?.('error', 'Gagal', err.message);
    }
  },

  async _saveToAgenda(data, jenisLabel, filePath) {
    try {
      await this._db.collection('settings').doc('surat_counter').set({
        counter: this._nomorSuratCounter
      }, { merge: true });
      this._nomorSuratCounter++;
      this._updateNomorSuratDisplay();

      await this._db.collection('agenda_surat').add({
        type: 'keluar',
        nomor: data.nomor_surat,
        perihal: jenisLabel + (data.nama_siswa !== '...' ? ` - ${data.nama_siswa}` : ''),
        tujuan: data.tujuan || data.sekolah_tujuan || '-',
        tanggal: data.tanggal_surat,
        dibuat_oleh: this._userProfile?.displayName || 'TU',
        file_path: filePath,
        school_id: this._schoolProfile?.id || 'default',
        created_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn('[GeneratorSurat] Gagal simpan ke agenda:', err.message);
    }
  }
});

console.log('✅ GeneratorSurat Modular loaded. [Core, UI, Templates]');
