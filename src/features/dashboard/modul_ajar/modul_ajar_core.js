// src/features/dashboard/modul_ajar/modul_ajar_core.js

const ModulAjarCore = {
  _db: null,
  _userProfile: null,
  _schoolProfile: null,
  _lastResult: null,

  init(db, userProfile, schoolProfile) {
    this._db = db;
    this._userProfile = userProfile;
    this._schoolProfile = schoolProfile;
    if (window.ModulAjarUI) {
      window.ModulAjarUI.init();
    }
  },

  async generateFromGUI(data, onStart, onComplete, onError) {
    onStart();
    const adaABK = data.adaABK ? 'termasuk ABK (Anak Berkebutuhan Khusus)' : 'reguler';
    const sistemPrompt = `Anda adalah instruktur pengembangan kurikulum senior.
Buat Modul Ajar LENGKAP, KREATIF, dan BERKUALITAS TINGGI:
1. Semua komponen WAJIB Modul Ajar ada.
2. Kegiatan pembelajaran variatif dan interaktif.
3. Asesmen autentik.
4. Profil Pelajar Pancasila terintegrasi.
5. Diferensiasi untuk siswa ${adaABK}.
Format: Gunakan heading (## NAMA BAGIAN)`;

    const mediaListText = data.mediaList.length > 0 ? data.mediaList.join(', ') : 'Papan tulis, buku teks, alat tulis';
    const abkText = data.adaABK ? '- Terdapat siswa ABK: Ya (sertakan adaptasi/diferensiasi)' : '';

    const userPrompt = `Buat MODUL AJAR:
Mata Pelajaran: ${data.mapel}
Kelas: ${data.kelas} | Fase: ${data.fase}
Sekolah: ${this._schoolProfile?.nama_sekolah || 'SD Negeri Cimega'}
Tahun Pelajaran: ${this._schoolProfile?.tahun_ajaran || '2025/2026'}
Alokasi Waktu: ${data.alokasi || '2 × 35 menit'} (${data.jmlPertemuan} pertemuan)
Penyusun: ${this._userProfile?.displayName || 'Guru'}

Capaian Pembelajaran: ${data.elemen}
Tujuan Pembelajaran: ${data.tp}
Model: ${data.modelPem || 'PBL'}
Target PD: ${data.targetPD || 'Peserta didik reguler'}
${abkText}
Media: ${mediaListText}

Komponen wajib: Informasi Umum, Kompetensi Awal, Profil Pelajar Pancasila, Sarana & Prasarana, Target PD, Model, Tujuan, Pemahaman Bermakna, Pertanyaan Pemantik, Kegiatan, Asesmen, Pengayaan, Bahan Bacaan, Refleksi.`;

    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const res = await api.geminiAsk({
        system: sistemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 8000
      });

      if (res.error) throw new Error(res.error);

      this._lastResult = {
        text: res.text,
        mapel: data.mapel, kelas: data.kelas, fase: data.fase,
        elemen: data.elemen, tp: data.tp, alokasi: data.alokasi,
        jmlPertemuan: data.jmlPertemuan, modelPem: data.modelPem,
        timestamp: new Date().toISOString(),
        type: 'modul_ajar'
      };

      onComplete(res.text);
    } catch (err) {
      console.error('[ModulAjarCore] Error:', err);
      onError(err);
    }
  },

  async generateFromPrompt(prompt, onStart, onComplete, onError) {
    onStart();
    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const sysPrompt = `Anda ahli pengembangan kurikulum. Buat Modul Ajar lengkap. Sekolah: ${this._schoolProfile?.nama_sekolah || 'SDN Cimega'}. Tahun Pelajaran: ${this._schoolProfile?.tahun_ajaran || '2025/2026'}.`;
      const res = await api.geminiAsk({
        system: sysPrompt,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 8000
      });

      if (res.error) throw new Error(res.error);

      this._lastResult = {
        text: res.text, mapel: 'Custom', kelas: '-', fase: '-',
        timestamp: new Date().toISOString(), type: 'modul_ajar'
      };

      onComplete(res.text);
    } catch (err) {
      console.error('[ModulAjarCore] Error:', err);
      onError(err);
    }
  },

  async downloadPDF() {
    if (!this._lastResult) return;
    const d = this._lastResult;
    const sp = this._schoolProfile || {};
    const kopHtml = window.ProfilSekolah?.buildKopSuratHTML() || `<div style="text-align:center;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:16px;"><strong style="font-size:16pt;">${sp.nama_sekolah || 'NAMA SEKOLAH'}</strong></div>`;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      body { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11pt; color: #000; margin: 2cm; line-height: 1.6; }
      h3 { color: #000; border-bottom: 1px solid #ccc; font-size: 12pt; margin-top: 16pt; }
      @page { margin: 2cm; }
    </style></head><body>
      ${kopHtml}
      <h2 style="text-align:center;font-size:14pt;">MODUL AJAR</h2>
      <p style="text-align:center;">${d.mapel} — Kelas ${d.kelas} Fase ${d.fase}</p>
      <hr>
      <div style="white-space:pre-wrap;">${d.text}</div>
    </body></html>`;

    try {
      const api = window.cimegaConfig || window.cimegaAPI;
      const res = await api.generatePDF(html, \`ModulAjar_\${d.mapel}_Kelas\${d.kelas}\`);
      if (res.success) { 
        window.showToast?.('success', 'PDF Siap!', res.fileName); 
        api.openFile(res.filePath); 
      } else throw new Error(res.error);
    } catch (err) { 
      window.showToast?.('error', 'Gagal', err.message); 
    }
  },

  async saveDraft() {
    if (!this._lastResult || !this._db) return;
    try {
      await this._db.collection('modul_ajar').add({
        ...this._lastResult,
        user_id: this._userProfile?.uid || 'unknown',
        school_id: this._schoolProfile?.id || 'default',
        status: 'draft',
        created_at: new Date().toISOString()
      });
      window.showToast?.('success', 'Draft Disimpan!', 'Modul Ajar tersimpan.');
    } catch (err) { 
      window.showToast?.('error', 'Gagal Simpan', err.message); 
    }
  }
};

window.ModulAjarCore = ModulAjarCore;
// Alias backward compatibility
window.ModulAjar = ModulAjarCore;
