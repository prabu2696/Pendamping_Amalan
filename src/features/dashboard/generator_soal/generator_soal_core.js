// ================================================================
// src/features/dashboard/generator_soal/generator_soal_core.js
// Core Logic: AI, Prompts, PDF Export, Database
// ================================================================

window.GeneratorSoalCore = {
  db: null,
  userProfile: null,
  schoolProfile: null,
  isGenerating: false,
  lastResult: null,

  init(db, userProfile, schoolProfile) {
    this.db = db;
    this.userProfile = userProfile;
    this.schoolProfile = schoolProfile;
  },

  async generateSoal(params) {
    this.isGenerating = true;
    try {
      const {
        jenisAsesmen, kelas, semester, mapel, materi, bahasa,
        komposisi, totalSoal, sertakanKunci, sertakanPedoman,
        acakSoal, pctMudah, pctSedang, pctSulit, tingkatLabel, sertakanKop
      } = params;

      const sistemPrompt = `Anda adalah guru senior Indonesia yang berpengalaman membuat soal asesmen berkualitas tinggi sesuai Kurikulum Merdeka. 
Buat soal yang:
1. Sesuai Capaian Pembelajaran (CP) Kurikulum Merdeka untuk tingkat kelas yang diminta
2. Menggunakan Bahasa ${bahasa} yang tepat dan sesuai usia siswa
3. Memiliki tingkat kesulitan sesuai permintaan
4. HOTS-oriented untuk soal uraian dan sebagian soal PG
5. Bebas dari soal yang ambigu atau multi-interpretasi
${sertakanKunci ? '6. WAJIB sertakan kunci jawaban dan pembahasan singkat di bagian akhir' : ''}
${sertakanPedoman ? '7. WAJIB sertakan pedoman penskoran (rubrik) untuk setiap tipe soal' : ''}
FORMAT OUTPUT yang WAJIB diikuti:
- Mulai langsung dengan soal nomor 1 (tanpa pendahuluan panjang)
- Gunakan format yang rapi dan siap cetak
- Pisahkan tiap bagian soal dengan "=== BAGIAN [NAMA] ===" sebagai header
- Nomor soal berurutan dari 1 hingga ${totalSoal}`;

      const userPrompt = `Buatkan naskah soal ${jenisAsesmen} dengan spesifikasi berikut:

**IDENTITAS SOAL:**
- Mata Pelajaran: ${mapel}
- Kelas: ${kelas} | Semester: ${semester}
- Materi Pokok: ${materi}
- Tahun Pelajaran: ${this.schoolProfile?.tahun_ajaran || '2025/2026'}

**KOMPOSISI SOAL (Total: ${totalSoal} butir):**
${komposisi.map((k, i) => `${i+1}. ${k}`).join('\n')}

**TINGKAT KESULITAN:** ${tingkatLabel}
${pctMudah > 0 ? `- Mudah: sekitar ${Math.round(totalSoal * pctMudah / 100)} soal` : ''}
${pctSedang > 0 ? `- Sedang: sekitar ${Math.round(totalSoal * pctSedang / 100)} soal` : ''}
${pctSulit > 0 ? `- Sulit: sekitar ${Math.round(totalSoal * pctSulit / 100)} soal` : ''}

**INSTRUKSI TAMBAHAN:**
${acakSoal ? '- Buat 2 versi soal (Paket A dan Paket B) dengan urutan soal yang diacak' : '- Buat 1 paket soal standar'}
${sertakanKunci ? '- Sertakan KUNCI JAWABAN lengkap di bagian akhir' : ''}
${sertakanPedoman ? '- Sertakan PEDOMAN PENSKORAN (rubrik) untuk setiap tipe soal' : ''}

Mulai langsung dengan naskah soal. Gunakan Bahasa ${bahasa}.`;

      const api = window.cimegaConfig || window.cimegaAPI;
      const res = await api.geminiAsk({
        system: sistemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 6000
      });

      if (res.error) throw new Error(res.error);

      this.lastResult = {
        text: res.text,
        jenisAsesmen, kelas, semester, mapel, materi,
        totalSoal, sertakanKunci, sertakanPedoman, sertakanKop,
        timestamp: new Date().toISOString()
      };

      return this.lastResult;
    } finally {
      this.isGenerating = false;
    }
  },

  async generateFromPromptStr(prompt, sertakanKop) {
    this.isGenerating = true;
    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const res = await api.geminiAsk({
        system: `Anda adalah guru senior Indonesia yang ahli membuat soal asesmen Kurikulum Merdeka. 
Buat soal berkualitas tinggi sesuai instruksi pengguna. Format output rapi dan siap cetak. 
Sekolah: ${this.schoolProfile?.nama_sekolah || 'SDN Cimega'}. Tahun Pelajaran: ${this.schoolProfile?.tahun_ajaran || '2025/2026'}.`,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 6000
      });

      if (res.error) throw new Error(res.error);

      this.lastResult = {
        text: res.text,
        jenisAsesmen: 'Custom', kelas: '-', semester: '-', mapel: 'Custom',
        materi: prompt.substring(0, 100),
        sertakanKop: sertakanKop,
        timestamp: new Date().toISOString()
      };

      return this.lastResult;
    } finally {
      this.isGenerating = false;
    }
  },

  async saveDraft() {
    if (!this.lastResult || !this.db) throw new Error("Data atau DB tidak tersedia.");
    await this.db.collection('soal_asesmen').add({
      ...this.lastResult,
      user_id: this.userProfile?.uid || 'unknown',
      school_id: this.schoolProfile?.id || 'default',
      status: 'draft',
      created_at: new Date().toISOString()
    });
  },

  async downloadPDF() {
    if (!this.lastResult) throw new Error("Tidak ada data untuk dicetak.");
    const d = this.lastResult;
    const sp = this.schoolProfile || {};
    const kopHtml = window.ProfilSekolah?.buildKopSuratHTML() || `
      <div style="text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:16px;">
        <strong style="font-size:16pt;">${sp.nama_sekolah || 'NAMA SEKOLAH'}</strong><br>
        <span style="font-size:10pt;">${sp.alamat || 'Alamat Sekolah'}</span>
      </div>`;

    const headerSoal = `
      <table style="width:100%;margin-bottom:16px;font-size:10pt;">
        <tr>
          <td>Mata Pelajaran</td><td>: <strong>${d.mapel}</strong></td>
          <td>Kelas/Semester</td><td>: <strong>${d.kelas} / ${d.semester}</strong></td>
        </tr>
        <tr>
          <td>Jenis Asesmen</td><td>: <strong>${d.jenisAsesmen}</strong></td>
          <td>Tahun Pelajaran</td><td>: <strong>${sp.tahun_ajaran || '2025/2026'}</strong></td>
        </tr>
        <tr>
          <td>Waktu</td><td>: ......... Menit</td>
          <td>Jumlah Soal</td><td>: <strong>${d.totalSoal || '?'} Butir</strong></td>
        </tr>
      </table>
      <div style="border:1px solid #111;padding:8px;margin-bottom:16px;font-size:9pt;">
        <strong>Petunjuk Umum:</strong><br>
        1. Berdo'alah sebelum mengerjakan soal.<br>
        2. Tulis nama dan nomor absen pada lembar jawaban yang tersedia.<br>
        3. Periksa kembali jawaban Anda sebelum diserahkan kepada pengawas.<br>
        4. Dilarang bekerja sama atau menyontek dalam bentuk apapun.
      </div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12pt; color: #000; margin: 2cm; }
          @media print { body { margin: 1.5cm; } }
          h3 { color: #000; border-bottom: 1px solid #000; }
          .soal-text { white-space: pre-wrap; line-height: 1.8; }
        </style>
      </head>
      <body>
        ${d.sertakanKop ? kopHtml : ''}
        ${headerSoal}
        <div class="soal-text">${d.text}</div>
      </body>
      </html>`;

    const api = window.cimegaConfig || window.cimegaAPI;
    const fileName = `Soal_${d.jenisAsesmen}_${d.mapel}_Kelas${d.kelas}_${new Date().toLocaleDateString('id-ID').replace(/\//g,'-')}`;
    const result = await api.generatePDF(htmlContent, fileName);

    if (result.success) {
      await api.openFile(result.filePath);
      return result.fileName;
    } else {
      throw new Error(result.error);
    }
  }
};

console.log('✅ GeneratorSoalCore loaded.');
