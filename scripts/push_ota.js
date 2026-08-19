/**
 * ============================================================
 *   PENDAMPING AMALAN — Supabase + Firestore OTA Pusher
 *   Menggunakan @capgo/capacitor-updater
 * ============================================================
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, serverTimestamp } = require("firebase/firestore");
const { createClient } = require("@supabase/supabase-js");
const AdmZip = require("adm-zip");

// ─── Validasi Environment Variables ──
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || "ota-updates";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ EROR: SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diset di file .env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Firebase Config (Metadata) ──
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function pushUpdate() {
  console.log("=".repeat(55));
  console.log("  🚀 PENDAMPING AMALAN — OTA Pusher (Capacitor Updater)");
  console.log("=".repeat(55));

  try {
    // 1. Baca dan Increment Versi di index.html
    const rootDir = path.resolve(__dirname, "..");
    const htmlPath = path.join(rootDir, "index.html");
    let htmlContent = fs.readFileSync(htmlPath, "utf8");
    const versionMatch = htmlContent.match(/window\.__APP_VERSION\s*=\s*(\d+);/);
    if (!versionMatch) throw new Error("Tidak menemukan window.__APP_VERSION di index.html");
    
    let version = parseInt(versionMatch[1], 10);
    version += 1; // Increment versi
    console.log(`  📦 Menaikkan versi ke : ${version}`);
    
    htmlContent = htmlContent.replace(/window\.__APP_VERSION\s*=\s*(\d+);/, `window.__APP_VERSION = ${version};`);
    fs.writeFileSync(htmlPath, htmlContent);

    // 2. Sinkronkan ke www/ dan android/
    const wwwDir = path.join(rootDir, "www");
    if (!fs.existsSync(wwwDir)) fs.mkdirSync(wwwDir, { recursive: true });
    fs.writeFileSync(path.join(wwwDir, "index.html"), htmlContent);

    const androidAssetsHtml = path.join(rootDir, "android", "app", "src", "main", "assets", "public", "index.html");
    if (fs.existsSync(path.dirname(androidAssetsHtml))) {
      fs.writeFileSync(androidAssetsHtml, htmlContent);
    }
    console.log("  📂 Memperbarui folder www/ dan android/assets/public/");

    // 3. Buat ZIP dari folder www/ (Mengecualikan assets/audio untuk menghemat bandwidth)
    const zip = new AdmZip();
    
    function addFolderExceptAudio(localDirPath, zipPrefix) {
      const items = fs.readdirSync(localDirPath);
      for (const item of items) {
        if (item === "audio") continue; // Lompati folder audio
        const itemPath = path.join(localDirPath, item);
        const zipEntryPath = zipPrefix ? `${zipPrefix}/${item}` : item;
        if (fs.statSync(itemPath).isDirectory()) {
          addFolderExceptAudio(itemPath, zipEntryPath);
        } else {
          zip.addLocalFile(itemPath, zipPrefix || "");
        }
      }
    }

    addFolderExceptAudio(wwwDir, "");
    const zipBuffer = zip.toBuffer();
    const zipFileName = `update_${version}.zip`;
    console.log(`  🗜️  Membuat file ZIP : ${zipFileName} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);

    // 4. Upload ke Supabase Storage
    console.log("  ☁️  Mengunggah ke Supabase Storage...");
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(zipFileName, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      });

    if (uploadError) throw new Error("Gagal upload Supabase: " + uploadError.message);

    // 5. Dapatkan URL Publik Supabase
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(zipFileName);
    
    const publicUrl = publicUrlData.publicUrl;
    console.log(`  🔗 URL Publik ZIP  : ${publicUrl}`);

    // 6. Simpan Metadata ke Firestore
    console.log("  🔥 Menyimpan metadata ke Firestore...");
    const docRef = doc(db, "app_updates", "latest");
    await setDoc(docRef, {
      version: version,
      url: publicUrl,
      pushedAt: serverTimestamp(),
      message: `Versi ${version} tersedia — Ketuk tombol Update di aplikasi!`,
      pushedBy: "push_ota.js (Capacitor Updater)"
    });

    console.log("");
    console.log("  ✅ BERHASIL DIUNGGAH & DIPERBARUI!");
    console.log("");
    console.log(`  📱 Buka aplikasi di HP → Ketuk tombol 🔄 Update`);
    console.log(`     Aplikasi akan mendownload ZIP dan reload secara native.`);
    console.log("=".repeat(55));
    process.exit(0);
  } catch (err) {
    console.error("\n  ❌ GAGAL:", err.message);
    process.exit(1);
  }
}

pushUpdate();
