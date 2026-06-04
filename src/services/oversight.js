'use strict';

/**
 * CIMEGA SMART OFFICE - MODUL PENGAWASAN ADMINISTRASI
 * Lokasi: src/services/oversight.js
 * Deskripsi: Memungkinkan Admin untuk memantau seluruh dokumen yang dibuat user.
 */

window.ModulOversight = {
    unsub: null,
    docs: [],

    init: async function() {
        console.log('🔍 Menginisialisasi Modul Pengawasan Administrasi...');
        this.renderSkeleton();
        this.startListener();
    },

    renderSkeleton: function() {
        const container = document.getElementById('oversightTableContainer');
        if (!container) return;
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--muted)">
                <div class="spinner" style="margin-bottom:10px"></div>
                Menghubungkan ke database pengawasan...
            </div>
        `;
    },

    startListener: function() {
        if (this.unsub) this.unsub();

        const { collection, query, where, orderBy, onSnapshot } = window._fb;
        const db = window._fb.db;

        // Ambil semua dokumen secara global
        const q = query(
            collection(db, 'shared_docs'),
            orderBy('sharedAt', 'desc')
        );

        this.unsub = onSnapshot(q, (snap) => {
            this.docs = [];
            snap.forEach(d => {
                const data = { id: d.id, ...d.data() };
                // Filter di sisi klien jika flag admin_hidden ada
                if (!data.admin_hidden) {
                    this.docs.push(data);
                }
            });
            this.renderTable();
            this.updateCounter();
        }, (err) => {
            console.error('Oversight error:', err);
            const container = document.getElementById('oversightTableContainer');
            if (container) container.innerHTML = `<div class="error">Gagal memuat data: ${err.message}</div>`;
        });
    },

    renderTable: function() {
        const container = document.getElementById('oversightTableContainer');
        if (!container) return;

        if (this.docs.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="padding:60px">
                    <div class="icon" style="font-size:40px;opacity:0.3">📋</div>
                    <p style="margin-top:10px;color:var(--muted)">Belum ada aktivitas administrasi yang tercatat atau log telah dibersihkan.</p>
                </div>
            `;
            return;
        }

        let html = `
            <table class="admin-table" style="width:100%; border-collapse:collapse; font-size:12px;">
                <thead>
                    <tr style="text-align:left; border-bottom:1px solid var(--border); color:var(--cyan)">
                        <th style="padding:12px">NAMA ADMINISTRASI</th>
                        <th style="padding:12px">PEMBUAT & ROLE</th>
                        <th style="padding:12px">SEKOLAH</th>
                        <th style="padding:12px">KATEGORI</th>
                        <th style="padding:12px">WAKTU DIBUAT</th>
                        <th style="padding:12px; text-align:right">AKSI</th>
                    </tr>
                </thead>
                <tbody>
        `;

        this.docs.forEach(doc => {
            const date = doc.sharedAt ? new Date(doc.sharedAt.toDate()).toLocaleString('id-ID') : '—';
            
            // Look up user role if available
            let roleBadges = '';
            const userObj = window._allUsers ? window._allUsers.find(u => u.id === doc.sharedById) : null;
            if (userObj && userObj.roles && userObj.roles.length > 0) {
                roleBadges = userObj.roles.map(r => `<span style="background:rgba(255,200,0,0.15);color:var(--gold);padding:2px 6px;border-radius:4px;font-size:9px;margin-right:3px">${r.replace('_',' ').toUpperCase()}</span>`).join('');
            } else {
                roleBadges = `<span style="color:var(--muted);font-size:9px">Role tidak diketahui</span>`;
            }

            html += `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.03); transition:all 0.2s" class="hover-row">
                    <td style="padding:12px; font-weight:600; color:#fff">📄 ${doc.docName || 'Dokumen Tanpa Judul'}</td>
                    <td style="padding:12px">
                        <div style="font-weight:600; color:var(--cyan)">${doc.sharedBy || 'Unknown User'}</div>
                        <div style="margin-top:4px">${roleBadges}</div>
                    </td>
                    <td style="padding:12px; font-weight:600; color:#ddd">
                        🏫 ${doc.sekolah || 'Tidak diketahui'}
                    </td>
                    <td style="padding:12px"><span class="badge" style="background:rgba(0,229,255,0.1); color:var(--cyan); border:1px solid rgba(0,229,255,0.2)">${doc.kategori || 'Umum'}</span></td>
                    <td style="padding:12px; color:var(--muted)">${date}</td>
                    <td style="padding:12px; text-align:right">
                        <button class="btn btn-ghost btn-sm" onclick="ModulOversight.viewDetail('${doc.id}')">👁️ Cek Detail</button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    updateCounter: function() {
        const el = document.getElementById('oversightCounter');
        if (el) el.textContent = this.docs.length;
    },

    viewDetail: async function(id) {
        const doc = this.docs.find(d => d.id === id);
        if (!doc) return;

        const modal = document.getElementById('modalOversightDetail');
        const title = document.getElementById('ovTitle');
        const meta = document.getElementById('ovMeta');
        const content = document.getElementById('ovContent');

        title.textContent = doc.docName;
        meta.innerHTML = `Disusun oleh <strong>${doc.sharedBy}</strong> pada ${doc.sharedAt ? new Date(doc.sharedAt.toDate()).toLocaleString('id-ID') : '—'}`;
        
        // Render content safely (it's HTML from Quill/Chatbot)
        content.innerHTML = doc.content || '<p style="color:var(--muted)">Tidak ada konten.</p>';

        // Sisipkan tombol "Simpan ke PC" di bawah info title
        const metaActions = document.getElementById('ovMetaActions');
        if (!metaActions) {
            const actionContainer = document.createElement('div');
            actionContainer.id = 'ovMetaActions';
            actionContainer.style.marginTop = '10px';
            title.parentNode.appendChild(actionContainer);
        }
        document.getElementById('ovMetaActions').innerHTML = `
            <button class="btn btn-gold btn-sm" style="font-size:10px; padding:4px 8px; margin-top:5px;" onclick="ModulOversight.downloadLocal('${doc.id}')">💾 Simpan Bukti Pengawasan (Lokal PC)</button>
        `;

        if (window.openModal) window.openModal('modalOversightDetail');
    },

    downloadLocal: function(id) {
        const doc = this.docs.find(d => d.id === id);
        if (!doc) return;

        const title = doc.docName || 'Dokumen Pengawasan';
        const date = doc.sharedAt ? new Date(doc.sharedAt.toDate()).toLocaleString('id-ID') : 'Unknown Date';
        const userObj = window._allUsers ? window._allUsers.find(u => u.id === doc.sharedById) : null;
        const role = userObj && userObj.roles ? userObj.roles.join(', ') : 'Unknown';

        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Bukti Pengawasan - ${title}</title>
    <style>
        body { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12pt; line-height: 1.6; color: #000; padding: 2cm; max-width: 21cm; margin: 0 auto; background: #fff; }
        .oversight-header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .oversight-header h2 { margin: 0 0 10px 0; font-size: 16pt; text-transform: uppercase; }
        .oversight-meta { font-size: 10pt; color: #555; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
        .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80px; opacity: 0.05; color: red; font-family: 'Plus Jakarta Sans', sans-serif; pointer-events: none; white-space: nowrap; }
    </style>
</head>
<body>
    <div class="watermark">ARSIP PUSAT CIMEGA (CONFIDENTIAL)</div>
    <div class="oversight-header">
        <h2>ARSIP PENGAWASAN ADMINISTRASI</h2>
        <div class="oversight-meta">
            <div><strong>Nama Dokumen:</strong> ${title}</div>
            <div><strong>Waktu Dibuat:</strong> ${date}</div>
            <div><strong>Pembuat (ID):</strong> ${doc.sharedBy} (${doc.sharedById})</div>
            <div><strong>Role Pembuat:</strong> ${role}</div>
            <div><strong>Institusi Sekolah:</strong> ${doc.sekolah || 'Global'}</div>
        </div>
    </div>
    <div class="document-content">
        ${doc.content || '<p>Tidak ada konten teks terbaca.</p>'}
    </div>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = `Pengawasan_${doc.sekolah || 'Sekolah'}_${doc.sharedBy}_${title.replace(/\s+/g, '_')}.html`; 
        a.click();
        URL.revokeObjectURL(url);

        if (window.showToast) window.showToast('success', 'Tersimpan', 'File berhasil diunduh ke PC secara lokal.');
    },

    clearLogs: async function() {
        if (this.docs.length === 0) {
            if (window.showToast) window.showToast('info', 'Data Kosong', 'Belum ada data pengawasan yang bisa dibersihkan.');
            return;
        }
        if (!(await window.CyberDialog.confirm('Peringatan: Ini hanya akan membersihkan tampilan log di panel admin. Dokumen asli di akun user tidak akan terhapus. Lanjutkan?'))) return;

        const { doc, updateDoc } = window._fb;
        const db = window._fb.db;
        
        if (window.showToast) window.showToast('info', 'Membersihkan...', 'Sedang memproses pembersihan log...');

        try {
            let clearedCount = 0;
            for (const d of this.docs) {
                await updateDoc(doc(db, 'shared_docs', d.id), {
                    admin_hidden: true
                });
                clearedCount++;
            }
            if (window.showToast) window.showToast('success', 'Selesai', `${clearedCount} entri log telah dibersihkan dari pandangan.`);
        } catch (e) {
            console.error('Gagal membersihkan log:', e);
            if (window.showToast) window.showToast('error', 'Gagal', e.message);
        }
    }
};
