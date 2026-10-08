# Script ini otomatis pindah ke folder frontend yang benar (folder tempat
# script ini berada), install dependency kalau belum ada, lalu menjalankan
# aplikasi Next.js.

Set-Location -Path $PSScriptRoot

if (-not (Test-Path ".\node_modules")) {
    Write-Host "Dependency belum terinstall, menjalankan npm install ..."
    npm install
}

Write-Host "Menjalankan aplikasi di http://localhost:3000 ..."
npm run dev
