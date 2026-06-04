// ── CIMEGA SMART OFFICE: VOICE AI SERVICE ───────────────────────────
// Lokasi: src/services/voice_service.js

window.CimegaVoice = {
    audio: null,
    isPlaying: false,

    speak: async function(text, btnEl = null) {
        if (this.isPlaying) {
            this.stop();
            if (btnEl) btnEl.innerHTML = '🔊';
            return;
        }

        const cleanText = text.replace(/\[ACTION:[\s\S]+?\]/g, '').replace(/[#*`_]/g, '').trim();
        console.log('[VOICE_DEBUG] Mencoba memproses suara untuk:', cleanText);

        try {
            if (btnEl) btnEl.innerHTML = '⌛';
            
            // Panggil Otak Suara di Sistem Pusat (Main Process) via IPC
            const _api = window.cimegaConfig || window.cimegaAPI;
            const data = await _api.ttsGenerate({ text: cleanText });

            if (data.success && data.audioContent) {
                const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mp3');
                const url = URL.createObjectURL(audioBlob);
                
                this.audio = new Audio(url);
                this.audio.onplay = () => { 
                    this.isPlaying = true; 
                    if (btnEl) btnEl.innerHTML = '⏹️'; 
                };
                this.audio.onended = () => { 
                    this.isPlaying = false; 
                    if (btnEl) btnEl.innerHTML = '🔊'; 
                };
                this.audio.play().catch(err => {
                    console.warn('[VOICE_DEBUG] Playback blocked or failed:', err);
                    this.fallbackNative(cleanText, btnEl);
                });
            } else {
                throw new Error(data.error || 'Konten suara tidak ditemukan atau kosong.');
            }
        } catch (e) {
            console.warn('Voice Service: IPC failed, falling back to local speech api...', e);
            if (window.cimegaConfig?.logToTerminal) {
                window.cimegaConfig.logToTerminal(`Voice AI Fail: ${e.message}`, 'WARN');
            }
            this.fallbackNative(cleanText, btnEl);
        }
    },

    fallbackNative: function(text, btnEl) {
        // --- EMERGENCY FALLBACK: WEB SPEECH API (Native Browser) ---
        if (!window.speechSynthesis) {
            if (window.showToast) window.showToast('error', 'Gagal', 'Sistem suara tidak didukung di perangkat ini.');
            return;
        }
        
        this.stop();
        const msg = new SpeechSynthesisUtterance(text);
        msg.lang = 'id-ID';
        msg.rate = 1.08;
        
        // Find best Indonesian voice
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = voices.find(v => 
            v.lang.includes('id') && 
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
        ) || voices.find(v => v.lang.includes('id'));
        
        if (bestVoice) {
            msg.voice = bestVoice;
        }
        
        msg.onstart = () => { 
            this.isPlaying = true; 
            if (btnEl) btnEl.innerHTML = '⏹️'; 
        };
        msg.onend = () => { 
            this.isPlaying = false; 
            if (btnEl) btnEl.innerHTML = '🔊'; 
        };
        
        window.speechSynthesis.speak(msg);
    },

    stop: function() {
        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        this.isPlaying = false;
    },

    base64ToBlob: function(base64, type) {
        const bin = atob(base64);
        const len = bin.length;
        const arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type });
    }
};
