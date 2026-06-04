// src/features/dashboard/nilai_rapor/nilai_rapor_ui.js

window.NilaiRaporUI = {
  renderForm(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="cyber-container fade-in" style="height:100%; display:flex; flex-direction:column; padding:10px;">
         <div class="cyber-title" style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid rgba(0,229,255,0.2); padding-bottom: 15px; margin-bottom: 20px;">
             <div style="display:flex; align-items:center; gap:12px;">
                 <div style="font-size:24px; background:rgba(0,229,255,0.1); width:45px; height:45px; display:flex; align-items:center; justify-content:center; border-radius:10px; border:1px solid rgba(0,229,255,0.3); box-shadow: 0 0 15px rgba(0,229,255,0.1)">🎓</div>
                 <div style="display:flex; flex-direction:column;">
                     <span style="font-size:18px; font-weight:700; letter-spacing:1px; color:#fff; text-shadow: 0 0 10px rgba(0,229,255,0.3)">Generator Rapor Digital</span>
                     <span style="font-size:11px; color:rgba(0,229,255,0.8); text-transform:uppercase; letter-spacing:2px;">Asesmen & Penilaian</span>
                 </div>
             </div>
             <div style="font-size:11px; font-weight:700; color:#0b0e14; background:linear-gradient(90deg, #00e5ff, #0099ff); padding:6px 12px; border-radius:20px; box-shadow: 0 0 15px rgba(0,229,255,0.4)">T.A 2026/2027</div>
         </div>
         
         <div style="flex:1; overflow-y:auto; padding-right:15px;" class="custom-scrollbar">
             <div class="cyber-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px;">
                 <div class="cyber-group">
                     <label class="cyber-label">Pilih Kelas</label>
                     <select id="nr-rombel-select" class="cyber-select" onchange="window.NilaiRaporCore.loadSiswaByRombel()" required>
                         <option value="">-- Memuat Kelas... --</option>
                     </select>
                 </div>
                 <div class="cyber-group">
                     <label class="cyber-label">Semester</label>
                     <select id="nr-semester" class="cyber-select" onchange="window.NilaiRaporCore.loadSiswaByRombel()">
                         <option value="1">Semester 1 (Ganjil)</option>
                         <option value="2">Semester 2 (Genap)</option>
                     </select>
                 </div>
             </div>

             <!-- Table container -->
             <div id="nr-tabel-nilai" style="margin-top: 15px;">
                 <div style="text-align:center;padding:40px;color:var(--muted);background:rgba(255,255,255,0.01);border:1px dashed rgba(255,255,255,0.1);border-radius:10px;">
                     Pilih Kelas dan Semester di atas untuk memuat daftar nilai siswa.
                 </div>
             </div>
         </div>
      </div>
    `;

    // Trigger loading of classes
    if (window.NilaiRaporCore) {
      window.NilaiRaporCore.init(window.db || window._fb?.db, window._userData, window._schoolProfile);
    }
  },

  renderRombelSelect(rombels) {
    const el = document.getElementById('nr-rombel-select');
    if (el) {
      el.innerHTML = '<option value="">-- Pilih Kelas --</option>' +
        rombels.map(r => `<option value="${r.id}" data-fase="${r.fase}">${r.nama_kelas}</option>`).join('');
    }
  },

  renderNilaiTable(fase) {
    const container = document.getElementById('nr-tabel-nilai');
    const students = window.NilaiRaporCore._students;
    const nilaiData = window.NilaiRaporCore._nilaiData;
    
    if (!container || students.length === 0) {
      if (container) container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);">Tidak ada siswa di kelas ini.</div>';
      return;
    }

    const mapels = window.NilaiRaporCore.MAPEL_LIST[fase] || window.NilaiRaporCore.MAPEL_LIST['B'];
    const headerMapels = mapels.map(m => `<th style="min-width:100px;padding:8px 4px;font-size:10px;color:var(--muted);text-align:center;writing-mode:vertical-rl;transform:rotate(180deg);height:120px;">${m.nama}</th>`).join('');

    const rows = students.map((siswa, idx) => {
      const nilaiSiswa = nilaiData[siswa.id] || {};
      const cells = mapels.map(m => {
        const nd = nilaiSiswa[m.id];
        const nilaiRata = nd?.rata_rata ?? '';
        const predikatObj = nilaiRata !== '' ? window.NilaiRaporCore.getPredikat(nilaiRata) : { predikat: '' };
        const predikat = predikatObj.predikat;
        const bgColor = predikat === 'A' ? 'rgba(0,229,0,0.1)' :
                        predikat === 'B' ? 'rgba(0,100,255,0.1)' :
                        predikat === 'C' ? 'rgba(255,170,0,0.1)' :
                        predikat === 'D' ? 'rgba(255,68,102,0.1)' : 'transparent';
        return `<td style="padding:4px;text-align:center;background:${bgColor};">
          <input type="number" min="0" max="100" step="0.5"
            id="nilai-${siswa.id}-${m.id}"
            value="${nilaiRata}"
            style="width:60px;padding:4px;background:rgba(255,255,255,0.05);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:11px;text-align:center;"
            oninput="window.NilaiRaporUI.onNilaiChange('${siswa.id}', '${m.id}', this.value)"
            placeholder="0-100">
          <div id="pred-${siswa.id}-${m.id}" style="font-size:9px;color:var(--muted);margin-top:2px;">${predikat}</div>
        </td>`;
      }).join('');

      return `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);${idx % 2 === 0 ? '' : 'background:rgba(255,255,255,0.02);'}">
        <td style="padding:8px;font-size:11px;white-space:nowrap;">${idx + 1}. ${siswa.nama_lengkap}</td>
        ${cells}
        <td style="padding:4px;text-align:center;">
          <button onclick="window.NilaiRaporCore.generateRaporSiswa('${siswa.id}')"
            style="padding:4px 10px;background:rgba(0,229,255,0.15);border:1px solid rgba(0,229,255,0.3);border-radius:6px;cursor:pointer;color:var(--cyan);font-size:10px;white-space:nowrap;">
            📄 Rapor
          </button>
        </td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div style="overflow-x:auto;max-height:500px;overflow-y:auto;">
        <table style="width:100%;border-collapse:collapse;min-width:800px;">
          <thead style="position:sticky;top:0;z-index:10;background:#041428;">
            <tr>
              <th style="padding:8px;text-align:left;font-size:11px;color:var(--muted);min-width:180px;">NAMA SISWA</th>
              ${headerMapels}
              <th style="padding:8px;font-size:11px;color:var(--muted);">AKSI</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
        <button onclick="window.NilaiRaporCore.simpanSemuaNilai()"
          style="padding:10px 24px;background:linear-gradient(135deg,rgba(0,229,255,0.3),rgba(0,102,255,0.2));border:1px solid var(--cyan);border-radius:8px;color:var(--cyan);cursor:pointer;font-weight:600;">
          💾 Simpan Semua Nilai
        </button>
        <button onclick="window.NilaiRaporCore.generateRaporMassal()"
          style="padding:10px 24px;background:linear-gradient(135deg,rgba(255,68,102,0.3),rgba(200,0,50,0.2));border:1px solid rgba(255,68,102,0.5);color:#ff6688;border-radius:8px;cursor:pointer;font-weight:600;">
          🖨 Generate Rapor Semua Siswa
        </button>
        <button onclick="window.NilaiRaporCore.exportExcelNilai()"
          style="padding:10px 24px;background:rgba(0,170,0,0.15);border:1px solid rgba(0,170,0,0.4);color:#44cc44;border-radius:8px;cursor:pointer;">
          📊 Export Excel
        </button>
      </div>`;
  },

  onNilaiChange(siswaId, mapelId, nilaiStr) {
    const nilai = parseFloat(nilaiStr);
    const predEl = document.getElementById(`pred-${siswaId}-${mapelId}`);
    
    if (predEl && !isNaN(nilai)) {
      const { predikat } = window.NilaiRaporCore.getPredikat(nilai);
      predEl.textContent = predikat;
      predEl.style.color = predikat === 'A' ? '#44cc44' : predikat === 'B' ? '#66aaff' :
                           predikat === 'C' ? '#ffaa00' : '#ff6688';
    }

    if (!window.NilaiRaporCore._nilaiData[siswaId]) window.NilaiRaporCore._nilaiData[siswaId] = {};
    if (!window.NilaiRaporCore._nilaiData[siswaId][mapelId]) window.NilaiRaporCore._nilaiData[siswaId][mapelId] = {};
    window.NilaiRaporCore._nilaiData[siswaId][mapelId].rata_rata = isNaN(nilai) ? null : nilai;
  }
};
