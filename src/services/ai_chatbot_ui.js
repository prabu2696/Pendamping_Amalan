// ai_chatbot_ui.js - UI Rendering & DOM Management
// Bergantung pada: ai_chatbot_core.js (window.CimegaAIChatbotCore)

window.CimegaAIChatbotUI = {

  // ── HELPER: Akses elemen dengan fallback embedded ─────────────────

  getEl: function (id) {
    const embedded = document.getElementById('aiChatbotEmbedded');
    if (embedded) {
      const el = embedded.querySelector('#' + id);
      if (el) return el;
    }
    return document.getElementById(id);
  },

  // ── INIT & RENDER ─────────────────────────────────────────────────

  init: function (containerId) {
    if (containerId) {
      this.renderTo(containerId);
      return;
    }
    const existing = document.getElementById('aiChatbotContainer');
    if (existing) existing.remove();

    const chatbotHTML = `
      <div id="aiChatbotContainer" style="position:fixed;bottom:20px;left:20px;z-index:9998;font-family: 'Plus Jakarta Sans', sans-serif;">
        <div onclick="window.CimegaAIChatbot.toggle()" style="width:52px;height:52px;background:linear-gradient(135deg,#aa55ff,#6600ff);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 24px rgba(170,85,255,0.4);position:relative;transition:all 0.2s;">
          <span style="font-size:22px;">🤖</span>
          <div style="position:absolute;top:-4px;right:-4px;background:var(--cyan);color:#000;font-size:8px;font-weight:900;padding:2px 4px;border-radius:8px;font-family:'Orbitron';">AI</div>
        </div>
        <div id="aiChatWindow" style="display:none;width:360px;height:520px;background:rgba(4,20,45,0.98);border:1px solid rgba(170,85,255,0.4);border-radius:20px;position:absolute;bottom:62px;left:0;flex-direction:column;overflow:hidden;backdrop-filter:blur(25px);box-shadow:0 15px 50px rgba(0,0,0,0.8);">
          <div style="padding:14px 18px;background:rgba(170,85,255,0.15);border-bottom:1px solid rgba(170,85,255,0.2);display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:8px;height:8px;border-radius:50%;background:var(--success);box-shadow:0 0 8px var(--success);"></div>
              <div style="font-family:'Orbitron';font-size:11px;color:#fff;font-weight:700;">CO-PILOT AI</div>
            </div>
            <button onclick="window.CimegaAIChatbot.toggle()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1;">✕</button>
          </div>
          <div id="aiChatHistory" style="flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;scroll-behavior:smooth;"></div>
          <div id="aiTyping" style="display:none;padding:8px 14px;font-size:11px;color:var(--cyan);font-style:italic;">AI sedang berpikir...</div>
          <div id="aiAttachmentBar" style="display:none;padding:8px 14px;background:rgba(0,229,255,0.1);border-top:1px solid rgba(0,229,255,0.2);font-size:10px;color:var(--cyan);display:flex;align-items:center;justify-content:space-between;">
            <div id="aiFileName" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px;"></div>
            <span onclick="window.CimegaAIChatbot.clearAttachment()" style="cursor:pointer;font-weight:bold;margin-left:10px;">✕</span>
          </div>
          <div style="padding:12px;border-top:1px solid rgba(170,85,255,0.2);display:flex;gap:8px;background:rgba(0,0,0,0.2);">
            <input type="file" id="aiFileInput" style="display:none;" onchange="window.CimegaAIChatbot.handleFileChange(event)" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"/>
            <button onclick="window.CimegaAIChatbot.triggerUpload()" style="background:rgba(255,255,255,0.05);border:1px solid rgba(170,85,255,0.3);border-radius:10px;width:40px;cursor:pointer;color:#fff;font-size:16px;" title="Unggah Dokumen">📎</button>
            <input id="aiChatInput" placeholder="Ketik instruksi administrasi Anda..." style="flex:1;background:rgba(170,85,255,0.05);border:1px solid rgba(170,85,255,0.2);border-radius:10px;padding:10px;color:#fff;outline:none;font-size:12px;" onkeydown="if(event.key==='Enter') window.CimegaAIChatbot.ask()"/>
            <button id="aiSendBtn" onclick="window.CimegaAIChatbot.ask()" style="background:linear-gradient(135deg,#aa55ff,#6600ff);border:none;border-radius:10px;width:40px;cursor:pointer;color:#fff;font-size:14px;">✨</button>
          </div>
        </div>
      </div>`;

    const div = document.createElement('div');
    div.innerHTML = chatbotHTML;
    document.body.appendChild(div);
    this.renderMainMenuInto('aiChatHistory');

    // Aktifkan Pengamat Kecerdasan (Phase 4)
    window.CimegaAIChatbotCore.startIntelligenceObserver();
  },

  renderTo: function (containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div id="aiChatbotEmbedded" style="display:flex;flex-direction:column;height:calc(100vh - 150px);background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
        <div style="padding:16px 20px;background:rgba(170,85,255,0.1);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:9px;height:9px;border-radius:50%;background:var(--success);box-shadow:0 0 10px var(--success);"></div>
            <div style="font-family:'Orbitron';font-size:12px;color:#fff;font-weight:700;letter-spacing:1px;">CIMEGA CO-PILOT AI 🤖</div>
          </div>
          <div style="font-size:10px;color:var(--muted);font-family:'Orbitron';">GEMINI 2.5 FLASH</div>
        </div>
        <div id="aiChatHistory" style="flex:1;overflow-y:auto;padding:20px;display:flex;flex-direction:column;gap:14px;scroll-behavior:smooth;"></div>
        <div id="aiTyping" style="display:none;padding:10px 20px;font-size:11px;color:var(--cyan);font-style:italic;">AI sedang memproses...</div>
        <div id="aiAttachmentBar" style="display:none;padding:10px 20px;background:rgba(0,229,255,0.05);border-top:1px solid var(--border);font-size:11px;color:var(--cyan);display:flex;align-items:center;justify-content:space-between;">
          <div id="aiFileName" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;"></div>
          <span onclick="window.CimegaAIChatbot.clearAttachment()" style="cursor:pointer;font-weight:bold;padding:4px;">✕</span>
        </div>
        <div style="padding:16px 20px;border-top:1px solid var(--border);display:flex;gap:10px;background:rgba(0,0,0,0.08);">
          <input type="file" id="aiFileInput" style="display:none;" onchange="window.CimegaAIChatbot.handleFileChange(event)" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"/>
          <button onclick="window.CimegaAIChatbot.triggerUpload()" style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;width:50px;cursor:pointer;color:#fff;font-size:18px;transition:all 0.2s;" title="Unggah Dokumen">📎</button>
          <input id="aiChatInput" placeholder="Ketik instruksi atau perintah administrasi..." style="flex:1;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:12px;padding:12px 16px;color:#fff;outline:none;font-size:13px;font-family: 'Plus Jakarta Sans', sans-serif;" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); window.CimegaAIChatbot.ask();}"/>
          <button id="aiSendBtn" onclick="window.CimegaAIChatbot.ask()" style="background:linear-gradient(135deg,#aa55ff,#6600ff);border:none;border-radius:12px;width:50px;cursor:pointer;color:#fff;font-size:16px;transition:transform 0.15s;" onmousedown="this.style.transform='scale(0.92)'" onmouseup="this.style.transform='scale(1)'">✨</button>
        </div>
      </div>`;

    this.renderMainMenuInto('aiChatHistory');
  },

  renderMainMenuInto: function (historyId) {
    const history = document.getElementById(historyId);
    if (!history) return;
    history.innerHTML = '';

    const userData = window.CimegaAIChatbotCore.getUserData();
    const roles = window.CimegaAIChatbotCore.getUserRoles();

    // ★ USER IDENTITY & ASSIGNMENTS ★
    let assignedInfo = "";
    if (userData.teaching_assignments) {
      const { classes, phases } = userData.teaching_assignments;
      let parts = [];
      if (phases?.length) parts.push(`Fase: ${phases.join(', ')}`);
      if (classes?.length) parts.push(`Unit: ${classes.join(', ')}`);
      assignedInfo = parts.join(' · ');
    } else if (userData.wali_kelas) {
      assignedInfo = `Wali Kelas: ${userData.wali_kelas}`;
    } else {
      assignedInfo = "Administrasi Staf & Manajemen";
    }

    // ★ GREETING LOGIC ★
    const now = new Date();
    const hour = now.getHours();
    let waktu = "Halo";
    if (hour >= 5 && hour < 11) waktu = "Selamat Pagi";
    else if (hour >= 11 && hour < 15) waktu = "Selamat Siang";
    else if (hour >= 15 && hour < 18) waktu = "Selamat Sore";
    else waktu = "Selamat Malam";

    // Hitung Tahun Ajaran Dinamis
    const currentYear = now.getFullYear();
    const academicYear = (now.getMonth() >= 6) ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const menuWrapper = document.createElement('div');
    menuWrapper.id = 'aiMainMenu';
    menuWrapper.style.cssText = 'animation: fadein 0.5s ease; width: 100%;';

    // ★ IDENTITY CARD UI ★
    menuWrapper.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(170,85,255,0.2),rgba(102,0,255,0.1));border:1px solid rgba(170,85,255,0.3);border-radius:18px;padding:20px;margin-bottom:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2);position:relative;overflow:hidden;">
        <div style="position:absolute;top:-10px;right:-10px;font-size:80px;opacity:0.05;transform:rotate(15deg);">🤖</div>
        <div style="font-size:16px;color:#fff;font-weight:800;margin-bottom:4px;font-family:'Orbitron';">${waktu}, Bapak/Ibu ${userData.nama || 'Rekan'}!</div>
        <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:12px;">${dateStr} · Tahun Ajaran ${academicYear}</div>
        <div style="font-size:11px;color:var(--cyan);font-weight:600;margin-bottom:12px;letter-spacing:0.5px;font-family:'Orbitron';">${userData.sekolah || 'Cimega Smart Office'}</div>
        
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
          ${roles.map(r => `<span style="background:rgba(0,229,255,0.15);color:var(--cyan);padding:3px 8px;border-radius:6px;font-size:9px;font-weight:800;border:1px solid rgba(0,229,255,0.2);">${r.replace('_', ' ').toUpperCase()}</span>`).join('')}
        </div>
        
        <div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:10px;border:1px solid rgba(255,255,255,0.05);">
          <div style="font-size:10px; color:var(--muted); margin-bottom:10px;">PROFIL JABATAN & PENUGASAN</div>
          <div style="font-size:10px;color:#ddeeff;font-weight:600;display:flex;align-items:center;gap:4px;">
            <span>📍</span> ${assignedInfo}
          </div>
        </div>

        <div style="font-size:11px;color:rgba(255,255,255,0.9);line-height:1.6;margin-top:15px;border-top:1px solid rgba(255,255,255,0.1);padding-top:12px;font-style:italic;">
          "Selamat datang di Cimega AI. Saya adalah pendamping profesional Anda yang siap membantu tata kelola sekolah dengan sisi kemanusiaan. Apa yang bisa kita diskusikan hari ini?"
        </div>
      </div>
    `;
    history.appendChild(menuWrapper);
  },

  // ── CHAT INTERACTION ──────────────────────────────────────────────

  quickAsk: function (promptText) {
    const m = document.getElementById('aiMainMenu');
    if (m) m.remove();

    const input = document.getElementById('aiChatInput');
    if (input) {
      input.value = promptText;
      this.ask();
    }
  },

  toggle: function () {
    const win = document.getElementById('aiChatWindow');
    if (!win) return;
    const isOpen = win.style.display !== 'flex';
    win.style.display = isOpen ? 'flex' : 'none';
    if (isOpen) {
      const inp = document.getElementById('aiChatInput');
      if (inp) inp.focus();
    }
  },

  ask: async function () {
    const core = window.CimegaAIChatbotCore;
    const input = this.getEl('aiChatInput');
    const sendBtn = this.getEl('aiSendBtn');
    const typing = this.getEl('aiTyping');

    if (!input || (!input.value.trim() && !core.currentAttachment)) return;
    const text = input.value.trim();
    const attachments = core.currentAttachment ? [core.currentAttachment] : null;

    const mainMenu = document.getElementById('aiMainMenu');
    if (mainMenu) mainMenu.remove();

    // Sandboxing client-side pre-filter to block unrelated requests & jailbreaks
    if (core.isForbiddenQuery(text)) {
      this.renderMessage(text, 'user');
      input.value = '';
      this.clearAttachment();

      const friendlyWarning = "Mohon maaf Bapak/Ibu, wewenang saya sebagai Co-Pilot AI Cimega dibatasi hanya untuk pembuatan dokumen administrasi sekolah saja. Saya tidak dapat melayani permintaan di luar lingkup tersebut.";
      if (typing) typing.style.display = 'none';
      setTimeout(() => {
        this.renderMessage(friendlyWarning, 'ai', null, null, true);
        if (window.CimegaVoice) window.CimegaVoice.speak(friendlyWarning);
      }, 300);
      return;
    }

    this.renderMessage(text, 'user');

    // Simpan ke memori lokal (core history)
    core.history.push({
      role: 'user',
      content: text || (attachments ? "[Menganalisis Dokumen]" : ""),
      attachments: attachments
    });

    this.clearAttachment(); // Bersihkan UI lampiran setelah dikirim

    input.value = '';
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;
    if (typing) typing.style.display = 'block';

    try {
      const result = await core.callAI(text, attachments);

      if (result.error) throw new Error(result.error);

      this.renderMessage(result.text, 'ai', result.actionTag, result.actionData);
    } catch (e) {
      let errorMsg = e.message || 'Terjadi gangguan koneksi.';
      let friendlyMsg = '⚠️ Terjadi kesalahan: ' + errorMsg;
      let shouldSpeakAuto = false;

      // DETEKSI ERROR KUOTA / LIMIT (Agar lebih ramah)
      if (errorMsg.includes('Batas pemakaian') || errorMsg.includes('Quota') || errorMsg.includes('limit')) {
        friendlyMsg = 'Mohon maaf Bapak Imam, sepertinya kuota harian AI saya sudah mencapai batas. Bapak bisa mencoba kembali dalam beberapa menit ya. Terima kasih atas kesabarannya.';
        shouldSpeakAuto = true;
      }

      this.renderMessage(friendlyMsg, 'ai', null, null, true); // true = isError

      if (shouldSpeakAuto && window.CimegaVoice) {
        // BERIKAN INFORMASI LEWAT SUARA SECARA OTOMATIS
        window.CimegaVoice.speak(friendlyMsg);
      }

      // LAPORKAN KE TERMINAL UTAMA (Main Process)
      if (window.cimegaConfig?.logToTerminal) {
        window.cimegaConfig.logToTerminal(`AI Chat Error: ${errorMsg}`, 'ERROR');
      }
    } finally {
      if (typing) typing.style.display = 'none';
      if (input) { input.disabled = false; input.focus(); }
      if (sendBtn) sendBtn.disabled = false;
    }
  },

  // ── RENDERING ─────────────────────────────────────────────────────

  renderMessage: function (text, sender, action = null, actionData = null, isError = false) {
    const history = this.getEl('aiChatHistory');
    if (!history) return;

    const isMe = sender === 'user';
    const div = document.createElement('div');
    div.style.cssText = `
      align-self:${isMe ? 'flex-end' : 'flex-start'};
      max-width:87%;
      padding:${isMe ? '11px 15px' : '11px 32px 11px 15px'};
      border-radius:${isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px'};
      font-size:13px; line-height:1.55;
      background:${isMe ? 'linear-gradient(135deg,#0055cc,#003da5)' : 'rgba(255,255,255,0.055)'};
      color:${isMe ? '#fff' : '#ddeeff'};
      border:1px solid ${isMe ? 'rgba(0,229,255,0.25)' : 'rgba(170,85,255,0.2)'};
      box-shadow:0 3px 12px rgba(0,0,0,0.12);
      word-break:break-word;
      position:relative;
    `;

    // Hanya tampilkan tombol suara jika bukan pesan user DAN bukan pesan error
    if (!isMe && !isError) {
      const voiceBtn = document.createElement('div');
      voiceBtn.innerHTML = '🔊';
      voiceBtn.style.cssText = 'position:absolute;top:6px;right:8px;cursor:pointer;font-size:12px;opacity:0.6;transition:opacity 0.2s;';
      voiceBtn.onmouseover = () => voiceBtn.style.opacity = '1';
      voiceBtn.onmouseout = () => voiceBtn.style.opacity = '0.6';
      voiceBtn.onclick = () => window.CimegaVoice.speak(text, voiceBtn);
      div.appendChild(voiceBtn);
    }

    const textNode = document.createElement('span');

    // DETEKSI TEKS ARAB & BUNGKUS DENGAN FONT QURAN (Jika ada karakter Arab)
    let processedText = text;
    const arabicRegex = /([\u0600-\u06FF][\u0600-\u06FF\s،؛؟0-9]*(?:[\u0600-\u06FF][\u0600-\u06FF\s،؛؟0-9]*)*)/g;

    if (arabicRegex.test(text)) {
      processedText = text.replace(arabicRegex, match => {
        return `<div class="arabic-naskh" dir="rtl">${match.trim()}</div>`;
      });
    }

    textNode.innerHTML = processedText.replace(/\n/g, '<br>');
    div.appendChild(textNode);

    // Deteksi jika pesan dari AI berupa berkas dokumen/tabel formal untuk pratinjau cetak
    if (!isMe && !isError) {
      const isDocument = text.includes('# ') || text.includes('## ') || text.length > 500 || text.includes('<tr>');
      if (isDocument) {
        const previewBtn = document.createElement('button');
        previewBtn.style.cssText = 'display:block; margin-top:10px; width:100%; padding:8px 12px; background:linear-gradient(90deg, #00e5ff, #0099ff); color:#000; border:none; border-radius:8px; font-family:\'Plus Jakarta Sans\', sans-serif; font-size:11px; font-weight:700; cursor:pointer; box-shadow:0 0 10px rgba(0,229,255,0.3); text-transform:uppercase; letter-spacing:0.5px;';
        previewBtn.innerHTML = '🖥️ Pratinjau Cetak & Ekspor';
        previewBtn.onclick = () => {
          if (window.CimegaRouter && typeof window.CimegaRouter.renderGenericAIResult === 'function') {
            window.CimegaAIChatbot.toggle(); // Tutup window chat agar area pratinjau terlihat penuh
            window.CimegaRouter.renderGenericAIResult('Dokumen AI Chat', text, 'word');
          }
        };
        div.appendChild(previewBtn);
      }
    }

    if (action) {
      const btn = document.createElement('button');
      btn.style.cssText = 'display:block;margin-top:10px;width:100%;padding:7px 12px;background:var(--cyan);color:#000;border:none;border-radius:8px;font-family:Orbitron;font-size:10px;font-weight:700;cursor:pointer;';
      btn.innerText = `⚡ TERAPKAN AKSI: ${action.replace('_', ' ')}`;
      btn.onclick = () => this.triggerAction(action, actionData);
      div.appendChild(btn);
    }

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  },

  // ── ACTION ROUTING ────────────────────────────────────────────────

  triggerAction: function (type, data = null) {
    const findNavAndClick = (keyword) => {
      const items = Array.from(document.querySelectorAll('.nav-item'));
      const item = items.find(el => el.innerText.toLowerCase().includes(keyword));
      if (item) item.click();
    };

    if (type === 'MODUL_AJAR') findNavAndClick('perencanaan');
    else if (type === 'SURAT' || type === 'DRAFT_SURAT') {
      if (data) localStorage.setItem('cimega_ai_draft', data);
      findNavAndClick('e-office');
      if (window.showToast) window.showToast('success', 'Draf Disiapkan', 'Draf dari AI telah dimuat ke modul E-Office.');
    }
    else if (type === 'RKAS') findNavAndClick('rkas');
    else if (type === 'SUPERVISI') findNavAndClick('supervisi');
  },

  // ── FILE UPLOAD (UI SIDE) ─────────────────────────────────────────

  triggerUpload: function () {
    const fileInput = this.getEl('aiFileInput');
    if (fileInput) fileInput.click();
  },

  handleFileChange: function (event) {
    const file = event.target.files[0];
    if (!file) return;

    window.CimegaAIChatbotCore.setAttachment(file)
      .then((attachment) => {
        const bar = this.getEl('aiAttachmentBar');
        const nameEl = this.getEl('aiFileName');
        if (bar && nameEl) {
          nameEl.innerText = `📎 Lampiran: ${attachment.name}`;
          bar.style.display = 'flex';
        }
      })
      .catch((err) => {
        this.renderMessage(`⚠️ Mohon maaf Bapak Imam, ${err.message}`, 'ai', null, null, true);
        event.target.value = '';
      });
  },

  clearAttachment: function () {
    window.CimegaAIChatbotCore.clearAttachmentState();
    const bar = this.getEl('aiAttachmentBar');
    const fileInput = this.getEl('aiFileInput');
    if (bar) bar.style.display = 'none';
    if (fileInput) fileInput.value = '';
  }
};

// ── BACKWARD COMPATIBILITY ────────────────────────────────────────────
// Alias agar dashboard.html yang menggunakan window.CimegaAIChatbot tidak perlu diubah
window.CimegaAIChatbot = window.CimegaAIChatbotUI;
