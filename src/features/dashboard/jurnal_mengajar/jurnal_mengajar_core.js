/**
 * Core Jurnal Mengajar
 * Handle db, save, load, export.
 */
const JurnalMengajarCore = (() => {
  let _db = null;
  let _userProfile = null;
  let _schoolProfile = null;

  function _getSemester(date) {
    return (date.getMonth() + 1) >= 7 ? 1 : 2;
  }

  function _generateId() {
    return `jm_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  function _formatTanggalPendek(dateKey) {
    if (!dateKey) return '-';
    const [y, m, d] = dateKey.split('-');
    return `${d}/${m}/${y}`;
  }

  function _toast(pesan, tipe = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(pesan, tipe);
    } else {
      console.warn('[Core]', pesan);
    }
  }

  async function init(db, userProfile, schoolProfile) {
    _db = db;
    _userProfile = userProfile;
    _schoolProfile = schoolProfile;
    
    if (window.JurnalMengajarUI) {
      await window.JurnalMengajarUI.renderForm(userProfile);
    }
  }

  async function saveJurnal(formData) {
    if (!_db) {
      _toast('Database tidak tersambung', 'error');
      return;
    }

    const tanggalDate = new Date(formData.tanggal + 'T00:00:00');
    const semester = _getSemester(tanggalDate);

    const payload = {
      id: _generateId(),
      school_id: _schoolProfile?.school_id || '',
      guru_id: _userProfile?.uid || '',
      guru_nama: _userProfile?.nama || '',
      rombel_id: formData.kelas,
      mapel: formData.mapel,
      tanggal: formData.tanggal,
      semester: semester,
      tahun_ajaran: _schoolProfile?.tahun_ajaran || '',
      tujuan_pembelajaran: formData.tujuan_pembelajaran,
      materi_pokok: formData.materi_pokok,
      metode: formData.metode,
      media_alat: formData.media_alat,
      kehadiran: {
        hadir: formData.hadir,
        izin: formData.izin,
        sakit: formData.sakit,
        alfa: formData.alfa,
      },
      catatan_khusus: formData.catatan_khusus,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const docId = `${_userProfile?.uid || 'guru'}_${formData.kelas}_${formData.tanggal}`;
      await _db.collection('jurnal_mengajar').doc(docId).set(payload, { merge: true });

      _toast('Jurnal berhasil disimpan', 'success');

      if (window.JurnalMengajarUI) {
        const bulan = formData.tanggal.substring(0, 7);
        window.JurnalMengajarUI.setFilterBulan(bulan);
        await window.JurnalMengajarUI.renderList(bulan);
      }
    } catch (err) {
      _toast('Gagal menyimpan jurnal', 'error');
    }
  }

  async function loadJurnalHistory(bulan) {
    if (!_db) return [];
    
    const startDate = `${bulan}-01`;
    const endDate = `${bulan}-31`;

    try {
      const snapshot = await _db
        .collection('jurnal_mengajar')
        .where('school_id', '==', _schoolProfile?.school_id || '')
        .where('guru_id', '==', _userProfile?.uid || '')
        .where('tanggal', '>=', startDate)
        .where('tanggal', '<=', endDate)
        .orderBy('tanggal', 'desc')
        .get();

      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async function exportPDF(bulan) {
    if (!_db) {
      _toast('Database tidak tersambung', 'error');
      return;
    }

    _toast('Menyiapkan export PDF...', 'info');

    let dokumen = [];
    try {
      const startDate = `${bulan}-01`;
      const endDate = `${bulan}-31`;
      const snapshot = await _db
        .collection('jurnal_mengajar')
        .where('school_id', '==', _schoolProfile?.school_id || '')
        .where('guru_id', '==', _userProfile?.uid || '')
        .where('tanggal', '>=', startDate)
        .where('tanggal', '<=', endDate)
        .orderBy('tanggal', 'asc')
        .get();
      dokumen = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      _toast('Gagal mengambil data', 'error');
      return;
    }

    if (dokumen.length === 0) {
      _toast('Tidak ada data', 'error');
      return;
    }

    const namaBulan = new Date(`${bulan}-01`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const tableRows = dokumen
      .map((j, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center">${_formatTanggalPendek(j.tanggal)}</td>
        <td class="center">${j.rombel_id || '-'}</td>
        <td>${j.mapel || '-'}</td>
        <td>${j.tujuan_pembelajaran || '-'}</td>
        <td>${j.materi_pokok || '-'}</td>
        <td>${j.metode || '-'}</td>
        <td>${j.media_alat || '-'}</td>
        <td class="center">${j.kehadiran?.hadir ?? 0}</td>
        <td class="center">${j.kehadiran?.izin ?? 0}</td>
        <td class="center">${j.kehadiran?.sakit ?? 0}</td>
        <td class="center">${j.kehadiran?.alfa ?? 0}</td>
        <td>${j.catatan_khusus || '-'}</td>
      </tr>`).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Jurnal Mengajar - ${namaBulan}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; color: #000; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #000; }
          .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
          .header h2 { font-size: 14px; font-weight: bold; color: #1a73e8; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #555; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #1a73e8; color: #fff; padding: 5px 6px; border: 1px solid #bbb; text-align: center; font-weight: bold; }
          td { padding: 4px 6px; border: 1px solid #ddd; vertical-align: top; }
          td.center { text-align: center; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 30px; display: flex; justify-content: flex-end; }
          .ttd { text-align: center; }
          .ttd p { font-size: 11px; }
          .ttd .nama { font-weight: bold; text-decoration: underline; margin-top: 50px; }
          @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${_schoolProfile?.nama_sekolah || 'Sekolah'}</h1>
          <h2>JURNAL MENGAJAR HARIAN</h2>
          <p>Periode: ${namaBulan} &nbsp;|&nbsp; Guru: ${_userProfile?.nama || '-'} &nbsp;|&nbsp; TA: ${_schoolProfile?.tahun_ajaran || '-'}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>No</th><th>Tgl</th><th>Kelas</th><th>Mata Pelajaran</th>
              <th>Tujuan Pembelajaran</th><th>Materi Pokok</th><th>Metode</th>
              <th>Media/Alat</th><th>H</th><th>I</th><th>S</th><th>A</th>
              <th>Catatan Khusus</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
        <div class="footer">
          <div class="ttd">
            <p>${_schoolProfile?.kota || 'Kota'}, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p>Guru Mata Pelajaran,</p>
            <p class="nama">${_userProfile?.nama || '_____________________'}</p>
            <p>NIP. ${_userProfile?.nip || '-'}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const fileName = `Jurnal_Mengajar_${_userProfile?.nama?.replace(/\s+/g, '_') || 'Guru'}_${bulan}.pdf`;

    try {
      if (window.cimegaConfig?.generatePDF) {
        const filePath = await window.cimegaConfig.generatePDF(htmlContent, fileName);
        if (filePath && window.cimegaConfig?.openFile) {
          await window.cimegaConfig.openFile(filePath);
        }
        _toast('PDF berhasil dibuat', 'success');
      } else if (window.cimegaAPI?.generatePDF) {
        const filePath = await window.cimegaAPI.generatePDF(htmlContent, fileName);
        if (filePath && window.cimegaAPI?.openFile) {
          await window.cimegaAPI.openFile(filePath);
        }
        _toast('PDF berhasil dibuat', 'success');
      } else {
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        _toast('PDF dibuka di tab baru', 'info');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (err) {
      _toast('Gagal export PDF', 'error');
    }
  }

  return {
    init,
    saveJurnal,
    loadJurnalHistory,
    exportPDF,
  };
})();

window.JurnalMengajarCore = JurnalMengajarCore;
