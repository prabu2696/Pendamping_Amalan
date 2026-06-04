/**
 * @file manajemen_rombel.js
 * @description Modul Manajemen Rombongan Belajar (Kelas)
 */

const ManajemenRombel = {

  _db: null,
  _schoolId: null,
  _rombels: [],
  _students: [],

  // Init
  init(db, schoolId) {
    this._db = db;
    this._schoolId = schoolId || 'default';
    this._load();
  },

  // Load data
  async _load() {
    try {
      const [rombelSnap, studentSnap] = await Promise.all([
        this._db.collection('rombel').where('school_id', '==', this._schoolId).orderBy('nama_kelas').get(),
        this._db.collection('students').where('school_id', '==', this._schoolId).where('status', '==', 'aktif').orderBy('nama_lengkap').get()
      ]);

      this._rombels = rombelSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this._students = studentSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      this._renderRombelList();
      this._renderSiswaSelector();
      console.log(`[Rombel] Loaded ${this._rombels.length} rombel, ${this._students.length} siswa`);
    } catch (err) {
      console.error('[Rombel] Load error:', err);
      window.showToast?.('error', 'Gagal Memuat', err.message);
    }
  },

  // Render list
  _renderRombelList() {
    const container = document.getElementById('rombel-list-container');
    if (!container) return;

    if (this._rombels.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--muted);">
          <div style="font-size:32px;margin-bottom:8px;">📂</div>
          <div>Belum ada rombel. Klik "+ Tambah Rombel" untuk membuat rombel baru.</div>
        </div>`;
      return;
    }

    const rows = this._rombels.map(r => {
      const jumlahSiswa = this._students.filter(s => s.rombel_id === r.id).length;
      const waliKelas = r.wali_kelas_nama || '<span style="color:var(--warn)">⚠ Belum ditentukan</span>';
      return `
        <tr>
          <td style="font-weight:600;color:var(--cyan);">${r.nama_kelas}</td>
          <td>${r.fase || '-'}</td>
          <td>${r.tingkat || '-'}</td>
          <td>${waliKelas}</td>
          <td><span style="background:rgba(0,229,255,0.1);padding:2px 10px;border-radius:12px;font-size:11px;">${jumlahSiswa} siswa</span></td>
          <td>
            <button onclick="ManajemenRombel.editRombel('${r.id}')" 
              style="background:rgba(0,102,255,0.2);border:1px solid rgba(0,102,255,0.4);color:#66aaff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;margin-right:4px;">
              ✏ Edit
            </button>
            <button onclick="ManajemenRombel.kelolaAnggota('${r.id}')"
              style="background:rgba(0,229,255,0.1);border:1px solid rgba(0,229,255,0.3);color:var(--cyan);padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;margin-right:4px;">
              👥 Anggota
            </button>
            <button onclick="ManajemenRombel.deleteRombel('${r.id}', '${r.nama_kelas}')"
              style="background:rgba(255,68,102,0.1);border:1px solid rgba(255,68,102,0.3);color:var(--danger);padding:4px 12px;border-radius:6px;cursor:pointer;font-size:11px;">
              🗑
            </button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:rgba(0,229,255,0.05);border-bottom:1px solid var(--border);">
            <th style="text-align:left;padding:10px 8px;font-size:11px;color:var(--muted);">NAMA KELAS</th>
            <th style="text-align:left;padding:10px 8px;font-size:11px;color:var(--muted);">FASE</th>
            <th style="text-align:left;padding:10px 8px;font-size:11px;color:var(--muted);">TINGKAT</th>
            <th style="text-align:left;padding:10px 8px;font-size:11px;color:var(--muted);">WALI KELAS</th>
            <th style="text-align:left;padding:10px 8px;font-size:11px;color:var(--muted);">JUMLAH SISWA</th>
            <th style="text-align:left;padding:10px 8px;font-size:11px;color:var(--muted);">AKSI</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  // Render student selector
  _renderSiswaSelector() {
    const el = document.getElementById('rombel-siswa-unassigned');
    if (!el) return;
    const unassigned = this._students.filter(s => !s.rombel_id);
    el.innerHTML = unassigned.length > 0
      ? unassigned.map(s => `<option value="${s.id}">${s.nama_lengkap} (${s.nisn || 'No NISN'})</option>`).join('')
      : '<option disabled>Semua siswa sudah terdaftar di rombel</option>';
  },

  // Open modal
  openFormRombel(rombelId = null) {
    const existing = rombelId ? this._rombels.find(r => r.id === rombelId) : null;

    // Pilihan wali kelas dari state (di-load dari users)
    const modal = document.createElement('div');
    modal.id = 'modal-rombel';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#041428;border:1px solid rgba(0,229,255,0.3);border-radius:16px;padding:28px;width:480px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="color:var(--cyan);font-size:14px;">${existing ? '✏ Edit Rombel' : '➕ Tambah Rombel Baru'}</h3>
          <button onclick="document.getElementById('modal-rombel').remove()" 
            style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;">✕</button>
        </div>
        <div style="display:grid;gap:14px;">
          <div>
            <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Nama Kelas *</label>
            <input id="rm-nama" placeholder="Contoh: 1A, 4B, 6C" value="${existing?.nama_kelas || ''}"
              style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Tingkat *</label>
              <select id="rm-tingkat" style="width:100%;padding:10px;background:#041428;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
                ${['1','2','3','4','5','6'].map(t => `<option value="${t}" ${existing?.tingkat === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Fase *</label>
              <select id="rm-fase" style="width:100%;padding:10px;background:#041428;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
                <option value="A" ${existing?.fase === 'A' ? 'selected' : ''}>Fase A (Kelas 1-2)</option>
                <option value="B" ${existing?.fase === 'B' ? 'selected' : ''}>Fase B (Kelas 3-4)</option>
                <option value="C" ${existing?.fase === 'C' ? 'selected' : ''}>Fase C (Kelas 5-6)</option>
              </select>
            </div>
          </div>
          <div>
            <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Tahun Ajaran *</label>
            <input id="rm-tahun" placeholder="Contoh: 2025/2026" value="${existing?.tahun_ajaran || '2025/2026'}"
              style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
          <div>
            <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:4px;">Jurusan / Peminatan</label>
            <input id="rm-jurusan" placeholder="Opsional (untuk SMA/SMK)" value="${existing?.jurusan || ''}"
              style="width:100%;padding:10px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;">
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;justify-content:flex-end;">
          <button onclick="document.getElementById('modal-rombel').remove()"
            style="padding:10px 20px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:8px;color:var(--muted);cursor:pointer;">
            Batal
          </button>
          <button onclick="ManajemenRombel.saveRombel(${rombelId ? `'${rombelId}'` : 'null'})"
            style="padding:10px 24px;background:linear-gradient(135deg,rgba(0,229,255,0.3),rgba(0,102,255,0.2));border:1px solid var(--cyan);border-radius:8px;color:var(--cyan);cursor:pointer;font-weight:600;">
            💾 Simpan
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  editRombel(rombelId) { this.openFormRombel(rombelId); },

  // Save to DB
  async saveRombel(rombelId = null) {
    const namaKelas = document.getElementById('rm-nama')?.value?.trim();
    const tingkat = document.getElementById('rm-tingkat')?.value;
    const fase = document.getElementById('rm-fase')?.value;
    const tahunAjaran = document.getElementById('rm-tahun')?.value?.trim();

    if (!namaKelas || !tingkat || !fase || !tahunAjaran) {
      window.showToast?.('warn', 'Data Kurang', 'Nama kelas, tingkat, fase, dan tahun ajaran wajib diisi.');
      return;
    }

    const data = {
      nama_kelas: namaKelas,
      tingkat,
      fase,
      tahun_ajaran: tahunAjaran,
      jurusan: document.getElementById('rm-jurusan')?.value?.trim() || '',
      school_id: this._schoolId,
      updated_at: new Date().toISOString()
    };

    try {
      window.showToast?.('info', 'Menyimpan...', '');
      if (rombelId) {
        await this._db.collection('rombel').doc(rombelId).update(data);
        window.showToast?.('success', 'Rombel Diperbarui', `Kelas ${namaKelas} berhasil diperbarui.`);
      } else {
        data.created_at = new Date().toISOString();
        await this._db.collection('rombel').add(data);
        window.showToast?.('success', 'Rombel Ditambahkan', `Kelas ${namaKelas} berhasil dibuat.`);
      }
      document.getElementById('modal-rombel')?.remove();
      this._load();
    } catch (err) {
      window.showToast?.('error', 'Gagal Menyimpan', err.message);
    }
  },

  // Delete from DB
  async deleteRombel(rombelId, namaKelas) {
    const siswaInRombel = this._students.filter(s => s.rombel_id === rombelId).length;
    const konfirmasi = await window.showConfirm?.(
      `Hapus Rombel "${namaKelas}"?`,
      `${siswaInRombel > 0 ? `⚠ Ada ${siswaInRombel} siswa di kelas ini yang akan kehilangan assignment rombel.\n` : ''}Tindakan ini tidak dapat dibatalkan.`
    );
    if (!konfirmasi) return;

    try {
      // Hapus assignment rombel dari semua siswa di kelas ini
      if (siswaInRombel > 0) {
        const batch = this._db.batch();
        this._students
          .filter(s => s.rombel_id === rombelId)
          .forEach(s => batch.update(this._db.collection('students').doc(s.id), { rombel_id: null }));
        await batch.commit();
      }
      await this._db.collection('rombel').doc(rombelId).delete();
      window.showToast?.('success', 'Rombel Dihapus', `Kelas ${namaKelas} berhasil dihapus.`);
      this._load();
    } catch (err) {
      window.showToast?.('error', 'Gagal Menghapus', err.message);
    }
  },

  // Manage members
  kelolaAnggota(rombelId) {
    const rombel = this._rombels.find(r => r.id === rombelId);
    if (!rombel) return;

    const anggota = this._students.filter(s => s.rombel_id === rombelId);
    const unassigned = this._students.filter(s => !s.rombel_id);

    const modal = document.createElement('div');
    modal.id = 'modal-anggota';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="background:#041428;border:1px solid rgba(0,229,255,0.3);border-radius:16px;padding:28px;width:640px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h3 style="color:var(--cyan);font-size:14px;">👥 Anggota ${rombel.nama_kelas} — ${anggota.length} siswa</h3>
          <button onclick="document.getElementById('modal-anggota').remove()" 
            style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;">✕</button>
        </div>

        <!-- Daftar anggota saat ini -->
        <div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px;max-height:220px;overflow-y:auto;margin-bottom:16px;">
          ${anggota.length === 0
            ? '<div style="text-align:center;color:var(--muted);padding:20px;">Belum ada siswa di kelas ini.</div>'
            : anggota.map(s => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid rgba(255,255,255,0.05);">
                  <span style="font-size:12px;">${s.nama_lengkap} <span style="color:var(--muted);font-size:10px;">(${s.nisn || 'No NISN'})</span></span>
                  <button onclick="ManajemenRombel.removeSiswaFromRombel('${s.id}', '${rombelId}')"
                    style="background:rgba(255,68,102,0.1);border:1px solid rgba(255,68,102,0.3);color:var(--danger);padding:2px 10px;border-radius:6px;cursor:pointer;font-size:10px;">
                    Keluarkan
                  </button>
                </div>`).join('')}
        </div>

        <!-- Tambah siswa baru -->
        ${unassigned.length > 0 ? `
          <div style="margin-top:12px;">
            <label style="font-size:11px;color:var(--muted);display:block;margin-bottom:6px;">Tambah Siswa ke Kelas Ini</label>
            <div style="display:flex;gap:8px;">
              <select id="anggota-selector" style="flex:1;padding:8px;background:#041428;border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:12px;">
                <option value="">-- Pilih Siswa --</option>
                ${unassigned.map(s => `<option value="${s.id}">${s.nama_lengkap} (${s.nisn || 'No NISN'})</option>`).join('')}
              </select>
              <button onclick="ManajemenRombel.addSiswaToRombel('${rombelId}')"
                style="padding:8px 16px;background:rgba(0,229,255,0.2);border:1px solid var(--cyan);border-radius:8px;color:var(--cyan);cursor:pointer;font-size:12px;white-space:nowrap;">
                ➕ Tambah
              </button>
            </div>
          </div>
        ` : '<div style="color:var(--muted);font-size:12px;text-align:center;padding:8px;">Semua siswa sudah masuk rombel.</div>'}

        <div style="text-align:right;margin-top:16px;">
          <button onclick="document.getElementById('modal-anggota').remove()"
            style="padding:8px 20px;background:rgba(0,229,255,0.1);border:1px solid var(--border);border-radius:8px;color:var(--cyan);cursor:pointer;">
            Tutup
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  },

  async addSiswaToRombel(rombelId) {
    const siswaId = document.getElementById('anggota-selector')?.value;
    if (!siswaId) { window.showToast?.('warn', 'Pilih Siswa', 'Pilih siswa dari daftar terlebih dahulu.'); return; }
    try {
      await this._db.collection('students').doc(siswaId).update({ rombel_id: rombelId });
      document.getElementById('modal-anggota')?.remove();
      this._load();
      setTimeout(() => this.kelolaAnggota(rombelId), 500);
    } catch (err) { window.showToast?.('error', 'Gagal', err.message); }
  },

  async removeSiswaFromRombel(siswaId, rombelId) {
    try {
      await this._db.collection('students').doc(siswaId).update({ rombel_id: null });
      document.getElementById('modal-anggota')?.remove();
      this._load();
      setTimeout(() => this.kelolaAnggota(rombelId), 500);
    } catch (err) { window.showToast?.('error', 'Gagal', err.message); }
  },

  // Mass promotion
  async naikKelasMassal() {
    const konfirmasi = await window.showConfirm?.(
      'Naik Kelas Massal?',
      'Semua siswa aktif akan otomatis naik ke tingkat berikutnya. Siswa kelas 6 akan ditandai sebagai "Lulus". Tindakan ini TIDAK dapat dibatalkan!'
    );
    if (!konfirmasi) return;

    window.showToast?.('info', 'Proses Naik Kelas...', 'Harap tunggu...');

    const batch = this._db.batch();
    let count = 0;

    this._students.forEach(siswa => {
      const rombel = this._rombels.find(r => r.id === siswa.rombel_id);
      if (!rombel) return;

      const tingkat = parseInt(rombel.tingkat);
      const ref = this._db.collection('students').doc(siswa.id);

      if (tingkat >= 6) {
        // Siswa kelas 6 → Lulus
        batch.update(ref, { status: 'lulus', rombel_id: null, tanggal_lulus: new Date().toISOString() });
      } else {
        // Naikkan tingkat, hapus assignment rombel lama (admin harus assign ulang ke rombel baru)
        batch.update(ref, { rombel_id: null });
      }
      count++;
    });

    try {
      await batch.commit();
      window.showToast?.('success', 'Naik Kelas Selesai!', `${count} siswa berhasil diproses. Silakan assign ulang siswa ke rombel tahun ajaran baru.`);
      this._load();
    } catch (err) {
      window.showToast?.('error', 'Gagal', err.message);
    }
  }

};

window.ManajemenRombel = ManajemenRombel;
console.log('✅ ManajemenRombel v2.0 loaded.');
