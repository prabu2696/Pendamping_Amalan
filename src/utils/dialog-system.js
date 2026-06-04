/**
 * CyberDialog - Elegant Cyberpunk Global Modal System
 * Replaces native alert(), confirm(), prompt()
 */
window.CyberDialog = {
  _createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'cyber-dialog-overlay';
    // Style directly injected to ensure it always works dynamically
    if (!document.getElementById('cyber-dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'cyber-dialog-styles';
      style.textContent = `
        .cyber-dialog-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(2, 11, 24, 0.6);
          backdrop-filter: blur(10px);
          display: flex; align-items: center; justify-content: center;
          animation: cyberFadeIn 0.3s ease-out;
        }
        .cyber-dialog-box {
          position: relative; width: 420px; max-width: 90%;
          background: rgba(10, 10, 12, 0.9); color: #e0f4ff; padding: 24px;
          clip-path: polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px));
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.15);
          animation: cyberScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .cyber-dialog-box::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(0, 229, 255, 0.8), transparent 40%, rgba(255, 68, 102, 0.5));
          z-index: -1; clip-path: inherit; padding: 1px;
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }
        .cyber-dialog-header {
          font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700; font-size: 14px;
          letter-spacing: 2px; color: #00e5ff; display: flex; align-items: center; gap: 10px;
          margin-bottom: 16px; border-bottom: 1px solid rgba(0, 229, 255, 0.2); padding-bottom: 12px;
        }
        .cyber-dialog-body {
          font-family: 'JetBrains Mono', monospace; font-size: 14px; line-height: 1.6;
          margin-bottom: 24px; color: rgba(224, 244, 255, 0.9);
        }
        .cyber-dialog-input {
          width: 100%; background: rgba(0, 229, 255, 0.05); border: 1px solid rgba(0, 229, 255, 0.3);
          color: #fff; padding: 10px; font-family: 'JetBrains Mono', monospace; margin-top: 10px; outline: none;
        }
        .cyber-dialog-input:focus { border-color: #00e5ff; box-shadow: 0 0 8px rgba(0,229,255,0.4); }
        .cyber-dialog-actions { display: flex; justify-content: flex-end; gap: 12px; }
        .cyber-btn-confirm, .cyber-btn-cancel {
          background: transparent; border: 1px solid rgba(0, 229, 255, 0.4); color: #00e5ff;
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; font-weight: 600; padding: 8px 16px;
          cursor: pointer; transition: all 0.2s;
          clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
        }
        .cyber-btn-confirm:hover { background: rgba(0, 229, 255, 0.15); box-shadow: 0 0 10px rgba(0, 229, 255, 0.4); }
        .cyber-btn-cancel { border-color: rgba(255, 68, 102, 0.4); color: #ff4466; }
        .cyber-btn-cancel:hover { background: rgba(255, 68, 102, 0.15); box-shadow: 0 0 10px rgba(255, 68, 102, 0.4); }
        @keyframes cyberFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cyberScaleUp {
          0% { opacity: 0; transform: scale(0.95); filter: brightness(2); }
          50% { filter: brightness(0.8); }
          100% { opacity: 1; transform: scale(1); filter: brightness(1); }
        }
      `;
      document.head.appendChild(style);
    }
    return overlay;
  },

  alert(message, title = 'SYSTEM NOTIFICATION') {
    return new Promise(resolve => {
      const overlay = this._createOverlay();
      overlay.innerHTML = `
        <div class="cyber-dialog-box">
          <div class="cyber-dialog-header">
            <span class="cyber-dialog-icon">ℹ️</span>
            <span class="cyber-dialog-title">${title}</span>
          </div>
          <div class="cyber-dialog-body">${message}</div>
          <div class="cyber-dialog-actions">
            <button class="cyber-btn-confirm">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const btn = overlay.querySelector('.cyber-btn-confirm');
      btn.focus();
      btn.onclick = () => { overlay.remove(); resolve(); };
    });
  },

  confirm(message, title = 'SYSTEM WARNING') {
    return new Promise(resolve => {
      const overlay = this._createOverlay();
      overlay.innerHTML = `
        <div class="cyber-dialog-box">
          <div class="cyber-dialog-header">
            <span class="cyber-dialog-icon">⚠️</span>
            <span class="cyber-dialog-title">${title}</span>
          </div>
          <div class="cyber-dialog-body">${message}</div>
          <div class="cyber-dialog-actions">
            <button class="cyber-btn-cancel">CANCEL</button>
            <button class="cyber-btn-confirm">PROCEED</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      overlay.querySelector('.cyber-btn-cancel').onclick = () => { overlay.remove(); resolve(false); };
      const btnConfirm = overlay.querySelector('.cyber-btn-confirm');
      btnConfirm.focus();
      btnConfirm.onclick = () => { overlay.remove(); resolve(true); };
    });
  },

  prompt(message, defaultVal = '', title = 'SYSTEM INPUT') {
    return new Promise(resolve => {
      const overlay = this._createOverlay();
      overlay.innerHTML = `
        <div class="cyber-dialog-box">
          <div class="cyber-dialog-header">
            <span class="cyber-dialog-icon">⌨️</span>
            <span class="cyber-dialog-title">${title}</span>
          </div>
          <div class="cyber-dialog-body">
            ${message}
            <input type="text" class="cyber-dialog-input" value="${defaultVal}">
          </div>
          <div class="cyber-dialog-actions">
            <button class="cyber-btn-cancel">CANCEL</button>
            <button class="cyber-btn-confirm">SUBMIT</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('.cyber-dialog-input');
      input.focus();
      input.setSelectionRange(0, input.value.length);
      
      const submit = () => { overlay.remove(); resolve(input.value); };
      const cancel = () => { overlay.remove(); resolve(null); };
      
      overlay.querySelector('.cyber-btn-cancel').onclick = cancel;
      overlay.querySelector('.cyber-btn-confirm').onclick = submit;
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') submit();
        if (e.key === 'Escape') cancel();
      });
    });
  }
};
