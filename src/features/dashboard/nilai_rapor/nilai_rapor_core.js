// src/features/dashboard/nilai_rapor/nilai_rapor_core.js

window.NilaiRaporCore = {
  _db: null,
  _userProfile: null,
  _schoolProfile: null,
  _students: [],
  _rombels: [],
  _nilaiData: {},
  _isGenerating: false,

  MAPEL_LIST: {
    'A': [
      { id: 'agama', nama: 'Pendidikan Agama dan Budi Pekerti' },
      { id: 'ppkn', nama: 'Pendidikan Pancasila' },
      { id: 'bindo', nama: 'Bahasa Indonesia' },
      { id: 'matematika', nama: 'Matematika' },
      { id: 'pjok', nama: 'PJOK' },
      { id: 'seni', nama: 'Seni (Musik / Rupa / Teater / Tari)' },
    ],
    'B': [
      { id: 'agama', nama: 'Pendidikan Agama dan Budi Pekerti' },
      { id: 'ppkn', nama: 'Pendidikan Pancasila' },
      { id: 'bindo', nama: 'Bahasa Indonesia' },
      { id: 'matematika', nama: 'Matematika' },
      { id: 'ipas', nama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)' },
      { id: 'pjok', nama: 'PJOK' },
      { id: 'seni', nama: 'Seni (Musik / Rupa / Teater / Tari)' },
      { id: 'bahasa_inggris', nama: 'Bahasa Inggris' },
    ],
    'C': [
      { id: 'agama', nama: 'Pendidikan Agama dan Budi Pekerti' },
      { id: 'ppkn', nama: 'Pendidikan Pancasila' },
      { id: 'bindo', nama: 'Bahasa Indonesia' },
      { id: 'matematika', nama: 'Matematika' },
      { id: 'ipas', nama: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)' },
      { id: 'pjok', nama: 'PJOK' },
      { id: 'seni', nama: 'Seni (Musik / Rupa / Teater / Tari)' },
      { id: 'bahasa_inggris', nama: 'Bahasa Inggris' },
    ]
  },

  getPredikat(nilai) {
    if (nilai >= 91) return { predikat: 'A', label: 'Sangat Baik' };
    if (nilai >= 81) return { predikat: 'B', label: 'Baik' };
    if (nilai >= 71) return { predikat: 'C', label: 'Cukup' };
    return { predikat: 'D', label: 'Perlu Bimbingan' };
  },

  init(db, userProfile, schoolProfile) {
    this._db = db;
    this._userProfile = userProfile;
    this._schoolProfile = schoolProfile;
    this._loadRombelsAndStudents();
  },

  async _loadRombelsAndStudents() {
    try {
      const snap = await this._db.collection('rombel')
        .where('school_id', '==', this._schoolProfile?.id || 'default')
        .orderBy('nama_kelas').get();
      this._rombels = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (window.NilaiRaporUI) {
        window.NilaiRaporUI.renderRombelSelect(this._rombels);
      }
    } catch (err) {
      console.error('Load rombels error:', err);
    }
  },

  async loadSiswaByRombel() {
    const rombelEl = document.getElementById('nr-rombel-select');
    const rombelId = rombelEl?.value;
    const fase = rombelEl?.selectedOptions[0]?.dataset?.fase || 'B';

    if (!rombelId) {
      window.showToast?.('warn', 'Pilih Kelas', 'Pilih kelas terlebih dahulu.');
      return;
    }

    try {
      window.showToast?.('info', 'Memuat...', 'Mengambil data siswa...');

      const [studentSnap, nilaiSnap] = await Promise.all([
        this._db.collection('students')
          .where('rombel_id', '==', rombelId)
          .where('status', '==', 'aktif')
          .orderBy('nama_lengkap').get(),
        this._db.collection('nilai')
          .where('rombel_id', '==', rombelId)
          .where('semester', '==', document.getElementById('nr-semester')?.value || '1')
          .get()
      ]);

      this._students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._nilaiData = {};
      
      nilaiSnap.docs.forEach(d => {
        const nd = d.data();
        if (!this._nilaiData[nd.student_id]) this._nilaiData[nd.student_id] = {};
        this._nilaiData[nd.student_id][nd.mapel_id] = nd;
      });

      if (window.NilaiRaporUI) {
        window.NilaiRaporUI.renderNilaiTable(fase);
      }
      window.showToast?.('success', 'Data Dimuat', `${this._students.length} siswa siap.`);
    } catch (err) {
      window.showToast?.('error', 'Gagal Memuat', err.message);
    }
  },

  async simpanSemuaNilai() {
    const rombelEl = document.getElementById('nr-rombel-select');
    const rombelId = rombelEl?.value;
    const semester = document.getElementById('nr-semester')?.value || '1';
    const fase = rombelEl?.selectedOptions[0]?.dataset?.fase || 'B';
    const mapels = this.MAPEL_LIST[fase] || this.MAPEL_LIST['B'];

    if (!rombelId) { window.showToast?.('warn', '', 'Pilih kelas terlebih dahulu.'); return; }

    window.showToast?.('info', 'Menyimpan...', 'Menyimpan nilai...');
    const batch = this._db.batch();
    let saveCount = 0;

    this._students.forEach(siswa => {
      mapels.forEach(m => {
        const inputEl = document.getElementById(`nilai-${siswa.id}-${m.id}`);
        const nilaiVal = inputEl ? parseFloat(inputEl.value) : null;
        if (nilaiVal === null || isNaN(nilaiVal)) return;

        const { predikat, label } = this.getPredikat(nilaiVal);
        const ref = this._db.collection('nilai').doc(`${siswa.id}_${m.id}_${semester}`);
        batch.set(ref, {
          student_id: siswa.id,
          nama_siswa: siswa.nama_lengkap,
          rombel_id: rombelId,
          mapel_id: m.id,
          mapel_nama: m.nama,
          semester,
          rata_rata: nilaiVal,
          predikat,
          label_predikat: label,
          school_id: this._schoolProfile?.id || 'default',
          updated_at: new Date().toISOString(),
          updated_by: this._userProfile?.displayName || 'Guru'
        }, { merge: true });
        saveCount++;
      });
    });

    try {
      await batch.commit();
      window.showToast?.('success', 'Tersimpan!', `${saveCount} data disimpan.`);
    } catch (err) {
      window.showToast?.('error', 'Gagal Simpan', err.message);
    }
  },

  async generateRaporSiswa(siswaId) {
    const siswa = this._students.find(s => s.id === siswaId);
    if (!siswa) return;

    const rombelEl = document.getElementById('nr-rombel-select');
    const fase = rombelEl?.selectedOptions[0]?.dataset?.fase || 'B';
    const semester = document.getElementById('nr-semester')?.value || '1';
    const mapels = this.MAPEL_LIST[fase] || this.MAPEL_LIST['B'];
    const nilaiSiswa = this._nilaiData[siswaId] || {};

    const nilaiRows = mapels.map(m => {
      const nd = nilaiSiswa[m.id];
      const rata = nd?.rata_rata ?? '-';
      const { predikat, label } = rata !== '-' ? this.getPredikat(rata) : { predikat: '-', label: '-' };
      return { mapel: m.nama, rata, predikat, label };
    });

    let narasiGuru = 'Siswa menunjukkan perkembangan yang baik.';
    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const nilaiSummary = nilaiRows.map(r => `${r.mapel}: ${r.rata} (${r.predikat})`).join(', ');
      const res = await api.geminiAsk({
        system: 'Buat catatan rapor 2-3 kalimat yang positif, memotivasi, dan personal.',
        messages: [{ role: 'user', content: `Siswa: ${siswa.nama_lengkap}. Nilai: ${nilaiSummary}.` }],
        maxTokens: 300
      });
      if (res.text) narasiGuru = res.text.trim();
    } catch (_) {}

    const rataRataTotal = nilaiRows.filter(r => r.rata !== '-').reduce((sum, r) => sum + r.rata, 0) / (nilaiRows.filter(r => r.rata !== '-').length || 1);
    const { predikat: predTotal, label: labelTotal } = this.getPredikat(rataRataTotal);

    const raporHTML = window.NilaiRaporTemplate.buildRaporHTML({
      siswa, 
      rombelNama: rombelEl?.selectedOptions[0]?.textContent || siswa.kelas || '-', 
      fase, 
      semester, 
      schoolProfile: this._schoolProfile || {}, 
      nilaiRows, 
      rataRataTotal, 
      predTotal, 
      labelTotal, 
      narasiGuru
    });

    try {
      window.showToast?.('info', 'Membuat Rapor...', siswa.nama_lengkap);
      const api = window.cimegaConfig || window.cimegaAPI;
      const res = await api.generatePDF(raporHTML, `Rapor_${siswa.nama_lengkap.replace(/ /g,'_')}_Sem${semester}`);
      if (res.success) {
        window.showToast?.('success', 'Rapor Siap!', `Rapor ${siswa.nama_lengkap} dibuat.`);
        await api.openFile(res.filePath);
      } else throw new Error(res.error);
    } catch (err) {
      window.showToast?.('error', 'Gagal', err.message);
    }
  },

  async generateRaporMassal() {
    if (this._students.length === 0) {
      window.showToast?.('warn', '', 'Tidak ada siswa.');
      return;
    }

    const konfirmasi = await window.showConfirm?.('Generate Semua?', 'Proses ini membutuhkan waktu beberapa menit.');
    if (!konfirmasi) return;

    this._isGenerating = true;
    window.showToast?.('info', 'Generating...', `0/${this._students.length}`);

    for (let i = 0; i < this._students.length; i++) {
      await this.generateRaporSiswa(this._students[i].id);
      window.showToast?.('info', 'Proses...', `${i+1}/${this._students.length}`);
      await new Promise(r => setTimeout(r, 1000));
    }

    this._isGenerating = false;
    window.showToast?.('success', 'Selesai!', 'Generate massal selesai.');
  },

  async exportExcelNilai() {
    const rombelEl = document.getElementById('nr-rombel-select');
    const rombelId = rombelEl?.value;
    const namaKelas = rombelEl?.selectedOptions[0]?.textContent || 'Kelas';
    const fase = rombelEl?.selectedOptions[0]?.dataset?.fase || 'B';
    const semester = document.getElementById('nr-semester')?.value || '1';
    const mapels = this.MAPEL_LIST[fase] || this.MAPEL_LIST['B'];

    if (!rombelId || this._students.length === 0) {
      window.showToast?.('warn', '', 'Muat data terlebih dahulu.');
      return;
    }

    const header = `<tr><th>No</th><th>Nama Siswa</th><th>NISN</th>${mapels.map(m => `<th>${m.nama}</th>`).join('')}<th>Rata-rata</th><th>Predikat</th></tr>`;
    const rows = this._students.map((siswa, i) => {
      const nilaiSiswa = this._nilaiData[siswa.id] || {};
      const nilaiArr = mapels.map(m => nilaiSiswa[m.id]?.rata_rata ?? '');
      const valid = nilaiArr.filter(v => v !== '');
      const rataTotal = valid.length ? (valid.reduce((a,b) => a+b, 0) / valid.length).toFixed(1) : '-';
      const { predikat } = valid.length ? this.getPredikat(parseFloat(rataTotal)) : { predikat: '-' };
      return `<tr><td>${i+1}</td><td>${siswa.nama_lengkap}</td><td>${siswa.nisn||'-'}</td>${nilaiArr.map(v => `<td>${v !== '' ? v.toFixed(1) : '-'}</td>`).join('')}<td>${rataTotal}</td><td>${predikat}</td></tr>`;
    }).join('');

    const html = `<html><head><style>th,td{border:1px solid #ccc;padding:4px;}th{background:#e0e0e0;}</style></head>
      <body><h2>Daftar Nilai — ${namaKelas} Semester ${semester}</h2>
      <table>${header}${rows}</table></body></html>`;

    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const res = await api.saveHTML(html, `Nilai_${namaKelas.replace(/ /g,'_')}_Sem${semester}`);
      if (res.success) { window.showToast?.('success', 'Export Selesai!', res.fileName); api.openFile(res.filePath); }
      else throw new Error(res.error);
    } catch (err) {
      window.showToast?.('error', 'Gagal Export', err.message);
    }
  }
};

window.NilaiRapor = window.NilaiRaporCore;
