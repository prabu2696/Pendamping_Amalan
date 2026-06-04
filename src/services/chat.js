window.CimegaChat = {
  db: null,
  sekolah: null,
  schoolKey: null,
  currentUser: null,
  presenceInterval: null,
  unsubMessages: null,
  unsubMembers: null,
  clearedAt: 0,

  // ── 1. STATE & CONTEXT ──
  currentTab: 'school', // 'school' | 'kepsek'
  currentMode: 'group',  // 'group'  | 'private'
  targetId: null,       // User ID untuk Chat Privat
  targetName: null,     // Nama User untuk Judul Header

  init: async function (dbInstance, containerId, options = {}) {
    this.db = dbInstance || window.db || (window._fb ? window._fb.db : null);
    const rawUser = localStorage.getItem('cimega_user');
    this.currentUser = rawUser ? JSON.parse(rawUser) : (window._userData || {});
    this.sekolah = this.currentUser.sekolah || this.currentUser.school_id;

    // ★ PRIMARY CONTEXT ★
    if (options.tab) this.currentTab = options.tab;
    this.currentMode = 'group'; // Reset ke grup setiap kali berganti menu sidebar
    this.targetId = null;

    // Normalisasi Roles
    if (!this.currentUser.roles) {
      const r = this.currentUser.role || 'guru';
      this.currentUser.roles = [r.toLowerCase().trim().replace(/[\s-]/g, '_')];
    }

    const clearKey = `cimega_chat_clear_${this.currentUser.id}_${this.sekolah}`;
    this.clearedAt = parseInt(localStorage.getItem(clearKey) || '0');

    this.injectUI(containerId);

    // Initial listener setup
    if (this.db) {
      if (this.presenceInterval) clearInterval(this.presenceInterval);
      this.setPresence(true);
      this.startMembersListener();
      this.startMessagesListener();
      
      // Setup incoming call listeners (v6)
      if (this.unsubCallsSchool) this.unsubCallsSchool();
      if (this.unsubCallsDirect) this.unsubCallsDirect();
      this.stopIncomingRing();
      this.startIncomingCallListener();
      
      this.presenceInterval = setInterval(() => this.setPresence(true), 30000);
    }

    const attachPicker = () => {
      const picker = document.querySelector('emoji-picker');
      if (picker) {
        picker.addEventListener('emoji-click', event => {
          this.insertEmoji(event.detail.unicode);
        });
      }
    };

    if (customElements && customElements.whenDefined) {
      customElements.whenDefined('emoji-picker').then(attachPicker).catch(attachPicker);
    } else {
      setTimeout(attachPicker, 1000);
    }

    window.addEventListener('mousedown', this._handleOutsideClick.bind(this));
  },

  injectUI: function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const sidebarTitle = this.currentTab === 'kepsek' ? 'KOLEGA KEPALA SEKOLAH' : 'USER AKTIF';
    const sidebarIcon = this.currentTab === 'kepsek' ? '🏛️' : '🌍';

    container.innerHTML = `
      <div id="cimegaChatWrapper" style="display:flex; height:calc(100vh - 150px); background:var(--card); border:1px solid var(--border); border-radius:12px; overflow:hidden; font-family: 'Plus Jakarta Sans', sans-serif;">
        <!-- SIDEBAR -->
        <div style="width:260px; border-right:1px solid var(--border); background:rgba(0,0,0,0.25); display:flex; flex-direction:column; flex-shrink:0;">
          
          <div style="padding:15px; border-bottom:1px solid var(--border); background:rgba(0,0,0,0.3); display:flex; justify-content:space-between; align-items:center;">
             <div id="sidebarTitle" style="font-family:'Orbitron'; font-size:10px; color:var(--cyan); letter-spacing:1px; white-space:nowrap;">${sidebarIcon} ${sidebarTitle}</div>
             <div id="onlineCount" style="font-size:9px; color:#ffcc00; font-family:'Orbitron';">• 0</div>
          </div>

          <div id="chatMembersList" style="flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:5px;"></div>
        </div>

        <!-- MAIN PANEL -->
        <div style="flex:1; display:flex; flex-direction:column; min-width:0; position:relative; background:rgba(10, 20, 30, 0.98);">
          <div style="padding:12px 20px; background:rgba(4, 25, 50, 0.98); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div id="chatContextIcon" style="font-size:24px;"></div>
              <div>
                <div id="chatHeaderTitle" style="font-family:'Orbitron'; font-size:13px; color:#fff; font-weight:700; text-transform:uppercase;">...</div>
                <div id="chatHeaderSub" style="font-size:10px; color:var(--cyan); opacity:0.8;">Saluran Institusi Terenkripsi</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
               <!-- Call Buttons (Audio & Video) -->
               <button id="btnChatCall" onclick="window.CimegaChat.startCall('audio')" style="background:rgba(0,229,255,0.1); border:1px solid rgba(0,229,255,0.3); color:var(--cyan); width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer; transition: all 0.3s;" title="Panggilan Suara">📞</button>
               <button id="btnChatVideo" onclick="window.CimegaChat.startCall('video')" style="background:rgba(255,0,255,0.1); border:1px solid rgba(255,0,255,0.3); color:var(--magenta); width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; cursor:pointer; transition: all 0.3s;" title="Panggilan Video">📹</button>
               
               <button onclick="window.CimegaChat.clearChat()" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); color:var(--muted); padding:6px 12px; border-radius:6px; font-size:10px; cursor:pointer;">BERSIHKAN</button>
            </div>
          </div>
          
          <div id="chatHistory" style="flex:1; overflow-y:auto !important; padding:20px; display:flex; flex-direction:column; gap:4px; scroll-behavior:smooth;">
             <div class="spinner-sm" style="margin-top:50px"></div>
          </div>

          <div style="padding:15px; background:rgba(4, 25, 50, 0.98); border-top:1px solid var(--border); position:relative;">
            <div id="emojiPickerCont" style="position:absolute; bottom:80px; left:15px; width:350px; height:400px; display:none; z-index:100; box-shadow:0 10px 50px #000; border-radius:12px; overflow:hidden;">
               <emoji-picker class="cyber-picker" style="width:100%; height:100%;"></emoji-picker>
            </div>

            <div style="display:flex; gap:12px; align-items:center;">
              <button onclick="window.CimegaChat.toggleEmoji()" style="background:none; border:none; font-size:24px; cursor:pointer; opacity:0.8; transition:opacity 0.2s;" title="Emoji">😊</button>
              
              <button onclick="document.getElementById('hiddenChatFiles').click()" style="background:rgba(0,229,255,0.1); border:1.5px solid var(--cyan); border-radius:50%; width:34px; height:34px; display:flex; align-items:center; justify-content:center; color:var(--cyan); font-size:18px; cursor:pointer;" title="Kirim File/Gambar">+</button>
              <input type="file" id="hiddenChatFiles" multiple style="display:none" onchange="window.CimegaChat.handleFileUpload(event)" />

              <input id="commChatInput" placeholder="Ketik pesan di sini..." maxlength="1000" style="flex:1; background:rgba(255,255,255,0.03); border:1px solid rgba(0,229,255,0.2); border-radius:12px; padding:12px 18px; color:#fff; outline:none; font-size:14px;" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); window.CimegaChat.send();}" />
              
              <button onclick="window.CimegaChat.send()" style="background:linear-gradient(135deg,#aa55ff, #00e5ff); border:none; border-radius:12px; width:50px; height:46px; cursor:pointer; color:#fff; font-size:18px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 15px rgba(0,229,255,0.2);">🚀</button>
            </div>

            <div id="chatUploadProgress" style="display:none; position:absolute; bottom:70px; left:15px; right:15px; background:rgba(0,0,0,0.9); border:1px solid var(--cyan); border-radius:10px; padding:12px; backdrop-filter:blur(10px);">
               <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                 <div style="font-size:11px; color:var(--cyan); font-weight:700;" id="chatUploadStatus">Processing...</div>
                 <div style="font-size:10px; color:var(--muted);" id="chatUploadPercent">0%</div>
               </div>
               <div style="height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden;">
                 <div id="chatUploadProgressInner" style="height:100%; width:0%; background:var(--cyan); transition:width 0.3s; box-shadow:0 0 10px var(--cyan);"></div>
               </div>
            </div>
          </div>
        </div>
      </div>
      <style>
        .cyber-picker {
          --background: #041428;
          --border-color: rgba(0, 229, 255, 0.2);
          --indicator-color: #00e5ff;
          --button-hover-background: rgba(0, 229, 255, 0.1);
        }
        .chat-date-divider { clear: both; display:flex; align-items:center; justify-content:center; margin: 20px 0; width: 100%; }
        .chat-date-label { padding: 4px 15px; background:rgba(255,255,255,0.05); border-radius:10px; font-size:10px; color:#aaa; font-weight:700; border:1px solid rgba(255,255,255,0.03); }
        .chat-img-msg { transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.1); }
        .chat-img-msg:hover { transform: scale(1.02); }
        .spinner-sm { width:24px; height:24px; border:3px solid rgba(0,229,255,0.1); border-top-color:var(--cyan); border-radius:50%; animation:spinChat 0.8s linear infinite; margin:0 auto; }
        @keyframes spinChat { to { transform: rotate(360deg); } }
        
        /* Pulse Animation for Active Call button */
        @keyframes activeCallPulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.6); }
          70% { box-shadow: 0 0 0 12px rgba(0, 230, 118, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); }
        }
        .btn-call-active-glow {
          animation: activeCallPulse 1.8s infinite;
        }
      </style>
    `;
    this.updateHeader();
  },

  updateHeader: function () {
    const hIcon = document.getElementById('chatContextIcon');
    const hTitle = document.getElementById('chatHeaderTitle');
    const hSub = document.getElementById('chatHeaderSub');
    if (!hTitle) return;

    if (this.currentMode === 'private') {
      hIcon.innerText = '👤';
      hTitle.innerText = `RAHASIA: ${this.targetName || 'Personil'}`;
      hSub.innerText = 'Percakapan 1-ke-1 Terikat Institusi';
    } else if (this.currentTab === 'kepsek') {
      hIcon.innerText = '🏛️';
      hTitle.innerText = 'GRUP FORUM KEPALA SEKOLAH';
      hSub.innerText = 'Diskusi Strategis Pimpinan';
    } else {
      hIcon.innerText = '🌍';
      hTitle.innerText = 'CHAT KOMUNITAS SEKOLAH';
      hSub.innerText = 'Komunikasi Institusi Terenkripsi';
    }
  },

  switchPrivate: function (id, name) {
    if (this.currentMode === 'private' && this.targetId === id) return;

    this.currentMode = 'private';
    this.targetId = id;
    this.targetName = name;

    this.updateHeader();
    this.startMessagesListener();
    this.renderMembersList(this._lastMembers || []); // Update UI highlight
  },

  handleFileUpload: async function (e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    if (files.length > 10) {
      if (window.showToast) window.showToast('warn', 'Batas Terlampaui', 'Maksimal 10 gambar yang dapat dikirim sekaligus.');
      else await window.CyberDialog.alert('Maksimal 10 gambar yang dapat dikirim sekaligus.');
      e.target.value = '';
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    const p = document.getElementById('chatUploadProgress');
    const pi = document.getElementById('chatUploadProgressInner');
    const st = document.getElementById('chatUploadStatus');
    const pct = document.getElementById('chatUploadPercent');

    p.style.display = 'block';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        if (window.showToast) window.showToast('error', 'Format Ditolak', `File "${file.name}" ditolak. Chat sekolah hanya mendukung format JPG dan PNG.`);
        else await window.CyberDialog.alert(`File "${file.name}" ditolak. Chat hanya mendukung format JPG/PNG.`);
        continue;
      }

      if (file.size > maxSize) {
        if (window.showToast) window.showToast('warn', 'Batas Ukuran', `File "${file.name}" melebihi batas 10MB.`);
        else await window.CyberDialog.alert(`File "${file.name}" melebihi batas 10MB.`);
        continue;
      }

      st.textContent = `Mengunggah: ${file.name}`;
      try {
        const ext = file.name.split('.').pop();
        const path = `chat_media/${this.sekolah}/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

        await window._supabase.storage.from('cimega-cloud').upload(path, file);
        const { data } = window._supabase.storage.from('cimega-cloud').getPublicUrl(path);

        const metadata = {
          name: file.name,
          size: (file.size / (1024 * 1024) > 1) ? (file.size / (1024 * 1024)).toFixed(2) + ' MB' : (file.size / 1024).toFixed(1) + ' KB',
          type: file.type,
          url: data.publicUrl
        };

        await this.send(JSON.stringify(metadata), true);

        const progress = ((i + 1) / files.length) * 100;
        pi.style.width = progress + '%';
        pct.textContent = Math.round(progress) + '%';
      } catch (err) { console.error('Upload Error:', err); }
    }

    setTimeout(() => { p.style.display = 'none'; e.target.value = ''; }, 800);
  },

  startMembersListener: function () {
    if (this.unsubMembers) this.unsubMembers();
    const { collection, query, where, onSnapshot } = window._fb;

    let q;
    if (this.currentTab === 'kepsek') {
      // Kepsek bisa berkomunikasi lintas sekolah
      q = query(collection(this.db, "users"));
    } else {
      // Staf biasa terisolasi di satu sekolah
      q = query(collection(this.db, "users"), where("sekolah", "==", this.sekolah));
    }

    this.unsubMembers = onSnapshot(q, (snap) => {
      let members = [];
      snap.forEach(d => {
        const data = d.data();
        const roles = data.roles || [data.role?.toLowerCase() || 'guru'];

        if (this.currentTab === 'kepsek') {
          // Hanya kepsek lain
          if (roles.includes('kepsek') && d.id !== this.currentUser.id) {
            members.push({ id: d.id, ...data });
          }
        } else {
          // Semua staf sekolah kecuali diri sendiri
          if (d.id !== this.currentUser.id) {
            members.push({ id: d.id, ...data });
          }
        }
      });
      this._lastMembers = members;
      this.renderMembersList(members);
    });
  },

  startMessagesListener: function () {
    if (this.unsubMessages) this.unsubMessages();
    const { collection, query, where, onSnapshot } = window._fb;

    let q;
    if (this.currentMode === 'private') {
      const sortedIds = [this.currentUser.id, this.targetId].sort();
      if (this.currentTab === 'kepsek') {
        // Chat pribadi Kepsek lintas sekolah
        const privateID = `kepsek_${sortedIds.join('_')}`;
        q = query(collection(this.db, "chats"),
          where("private_id", "==", privateID)
        );
      } else {
        // Chat pribadi staf biasa diisolasi per sekolah
        const privateID = `${this.sekolah}_${sortedIds.join('_')}`;
        q = query(collection(this.db, "chats"),
          where("sekolah", "==", this.sekolah),
          where("private_id", "==", privateID)
        );
      }
    } else {
      const scope = this.currentTab === 'kepsek' ? 'kepsek' : 'school';
      q = query(collection(this.db, "chats"),
        where("sekolah", "==", this.sekolah),
        where("scope", "==", scope)
      );
    }

    this.unsubMessages = onSnapshot(q, async (snap) => {
      const msgs = [];
      for (const d of snap.docs) {
        const data = d.data();
        try {
          const decrypted = await this.decryptSafe(data.payload);
          msgs.push({
            id: d.id,
            sender: data.sender_name,
            senderId: data.sender_id,
            text: decrypted,
            time: data.client_ts ? new Date(data.client_ts) : new Date(),
            deleted: data.deleted || false
          });
        } catch (e) { msgs.push({ id: d.id, sender: data.sender_name, text: "[Terenkripsi]", time: new Date() }); }
      }
      msgs.sort((a, b) => a.time - b.time);
      this.renderMessages(msgs);
    });
  },

  renderMembersList: function (members) {
    const cont = document.getElementById('chatMembersList');
    const headerOC = document.getElementById('onlineCount');
    if (!cont) return; cont.innerHTML = '';

    // ★ GROUP BUTTON DI SIDEBAR CHAT ★
    const groupBtn = document.createElement('div');
    groupBtn.onclick = () => {
      this.currentMode = 'group';
      this.targetId = null;
      this.updateHeader();
      this.startMessagesListener();
      this.renderMembersList(members);
    };
    groupBtn.style.cssText = `display:flex; align-items:center; gap:10px; padding:12px; border-radius:10px; background:${this.currentMode === 'group' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.03)'}; cursor:pointer; margin-bottom:12px; border:1px solid ${this.currentMode === 'group' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)'}; transition:all 0.2s;`;
    
    if (this.currentTab === 'kepsek') {
      groupBtn.innerHTML = `<div style="font-size:20px;">🏛️</div><div><div style="font-size:12px; color:#fff; font-weight:700;">Grup Forum Kepsek</div><div style="font-size:9px; color:var(--muted);">Diskusi Pimpinan</div></div>`;
    } else {
      groupBtn.innerHTML = `<div style="font-size:20px;">🌍</div><div><div style="font-size:12px; color:#fff; font-weight:700;">Grup Komunitas</div><div style="font-size:9px; color:var(--muted);">Saluran Publik Sekolah</div></div>`;
    }
    cont.appendChild(groupBtn);

    const now = Date.now();
    let onlineCount = 0;

    members.sort((a, b) => (b.is_online ? 1 : 0) - (a.is_online ? 1 : 0)).forEach(m => {
      const isOnline = m.is_online && (now / 1000 - (m.last_seen?.seconds || 0) < 180);
      if (isOnline) onlineCount++;

      const isActive = this.currentMode === 'private' && this.targetId === m.id;
      const div = document.createElement('div');
      div.onclick = () => {
        this.switchPrivate(m.id, m.nama);
      };
      div.style.cssText = `display:flex; align-items:center; gap:10px; padding:10px; border-radius:10px; background:${isActive ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.02)'}; cursor:pointer; border:1px solid ${isActive ? 'var(--cyan)' : 'rgba(255,255,255,0.03)'}; transition:all 0.2s; margin-bottom:4px;`;

      const avatar = m.avatarUrl ? `<img src="${m.avatarUrl}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">` : `<div style="width:32px; height:32px; border-radius:50%; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:14px;">👤</div>`;

      div.innerHTML = `
         <div style="position:relative;">
           ${avatar}
           <div style="width:9px; height:9px; border-radius:50%; background:${isOnline ? '#ffcc00' : '#555'}; position:absolute; bottom:-1px; right:-1px; border:2px solid #112233;"></div>
         </div>
         <div style="flex:1; min-width:0;">
           <div style="font-size:12px; color:#fff; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${m.nama}</div>
           <div style="font-size:9px; color:var(--muted);">${m.role || 'Staf'}</div>
         </div>
       `;
      cont.appendChild(div);
    });
    if (headerOC) headerOC.innerText = `• ${onlineCount}`;
  },

  renderMessages: function (messages) {
    const history = document.getElementById('chatHistory');
    if (!history) return;

    const valid = messages.filter(m => m.time.getTime() > this.clearedAt && !m.deleted);
    const wasBottom = history.scrollHeight - history.scrollTop <= history.clientHeight + 200;

    history.innerHTML = '';
    let lastDate = '';

    valid.forEach(m => {
      if (m.time.toDateString() !== lastDate) {
        history.appendChild(this.createDateDivider(m.time));
        lastDate = m.time.toDateString();
      }

      const isMe = String(m.senderId) === String(this.currentUser.id);
      let content = '';

      if (m.text.startsWith('{"name":')) {
        try {
          const file = JSON.parse(m.text);
          const isImg = file.type?.startsWith('image/');
          if (isImg) {
            content = `<img src="${file.url}" class="chat-img-msg" style="max-width:280px; border-radius:12px; cursor:pointer;" onclick="window.cimegaAPI.openExternal('${file.url}')">`;
          } else {
            const ext = file.name.split('.').pop().toUpperCase();
            let icon = '📒';
            if (ext === 'PDF') icon = '📕';
            else if (['DOC', 'DOCX'].includes(ext)) icon = '📘';
            else if (['XLS', 'XLSX'].includes(ext)) icon = '📗';

            content = `
              <div onclick="window.cimegaAPI.openExternal('${file.url}')" style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:12px; display:flex; align-items:center; gap:12px; cursor:pointer; width:220px;">
                <div style="font-size:26px;">${icon}</div>
                <div style="flex:1; min-width:0;">
                  <div style="font-size:11px; font-weight:700; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${file.name}</div>
                  <div style="font-size:9px; color:var(--cyan);">${file.size} · ${ext}</div>
                </div>
                <div style="font-size:14px; color:var(--muted); margin-left:5px;">📥</div>
              </div>
            `;
          }
        } catch (e) { content = m.text; }
      } else {
        content = `<div style="font-size:13px; color:#fff; line-height:1.6; white-space:pre-wrap; word-break:break-word;">${this.escapeHtml(m.text)}</div>`;
      }

      const wrap = document.createElement('div');
      wrap.style.cssText = `clear:both; margin-bottom:14px; display:flex; flex-direction:column; align-items:${isMe ? 'flex-end' : 'flex-start'};`;

      const bubble = document.createElement('div');
      bubble.style.cssText = `max-width:85%; background:${isMe ? 'linear-gradient(135deg, rgba(80,0,200,0.4), rgba(0,50,150,0.3))' : 'rgba(255,255,255,0.04)'}; padding:10px 14px; border-radius:${isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px'}; border:1px solid ${isMe ? 'rgba(0,229,255,0.2)' : 'rgba(255,255,255,0.05)'}; position:relative; box-shadow:0 6px 15px rgba(0,0,0,0.2);`;

      const header = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; gap:20px;">
        <div style="font-size:9px; color:var(--cyan); font-weight:800; opacity:0.8; font-family:'Orbitron'; text-transform:uppercase;">${isMe ? 'ANDA' : m.sender}</div>
        ${isMe ? `<button onclick="window.CimegaChat.deleteMessage('${m.id}')" style="background:none; border:none; color:var(--danger); font-size:10px; cursor:pointer; opacity:0.4; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.4">✕</button>` : ''}
      </div>`;

      bubble.innerHTML = `${header}${content}<div style="font-size:8px; opacity:0.3; text-align:right; margin-top:6px; color:#fff;">${m.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>`;

      if (typeof twemoji !== 'undefined' && !m.text.includes('{"name":')) twemoji.parse(bubble);

      wrap.appendChild(bubble);
      history.appendChild(wrap);
    });

    if (wasBottom) history.scrollTop = history.scrollHeight;
  },

  createDateDivider: function (date) {
    const d = document.createElement('div'); d.className = 'chat-date-divider';
    d.innerHTML = `<div class="chat-date-label">${date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>`; return d;
  },

  send: async function (customText = null, isRaw = false) {
    const input = document.getElementById('commChatInput');
    const text = customText || input?.value.trim();
    if (!text) return;
    if (!customText && input) input.value = '';

    const { collection, addDoc, serverTimestamp } = window._fb;
    const payload = await this.encryptSafe(text);

    const docData = {
      sekolah: this.sekolah,
      sender_id: this.currentUser.id,
      sender_name: this.currentUser.nama,
      payload: payload,
      client_ts: Date.now(),
      timestamp: serverTimestamp(),
      deleted: false
    };

    if (this.currentMode === 'private') {
      const sortedIds = [this.currentUser.id, this.targetId].sort();
      if (this.currentTab === 'kepsek') {
        docData.private_id = `kepsek_${sortedIds.join('_')}`;
        docData.scope = 'private_kepsek';
      } else {
        docData.private_id = `${this.sekolah}_${sortedIds.join('_')}`;
        docData.scope = 'private';
      }
    } else {
      docData.scope = this.currentTab === 'kepsek' ? 'kepsek' : 'school';
    }

    await addDoc(collection(this.db, "chats"), docData);
  },

  clearChat: async function () {
    if (!(await window.CyberDialog.confirm('Bersihkan riwayat chat di perangkat ini?'))) return;
    this.clearedAt = Date.now();
    const key = `cimega_chat_clear_${this.currentUser.id}_${this.sekolah}`;
    localStorage.setItem(key, this.clearedAt);
    this.renderMessages([]);
  },

  setPresence: async function (on) {
    if (this.db && this.currentUser.id) {
      await window._fb.updateDoc(window._fb.doc(this.db, "users", this.currentUser.id), {
        is_online: on,
        last_seen: window._fb.serverTimestamp()
      });
    }
  },

  deleteMessage: async function (id) {
    if (!(await window.CyberDialog.confirm('Hapus pesan ini selamanya?'))) return;
    try {
      await window._fb.updateDoc(window._fb.doc(this.db, "chats", id), { deleted: true });
    } catch (e) { await window.CyberDialog.alert('Gagal menghapus pesan.'); }
  },

  // ── CALLING INTEGRATION (v6) ──
  unsubCallsSchool: null,
  unsubCallsDirect: null,
  ringCtx: null,
  ringInterval: null,

  playIncomingRing: function() {
    if (this.ringCtx) return;
    this.ringCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ringCtx.state === 'suspended') {
      this.ringCtx.resume();
    }
    const playSeq = () => {
      if (!this.ringCtx) return;
      const notes = [329.63, 392.00, 523.25, 659.25]; // E5, G5, C6, E6
      let startTime = this.ringCtx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ringCtx.createOscillator();
        const gainNode = this.ringCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + (idx * 0.15));
        gainNode.gain.setValueAtTime(0.0, startTime + (idx * 0.15));
        gainNode.gain.linearRampToValueAtTime(0.1, startTime + (idx * 0.15) + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + (idx * 0.15) + 0.2);
        osc.connect(gainNode);
        gainNode.connect(this.ringCtx.destination);
        osc.start(startTime + (idx * 0.15));
        osc.stop(startTime + (idx * 0.15) + 0.25);
      });
    };
    playSeq();
    this.ringInterval = setInterval(playSeq, 1500);
  },

  stopIncomingRing: function() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    if (this.ringCtx) {
      try { this.ringCtx.close(); } catch(_) {}
      this.ringCtx = null;
    }
  },

  startIncomingCallListener: function() {
    if (this.unsubCallsSchool) this.unsubCallsSchool();
    if (this.unsubCallsDirect) this.unsubCallsDirect();
    
    const { collection, query, where, onSnapshot } = window._fb;
    
    const handleChanges = (snap) => {
      let activeGroupCall = null;
      let incomingRingingCall = null;

      snap.forEach(docSnap => {
        const data = docSnap.data();
        const callId = docSnap.id;
        const isFromMe = String(data.callerId) === String(this.currentUser.id);
        const myParticipantObj = data.participants?.find(p => String(p.id) === String(this.currentUser.id));

        if (data.status === 'ringing') {
          if (!isFromMe) {
            let isTarget = false;
            if (data.scope === 'private') {
              isTarget = String(data.targetId) === String(this.currentUser.id);
            } else if (data.scope === 'kepsek') {
              isTarget = this.currentUser.roles.includes('kepsek');
            } else {
              isTarget = true; // School-wide group call
            }

            const declinedCalls = JSON.parse(localStorage.getItem('cimega_declined_calls') || '[]');
            if (isTarget && !declinedCalls.includes(callId)) {
              incomingRingingCall = { id: callId, data };
            }
          }
        } else if (data.status === 'active') {
          let isRelevantGroup = false;
          if (data.scope === 'kepsek' && this.currentTab === 'kepsek' && this.currentMode === 'group') {
            isRelevantGroup = true;
          } else if ((data.scope === 'school' || data.scope === 'group') && this.currentTab === 'school' && this.currentMode === 'group') {
            isRelevantGroup = true;
          }

          if (isRelevantGroup && !myParticipantObj) {
            activeGroupCall = { id: callId, data };
          }
        }
      });

      // Handle Ringing UI Overlay
      if (incomingRingingCall) {
        // Hanya pemicu jika kita tidak dalam panggilan aktif
        if (localStorage.getItem('cimega_in_call') !== 'true') {
          this.showIncomingCallOverlay(incomingRingingCall.id, incomingRingingCall.data);
        }
      } else {
        this.hideIncomingCallOverlay();
      }

      // Handle Active Group Call Join Indicator
      this.updateActiveCallIndicator(activeGroupCall);
    };

    // Listener 1: Panggilan di sekolah saat ini
    this.unsubCallsSchool = onSnapshot(
      query(collection(this.db, "call_sessions"), where("sekolah", "==", this.sekolah)),
      handleChanges
    );

    // Listener 2: Panggilan direct target ke user saat ini (lintas sekolah)
    this.unsubCallsDirect = onSnapshot(
      query(collection(this.db, "call_sessions"), where("targetId", "==", this.currentUser.id)),
      handleChanges
    );
  },

  updateActiveCallIndicator: function(activeGroupCall) {
    const btnCall = document.getElementById('btnChatCall');
    const btnVideo = document.getElementById('btnChatVideo');
    if (!btnCall || !btnVideo) return;

    if (activeGroupCall) {
      // Glow hijau pulsing jika ada panggilan grup aktif untuk digabung
      btnCall.style.background = 'rgba(0, 230, 118, 0.25)';
      btnCall.style.border = '1px solid #00e676';
      btnCall.style.boxShadow = '0 0 10px rgba(0, 230, 118, 0.5)';
      btnCall.classList.add('btn-call-active-glow');
      btnCall.title = 'Gabung Panggilan Suara Aktif';
      
      btnVideo.style.background = 'rgba(0, 230, 118, 0.25)';
      btnVideo.style.border = '1px solid #00e676';
      btnVideo.style.boxShadow = '0 0 10px rgba(0, 230, 118, 0.5)';
      btnVideo.classList.add('btn-call-active-glow');
      btnVideo.title = 'Gabung Panggilan Video Aktif';
    } else {
      // Kembalikan ke warna cyan / magenta semula
      btnCall.style.background = 'rgba(0,229,255,0.1)';
      btnCall.style.border = '1px solid rgba(0,229,255,0.3)';
      btnCall.style.boxShadow = 'none';
      btnCall.classList.remove('btn-call-active-glow');
      btnCall.title = 'Panggilan Suara';

      btnVideo.style.background = 'rgba(255,0,255,0.1)';
      btnVideo.style.border = '1px solid rgba(255,0,255,0.3)';
      btnVideo.style.boxShadow = 'none';
      btnVideo.classList.remove('btn-call-active-glow');
      btnVideo.title = 'Panggilan Video';
    }
  },

  showIncomingCallOverlay: function(callId, data) {
    const existing = document.getElementById('cimegaIncomingCallOverlay');
    if (existing) return;

    this.playIncomingRing();

    const overlay = document.createElement('div');
    overlay.id = 'cimegaIncomingCallOverlay';
    overlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(4, 13, 26, 0.9); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; backdrop-filter:blur(15px); font-family:"Plus Jakarta Sans", sans-serif;';
    
    const callText = data.type === 'video' ? 'Panggilan Video Masuk' : 'Panggilan Suara Masuk';
    const sourceName = data.scope === 'group' || data.scope === 'school' || data.scope === 'kepsek' ? `Grup: ${data.callerName}` : data.callerName;

    overlay.innerHTML = `
      <div style="text-align:center; animation: fadein 0.3s ease;">
        <div style="width:110px; height:110px; border-radius:50%; background:rgba(0,229,255,0.05); border:2.5px solid var(--cyan); box-shadow:0 0 25px rgba(0,229,255,0.25); display:flex; align-items:center; justify-content:center; font-size:42px; margin:0 auto 20px;">👤</div>
        <h2 style="font-family:\'Orbitron\'; font-size:14px; letter-spacing:3px; color:var(--cyan); margin-bottom:12px; text-transform:uppercase;">${callText}</h2>
        <h1 style="font-size:24px; font-weight:800; color:#fff; margin-bottom:30px; text-shadow:0 0 10px rgba(255,255,255,0.2);">${sourceName}</h1>
        
        <div style="display:flex; gap:35px; justify-content:center;">
          <button id="btnDeclineCall" style="width:58px; height:58px; border-radius:50%; border:none; background:#ff3366; color:#fff; font-size:22px; cursor:pointer; box-shadow:0 0 15px rgba(255,51,102,0.4); display:flex; align-items:center; justify-content:center; transition:transform 0.15s;" onmousedown="this.style.transform=\'scale(0.9)\'" onmouseup="this.style.transform=\'scale(1)\'">✕</button>
          <button id="btnAcceptCall" style="width:58px; height:58px; border-radius:50%; border:none; background:#00e676; color:#fff; font-size:22px; cursor:pointer; box-shadow:0 0 15px rgba(0,230,118,0.4); display:flex; align-items:center; justify-content:center; transition:transform 0.15s;" onmousedown="this.style.transform=\'scale(0.9)\'" onmouseup="this.style.transform=\'scale(1)\'">📞</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btnDeclineCall').onclick = async () => {
      this.stopIncomingRing();
      
      const declinedCalls = JSON.parse(localStorage.getItem('cimega_declined_calls') || '[]');
      declinedCalls.push(callId);
      localStorage.setItem('cimega_declined_calls', JSON.stringify(declinedCalls));

      if (data.scope === 'private') {
        try {
          await window._fb.updateDoc(window._fb.doc(this.db, "call_sessions", callId), { status: 'ended' });
        } catch(e) {}
      }
      this.hideIncomingCallOverlay();
    };

    document.getElementById('btnAcceptCall').onclick = () => {
      this.stopIncomingRing();
      this.hideIncomingCallOverlay();

      const api = window.cimegaConfig || window.cimegaAPI;
      if (api && api.openCallWindow) {
        api.openCallWindow({
          sessionId: callId,
          type: data.type,
          scope: data.scope,
          targetId: data.callerId,
          targetName: data.callerName,
          callerId: data.callerId,
          callerName: data.callerName,
          sekolah: this.sekolah
        });
      }
    };
  },

  hideIncomingCallOverlay: function() {
    this.stopIncomingRing();
    const overlay = document.getElementById('cimegaIncomingCallOverlay');
    if (overlay) overlay.remove();
  },

  startCall: async function(callType) {
    if (localStorage.getItem('cimega_in_call') === 'true') {
      if (window.showToast) window.showToast('warn', 'Panggilan Aktif', 'Anda sedang berada dalam panggilan lain.');
      return;
    }

    const rnd = Math.random().toString(36).substring(2, 10);
    const sessId = `${this.sekolah}_call_${Date.now()}_${rnd}`;
    
    let callScope = 'group';
    let tId = null;
    let tName = null;

    if (this.currentMode === 'private') {
      callScope = 'private';
      tId = this.targetId;
      tName = this.targetName;
    } else {
      callScope = this.currentTab === 'kepsek' ? 'kepsek' : 'school';
      tName = this.currentTab === 'kepsek' ? 'Grup Forum Kepsek' : 'Grup Komunitas';
    }

    // Cek apakah ada panggilan grup/channel aktif, jika ya, langsung GABUNG saja
    const { collection, getDocs, query, where } = window._fb;
    let activeSessId = null;
    let activeType = callType;
    if (callScope !== 'private') {
      try {
        const qActive = query(collection(this.db, "call_sessions"),
          where("sekolah", "==", this.sekolah),
          where("scope", "==", callScope)
        );
        const snap = await getDocs(qActive);
        snap.forEach(docSnap => {
          const d = docSnap.data();
          if (d.status === 'ringing' || d.status === 'active') {
            activeSessId = docSnap.id;
            activeType = d.type;
          }
        });
      } catch(e) { console.error(e); }
    }

    const finalSessId = activeSessId || sessId;

    const api = window.cimegaConfig || window.cimegaAPI;
    if (api && api.openCallWindow) {
      await api.openCallWindow({
        sessionId: finalSessId,
        type: activeType,
        scope: callScope,
        targetId: tId || '',
        targetName: tName,
        callerId: activeSessId ? callerId : this.currentUser.id, // Jika gabung, caller tetap si pembuat
        callerName: activeSessId ? callerName : this.currentUser.nama,
        sekolah: this.sekolah
      });
    }
  },

  decryptSafe: async function (p) { try { return p ? await window.CimegaCrypto.decrypt(p, this.schoolKey) : ''; } catch (e) { return p; } },
  encryptSafe: async function (t) { try { return t ? await window.CimegaCrypto.encrypt(t, this.schoolKey) : t; } catch (e) { return t; } },
  escapeHtml: function (t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; },
  toggleEmoji: function () { const el = document.getElementById('emojiPickerCont'); if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block'; },
  _handleOutsideClick: function (e) { const ep = document.getElementById('emojiPickerCont'); if (ep && ep.style.display === 'block' && !ep.contains(e.target) && !e.target.closest('button')) ep.style.display = 'none'; }
};
