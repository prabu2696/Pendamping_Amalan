window.GeneratorSurat = window.GeneratorSurat || {};

Object.assign(window.GeneratorSurat, {
  JENIS_SURAT: {
    'aktif_belajar': {
      label: 'Surat Keterangan Aktif Belajar',
      perlu_siswa: true,
      fields: ['keperluan', 'tujuan'],
      template: (data) => window.GeneratorSurat._templateAktifBelajar(data)
    },
    'pindah_sekolah': {
      label: 'Surat Keterangan Pindah Sekolah',
      perlu_siswa: true,
      fields: ['sekolah_tujuan', 'alasan'],
      template: (data) => window.GeneratorSurat._templatePindahSekolah(data)
    },
    'kelakuan_baik': {
      label: 'Surat Keterangan Kelakuan Baik',
      perlu_siswa: true,
      fields: ['keperluan'],
      template: (data) => window.GeneratorSurat._templateKelakuanBaik(data)
    },
    'lulus': {
      label: 'Surat Keterangan Lulus',
      perlu_siswa: true,
      fields: [],
      template: (data) => window.GeneratorSurat._templateLulus(data)
    },
    'tidak_mampu': {
      label: 'Surat Keterangan Tidak Mampu',
      perlu_siswa: true,
      fields: ['keperluan'],
      template: (data) => window.GeneratorSurat._templateTidakMampu(data)
    },
    'tugas_guru': {
      label: 'Surat Tugas Guru',
      perlu_siswa: false,
      fields: ['nama_guru', 'nip_guru', 'jabatan_guru', 'tujuan_tugas', 'tanggal_tugas', 'keperluan_tugas'],
      template: (data) => window.GeneratorSurat._templateTugasGuru(data)
    },
    'undangan_rapat': {
      label: 'Surat Undangan Rapat',
      perlu_siswa: false,
      fields: ['kepada', 'perihal_rapat', 'hari_tanggal', 'waktu', 'tempat', 'acara'],
      template: (data) => window.GeneratorSurat._templateUndanganRapat(data)
    },
    'rekomendasi': {
      label: 'Surat Rekomendasi / Pengantar',
      perlu_siswa: true,
      fields: ['keperluan', 'tujuan_instansi'],
      template: (data) => window.GeneratorSurat._templateRekomendasi(data)
    }
  },

  _getKopHtml(data) {
    return window.ProfilSekolah?.buildKopSuratHTML() || `
      <div style="text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:16px;">
        <strong style="font-size:14pt;text-transform:uppercase;">${data.nama_sekolah}</strong><br>
        <span style="font-size:9pt;">${data.alamat} | Telp: ${data.no_telp} | NPSN: ${data.npsn}</span>
      </div>`;
  },

  _getFooterTtd(data, jabatan = 'Kepala Sekolah') {
    return `
      <div style="margin-top:40px;text-align:right;padding-right:20px;">
        <div>${data.kota || data.kabupaten}, ${data.tanggal_surat}</div>
        <div style="margin-top:8px;">${jabatan},</div>
        <br><br><br>
        <div style="text-decoration:underline;font-weight:bold;">${data.nama_kepsek}</div>
        ${data.nip_kepsek ? `<div>NIP. ${data.nip_kepsek}</div>` : ''}
      </div>`;
  },

  _getStyleSurat() {
    return `<style>body,div{font-family: 'Plus Jakarta Sans', sans-serif;font-size:12pt;color:#000;line-height:1.6;}
      .surat{max-width:700px;margin:auto;padding:20px;} .kop{border-bottom:3px double #000;padding-bottom:8px;margin-bottom:16px;}
      .nomor-surat{margin-bottom:16px;} .pembuka{margin-bottom:12px;} .isi{text-align:justify;margin-bottom:16px;}
      .ttd{margin-top:40px;text-align:right;padding-right:20px;}</style>`;
  },

  _templateAktifBelajar(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT KETERANGAN AKTIF BELAJAR</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, menerangkan bahwa:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama Lengkap</td><td>: <strong>${d.nama_siswa}</strong></td></tr>
      <tr><td>NISN</td><td>: ${d.nisn}</td></tr><tr><td>Kelas</td><td>: ${d.kelas}</td></tr>
      <tr><td>Tempat, Tgl. Lahir</td><td>: ${d.tempat_lahir}, ${d.tanggal_lahir}</td></tr>
      <tr><td>Nama Orang Tua</td><td>: ${d.nama_ortu}</td></tr>
      <tr><td>Alamat</td><td>: ${d.alamat_siswa}</td></tr></table>
      <p>adalah benar-benar siswa aktif di ${d.nama_sekolah} pada Tahun Pelajaran ${d.tahun_ajaran}.</p>
      <p>Surat keterangan ini dibuat untuk keperluan <strong>${d.keperluan}</strong> dan mohon dimaklumi oleh pihak yang bersangkutan.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templatePindahSekolah(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT KETERANGAN PINDAH SEKOLAH</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, dengan ini menerangkan bahwa:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama</td><td>: <strong>${d.nama_siswa}</strong></td></tr>
      <tr><td>NISN</td><td>: ${d.nisn}</td></tr><tr><td>Kelas</td><td>: ${d.kelas}</td></tr>
      <tr><td>Asal Sekolah</td><td>: ${d.nama_sekolah}</td></tr></table>
      <p>yang bersangkutan telah <strong>pindah sekolah</strong> ke <strong>${d.sekolah_tujuan}</strong> terhitung sejak tanggal ${d.tanggal_surat} dengan alasan: ${d.alasan}.</p>
      <p>Demikian surat keterangan ini dibuat dengan sebenar-benarnya untuk digunakan sebagaimana mestinya.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templateKelakuanBaik(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT KETERANGAN KELAKUAN BAIK</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, menerangkan bahwa:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama</td><td>: <strong>${d.nama_siswa}</strong></td></tr>
      <tr><td>NISN</td><td>: ${d.nisn}</td></tr><tr><td>Kelas</td><td>: ${d.kelas}</td></tr>
      <tr><td>Tempat, Tgl. Lahir</td><td>: ${d.tempat_lahir}, ${d.tanggal_lahir}</td></tr></table>
      <p>Berdasarkan catatan yang ada, yang bersangkutan selama menjadi siswa di ${d.nama_sekolah} dikenal sebagai siswa yang <strong>berkelakuan baik, jujur, dan bertanggung jawab</strong>.</p>
      <p>Surat ini dibuat untuk keperluan <strong>${d.keperluan}</strong>.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templateLulus(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT KETERANGAN LULUS</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, menerangkan bahwa:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama</td><td>: <strong>${d.nama_siswa}</strong></td></tr>
      <tr><td>NISN</td><td>: ${d.nisn}</td></tr><tr><td>Tempat, Tgl. Lahir</td><td>: ${d.tempat_lahir}, ${d.tanggal_lahir}</td></tr>
      <tr><td>Agama</td><td>: ${d.agama}</td></tr><tr><td>Nama Orang Tua</td><td>: ${d.nama_ortu}</td></tr></table>
      <p>adalah benar-benar siswa yang telah <strong>LULUS</strong> dari ${d.nama_sekolah} pada Tahun Pelajaran ${d.tahun_ajaran}.</p>
      <p>Surat keterangan ini dibuat sambil menunggu ijazah yang bersangkutan selesai diproses.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templateTidakMampu(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT KETERANGAN TIDAK MAMPU</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, menerangkan bahwa:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama</td><td>: <strong>${d.nama_siswa}</strong></td></tr>
      <tr><td>NISN</td><td>: ${d.nisn}</td></tr><tr><td>Kelas</td><td>: ${d.kelas}</td></tr>
      <tr><td>Nama Orang Tua</td><td>: ${d.nama_ortu}</td></tr>
      <tr><td>Alamat</td><td>: ${d.alamat_siswa}</td></tr></table>
      <p>Berdasarkan data yang ada, keluarga yang bersangkutan tergolong dalam kategori <strong>tidak mampu (kurang mampu secara ekonomi)</strong>.</p>
      <p>Surat keterangan ini dikeluarkan untuk keperluan <strong>${d.keperluan}</strong> dan dapat digunakan sebagaimana mestinya.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templateTugasGuru(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT TUGAS</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, memberikan tugas kepada:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama</td><td>: <strong>${d.nama_guru}</strong></td></tr>
      ${d.nip_guru ? `<tr><td>NIP</td><td>: ${d.nip_guru}</td></tr>` : ''}
      <tr><td>Jabatan</td><td>: ${d.jabatan_guru}</td></tr>
      <tr><td>Unit Kerja</td><td>: ${d.nama_sekolah}</td></tr></table>
      <p>Untuk melaksanakan tugas pada:</p>
      <table style="margin:12px 0;"><tr><td width="200">Hari/Tanggal</td><td>: ${d.tanggal_tugas}</td></tr>
      <tr><td>Tujuan</td><td>: ${d.tujuan_tugas}</td></tr>
      <tr><td>Keperluan</td><td>: ${d.keperluan_tugas}</td></tr></table>
      <p>Demikian surat tugas ini dibuat untuk dapat dilaksanakan dengan penuh tanggung jawab.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templateUndanganRapat(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <table style="margin-bottom:16px;width:100%;"><tr><td width="150">Nomor</td><td>: ${d.nomor_surat}</td></tr>
      <tr><td>Hal</td><td>: <strong>Undangan Rapat ${d.perihal_rapat}</strong></td></tr>
      <tr><td>Lampiran</td><td>: -</td></tr></table>
      <p>Kepada Yth.<br><strong>${d.kepada}</strong><br>di Tempat</p>
      <p>Dengan hormat,</p>
      <p>Dalam rangka ${d.perihal_rapat}, kami mengundang Bapak/Ibu untuk hadir dalam rapat yang akan dilaksanakan pada:</p>
      <table style="margin:12px 0;"><tr><td width="150">Hari/Tanggal</td><td>: ${d.hari_tanggal}</td></tr>
      <tr><td>Waktu</td><td>: ${d.waktu} WIB</td></tr>
      <tr><td>Tempat</td><td>: ${d.tempat}</td></tr>
      <tr><td>Agenda</td><td>: ${d.acara}</td></tr></table>
      <p>Mengingat pentingnya acara tersebut, kami mohon Bapak/Ibu untuk hadir tepat waktu. Atas perhatian dan kehadiran Bapak/Ibu, kami ucapkan terima kasih.</p>
      ${this._getFooterTtd(d)}</div>`;
  },

  _templateRekomendasi(d) {
    return `${this._getStyleSurat()}<div class="surat">
      ${this._getKopHtml(d)}
      <p><strong>SURAT REKOMENDASI / PENGANTAR</strong><br>Nomor: ${d.nomor_surat}</p>
      <p>Yang bertanda tangan di bawah ini, Kepala ${d.nama_sekolah}, dengan ini merekomendasikan:</p>
      <table style="margin:12px 0;"><tr><td width="200">Nama</td><td>: <strong>${d.nama_siswa}</strong></td></tr>
      <tr><td>NISN</td><td>: ${d.nisn}</td></tr><tr><td>Kelas</td><td>: ${d.kelas}</td></tr>
      <tr><td>Asal Sekolah</td><td>: ${d.nama_sekolah}</td></tr></table>
      <p>Kepada: <strong>${d.tujuan_instansi}</strong></p>
      <p>untuk keperluan <strong>${d.keperluan}</strong>. Yang bersangkutan adalah siswa berprestasi dan berperilaku baik.</p>
      <p>Demikian surat rekomendasi ini kami buat dengan sebenar-benarnya. Atas perhatian yang diberikan, kami ucapkan terima kasih.</p>
      ${this._getFooterTtd(d)}</div>`;
  }
});
