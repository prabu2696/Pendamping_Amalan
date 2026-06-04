/**
 * UI Jurnal Mengajar
 * Handle render form dan list.
 */
const JurnalMengajarUI = (() => {
  const METODE_LIST = [
    'Ceramah', 'Diskusi', 'Demonstrasi', 'Praktik',
    'Problem Based Learning (PBL)', 'Inquiry',
    'Discovery Learning', 'Cooperative Learning',
  ];

  function _formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
      console.warn('[UI]', pesan);
    }
  }

  function _inputStyle() {
    return `width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;padding:0.55rem 0.85rem;font-size:0.87rem;box-sizing:border-box;outline:none;transition:border-color 0.2s;`;
  }

  function _textareaStyle() {
    return `width:100%;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;padding:0.65rem 0.85rem;font-size:0.87rem;box-sizing:border-box;resize:vertical;outline:none;line-height:1.5;font-family:inherit;transition:border-color 0.2s;`;
  }

  async function renderForm(userProfile) {
    const container = document.getElementById('g_jurnal-container');
    if (!container) return;

    const today = new Date();
    const todayKey = _formatDateKey(today);
    const bulanKey = todayKey.substring(0, 7);

    const rombelAssigned = userProfile?.rombel_assigned || [];
    const mapelList = userProfile?.mapel_assigned || [];

    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0,229,255,0.15); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
        <h2 style="margin:0 0 1.5rem;color:var(--cyan);font-size:1.25rem;">📓 Jurnal Mengajar Harian</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">
          <div class="form-group">
            <label for="jurnal-tanggal" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">📅 Tanggal</label>
            <input type="date" id="jurnal-tanggal" value="${todayKey}" style="${_inputStyle()}" />
          </div>
          <div class="form-group">
            <label for="jurnal-kelas" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">🏫 Kelas</label>
            <select id="jurnal-kelas" style="${_inputStyle()}">
              <option value="">-- Pilih Kelas --</option>
              ${rombelAssigned.length > 0 ? rombelAssigned.map((r) => `<option value="${r}">${r}</option>`).join('') : `<option value="VII-A">VII-A</option><option value="VII-B">VII-B</option><option value="VIII-A">VIII-A</option>`}
            </select>
          </div>
          <div class="form-group">
            <label for="jurnal-mapel" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">📚 Mata Pelajaran</label>
            ${mapelList.length > 0 ? `<select id="jurnal-mapel" style="${_inputStyle()}"><option value="">-- Pilih Mapel --</option>${mapelList.map((m) => `<option value="${m}">${m}</option>`).join('')}</select>` : `<input type="text" id="jurnal-mapel" placeholder="Contoh: Matematika" style="${_inputStyle()}" />`}
          </div>
          <div class="form-group">
            <label for="jurnal-metode" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">🎯 Metode Pembelajaran</label>
            <select id="jurnal-metode" style="${_inputStyle()}">
              <option value="">-- Pilih Metode --</option>
              ${METODE_LIST.map((m) => `<option value="${m}">${m}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-group" style="margin-top:1rem;">
          <label for="jurnal-tujuan" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">🎓 Tujuan Pembelajaran</label>
          <textarea id="jurnal-tujuan" rows="3" placeholder="Peserta didik mampu..." style="${_textareaStyle()}"></textarea>
        </div>
        <div class="form-group" style="margin-top:1rem;">
          <label for="jurnal-materi" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">📋 Materi Pokok</label>
          <textarea id="jurnal-materi" rows="3" placeholder="Uraikan materi yang diajarkan..." style="${_textareaStyle()}"></textarea>
        </div>
        <div class="form-group" style="margin-top:1rem;">
          <label for="jurnal-media" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">🖥️ Media & Alat Pembelajaran</label>
          <textarea id="jurnal-media" rows="2" placeholder="Contoh: Buku paket, Laptop, Proyektor, Lembar Kerja Siswa..." style="${_textareaStyle()}"></textarea>
        </div>
        <div style="margin-top:1.25rem;">
          <p style="margin:0 0 0.75rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">👥 Data Kehadiran Siswa</p>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.75rem;max-width:480px;">
            ${[
              { id: 'jurnal-hadir', label: 'Hadir', color: '#00e5ff', emoji: '✅' },
              { id: 'jurnal-izin', label: 'Izin', color: '#ffc400', emoji: '📝' },
              { id: 'jurnal-sakit', label: 'Sakit', color: '#ff9800', emoji: '🤒' },
              { id: 'jurnal-alfa', label: 'Alfa', color: '#f44336', emoji: '❌' },
            ].map(f => `
              <div style="text-align:center;">
                <label for="${f.id}" style="display:block;margin-bottom:0.3rem;color:${f.color};font-size:0.78rem;font-weight:600;">${f.emoji} ${f.label}</label>
                <input type="number" id="${f.id}" min="0" value="0" style="${_inputStyle()} text-align:center; padding:0.5rem; border-color:${f.color}55;" />
              </div>`).join('')}
          </div>
        </div>
        <div class="form-group" style="margin-top:1rem;">
          <label for="jurnal-catatan" style="display:block;margin-bottom:0.4rem;color:rgba(255,255,255,0.6);font-size:0.83rem;font-weight:500;">📌 Catatan Khusus</label>
          <textarea id="jurnal-catatan" rows="2" placeholder="Kendala, kejadian khusus, atau tindak lanjut..." style="${_textareaStyle()}"></textarea>
        </div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.07);">
          <button id="btn-save-jurnal" style="background: linear-gradient(135deg, rgba(0,229,255,0.25), rgba(0,150,180,0.3)); border: 1px solid var(--cyan); border-radius: 8px; color: var(--cyan); padding: 0.65rem 1.5rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">💾 Simpan Jurnal</button>
          <button id="btn-reset-jurnal" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: rgba(255,255,255,0.5); padding: 0.65rem 1.25rem; font-size: 0.9rem; cursor: pointer; transition: all 0.2s;">🔄 Reset Form</button>
        </div>
      </div>
      <div id="jurnal-riwayat-section" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 1.25rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
          <h3 style="margin:0;color:rgba(255,255,255,0.8);font-size:1rem;">📅 Riwayat Jurnal Bulan Ini</h3>
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <input type="month" id="filter-bulan-jurnal" value="${bulanKey}" style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#fff; padding:0.4rem 0.75rem; font-size:0.85rem;" />
            <button id="btn-export-jurnal-pdf" style="background: rgba(255,82,82,0.15); border: 1px solid rgba(255,82,82,0.4); border-radius: 8px; color: #ff5252; padding: 0.4rem 1rem; font-size: 0.83rem; cursor: pointer; transition: all 0.2s;">📄 Export PDF</button>
          </div>
        </div>
        <div id="jurnal-riwayat-content">
          <p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Simpan jurnal atau pilih bulan untuk melihat riwayat.</p>
        </div>
      </div>
    `;

    _attachFormEvents();
    await renderList(bulanKey);
  }

  function _getFormValues() {
    return {
      tanggal: document.getElementById('jurnal-tanggal')?.value?.trim() || '',
      kelas: document.getElementById('jurnal-kelas')?.value?.trim() || '',
      mapel: document.getElementById('jurnal-mapel')?.value?.trim() || '',
      metode: document.getElementById('jurnal-metode')?.value?.trim() || '',
      tujuan_pembelajaran: document.getElementById('jurnal-tujuan')?.value?.trim() || '',
      materi_pokok: document.getElementById('jurnal-materi')?.value?.trim() || '',
      media_alat: document.getElementById('jurnal-media')?.value?.trim() || '',
      hadir: parseInt(document.getElementById('jurnal-hadir')?.value || '0', 10),
      izin: parseInt(document.getElementById('jurnal-izin')?.value || '0', 10),
      sakit: parseInt(document.getElementById('jurnal-sakit')?.value || '0', 10),
      alfa: parseInt(document.getElementById('jurnal-alfa')?.value || '0', 10),
      catatan_khusus: document.getElementById('jurnal-catatan')?.value?.trim() || '',
    };
  }

  function _validateForm(form) {
    const errors = [];
    if (!form.tanggal) errors.push('Tanggal wajib diisi');
    if (!form.kelas) errors.push('Kelas wajib dipilih');
    if (!form.mapel) errors.push('Mata pelajaran wajib diisi');
    if (!form.tujuan_pembelajaran) errors.push('Tujuan wajib diisi');
    if (!form.materi_pokok) errors.push('Materi wajib diisi');
    if (!form.metode) errors.push('Metode wajib dipilih');
    return errors;
  }

  function _attachFormEvents() {
    const btnSave = document.getElementById('btn-save-jurnal');
    if (btnSave) {
      btnSave.addEventListener('click', () => {
        const form = _getFormValues();
        const errors = _validateForm(form);
        if (errors.length > 0) {
          _toast('⚠️ ' + errors.join(', '), 'error');
          return;
        }
        if (window.JurnalMengajarCore) {
          window.JurnalMengajarCore.saveJurnal(form);
        }
      });
    }

    const btnReset = document.getElementById('btn-reset-jurnal');
    if (btnReset) {
      btnReset.addEventListener('click', () => _resetForm());
    }

    const filterBulan = document.getElementById('filter-bulan-jurnal');
    if (filterBulan) {
      filterBulan.addEventListener('change', (e) => {
        renderList(e.target.value);
      });
    }

    const btnPDF = document.getElementById('btn-export-jurnal-pdf');
    if (btnPDF) {
      btnPDF.addEventListener('click', () => {
        const filterEl = document.getElementById('filter-bulan-jurnal');
        const bulan = filterEl ? filterEl.value : _formatDateKey(new Date()).substring(0, 7);
        if (window.JurnalMengajarCore) {
          window.JurnalMengajarCore.exportPDF(bulan);
        }
      });
    }

    document.querySelectorAll('#jurnal-container input, #jurnal-container textarea, #jurnal-container select').forEach((el) => {
      el.addEventListener('focus', () => el.style.borderColor = 'rgba(0,229,255,0.5)');
      el.addEventListener('blur', () => el.style.borderColor = 'rgba(255,255,255,0.15)');
    });
  }

  function _resetForm() {
    const today = _formatDateKey(new Date());
    const fields = [
      { id: 'jurnal-tanggal', val: today },
      { id: 'jurnal-kelas', val: '' },
      { id: 'jurnal-mapel', val: '' },
      { id: 'jurnal-metode', val: '' },
      { id: 'jurnal-tujuan', val: '' },
      { id: 'jurnal-materi', val: '' },
      { id: 'jurnal-media', val: '' },
      { id: 'jurnal-hadir', val: '0' },
      { id: 'jurnal-izin', val: '0' },
      { id: 'jurnal-sakit', val: '0' },
      { id: 'jurnal-alfa', val: '0' },
      { id: 'jurnal-catatan', val: '' },
    ];
    fields.forEach(({ id, val }) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    });
    _toast('Form direset', 'info');
  }

  async function renderList(bulan) {
    const riwayatContent = document.getElementById('jurnal-riwayat-content');
    if (!riwayatContent) return;

    if (!window.JurnalMengajarCore) {
      riwayatContent.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Core module tidak ditemukan.</p>`;
      return;
    }

    riwayatContent.innerHTML = `<p style="text-align:center;color:var(--cyan);padding:1rem;">⏳ Memuat riwayat...</p>`;

    try {
      const dokumen = await window.JurnalMengajarCore.loadJurnalHistory(bulan);

      if (dokumen.length === 0) {
        riwayatContent.innerHTML = `<p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1.5rem;">Belum ada jurnal.</p>`;
        return;
      }

      const cards = dokumen.map((j) => `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-left: 3px solid var(--cyan); border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 0.75rem; transition: border-color 0.2s;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:0.5rem;margin-bottom:0.6rem;">
            <div>
              <span style="color:var(--cyan);font-weight:700;font-size:0.9rem;">${j.rombel_id || '-'}</span>
              <span style="color:rgba(255,255,255,0.4);margin:0 0.5rem;">•</span>
              <span style="color:rgba(255,255,255,0.8);font-size:0.9rem;">${j.mapel || '-'}</span>
            </div>
            <span style="background:rgba(0,229,255,0.1); border:1px solid rgba(0,229,255,0.25); border-radius:6px; color:rgba(0,229,255,0.8); padding:0.15rem 0.6rem; font-size:0.78rem;">${_formatTanggalPendek(j.tanggal)}</span>
          </div>
          <p style="margin:0 0 0.4rem;color:rgba(255,255,255,0.6);font-size:0.82rem;"><strong style="color:rgba(255,255,255,0.5);">Tujuan:</strong> ${j.tujuan_pembelajaran || '-'}</p>
          <p style="margin:0 0 0.4rem;color:rgba(255,255,255,0.6);font-size:0.82rem;"><strong style="color:rgba(255,255,255,0.5);">Materi:</strong> ${j.materi_pokok || '-'}</p>
          <p style="margin:0 0 0.6rem;color:rgba(255,255,255,0.6);font-size:0.82rem;"><strong style="color:rgba(255,255,255,0.5);">Metode:</strong> ${j.metode || '-'}</p>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
            <span style="background:rgba(0,229,255,0.1);border-radius:6px;padding:0.15rem 0.6rem;font-size:0.76rem;color:#00e5ff;">✅ ${j.kehadiran?.hadir ?? 0} Hadir</span>
            <span style="background:rgba(255,196,0,0.1);border-radius:6px;padding:0.15rem 0.6rem;font-size:0.76rem;color:#ffc400;">📝 ${j.kehadiran?.izin ?? 0} Izin</span>
            <span style="background:rgba(255,152,0,0.1);border-radius:6px;padding:0.15rem 0.6rem;font-size:0.76rem;color:#ff9800;">🤒 ${j.kehadiran?.sakit ?? 0} Sakit</span>
            <span style="background:rgba(244,67,54,0.1);border-radius:6px;padding:0.15rem 0.6rem;font-size:0.76rem;color:#f44336;">❌ ${j.kehadiran?.alfa ?? 0} Alfa</span>
          </div>
          ${j.catatan_khusus ? `<p style="margin:0.6rem 0 0;color:rgba(255,255,255,0.45);font-size:0.8rem;font-style:italic;">📌 ${j.catatan_khusus}</p>` : ''}
        </div>`).join('');

      riwayatContent.innerHTML = `${cards}<p style="color:rgba(255,255,255,0.25);font-size:0.78rem;text-align:right;margin-top:0.5rem;">Total ${dokumen.length} jurnal bulan ${bulan}</p>`;
    } catch (err) {
      riwayatContent.innerHTML = `<p style="color:#f44336;font-size:0.85rem;text-align:center;padding:1rem;">Gagal memuat: ${err.message || err}</p>`;
    }
  }

  function setFilterBulan(bulan) {
    const filter = document.getElementById('filter-bulan-jurnal');
    if (filter) filter.value = bulan;
  }

  return {
    renderForm,
    renderList,
    setFilterBulan,
  };
})();

window.JurnalMengajarUI = JurnalMengajarUI;
