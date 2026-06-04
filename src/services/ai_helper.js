// ── CIMEGA SMART OFFICE: AI HELPER ────────────────────────────────

window.CimegaAI = {
  // ★ ROLE CAPABILITIES MAPPING ★
  ROLE_CAPABILITIES: {
    'guru': {
      label: 'Guru (Kelas/Mapel)',
      domains: [],
      prohibited: []
    },
    'kepsek': {
      label: 'Kepala Sekolah',
      domains: [],
      prohibited: []
    },
    'bendahara': {
      label: 'Bendahara',
      domains: [],
      prohibited: []
    },
    'ops': {
      label: 'Operator (OPS)',
      domains: [],
      prohibited: []
    },
    'tu': {
      label: 'Tata Usaha (TU)',
      domains: [],
      prohibited: []
    },

  // ── 0. SAFETY FILTER: RED FLAGS ──
  FORBIDDEN_WORDS: [
    'anjing', 'babi', 'monyet', 'bangsat', 'tolol', 'goblok', 'idiot', 'kontol', 'memek', 'ngentot', 'puki', 
    'asu', 'suu', 'bajingan', 'brengsek', 'tempik', 'jembut', 'lonte', 'pelacur', 'perek', 'jablay'
  ],
  DANGEROUS_TOPICS: ['bom', 'peledak', 'senjata api', 'nuklir', 'merakit senjata', 'hacking', 'cracker', 'koding', 'coding', 'script'],
  HARASSMENT_INDICATORS: ['bullying', 'porn', 'bokep', 'porno', 'seksual', 'hina', 'bodoh', 'jelek', 'sampah'],

  validateMessage: function(text) {
    const lowText = text.toLowerCase();
    
    // 1. Cek Kata Kasar
    if (this.FORBIDDEN_WORDS.some(word => lowText.includes(word))) {
      return { safe: false, msg: "Mohon maaf, sebagai asisten sekolah yang profesional, saya tidak dapat menanggapi pesan yang mengandung kata-kata kurang sopan. Mari kita berdiskusi dengan bahasa yang lebih baik. 😊" };
    }
    
    // 2. Cek Topik Berbahaya
    if (this.DANGEROUS_TOPICS.some(t => lowText.includes(t))) {
      return { safe: false, msg: "Mohon maaf, fokus saya adalah membantu administrasi sekolah Kurikulum Merdeka. Saya tidak diizinkan untuk membahas topik berbahaya atau teknis pemrograman umum. Ada yang bisa saya bantu terkait sekolah? 🏫" };
    }

    // 3. Cek Pelecehan/SARA
    if (this.HARASSMENT_INDICATORS.some(i => lowText.includes(i))) {
      return { safe: false, msg: "Mohon maaf, saya memiliki standar etika yang ketat untuk menolak segala bentuk perundungan (bullying) atau konten tidak pantas. Mari jaga integritas lingkungan pendidikan kita. 🙏" };
    }

    // 4. Cek Multi-Tenant & Isolation
    const crossSchool = ['sekolah lain', 'instansi lain', 'sdn lain', 'data sekolah sebelah', 'sekolah berbeda', 'sekolah b', 'sekolah c', 'cross-tenant', 'pindah instansi'];
    if (crossSchool.some(k => lowText.includes(k))) {
      return { safe: false, msg: "Mohon maaf, sebagai Co-Pilot AI Cimega, wewenang saya dibatasi hanya untuk sekolah aktif saat ini. Saya dilarang mengakses atau membahas data dari sekolah/instansi lain demi menjaga kerahasiaan data. 🔒" };
    }

    return { safe: true };
  },

  // ── 1. AI PROTOCOL & GUARDRAILS ──
  SYSTEM_GUARDRAIL: `### CIMEGA ADVANCED INTELLIGENCE CORE ###
1. IDENTITAS: Anda adalah Cimega AI, asisten administratif strategis tingkat tinggi dengan kecerdasan setara Gemini/GPT. 
2. PERSONALITY: Cerdas, Analitis, Bijaksana, dan Empatik. Anda bukan sekadar pemberi template, tapi penasihat yang mampu memberikan solusi administratif yang inovatif.
3. KEMAMPUAN: Anda memahami seluruh koridor Kurikulum Merdeka dan Manajemen Sekolah. Berikan saran yang mendalam, logis, dan profesional.
4. SISI KEMANUSIAAN: Pahami kondisi psikologis pengguna (stres, lelah) dan berikan dukungan mental yang tulus sebelum kembali ke solusi teknis.
5. FILTER TEGAS: Tolak mutlak topik SARA, Pornografi, Kekerasan (Bom/Senjata), Hinaan, Bullying, Koding umum, dan data instansi lain.
6. ISOLASI DATA (MULTI-TENANT & ROLE PRIVACY): Anda beroperasi secara terisolasi penuh. Anda dilarang memberikan, menebak, atau membahas data dari sekolah lain atau data dari pengguna/peran lain di instansi ini. Akses Anda terbatas hanya untuk melayani pengguna saat ini.
7. KONTEKS: Manfaatkan riwayat percakapan untuk memberikan respon yang berkesinambungan tanpa mengulang instruksi awal.`,

  // ── 2. CONTEXT EXTRACTION & LIVE DATA ──
  getSchoolStats: async function(userData) {
    try {
      const { collection, getDocs, query, where, count } = window._fb;
      const db = window._fb.db;
      if (!db || !userData.sekolah) return null;

      // 1. Hitung Total Guru/Staf di sekolah ini
      const teacherQuery = query(collection(db, 'users'), where('sekolah', '==', userData.sekolah));
      const teacherSnap = await getDocs(teacherQuery);
      
      // 2. Hitung Total Dokumen yang telah dibuat (Shared)
      const docsQuery = query(collection(db, 'shared_docs'), where('sekolah', '==', userData.sekolah));
      const docsSnap = await getDocs(docsQuery);

      return {
        totalStaff: teacherSnap.size,
        totalDocs: docsSnap.size
      };
    } catch (e) {
      console.warn('CimegaAI: Gagal mengambil statistik riil', e);
      return null;
    }
  },

  getUserContext: async function() {
    try {
      const userData = JSON.parse(localStorage.getItem('cimega_user') || '{}');
      if (!userData || !userData.nama) return null;
      
      const stats = await this.getSchoolStats(userData);
      const rolesRaw = Array.isArray(userData.roles) ? userData.roles : (userData.role ? [userData.role] : []);
      const roleLabels = [];

      rolesRaw.forEach(r => {
        const roleKey = String(r).toLowerCase().trim().replace(/[\s-]/g, '_');
        const cap = this.ROLE_CAPABILITIES[roleKey];
        if (cap) roleLabels.push(cap.label);
      });

      const now = new Date();
      const hour = now.getHours();
      
      // Hitung Tahun Ajaran & Tanggal
      const currentYear = now.getFullYear();
      const academicYear = (now.getMonth() >= 6) ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
      const timeStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const clockStr = `${String(hour).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      // Tentukan Sapaan Waktu
      let waktuHint = "Malam";
      if (hour >= 5 && hour < 11) waktuHint = "Pagi";
      else if (hour >= 11 && hour < 15) waktuHint = "Siang";
      else if (hour >= 15 && hour < 18) waktuHint = "Sore";

      return {
        nama: userData.nama,
        sekolah: userData.sekolah || 'SDN Cimega',
        roles: roleLabels.length > 0 ? roleLabels : ['Staf Sekolah'],
        stats: stats || { totalStaff: 'Terlimit', totalDocs: 'Terlimit' },
        currentTime: timeStr,
        currentClock: clockStr,
        waktuHint: waktuHint,
        academicYear: academicYear,
        regulations: [
          "Keputusan BSKAP No. 032/H/KR/2024 tentang Capaian Pembelajaran Terbaru.",
          "Permendikbudristek No. 12 Tahun 2024 tentang Kurikulum Merdeka sebagai Kurikulum Nasional.",
          "Pedoman Implementasi Kurikulum Merdeka Revisi 2025."
        ]
      };
    } catch (e) { 
      console.error('CimegaAI: Context error', e);
      return null; 
    }
  },

  // ── 3. AI INTERACTION (Ask) ──
  ask: async function(options) {
    if (!options || !options.messages) return { error: 'Invalid parameters.' };
    
    const _api = window.cimegaConfig || window.cimegaAPI;
    if (!_api || !_api.geminiAsk) return { error: 'Integrasi AI (Bridge) tidak ditemukan.' };

    try {
      const text = options.messages[options.messages.length - 1].content;
      const validation = this.validateMessage(text);
      if (!validation.safe) {
        return { success: true, text: validation.msg };
      }

      const ctx = await this.getUserContext();
      let identityPrompt = "";
      
      if (ctx) {
        const isFirstMsg = options.messages.length <= 1;
        identityPrompt = `
### KONTEKS STRATEGIS USER ###
Tahun Ajaran Aktif: ${ctx.academicYear} | Waktu: ${ctx.currentTime} (${ctx.currentClock})
User: ${ctx.nama} (Jabatan: ${ctx.roles.join(', ')})
Institusi: ${ctx.sekolah}
---------------------------
DATA STATISTIK SEKOLAH (REAL-TIME):
- Jumlah Guru/Staf: ${ctx.stats.totalStaff}
- Total Dokumen Tersusun: ${ctx.stats.totalDocs}
---------------------------
REGULASI RELEVAN:
${ctx.regulations.map(r => `- ${r}`).join('\n')}
---------------------------
PRINSIP OPERASIONAL:
- TAHUN AJARAN: Selalu acu pada ${ctx.academicYear} untuk setiap regulasi Kurikulum Merdeka.
- DATA RIIL: Gunakan statistik di atas jika user bertanya tentang kondisi sekolah.
- GAYA BAHASA: Kolegial, Berwibawa, namun Hangat. Gunakan diksi yang cerdas.
- MEMORI PERCAKAPAN: ${isFirstMsg ? `Mulailah dengan sapaan hangat: "Selamat ${ctx.waktuHint}, Bapak/Ibu ${ctx.nama}". Berikan gambaran singkat bagaimana Anda bisa membantu sesuai jabatannya.` : 'DILARANG mengulang sapaan atau perkenalan diri. Langsunglah berdiskusi secara mendalam untuk menyelesaikan masalah user.'}
- KEDALAMAN RESPONS: Berikan saran yang komprehensif. Jika user bertanya tentang administrasi, berikan langkah-langkah strategisnya. Jika user curhat, berikan dukungan moral yang menenangkan.
- DISIPLIN TOPIK: Tetap tolak dengan cara yang cerdas dan berkelas jika user meminta koding atau materi di luar koridor sekolah.
`;
      }

      // Gabungkan sistem utama, identitas, pengetahuan sekolah, dan tugas spesifik (jika ada)
      const schoolKnowledge = window.CimegaKnowledge ? window.CimegaKnowledge.getKnowledgeString() : "";
      let mergedSystem = this.SYSTEM_GUARDRAIL + (identityPrompt ? "\n" + identityPrompt : "") + schoolKnowledge;
      
      // Tambahkan Instruksi Aksi Otomatis
      mergedSystem += `
\n### INSTRUKSI AKSI OTOMATIS (ACTION TAGS) ###
- Jika Bapak meminta bantuan membuat surat atau draf pesan resmi, berikan jawaban teks yang indah DAN sertakan tag [ACTION:DRAFT_SURAT:Isi draf surat lengkap di sini] di bagian akhir pesan.
- Gunakan tag [ACTION:MODUL_AJAR] jika Bapak ingin merancang perencanaan.
- Gunakan tag [ACTION:RKAS] jika terkait anggaran.
`;

      if (options.system) {
        mergedSystem += "\n\n### TUGAS SPESIFIK SAAT INI ###\n" + options.system;
      }

      const res = await _api.geminiAsk({
        system: mergedSystem,
        messages: options.messages,
        maxTokens: parseInt(options.maxTokens) || 2000
      });

      if (res && res.success && res.text) {
        return { success: true, text: res.text.trim() };
      }
      return { error: (res && res.error) ? res.error : 'Respon AI kosong atau tidak valid.' };
    } catch (err) {
      console.error('CimegaAI: Ask error', err);
      return { error: 'Kesalahan Sistem AI: ' + err.message };
    }
  }
};

console.log('✅ Cimega AI Helper v2.0 loaded. [Kokurikuler Ready, Modul Builder REMOVED]');

