'use strict';

window.AdminMaster = {
    container: null,
    schools: [],
    users: [],

    init: async function() {
        this.container = document.getElementById('masterApp');
        if (!this.container) return;
        this.renderSkeleton();
        await this.loadData();
        this.render();
    },

    renderSkeleton: function() {
        this.container.innerHTML = `
            <div style="text-align:center;padding:50px;">
                <div class="spinner" style="border-top-color:var(--cyan);width:30px;height:30px"></div>
                <div style="margin-top:14px;color:var(--muted)">Menyiapkan Data Master...</div>
            </div>
        `;
    },

    loadData: async function() {
        try {
            const { collection, getDocs, orderBy, query } = window._fb;
            this.schools = [];
            this.users = [];

            const [skolSnap, usrSnap] = await Promise.all([
                getDocs(query(collection(db, 'sekolah'), orderBy('nama', 'asc'))),
                getDocs(query(collection(db, 'users'), orderBy('nama', 'asc')))
            ]);

            skolSnap.forEach(doc => this.schools.push({ id: doc.id, ...doc.data() }));
            usrSnap.forEach(doc => this.users.push({ id: doc.id, ...doc.data() }));

            // Sync with global variables in admin.html
            window._allUsers = this.users;
            window._allSekolah = this.schools;

        } catch (e) {
            console.error("Gagal memuat Data Master:", e);
        }
    },

    render: function() {
        const groupedData = this.groupUsers();
        
        // Tampilan User Tanpa Sekolah (Yatim Piatu)
        const orphanUsers = this.users.filter(u => {
            const sch = this.schools.find(s => 
                (u.school_id && s.npsn && u.school_id === s.npsn) || 
                (u.sekolah && s.nama && u.sekolah === s.nama)
            );
            return !sch;
        });

        const activeSchools = this.schools.filter(s => s.status === 'aktif').length;

        let html = `
            <div class="section-header">
                <div>
                    <div class="section-title">📦 Master <span>Data Sinkronisasi</span></div>
                    <div style="font-size:11px;color:var(--muted);margin-top:3px">Kelola hubungan Sekolah & Pengguna secara langsung</div>
                </div>
                <div style="display:flex;gap:10px">
                    <button class="btn btn-primary" id="btnSyncMaster" onclick="masterSync('master')">🔄 Sinkron Sekarang</button>
                    <button class="btn btn-ghost" onclick="window.AdminMaster.init()">🔄 Refresh</button>
                    <button class="btn btn-gold" onclick="openModalSekolah()">🏫 + Tambah Institusi</button>
                </div>
            </div>

            <div class="stats-row" style="margin-bottom:20px">
                <div class="stat-card cyan" style="padding:15px">
                    <div class="stat-card-num">${this.schools.length}</div>
                    <div class="stat-card-label">Total Sekolah</div>
                </div>
                <div class="stat-card green" style="padding:15px">
                    <div class="stat-card-num">${activeSchools}</div>
                    <div class="stat-card-label">Sekolah Aktif</div>
                </div>
                <div class="stat-card blue" style="padding:15px">
                    <div class="stat-card-num">${this.users.length}</div>
                    <div class="stat-card-label">Total Pengguna</div>
                </div>
                <div class="stat-card gold" style="padding:15px">
                    <div class="stat-card-num">${orphanUsers.length}</div>
                    <div class="stat-card-label">Akun Administrator/Mandiri</div>
                </div>
            </div>
        `;

        // Render per Sekolah
        this.schools.forEach(s => {
            const usersInSchool = groupedData[s.id] || [];
            html += this.renderSchoolSection(s, usersInSchool);
        });

        // Render Orphan Users
        if (orphanUsers.length > 0) {
            html += `
                <div class="card" style="margin-top:20px">
                    <div class="card-header" style="display:flex; flex-direction:column; align-items:flex-start; gap:4px">
                        <div class="card-title" style="color:var(--gold)">👤 PENGGUNA MANDIRI & ADMINISTRATOR (${orphanUsers.length})</div>
                        <p style="font-size:11px; color:var(--muted); margin:0">Daftar akun yang tidak terafiliasi dengan institusi tertentu, termasuk akun Administrator sistem.</p>
                    </div>
                    <div class="table-wrap" style="border:none; border-radius:0; background:transparent; box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none">
                        ${this.renderUserTable(orphanUsers)}
                    </div>
                </div>
            `;
        }


        if (this.schools.length === 0 && orphanUsers.length === 0) {
            html += `<div class="empty-state"><div class="icon">📦</div><p>Database kosong. Mulai dengan menambah institusi.</p></div>`;
        }

        this.container.innerHTML = html;
    },

    groupUsers: function() {
        const groups = {};
        this.users.forEach(u => {
            const sch = this.schools.find(s => 
                (u.school_id && s.npsn && u.school_id === s.npsn) || 
                (u.sekolah && s.nama && u.sekolah === s.nama)
            );
            if (sch) {
                if (!groups[sch.id]) groups[sch.id] = [];
                groups[sch.id].push(u);
            }
        });
        return groups;
    },

    renderSchoolSection: function(s, users) {
        return `
            <div class="card" style="margin-bottom:20px; border-left:4px solid var(--cyan)">
                <div style="padding:15px 20px; background:rgba(0,229,255,0.03); display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border)">
                    <div>
                        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size:14px; font-weight:700; color:#fff">
                            🏫 ${s.nama || '-'} <span style="color:var(--muted); font-size:11px; margin-left:10px">NPSN: ${s.npsn || '-'}</span>
                        </div>
                        <div style="font-size:11px; color:var(--muted); margin-top:4px">📍 ${s.alamat || 'Alamat belum diisi'}</div>
                    </div>
                    <div style="display:flex; gap:8px">
                        <button class="btn btn-ghost btn-sm" onclick="openModalSekolah('${s.id}')">✏️ Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="konfirmasiHapus('sekolah','${s.id}','${(s.nama||'').replace(/'/g,"\\'")}')">🗑</button>
                        <button class="btn btn-primary btn-sm" onclick="window.AdminMaster.addManualUser('${s.id}', '${s.nama.replace(/'/g, "\\'")}', '${s.npsn}')">+ Tambah User</button>
                    </div>
                </div>
                <div class="table-wrap" style="border:none; border-radius:0; background:transparent; box-shadow:none; backdrop-filter:none; -webkit-backdrop-filter:none">
                    ${this.renderUserTable(users)}
                </div>
            </div>
        `;
    },

    renderUserTable: function(users) {
        if (users.length === 0) {
            return `<div style="padding:20px; text-align:center; color:var(--muted); font-style:italic">Belum ada pengguna di institusi ini.</div>`;
        }

        const rows = users.map(u => `
            <tr>
                <td>
                    <strong>${u.nama || '-'}</strong>
                    ${u.wali_kelas ? `<div style="font-size:9px;color:var(--muted)">📍 Walas: ${u.wali_kelas}</div>` : ''}
                    ${(u.teaching_assignments && ((u.teaching_assignments.classes && u.teaching_assignments.classes.length) || (u.teaching_assignments.phases && u.teaching_assignments.phases.length))) ? 
                        `<div style="font-size:9px;color:var(--cyan)">📍 Jangkauan: ${[...(u.teaching_assignments.phases||[]), ...(u.teaching_assignments.classes||[]).map(c=>'Kls '+c)].join(', ')}</div>` : ''}
                </td>
                <td><span class="badge badge-guru">${(u.roles || [u.role] || []).join(', ')}</span></td>
                <td><code>${u.username || '-'}</code></td>
                <td><span style="font-family:monospace; background:rgba(255,208,0,0.1); padding:2px 6px; border-radius:4px; color:var(--gold)">${u.password || '******'}</span></td>
                <td><span class="badge ${u.status === 'aktif' ? 'badge-active' : 'badge-inactive'}">${u.status || 'aktif'}</span></td>
                <td>
                    <button class="btn btn-ghost btn-sm" onclick="editUser('${u.id}')">✏️</button>
                </td>
            </tr>
        `).join('');

        return `
            <table>
                <thead>
                    <tr>
                        <th>Nama Lengkap</th>
                        <th>Jabatan / Role</th>
                        <th>Username</th>
                        <th>Password</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },

    addManualUser: function(schoolId, schoolName, npsn) {
        // Mock setting context for modalUser
        window._activeSchoolId = schoolId;
        window._activeSchoolName = schoolName;
        openModalUser();
        // Force inject school_id for migration consistency
        document.getElementById('userSchoolId').value = npsn;
    }
};
