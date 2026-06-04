/**
 * Core Logic Absensi
 * @version 1.0.0
 */

window.AbsensiCore = (() => {
  let _db = null;
  let _userProfile = null;
  let _schoolProfile = null;
  let _daftarSiswa = [];
  let _statusAbsensi = {};
  let _selectedRombelId = null;

  /** Format tanggal ke ID */
  function _formatTanggalID(date) {
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /** Format key tanggal */
  function _formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /** Tentukan semester */
  function _getSemester(date) {
    return date.getMonth() + 1 >= 7 ? 1 : 2;
  }

  /** Toast util */
  function _toast(pesan, tipe = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(pesan, tipe);
    }
  }

  /** Inisialisasi DB */
  async function init(db, userProfile, schoolProfile) {
    _db = db;
    _userProfile = userProfile;
    _schoolProfile = schoolProfile;

    const rombels = userProfile?.rombel_assigned || [];
    if (rombels.length > 0) {
      _selectedRombelId = rombels[0];
    }

    if (window.AbsensiUI) {
      await window.AbsensiUI.renderAbsensiForm();
    }
  }

  /** Memuat data siswa berdasarkan rombel */
  async function loadSiswaByRombel(rombelId) {
    if (!_db || !rombelId) return [];

    try {
      const snapshot = await _db
        .collection('students')
        .where('rombel_id', '==', rombelId)
        .where('school_id', '==', _schoolProfile?.school_id || '')
        .orderBy('nama', 'asc')
        .get();

      _daftarSiswa = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return _daftarSiswa;
    } catch (err) {
      _toast('Gagal memuat siswa.', 'error');
      return [];
    }
  }

  /** Simpan absensi */
  async function simpanAbsensi() {
    if (!_db) {
      _toast('Database terputus.', 'error');
      return;
    }
    if (_daftarSiswa.length === 0) {
      _toast('Tidak ada data.', 'error');
      return;
    }

    const today = new Date();
    const dateKey = _formatDateKey(today);
    const semester = _getSemester(today);

    const dataAbsensi = _daftarSiswa.map((s) => ({
      siswa_id: s.id,
      nama: s.nama || '',
      status: _statusAbsensi[s.id] || 'A',
    }));

    const payload = {
      school_id: _schoolProfile?.school_id || '',
      rombel_id: _selectedRombelId || '',
      tanggal: dateKey,
      semester: semester,
      data: dataAbsensi,
      created_by: _userProfile?.uid || '',
      created_at: new Date().toISOString(),
    };

    try {
      const docId = `${_selectedRombelId}_${dateKey}`;
      await _db.collection('absensi').doc(docId).set(payload, { merge: true });

      _toast('Absensi disimpan.', 'success');

      const filterBulan = document.getElementById('filter-bulan-absensi');
      const bulan = filterBulan ? filterBulan.value : dateKey.substring(0, 7);
      await loadRiwayat(bulan);
    } catch (err) {
      _toast('Gagal menyimpan.', 'error');
    }
  }

  /** Muat riwayat */
  async function loadRiwayat(bulan) {
    const riwayatContent = document.getElementById('absensi-riwayat-content');
    if (!riwayatContent) return;

    if (!_db || !_selectedRombelId) {
      riwayatContent.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Pilih rombel.</p>`;
      return;
    }

    riwayatContent.innerHTML = `<p style="text-align:center;color:var(--cyan);padding:1rem;">Memuat...</p>`;

    try {
      const startDate = `${bulan}-01`;
      const endDate = `${bulan}-31`;

      const snapshot = await _db
        .collection('absensi')
        .where('school_id', '==', _schoolProfile?.school_id || '')
        .where('rombel_id', '==', _selectedRombelId)
        .where('tanggal', '>=', startDate)
        .where('tanggal', '<=', endDate)
        .orderBy('tanggal', 'asc')
        .get();

      const dokumen = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (dokumen.length === 0) {
        riwayatContent.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Kosong.</p>`;
        return;
      }

      const rekapSiswa = {};
      _daftarSiswa.forEach((s) => {
        rekapSiswa[s.id] = { nama: s.nama, H: 0, I: 0, S: 0, A: 0 };
      });

      dokumen.forEach((dok) => {
        (dok.data || []).forEach((item) => {
          if (!rekapSiswa[item.siswa_id]) {
            rekapSiswa[item.siswa_id] = { nama: item.nama, H: 0, I: 0, S: 0, A: 0 };
          }
          if (['H', 'I', 'S', 'A'].includes(item.status)) {
            rekapSiswa[item.siswa_id][item.status]++;
          }
        });
      });

      const rows = Object.entries(rekapSiswa)
        .map(
          ([id, r], idx) => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
          <td style="padding:0.5rem 0.75rem;color:rgba(255,255,255,0.4);">${idx + 1}</td>
          <td style="padding:0.5rem 0.75rem;color:#fff;">${r.nama}</td>
          <td style="padding:0.5rem 0.75rem;text-align:center;color:#00e5ff;font-weight:700;">${r.H}</td>
          <td style="padding:0.5rem 0.75rem;text-align:center;color:#ffc400;font-weight:700;">${r.I}</td>
          <td style="padding:0.5rem 0.75rem;text-align:center;color:#ff9800;font-weight:700;">${r.S}</td>
          <td style="padding:0.5rem 0.75rem;text-align:center;color:#f44336;font-weight:700;">${r.A}</td>
        </tr>`
        )
        .join('');

      riwayatContent.innerHTML = `
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <th style="padding:0.5rem 0.75rem;text-align:left;color:rgba(255,255,255,0.4);">No</th>
                <th style="padding:0.5rem 0.75rem;text-align:left;color:rgba(255,255,255,0.4);">Nama Siswa</th>
                <th style="padding:0.5rem 0.75rem;text-align:center;color:#00e5ff;">H</th>
                <th style="padding:0.5rem 0.75rem;text-align:center;color:#ffc400;">I</th>
                <th style="padding:0.5rem 0.75rem;text-align:center;color:#ff9800;">S</th>
                <th style="padding:0.5rem 0.75rem;text-align:center;color:#f44336;">A</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch (err) {
      riwayatContent.innerHTML = `<p style="color:#f44336;text-align:center;padding:1rem;">Error memuat data.</p>`;
    }
  }

  /** Export data */
  async function exportExcel() {
    if (_daftarSiswa.length === 0) {
      _toast('Data kosong.', 'error');
      return;
    }

    const today = new Date();
    const filterBulan = document.getElementById('filter-bulan-absensi');
    const bulan = filterBulan ? filterBulan.value : _formatDateKey(today).substring(0, 7);

    let dokumen = [];
    try {
      const startDate = `${bulan}-01`;
      const endDate = `${bulan}-31`;
      const snapshot = await _db
        .collection('absensi')
        .where('school_id', '==', _schoolProfile?.school_id || '')
        .where('rombel_id', '==', _selectedRombelId)
        .where('tanggal', '>=', startDate)
        .where('tanggal', '<=', endDate)
        .orderBy('tanggal', 'asc')
        .get();
      dokumen = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      _toast('Gagal load data export.', 'error');
      return;
    }

    const rekapSiswa = {};
    _daftarSiswa.forEach((s) => {
      rekapSiswa[s.id] = { nama: s.nama, nis: s.nis || '-', H: 0, I: 0, S: 0, A: 0 };
    });

    dokumen.forEach((dok) => {
      (dok.data || []).forEach((item) => {
        if (!rekapSiswa[item.siswa_id]) {
          rekapSiswa[item.siswa_id] = { nama: item.nama, nis: '-', H: 0, I: 0, S: 0, A: 0 };
        }
        if (['H', 'I', 'S', 'A'].includes(item.status)) {
          rekapSiswa[item.siswa_id][item.status]++;
        }
      });
    });

    const rows = Object.entries(rekapSiswa)
      .map(
        ([id, r], idx) =>
          `<tr>
        <td>${idx + 1}</td>
        <td>${r.nama}</td>
        <td>${r.nis}</td>
        <td>${r.H}</td>
        <td>${r.I}</td>
        <td>${r.S}</td>
        <td>${r.A}</td>
        <td>${r.H + r.I + r.S + r.A}</td>
      </tr>`
      )
      .join('');

    const htmlContent = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; }
            h2 { text-align: center; }
            p { text-align: center; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            th { background: #1a73e8; color: #fff; padding: 6px; border: 1px solid #ccc; }
            td { padding: 5px; border: 1px solid #ccc; text-align: center; }
            td:nth-child(2) { text-align: left; }
          </style>
        </head>
        <body>
          <h2>Rekap Absensi Siswa</h2>
          <p>${_schoolProfile?.nama_sekolah || ''} | Kelas: ${_selectedRombelId || ''} | Periode: ${bulan}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Siswa</th>
                <th>NIS</th>
                <th>Hadir</th>
                <th>Izin</th>
                <th>Sakit</th>
                <th>Alfa</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `;

    const fileName = `Absensi_${_selectedRombelId}_${bulan}.xls`;

    try {
      if (window.cimegaConfig?.saveHTML) {
        const filePath = await window.cimegaConfig.saveHTML(htmlContent, fileName);
        if (filePath && window.cimegaConfig?.openFile) {
          await window.cimegaConfig.openFile(filePath);
        }
        _toast('Export berhasil.', 'success');
      } else if (window.cimegaAPI?.saveHTML) {
        const filePath = await window.cimegaAPI.saveHTML(htmlContent, fileName);
        if (filePath && window.cimegaAPI?.openFile) {
          await window.cimegaAPI.openFile(filePath);
        }
        _toast('Export berhasil.', 'success');
      } else {
        const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        _toast('File diunduh.', 'success');
      }
    } catch (err) {
      _toast('Gagal export.', 'error');
    }
  }

  return {
    init,
    loadSiswaByRombel,
    simpanAbsensi,
    loadRiwayat,
    exportExcel,
    getDaftarSiswa: () => _daftarSiswa,
    getStatusAbsensi: () => _statusAbsensi,
    setStatusAbsensi: (id, status) => { _statusAbsensi[id] = status; },
    getSelectedRombelId: () => _selectedRombelId,
    setSelectedRombelId: (id) => { _selectedRombelId = id; },
    getUserProfile: () => _userProfile,
    formatTanggalID: _formatTanggalID,
    formatDateKey: _formatDateKey
  };
})();
