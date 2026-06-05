window.CimegaSharing = {
  db: null,
  currentUser: null,
  sekolah: '',
  unsubFiles: null,
  filesList: [],
  selectedFileObject: null,

  init: function() {
    this.db = window._fb.db;
    this.currentUser = window.userData;
    
    // Safety get school
    this.sekolah = window.CimegaUtils ? window.CimegaUtils.getSafetySchoolID(this.currentUser) : (this.currentUser.sekolah || 'Unknown');

    // Attach listeners
    this.startListener();
  },

  handleSelectFile: async function(e) {
    const file = e.target.files[0];
    if (!file) {
      this.selectedFileObject = null;
      document.getElementById('sharingFileName').textContent = 'Belum ada file yang dipilih...';
      document.getElementById('btnSharingUpload').disabled = true;
      return;
    }

    // Validasi 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      if (window.showToast) window.showToast('warn', 'File Terlalu Besar', `Maksimal ukuran file adalah 10 MB.`);
      else await window.CyberDialog.alert('Maksimal ukuran file adalah 10 MB.');
      e.target.value = '';
      return;
    }

    this.selectedFileObject = file;
    document.getElementById('sharingFileName').textContent = file.name;
    document.getElementById('btnSharingUpload').disabled = false;
  },

  uploadFile: async function() {
    if (!this.selectedFileObject) return;
    const file = this.selectedFileObject;
    
    const progBox = document.getElementById('sharingProgressContainer');
    const progBar = document.getElementById('sharingProgressBar');
    const progStatus = document.getElementById('sharingProgressStatus');
    const progPct = document.getElementById('sharingProgressPct');
    const btnUp = document.getElementById('btnSharingUpload');

    btnUp.disabled = true;
    progBox.style.display = 'block';

    try {
      const ext = file.name.split('.').pop();
      const path = `school_shared_docs/${this.sekolah}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;
      
      progStatus.textContent = 'Mengunggah file ke cloud...';
      progBar.style.width = '30%';
      progPct.textContent = '30%';

      // Upload ke Supabase
      const { error } = await window._supabase.storage.from('cimega-cloud').upload(path, file);
      if (error) throw error;

      progBar.style.width = '70%';
      progPct.textContent = '70%';

      const { data: urlData } = window._supabase.storage.from('cimega-cloud').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      // Simpan ke Firestore
      progStatus.textContent = 'Menyimpan arsip...';
      const { addDoc, collection, serverTimestamp } = window._fb;
      
      await addDoc(collection(this.db, 'shared_docs'), {
         docName: file.name,
         fileUrl: publicUrl,
         sharedBy: this.currentUser.nama || this.currentUser.username,
         sekolah: this.sekolah,
         kategori: 'Berbagi Dokumen',
         sizeBytes: file.size,
         sharedAt: serverTimestamp(),
         admin_hidden: false
      });

      progBar.style.width = '100%';
      progPct.textContent = '100%';

      if (window.showToast) window.showToast('success', 'Berhasil', 'Dokumen berhasil dibagikan.');
    } catch(err) {
      console.error('Upload berbagi dokumen gagal:', err);
      if (window.showToast) window.showToast('error', 'Gagal', err.message);
    } finally {
      // Reset State
      setTimeout(() => {
         progBox.style.display = 'none';
         progBar.style.width = '0%';
         document.getElementById('sharingFileInput').value = '';
         this.selectedFileObject = null;
         document.getElementById('sharingFileName').textContent = 'Belum ada file yang dipilih...';
      }, 1500);
    }
  },

  startListener: function() {
    if (this.unsubFiles) this.unsubFiles();

    const { collection, query, where, onSnapshot } = window._fb;
    // FIK: Hapus orderBy di level query untuk menghindari error index Firestore
    // Kita akan melakukan sorting di sisi client
    const q = query(
      collection(this.db, 'shared_docs'),
      where('sekolah', '==', this.sekolah)
    );

    this.unsubFiles = onSnapshot(q, (snap) => {
      this.filesList = [];
      snap.forEach(doc => {
         const data = doc.data();
         if (!data.admin_hidden) {
           this.filesList.push({ id: doc.id, ...data });
         }
      });
      
      // SORT CLIENT-SIDE (Terbaru di atas)
      this.filesList.sort((a, b) => {
        const timeA = a.sharedAt ? a.sharedAt.toMillis() : 0;
        const timeB = b.sharedAt ? b.sharedAt.toMillis() : 0;
        return timeB - timeA;
      });

      this.renderTable();
    }, (err) => {
      console.error('Sharing docs listener error:', err);
      const container = document.getElementById('sharingTableContainer');
      if (container) container.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--danger)">Gagal memuat data: ${err.message}</div>`;
    });
  },

  getFileIcon: function(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    switch(ext) {
      case 'pdf': return { icon: '📄', color: '#ff4444', label: 'PDF' };
      case 'doc':
      case 'docx': return { icon: '📝', color: '#4488ff', label: 'WORD' };
      case 'xls':
      case 'xlsx': return { icon: '📊', color: '#00cc66', label: 'EXCEL' };
      case 'ppt':
      case 'pptx': return { icon: '📽️', color: '#ff8844', label: 'POWERPOINT' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return { icon: '🖼️', color: '#aa55ff', label: 'IMAGE' };
      case 'zip':
      case 'rar': return { icon: '📦', color: '#ffcc00', label: 'ARCHIVE' };
      default: return { icon: '📄', color: '#5a8aaa', label: 'FILE' };
    }
  },

  renderTable: function() {
    const container = document.getElementById('sharingTableContainer');
    if (!container) return;

    if (this.filesList.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px; color:var(--muted); background:rgba(255,255,255,0.02); border-radius:20px; border:1px solid rgba()">
          <div style="font-size:48px; margin-bottom:15px; opacity:0.5">📂</div>
          <div style="font-family:'Orbitron'; font-size:12px; letter-spacing:1px">BELUM ADA DOKUMEN</div>
          <p style="font-size:11px; margin-top:5px">Mulai bagikan file pertama untuk institusi Anda.</p>
        </div>`;
      return;
    }

    let html = '';

    this.filesList.forEach(f => {
      const typeInfo = this.getFileIcon(f.docName);
      let dateText = 'Baru saja';
      if (f.sharedAt) {
        dateText = new Date(f.sharedAt.toDate()).toLocaleDateString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'});
      }
      
      let sizeText = '';
      if (f.sizeBytes) {
         sizeText = f.sizeBytes > 1024 * 1024 
           ? (f.sizeBytes / (1024*1024)).toFixed(1) + ' MB'
           : (f.sizeBytes / 1024).toFixed(0) + ' KB';
      }

      const isOwner = (f.sharedBy === this.currentUser.nama || f.sharedBy === this.currentUser.username);
      const isKepsek = (this.currentUser.roles && this.currentUser.roles.includes('kepsek'));
      const canDelete = isOwner || isKepsek;

      html += `
        <div class="card" style="padding:15px; display:flex; flex-direction:column; gap:12px; position:relative; transition:all 0.3s; border-color:rgba(255,255,255,0.05); overflow:hidden" onmouseover="this.style.borderColor='var(--cyan)'; this.style.transform='translateY(-5px)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'; this.style.transform='none'">
          
          <!-- Background Accent -->
          <div style="position:absolute; top:-20px; right:-20px; font-size:60px; opacity:0.03; transform:rotate(-15deg); pointer-events:none">${typeInfo.icon}</div>

          <div style="display:flex; align-items:flex-start; gap:12px">
            <div style="width:40px; height:40px; border-radius:10px; background:${typeInfo.color}15; border:1px solid ${typeInfo.color}30; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0">
              ${typeInfo.icon}
            </div>
            <div style="flex:1; min-width:0">
              <div style="font-size:13px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis" title="${f.docName}">${f.docName}</div>
              <div style="font-size:10px; color:${typeInfo.color}; font-weight:700; font-family:'Orbitron'; margin-top:2px">${typeInfo.label} · ${sizeText}</div>
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.03); padding:8px 10px; border-radius:8px; display:flex; align-items:center; gap:8px">
            <div style="width:20px; height:20px; border-radius:50%; background:var(--cyan); display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--dark)">👤</div>
            <div style="flex:1; min-width:0">
              <div style="font-size:10px; color:#fff; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">${f.sharedBy}</div>
              <div style="font-size:9px; color:var(--muted)">${dateText}</div>
            </div>
          </div>

          <div style="display:flex; gap:8px; margin-top:5px">
             <button class="btn btn-primary btn-sm" style="flex:1; font-size:10px; padding:6px" onclick="window.open('${f.fileUrl}', '_blank')">📥 LIHAT / UNDUH</button>
             ${canDelete ? `
               <button class="btn btn-ghost btn-sm" style="color:var(--danger); background:rgba(255,68,102,0.05); padding:6px 10px" onclick="window.CimegaSharing.deleteFile('${f.id}')">🗑️</button>
             ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  deleteFile: async function(docId) {
    if (!(await window.CyberDialog.confirm('Hapus dokumen ini dari arsip institusi?'))) return;
    try {
      const { doc, deleteDoc } = window._fb;
      await deleteDoc(doc(this.db, 'shared_docs', docId));
      if (window.showToast) window.showToast('success', 'Terhapus', 'Dokumen berhasil dihapus.');
    } catch(err) {
      console.error(err);
      if (window.showToast) window.showToast('error', 'Gagal', 'Tidak dapat menghapus dokumen.');
    }
  }
};

