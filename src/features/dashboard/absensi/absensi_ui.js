/**
 * UI Render Absensi
 * @version 1.0.0
 */

window.AbsensiUI = (() => {
  const STATUS_LIST = [
    { kode: 'H', label: 'Hadir',  color: '#00e5ff', bg: 'rgba(0,229,255,0.15)' },
    { kode: 'I', label: 'Izin',   color: '#ffc400', bg: 'rgba(255,196,0,0.15)' },
    { kode: 'S', label: 'Sakit',  color: '#ff9800', bg: 'rgba(255,152,0,0.15)' },
    { kode: 'A', label: 'Alfa',   color: '#f44336', bg: 'rgba(244,67,54,0.15)' },
  ];

  /** Render UI form */
  async function renderAbsensiForm() {
    const container = document.getElementById('g_absensi-container');
    if (!container) return;

    const core = window.AbsensiCore;
    const today = new Date();
    const tanggalDisplay = core.formatTanggalID(today);
    const dateKey = core.formatDateKey(today);

    const profile = core.getUserProfile();
    const rombelAssigned = profile?.rombel_assigned || [];
    const selectedRombelId = core.getSelectedRombelId();

    container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--cyan)">⏳ Memuat data...</div>`;

    if (selectedRombelId) {
      await core.loadSiswaByRombel(selectedRombelId);
    }

    const daftarSiswa = core.getDaftarSiswa();
    daftarSiswa.forEach(s => core.setStatusAbsensi(s.id, 'H'));

    const selectRombelHTML = rombelAssigned.length > 1
      ? `<select id="absensi-rombel-select" style="background:rgba(0,229,255,0.08);border:1px solid rgba(0,229,255,0.3);border-radius:8px;color:#fff;padding:0.5rem 0.75rem;font-size:0.85rem;cursor:pointer;">
          ${rombelAssigned.map(r => `<option value="${r}" ${r === selectedRombelId ? 'selected' : ''}>${r}</option>`).join('')}
        </select>`
      : `<span style="color:rgba(255,255,255,0.6);font-size:0.85rem;padding:0.5rem 0.75rem;background:rgba(255,255,255,0.05);border-radius:8px;">${selectedRombelId || '-'}</span>`;

    const legendHTML = STATUS_LIST.map(s => 
      `<span style="background:${s.bg};border:1px solid ${s.color};border-radius:6px;padding:0.2rem 0.65rem;font-size:0.78rem;color:${s.color};font-weight:600;">${s.kode} = ${s.label}</span>`
    ).join('');

    const tbodyHTML = daftarSiswa.length === 0
      ? `<tr><td colspan="4" style="text-align:center;padding:2rem;color:rgba(255,255,255,0.3);">Data kosong.</td></tr>`
      : daftarSiswa.map((siswa, idx) => `
        <tr data-siswa-id="${siswa.id}" style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.2s;">
          <td style="padding:0.6rem 0.75rem;color:rgba(255,255,255,0.4);">${idx + 1}</td>
          <td style="padding:0.6rem 0.75rem;color:#fff;font-weight:500;">${siswa.nama || '-'}</td>
          <td style="padding:0.6rem 0.75rem;color:rgba(255,255,255,0.5);">${siswa.nis || '-'}</td>
          <td style="padding:0.6rem 0.75rem;text-align:center;">
            <div style="display:inline-flex;gap:0.4rem;flex-wrap:wrap;justify-content:center;">
              ${STATUS_LIST.map(s => `
                <button class="btn-status" data-siswa-id="${siswa.id}" data-status="${s.kode}"
                  style="background:${s.kode === 'H' ? s.bg : 'transparent'};border:1px solid ${s.kode === 'H' ? s.color : 'rgba(255,255,255,0.15)'};border-radius:6px;color:${s.kode === 'H' ? s.color : 'rgba(255,255,255,0.4)'};padding:0.3rem 0.6rem;font-size:0.78rem;font-weight:700;cursor:pointer;transition:all 0.18s;min-width:42px;">
                  ${s.kode}
                </button>`
              ).join('')}
            </div>
          </td>
        </tr>`).join('');

    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(0,229,255,0.15); border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;margin-bottom:1.5rem;">
          <div>
            <h2 style="margin:0;color:var(--cyan);font-size:1.25rem;">📋 Absensi</h2>
            <p style="margin:0.25rem 0 0;color:rgba(255,255,255,0.5);font-size:0.85rem;">${tanggalDisplay}</p>
          </div>
          <div style="display:flex;gap:0.75rem;flex-wrap:wrap;">
            ${selectRombelHTML}
            <button id="btn-tandai-semua-hadir" style="background:rgba(0,229,255,0.15);border:1px solid rgba(0,229,255,0.4);border-radius:8px;color:var(--cyan);padding:0.5rem 1rem;font-size:0.85rem;cursor:pointer;transition:all 0.2s;">✅ Hadir Semua</button>
          </div>
        </div>

        <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-bottom:1.25rem;">
          ${legendHTML}
        </div>

        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
            <thead>
              <tr style="border-bottom:1px solid rgba(0,229,255,0.2);">
                <th style="text-align:left;padding:0.6rem 0.75rem;color:rgba(255,255,255,0.5);font-weight:500;width:40px;">No</th>
                <th style="text-align:left;padding:0.6rem 0.75rem;color:rgba(255,255,255,0.5);font-weight:500;">Nama</th>
                <th style="text-align:left;padding:0.6rem 0.75rem;color:rgba(255,255,255,0.5);font-weight:500;">NIS</th>
                <th style="text-align:center;padding:0.6rem 0.75rem;color:rgba(255,255,255,0.5);font-weight:500;">Status</th>
              </tr>
            </thead>
            <tbody>${tbodyHTML}</tbody>
          </table>
        </div>

        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.07);">
          <button id="btn-simpan-absensi" style="background:linear-gradient(135deg, rgba(0,229,255,0.25), rgba(0,150,180,0.3));border:1px solid var(--cyan);border-radius:8px;color:var(--cyan);padding:0.65rem 1.5rem;font-size:0.9rem;font-weight:600;cursor:pointer;transition:all 0.2s;">💾 Simpan</button>
          <button id="btn-export-absensi" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.2);border-radius:8px;color:rgba(255,255,255,0.7);padding:0.65rem 1.25rem;font-size:0.9rem;cursor:pointer;transition:all 0.2s;">📊 Export</button>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 8px; padding: 1.25rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.75rem;">
          <h3 style="margin:0;color:rgba(255,255,255,0.8);font-size:1rem;">📅 Riwayat</h3>
          <input type="month" id="filter-bulan-absensi" value="${dateKey.substring(0, 7)}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#fff;padding:0.4rem 0.75rem;font-size:0.85rem;"/>
        </div>
        <div id="absensi-riwayat-content">
          <p style="color:rgba(255,255,255,0.3);font-size:0.85rem;text-align:center;padding:1rem;">Pilih bulan.</p>
        </div>
      </div>
    `;

    _attachFormEvents();
  }

  /** Listener form */
  function _attachFormEvents() {
    const core = window.AbsensiCore;

    const rombelSelect = document.getElementById('absensi-rombel-select');
    if (rombelSelect) {
      rombelSelect.addEventListener('change', async (e) => {
        core.setSelectedRombelId(e.target.value);
        await renderAbsensiForm();
      });
    }

    document.querySelectorAll('.btn-status').forEach((btn) => {
      btn.addEventListener('click', () => {
        _setStatusSiswa(btn.dataset.siswaId, btn.dataset.status);
      });
    });

    const btnSemua = document.getElementById('btn-tandai-semua-hadir');
    if (btnSemua) {
      btnSemua.addEventListener('click', () => {
        core.getDaftarSiswa().forEach((s) => _setStatusSiswa(s.id, 'H'));
        if (typeof window.showToast === 'function') {
          window.showToast('Semua hadir.', 'success');
        }
      });
    }

    const btnSimpan = document.getElementById('btn-simpan-absensi');
    if (btnSimpan) {
      btnSimpan.addEventListener('click', () => core.simpanAbsensi());
    }

    const btnExport = document.getElementById('btn-export-absensi');
    if (btnExport) {
      btnExport.addEventListener('click', () => core.exportExcel());
    }

    const filterBulan = document.getElementById('filter-bulan-absensi');
    if (filterBulan) {
      filterBulan.addEventListener('change', (e) => {
        core.loadRiwayat(e.target.value);
      });
    }
  }

  /** Update UI status siswa */
  function _setStatusSiswa(siswaId, status) {
    window.AbsensiCore.setStatusAbsensi(siswaId, status);

    const row = document.querySelector(`tr[data-siswa-id="${siswaId}"]`);
    if (!row) return;

    row.querySelectorAll('.btn-status').forEach((btn) => {
      const s = STATUS_LIST.find((x) => x.kode === btn.dataset.status);
      if (!s) return;
      
      const isActive = btn.dataset.status === status;
      btn.style.background = isActive ? s.bg : 'transparent';
      btn.style.borderColor = isActive ? s.color : 'rgba(255,255,255,0.15)';
      btn.style.color = isActive ? s.color : 'rgba(255,255,255,0.4)';
    });
  }

  return {
    renderAbsensiForm,
  };
})();
