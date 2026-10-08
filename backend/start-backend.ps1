# Script ini otomatis pindah ke folder backend yang benar (folder tempat
# script ini berada), lalu membuat/menyalakan venv yang benar, install
# dependency, dan menjalankan server. Cukup jalankan file ini setiap kali
# mau menyalakan backend, tidak perlu hafal urutan perintah manual lagi.

Set-Location -Path $PSScriptRoot

if (-not (Test-Path ".\venv")) {
    Write-Host "Virtual environment belum ada, membuat baru di backend\venv ..."
    python -m venv venv
}

Write-Host "Mengaktifkan virtual environment di backend\venv ..."
& ".\venv\Scripts\Activate.ps1"

Write-Host "Menginstall/memastikan dependency terpasang ..."
pip install -q -r requirements.txt

Write-Host "Menjalankan server di http://localhost:8000 ..."
uvicorn main:app --reload --port 8000
