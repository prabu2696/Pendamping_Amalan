const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const wwwDir = path.join(rootDir, 'www');
const androidAssetsDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public');

console.log('='.repeat(55));
console.log('  [SYNC] PENDAMPING AMALAN — Single Source of Truth');
console.log('='.repeat(55));

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) fs.mkdirSync(parentDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function removeRecursive(targetPath) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

try {
  // 1. Bersihkan cache dan folder usang
  console.log('  [1/4] Membersihkan cache dan file usang...');
  const obsoleteItems = ['mp3_adzan', 'Logo_Pesantren.png', 'islamic_dome_bg.jpg', 'audio', 'public'];
  for (const item of obsoleteItems) {
    removeRecursive(path.join(rootDir, item));
    removeRecursive(path.join(wwwDir, item));
    removeRecursive(path.join(androidAssetsDir, item));
  }

  // 2. Siapkan direktori www/
  if (!fs.existsSync(wwwDir)) fs.mkdirSync(wwwDir, { recursive: true });

  // 3. Salin File Master ke www/
  console.log('  [2/4] Menyinkronkan Master Root -> www/ ...');
  const itemsToSync = ['index.html', 'assets'];
  for (const item of itemsToSync) {
    copyRecursive(path.join(rootDir, item), path.join(wwwDir, item));
  }

  // 4. Salin langsung ke android/assets/public/
  if (fs.existsSync(path.join(rootDir, 'android'))) {
    console.log('  [3/4] Menyinkronkan Master Root -> android/assets/public/ ...');
    for (const item of itemsToSync) {
      copyRecursive(path.join(rootDir, item), path.join(androidAssetsDir, item));
    }
  }

  // 5. Jalankan Capacitor Sync
  console.log('  [4/4] Menjalankan Capacitor Sync Android...');
  execSync('npx cap sync android', { cwd: rootDir, stdio: 'inherit' });

  console.log('\n  [SUCCESS] SINKRONISASI BERHASIL (Single Source of Truth Aktif)!');
  console.log('='.repeat(55));
} catch (err) {
  console.error('\n  [ERROR] GAGAL SINKRONISASI:', err.message);
  process.exit(1);
}
