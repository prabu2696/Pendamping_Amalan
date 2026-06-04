const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');
const { globSync } = require('glob');
const bytenode = require('bytenode');

async function runSecureBuild() {
    console.log("============== CIMEGA SECURE BUILD ==============");
    console.log("[1/5] Memulai proses backup source code murni...");

    // 1. Backup file asli agar ruang kerja (workspace) tetap aman
    if (fs.existsSync('.src_backup')) {
        fs.removeSync('.src_backup');
    }
    fs.copySync('src', '.src_backup');

    try {
        console.log("[2/5] Mengacak (Obfuscate) kode javascript renderer...");
        
        // Kumpulkan semua file JS, kecualikan file main/preload terlebih dahulu untuk penanganan khusus
        const jsFiles = globSync('src/**/*.js', { ignore: 'node_modules/**' });
        
        jsFiles.forEach(file => {
            // Kita obfuscate semua file terlebih dahulu
            const code = fs.readFileSync(file, 'utf8');
            const result = JavaScriptObfuscator.obfuscate(code, {
                compact: true,
                controlFlowFlattening: true,       // Membuat logika berputar-putar rumit
                controlFlowFlatteningThreshold: 0.6,
                debugProtection: true,             // 🛑 ANTI-DEBUGGER
                debugProtectionInterval: 4000,
                disableConsoleOutput: true,        // Menghilangkan semua console.log
                identifierNamesGenerator: 'hexadecimal', 
                selfDefending: true,               
                stringArray: true,
                stringArrayEncoding: ['base64', 'rc4'],
                splitStrings: true,
                splitStringsChunkLength: 5
            });
            fs.writeFileSync(file, result.getObfuscatedCode(), 'utf8');
        });

        console.log("[3/5] Mengompilasi main.js dan preload.js ke V8 Bytecode (.jsc)...");
        
        const mainJsPath = 'src/services/electron/main.js';
        const preloadJsPath = 'src/services/electron/preload.js';

        // Kompilasi file menjadi bytecode biner .jsc
        await bytenode.compileFile({
            filename: mainJsPath,
            output: 'src/services/electron/main.jsc'
        });

        await bytenode.compileFile({
            filename: preloadJsPath,
            output: 'src/services/electron/preload.jsc'
        });

        // Ganti main.js dan preload.js dengan loader Bytenode sederhana
        const mainLoaderCode = `const bytenode = require('bytenode');\nrequire('./main.jsc');\n`;
        const preloadLoaderCode = `const bytenode = require('bytenode');\nrequire('./preload.jsc');\n`;

        fs.writeFileSync(mainJsPath, mainLoaderCode, 'utf8');
        fs.writeFileSync(preloadJsPath, preloadLoaderCode, 'utf8');

        console.log("[4/5] Kompilasi biner selesai. Memulai pembuatan installer (electron-builder)...");
        
        // Jalankan electron-builder
        execSync('npx electron-builder --win --x64', { stdio: 'inherit' });

        console.log("[5/5] Build Selesai. Ekstraksi Installer sukses!");

    } catch (e) {
        console.error("❌ Terjadi Kesalahan saat proses Build: ", e.message);
    } finally {
        console.log("Memulihkan source code murni ke ruang kerja...");
        
        // Restore file asli bagaimanapun hasil build-nya (sukses/gagal)
        if (fs.existsSync('.src_backup')) {
            fs.removeSync('src');                     // Hapus folder src hasil enkripsi/kompilasi
            fs.renameSync('.src_backup', 'src');      // Kembalikan folder murni asli
        }

        console.log("============== SELESAI ==============");
        console.log("Source code aman, Installer `.exe` biner terlindungi siap didistribusikan!");
    }
}

// Menghandle proses kill paksa agar file tidak hilang (Ctrl+C manual)
process.on('SIGINT', () => {
    console.log("\nProses dibatalkan pengguna. Memulihkan file asli...");
    if (fs.existsSync('.src_backup')) {
        fs.removeSync('src');
        fs.renameSync('.src_backup', 'src');
    }
    process.exit();
});

runSecureBuild();
