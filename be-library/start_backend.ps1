Write-Host "============ CLEANING PORTS ============"
$ports = @(8000, 8001, 8002, 4200)
foreach ($port in $ports) {
    $proc = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($proc) {
        Write-Host "Killing process on port $port (PID: $proc)..."
        Stop-Process -Id $proc -Force
    }
}

Write-Host "============ STARTING BACKEND SETUP ============"
$ErrorActionPreference = "Stop"

cd D:\Nhom14_ChuongTrinh_22CN2\be\be-library

if (-Not (Test-Path "venv_win")) {
    Write-Host "Creating Python virtual environment 'venv_win'..."
    python -m venv venv_win
}

Write-Host "Activating virtual environment and installing Python dependencies..."
& .\venv_win\Scripts\python.exe -m pip install --upgrade pip
& .\venv_win\Scripts\python.exe -m pip install -r requirements.txt

Write-Host "Installing Backend dependencies..."
npm install
cd api-gateway
npm install
cd ..

Write-Host "Installing Frontend dependencies..."
cd ..\fe-library\fe
npm install
cd ..\..\be-library

Write-Host "============ ALL SET, RUNNING SERVICES ============"
npm run dev
