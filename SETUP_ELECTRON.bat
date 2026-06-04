@echo off
echo ============================================================
echo  CIMEGA SMART OFFICE — Setup Electron Binary
echo ============================================================
echo.
echo  Electron binary tidak terdownload otomatis karena masalah
echo  koneksi ke GitHub Releases. Jalankan script ini sebagai
echo  solusi alternatif.
echo.
echo  Pilihan:
echo  1. Download manual dari: https://github.com/electron/electron/releases/tag/v33.4.0
echo     File: electron-v33.4.0-win32-x64.zip
echo     Ekstrak ke: node_modules\electron\dist\
echo.
echo  2. Atau jalankan perintah berikut di Command Prompt:
echo     set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
echo     npm install electron@33.4.0 --save-dev
echo.
echo  3. Atau gunakan mirror China (jika tidak bisa akses GitHub):
echo     set ELECTRON_GET_USE_PROXY=true
echo     set ELECTRON_CUSTOM_DIR=%%USERPROFILE%%\.electron
echo     node node_modules\electron\install.js
echo.
echo  Setelah electron.exe tersedia di node_modules\electron\dist\
echo  jalankan: npm start
echo.
pause
