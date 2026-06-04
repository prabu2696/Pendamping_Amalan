import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getFirestore, doc, setDoc, getDoc, updateDoc, onSnapshot, 
  collection, query, where, deleteDoc, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── 1. PARSE URL PARAMETERS & USER SESSION ──
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('sessionId');
const type = urlParams.get('type') || 'video'; // 'audio' | 'video'
const scope = urlParams.get('scope') || 'group'; // 'group' | 'private' | 'school' | 'kepsek'
const targetId = urlParams.get('targetId');
const targetName = urlParams.get('targetName') || 'Kolega';
const callerId = urlParams.get('callerId');
const callerName = urlParams.get('callerName') || 'Staf';

const myUser = JSON.parse(localStorage.getItem('cimega_user') || '{}');
const myId = myUser.id;
const myName = myUser.nama || 'Staf';
const sekolah = urlParams.get('sekolah') || myUser.sekolah || myUser.school_id;

const isInitiator = String(callerId) === String(myId);

// WebRTC State
let localStream = null;
let peerConnections = {}; // Map of userId -> RTCPeerConnection
let db = null;
let callSessionRef = null;
let unsubSession = null;
let unsubOffers = null;
let unsubAnswers = null;
let callStartTime = null;
let durationInterval = null;

// Ringtone Synthesizer State
let audioCtx = null;
let ringtoneInterval = null;

// Controls State
let isMuted = false;
let isVideoOff = false;

// Screen Sharing State
let isScreenSharing = false;
let screenStreamObj = null;

// ICE Candidate Queue to prevent race conditions
let candidateQueues = {}; // peerId -> [candidates]

// ── 2. WEB AUDIO API RINGTONE SYNTHESIZER ──
function playOutgoingRingtone() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const playTone = () => {
    if (!audioCtx) return;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc1.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc2.frequency.setValueAtTime(480, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime + 1.2);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 1.5);
    osc2.stop(audioCtx.currentTime + 1.5);
  };

  playTone();
  ringtoneInterval = setInterval(playTone, 3500);
}

function playIncomingRingtone() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const playSequence = () => {
    if (!audioCtx) return;
    const notes = [329.63, 392.00, 523.25, 659.25]; // E5, G5, C6, E6
    let startTime = audioCtx.currentTime;
    
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + (idx * 0.15));
      
      gainNode.gain.setValueAtTime(0.0, startTime + (idx * 0.15));
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + (idx * 0.15) + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + (idx * 0.15) + 0.2);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime + (idx * 0.15));
      osc.stop(startTime + (idx * 0.15) + 0.25);
    });
  };

  playSequence();
  ringtoneInterval = setInterval(playSequence, 1500);
}

function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  if (audioCtx) {
    try { audioCtx.close(); } catch(_) {}
    audioCtx = null;
  }
}

// ── 3. INTI JALUR HIDUP PANGGILAN (MAIN BOOT) ──
async function initCall() {
  // Tandai di local storage bahwa kita sedang dalam panggilan
  localStorage.setItem('cimega_in_call', 'true');

  // Update UI Titles
  document.getElementById('callTypeTitle').innerText = `${scope.toUpperCase()} ${type.toUpperCase()} CALL`;
  document.getElementById('statusTargetName').innerText = (scope === 'group' || scope === 'school' || scope === 'kepsek') ? 'Grup Komunitas' : targetName;

  // Cek/Minta izin media
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === 'video'
    });
    document.getElementById('localVideo').srcObject = localStream;
    if (type === 'audio') {
      document.getElementById('localVideoBox').style.display = 'none';
      document.getElementById('btnVideo').style.display = 'none';
      document.getElementById('btnScreen').style.display = 'none';
    }
  } catch (err) {
    console.error("Gagal mendapat izin media:", err);
    alert("Izin kamera atau mikrofon ditolak. Panggilan tidak dapat dilanjutkan.");
    cleanupAndClose();
    return;
  }

  // Load config Firebase dari Context Bridge
  const configBridge = window.cimegaConfig || window.cimegaAPI;
  if (!configBridge) {
    alert("Koneksi Cimega Bridge tidak ditemukan.");
    return;
  }
  
  const firebaseConfig = await configBridge.getFirebaseConfig();
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  callSessionRef = doc(db, 'call_sessions', sessionId);

  if (isInitiator) {
    // ── KELAS CALLER (PENELPON) ──
    document.getElementById('statusMessage').innerText = "MEMANGGIL...";
    playOutgoingRingtone();

    // Buat session panggilan di Firestore
    await setDoc(callSessionRef, {
      id: sessionId,
      status: 'ringing',
      type: type,
      scope: scope,
      sekolah: sekolah || 'cross_school',
      targetId: targetId || '',
      callerId: myId,
      callerName: myName,
      created_at: Date.now(),
      participants: [{ id: myId, nama: myName, joinedAt: Date.now() }]
    });

    listenToCallSession();
  } else {
    // ── KELAS CALLEE (PENERIMA) ──
    document.getElementById('statusMessage').innerText = "MENYAMBUNGKAN...";
    
    // Langsung gabung ke partisipan session
    await updateDoc(callSessionRef, {
      status: 'active',
      participants: arrayUnion({ id: myId, nama: myName, joinedAt: Date.now() })
    });

    listenToCallSession();
  }
}

// Pantau perubahan status panggilan
function listenToCallSession() {
  unsubSession = onSnapshot(callSessionRef, async (snap) => {
    if (!snap.exists()) {
      cleanupAndClose();
      return;
    }

    const data = snap.data();
    if (data.status === 'ended') {
      cleanupAndClose();
      return;
    }

    if (data.status === 'active') {
      stopRingtone();
      document.getElementById('statusOverlay').style.opacity = '0';
      setTimeout(() => {
        const overlay = document.getElementById('statusOverlay');
        if (overlay) overlay.style.display = 'none';
      }, 500);

      // Mulai Timer durasi panggilan jika belum
      if (!callStartTime) {
        callStartTime = Date.now();
        durationInterval = setInterval(updateDuration, 1000);
      }

      // Hubungkan peer connections (Mesh WebRTC)
      syncMeshConnections(data.participants);
    }
  });

  // Dengarkan signaling pertukaran Offer & Answer
  listenToSignaling();
}

// ── 4. WEB RTC MESH TOPOLOGY SIGNALING ──
function syncMeshConnections(participants) {
  participants.forEach(p => {
    if (p.id === myId) return; // Abaikan diri sendiri
    
    // Jika peer belum ada koneksinya, buat baru
    if (!peerConnections[p.id]) {
      setupPeerConnection(p.id, p.nama);
    }
  });

  // Hapus peer yang telah keluar
  Object.keys(peerConnections).forEach(peerId => {
    const isPresent = participants.some(p => String(p.id) === String(peerId));
    if (!isPresent) {
      removePeer(peerId);
    }
  });
}

function setupPeerConnection(peerId, peerName) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19002' },
      { urls: 'stun:stun1.l.google.com:19002' },
      { urls: 'stun:stun2.l.google.com:19002' }
    ]
  });

  peerConnections[peerId] = pc;

  // Tambahkan track lokal ke peer
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  // Tangani ICE Candidate
  pc.onicecandidate = async (event) => {
    if (event.candidate) {
      const candId = `cand_${myId}_to_${peerId}_${Date.now()}`;
      const candRef = doc(db, `call_sessions/${sessionId}/candidates`, candId);
      await setDoc(candRef, {
        candidate: JSON.stringify(event.candidate),
        fromId: myId,
        toId: peerId
      });
    }
  };

  // Tangani remote stream (video/audio peserta lain)
  pc.ontrack = (event) => {
    addRemoteVideo(peerId, peerName, event.streams[0]);
  };

  // Koordinasi Mesh: Siapa yang membuat Offer?
  // ID lexicographically terkecil yang memulai
  const shouldCreateOffer = String(myId) < String(peerId);
  if (shouldCreateOffer) {
    createOffer(peerId, pc);
  }
}

async function createOffer(peerId, pc) {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const offerId = `offer_${myId}_to_${peerId}`;
    const offerRef = doc(db, `call_sessions/${sessionId}/offers`, offerId);
    await setDoc(offerRef, {
      sdp: offer.sdp,
      fromId: myId,
      toId: peerId
    });
  } catch (err) {
    console.error("Gagal membuat offer untuk peer:", peerId, err);
  }
}

async function processQueuedCandidates(peerId) {
  const pc = peerConnections[peerId];
  const queue = candidateQueues[peerId];
  if (pc && pc.remoteDescription && queue) {
    while (queue.length > 0) {
      const cand = queue.shift();
      try {
        await pc.addIceCandidate(cand);
      } catch (e) {
        console.warn("Gagal menambahkan queued ICE candidate:", e);
      }
    }
  }
}

function listenToSignaling() {
  const offersRef = collection(db, `call_sessions/${sessionId}/offers`);
  const answersRef = collection(db, `call_sessions/${sessionId}/answers`);
  const candidatesRef = collection(db, `call_sessions/${sessionId}/candidates`);

  // 1. Dengarkan Offer Masuk
  unsubOffers = onSnapshot(offersRef, (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.toId === myId) {
          const pc = peerConnections[data.fromId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: data.sdp }));
            await processQueuedCandidates(data.fromId);
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            const answerId = `answer_${myId}_to_${data.fromId}`;
            const answerRef = doc(db, `call_sessions/${sessionId}/answers`, answerId);
            await setDoc(answerRef, {
              sdp: answer.sdp,
              fromId: myId,
              toId: data.fromId
            });
          }
        }
      }
    });
  });

  // 2. Dengarkan Answer Masuk
  unsubAnswers = onSnapshot(answersRef, (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.toId === myId) {
          const pc = peerConnections[data.fromId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
            await processQueuedCandidates(data.fromId);
          }
        }
      }
    });
  });

  // 3. Dengarkan ICE Candidates Masuk
  onSnapshot(candidatesRef, (snap) => {
    snap.docChanges().forEach(async (change) => {
      if (change.type === 'added') {
        const data = change.doc.data();
        if (data.toId === myId) {
          const pc = peerConnections[data.fromId];
          const cand = new RTCIceCandidate(JSON.parse(data.candidate));
          if (pc && pc.remoteDescription) {
            try {
              await pc.addIceCandidate(cand);
            } catch (e) {
              console.warn("Gagal menambahkan ICE candidate:", e);
            }
          } else {
            if (!candidateQueues[data.fromId]) {
              candidateQueues[data.fromId] = [];
            }
            candidateQueues[data.fromId].push(cand);
          }
        }
      }
    });
  });
}

// ── 5. MEDIA CONTROLS, SCREEN SHARING & GRID RENDERING ──
function addRemoteVideo(peerId, peerName, stream) {
  let videoBox = document.getElementById(`box_${peerId}`);
  if (videoBox) return;

  videoBox = document.createElement('div');
  videoBox.className = 'video-box';
  videoBox.id = `box_${peerId}`;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsinline = true;
  video.srcObject = stream;

  const label = document.createElement('div');
  label.className = 'video-label';
  label.innerText = peerName;

  videoBox.appendChild(video);
  videoBox.appendChild(label);
  
  document.getElementById('videoGrid').appendChild(videoBox);
}

function removePeer(peerId) {
  if (peerConnections[peerId]) {
    peerConnections[peerId].close();
    delete peerConnections[peerId];
  }
  const videoBox = document.getElementById(`box_${peerId}`);
  if (videoBox) videoBox.remove();
}

window.toggleMute = function() {
  isMuted = !isMuted;
  localStream.getAudioTracks().forEach(track => {
    track.enabled = !isMuted;
  });
  const btn = document.getElementById('btnMute');
  btn.innerText = isMuted ? '🔇' : '🎤';
  btn.classList.toggle('off', isMuted);
};

window.toggleVideo = function() {
  isVideoOff = !isVideoOff;
  localStream.getVideoTracks().forEach(track => {
    track.enabled = !isVideoOff;
  });
  const btn = document.getElementById('btnVideo');
  btn.innerText = isVideoOff ? '📷❌' : '📷';
  btn.classList.toggle('off', isVideoOff);
};

// ── SCREEN SHARING FUNCTIONS ──
window.toggleScreenShare = async function() {
  if (isScreenSharing) {
    stopScreenShare();
    return;
  }
  
  const api = window.cimegaConfig || window.cimegaAPI;
  if (!api || !api.getScreenSources) {
    alert("API Screen Sharing tidak tersedia.");
    return;
  }

  try {
    const sources = await api.getScreenSources();
    const listCont = document.getElementById('screenSourcesList');
    listCont.innerHTML = '';

    sources.forEach(src => {
      const item = document.createElement('div');
      item.style.cssText = 'width:180px; background:rgba(6, 20, 40, 0.6); border:1px solid var(--border-color); border-radius:10px; padding:10px; cursor:pointer; text-align:center; transition:all 0.2s; display:flex; flex-direction:column; align-items:center; gap:8px;';
      item.onmouseover = () => {
        item.style.borderColor = 'var(--cyan)';
        item.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.3)';
        item.style.transform = 'scale(1.03)';
      };
      item.onmouseout = () => {
        item.style.borderColor = 'var(--border-color)';
        item.style.boxShadow = 'none';
        item.style.transform = 'none';
      };
      
      const img = document.createElement('img');
      img.src = src.thumbnail;
      img.style.cssText = 'width:150px; height:90px; object-fit:cover; border-radius:6px; border:1px solid rgba(255,255,255,0.1);';
      
      const title = document.createElement('div');
      title.innerText = src.name;
      title.style.cssText = 'font-size:10px; color:#fff; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; width:100%;';
      
      item.appendChild(img);
      item.appendChild(title);
      item.onclick = () => {
        startScreenShare(src.id);
        closeScreenPicker();
      };
      
      listCont.appendChild(item);
    });

    document.getElementById('screenPickerModal').style.display = 'flex';
  } catch (err) {
    console.error("Gagal memuat sumber layar:", err);
  }
};

window.closeScreenPicker = function() {
  document.getElementById('screenPickerModal').style.display = 'none';
};

async function startScreenShare(sourceId) {
  try {
    screenStreamObj = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: sourceId
        }
      }
    });

    const screenTrack = screenStreamObj.getVideoTracks()[0];
    
    // Ganti video track pada semua Peer Connections
    Object.keys(peerConnections).forEach(peerId => {
      const pc = peerConnections[peerId];
      const senders = pc.getSenders();
      const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
      if (videoSender) {
        videoSender.replaceTrack(screenTrack);
      }
    });

    // Update preview lokal
    document.getElementById('localVideo').srcObject = screenStreamObj;
    
    // Tandai status sharing
    isScreenSharing = true;
    const btn = document.getElementById('btnScreen');
    btn.classList.add('off'); // Beri warna merah/aktif
    btn.innerText = '🖥️❌';

    screenTrack.onended = () => {
      stopScreenShare();
    };
  } catch (err) {
    console.error("Gagal membagikan layar:", err);
  }
}

function stopScreenShare() {
  if (!isScreenSharing) return;
  
  if (screenStreamObj) {
    screenStreamObj.getTracks().forEach(track => track.stop());
    screenStreamObj = null;
  }

  // Kembalikan ke track kamera
  const cameraTrack = localStream.getVideoTracks()[0];
  Object.keys(peerConnections).forEach(peerId => {
    const pc = peerConnections[peerId];
    const senders = pc.getSenders();
    const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
    if (videoSender && cameraTrack) {
      videoSender.replaceTrack(cameraTrack);
    }
  });

  document.getElementById('localVideo').srcObject = localStream;
  isScreenSharing = false;
  
  const btn = document.getElementById('btnScreen');
  btn.classList.remove('off');
  btn.innerText = '🖥️';
}

// ── 6. TIMER & CLEANUP (HANG UP) ──
function updateDuration() {
  const diff = Date.now() - callStartTime;
  const secs = Math.floor((diff / 1000) % 60);
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('callDuration').innerText = `${pad(mins)}:${pad(secs)}`;
}

window.endCall = async function() {
  stopRingtone();
  if (db && callSessionRef) {
    try {
      const snap = await getDoc(callSessionRef);
      if (snap.exists()) {
        const data = snap.data();
        const currentParticipants = data.participants || [];
        const updated = currentParticipants.filter(p => String(p.id) !== String(myId));
        
        // Panggilan privat berakhir jika salah satu keluar, panggilan grup berakhir jika sisa 0
        const isPrivate = data.scope === 'private';
        if (isPrivate || updated.length === 0) {
          await updateDoc(callSessionRef, { status: 'ended', participants: [] });
        } else {
          await updateDoc(callSessionRef, { participants: updated });
        }
      }
    } catch(e) {
      console.error("Gagal mengakhiri panggilan:", e);
    }
  }
  cleanupAndClose();
};

let isCleaningUp = false;
function cleanupAndClose() {
  if (isCleaningUp) return;
  isCleaningUp = true;

  stopRingtone();
  localStorage.removeItem('cimega_in_call');
  
  if (durationInterval) clearInterval(durationInterval);
  
  if (unsubSession) unsubSession();
  if (unsubOffers) unsubOffers();
  if (unsubAnswers) unsubAnswers();

  if (screenStreamObj) {
    screenStreamObj.getTracks().forEach(track => track.stop());
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  Object.keys(peerConnections).forEach(peerId => {
    peerConnections[peerId].close();
  });
  peerConnections = {};

  window.close();
}

// Jalankan saat halaman siap
window.addEventListener('DOMContentLoaded', initCall);
window.addEventListener('beforeunload', () => {
  endCall();
});
