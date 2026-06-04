// src/features/dashboard/nilai_rapor/nilai_rapor_template.js

window.NilaiRaporTemplate = {
  buildRaporHTML(data) {
    const {
      siswa, 
      rombelNama, 
      fase, 
      semester, 
      schoolProfile: sp, 
      nilaiRows, 
      rataRataTotal, 
      predTotal, 
      labelTotal, 
      narasiGuru
    } = data;

    const kopHtml = window.ProfilSekolah?.buildKopSuratHTML() || `<div style="text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:16px;"><strong style="font-size:14pt;">${sp.nama_sekolah || 'SEKOLAH DASAR'}</strong></div>`;

    const nilaiTableRows = nilaiRows.map((r, i) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'};">
        <td style="padding:6px 8px;border:1px solid #ddd;">${i + 1}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;">${r.mapel}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;">${r.rata !== '-' ? (typeof r.rata === 'number' ? r.rata.toFixed(1) : r.rata) : '-'}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;text-align:center;font-weight:bold;color:${r.predikat === 'A' ? 'green' : r.predikat === 'B' ? 'blue' : r.predikat === 'C' ? 'orange' : 'red'};">${r.predikat}</td>
        <td style="padding:6px 8px;border:1px solid #ddd;">${r.label}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8">
<style>
  body { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11pt; color: #000; margin: 1.5cm; }
  table { width: 100%; border-collapse: collapse; }
  @page { margin: 2cm; }
  .section-title { background: #f0f0f0; padding: 6px 10px; font-weight: bold; margin: 16px 0 8px; border-left: 4px solid #333; }
</style>
</head>
<body>
  ${kopHtml}
  <h2 style="text-align:center;font-size:13pt;margin:12px 0;">LAPORAN HASIL BELAJAR PESERTA DIDIK</h2>
  <p style="text-align:center;font-size:10pt;">Semester ${semester} — Tahun Pelajaran ${sp.tahun_ajaran || '2025/2026'}</p>
  <hr style="border:2px solid #000;margin:12px 0;">
  
  <div class="section-title">A. IDENTITAS PESERTA DIDIK</div>
  <table style="margin-bottom:16px;">
    <tr><td width="200">Nama Lengkap</td><td>: <strong>${siswa.nama_lengkap}</strong></td><td width="200">NISN</td><td>: ${siswa.nisn || '-'}</td></tr>
    <tr><td>Kelas</td><td>: ${rombelNama}</td><td>Fase</td><td>: ${fase}</td></tr>
    <tr><td>Tempat, Tgl. Lahir</td><td>: ${siswa.tempat_lahir || '-'}, ${siswa.tanggal_lahir ? new Date(siswa.tanggal_lahir).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) : '-'}</td><td>Agama</td><td>: ${siswa.agama || '-'}</td></tr>
    <tr><td>Nama Orang Tua</td><td>: ${siswa.nama_ayah || siswa.nama_ortu || '-'}</td><td>Alamat</td><td>: ${siswa.alamat || '-'}</td></tr>
  </table>

  <div class="section-title">B. CAPAIAN KOMPETENSI</div>
  <table style="margin-bottom:16px;border:1px solid #ccc;">
    <thead style="background:#e0e0e0;">
      <tr>
        <th style="padding:6px;border:1px solid #ccc;width:30px;">No.</th>
        <th style="padding:6px;border:1px solid #ccc;">Mata Pelajaran</th>
        <th style="padding:6px;border:1px solid #ccc;width:60px;">Nilai Akhir</th>
        <th style="padding:6px;border:1px solid #ccc;width:40px;">Predikat</th>
        <th style="padding:6px;border:1px solid #ccc;">Keterangan</th>
      </tr>
    </thead>
    <tbody>${nilaiTableRows}</tbody>
    <tfoot>
      <tr style="background:#f5f5f5;font-weight:bold;">
        <td colspan="2" style="padding:6px 8px;border:1px solid #ccc;text-align:right;">Rata-rata Keseluruhan:</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;">${typeof rataRataTotal === 'number' ? rataRataTotal.toFixed(1) : rataRataTotal}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;text-align:center;">${predTotal}</td>
        <td style="padding:6px 8px;border:1px solid #ccc;">${labelTotal}</td>
      </tr>
    </tfoot>
  </table>

  <div class="section-title">C. KEHADIRAN</div>
  <table style="margin-bottom:16px;">
    <tr>
      <td>Sakit</td><td>: ${siswa.sakit_count || 0} hari</td>
      <td>Izin</td><td>: ${siswa.izin_count || 0} hari</td>
      <td>Tanpa Keterangan</td><td>: ${siswa.alfa_count || 0} hari</td>
    </tr>
  </table>

  <div class="section-title">D. CATATAN WALI KELAS</div>
  <div style="border:1px solid #ccc;padding:12px;min-height:60px;margin-bottom:16px;font-style:italic;">${narasiGuru}</div>

  ${window.ProfilSekolah?.buildTtdKepsekHTML() || ''}
</body></html>`;
  }
};
