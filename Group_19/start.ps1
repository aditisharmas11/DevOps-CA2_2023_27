# MediTwin — Start All Services
# Usage: .\start.ps1
# Run from the MediTwin\ root directory.

$root = $PSScriptRoot

function Kill-Port ([int]$Port) {
    $ids = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
    foreach ($id in $ids) {
        if ($id) {
            Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
            Write-Host "  Freed port $Port (PID $id)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  MediTwin - Starting Services" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`nFreeing ports 5000 and 5173..." -ForegroundColor Yellow
Kill-Port 5000
Kill-Port 5173
Start-Sleep -Seconds 1

# Backend (runs Node + orchestrates Python AI engines directly)
Write-Host "`n[1/2] Starting backend on :5000 ..." -ForegroundColor Green
$backendDir = Join-Path $root "backend"
$backendScript = "Set-Location '$backendDir'; node server.js"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $backendScript)

Start-Sleep -Seconds 2

# Frontend
Write-Host "[2/2] Starting frontend on :5173 ..." -ForegroundColor Green
$frontendDir = Join-Path $root "frontend"
$frontendScript = "Set-Location '$frontendDir'; npm run dev"
Start-Process powershell -ArgumentList @("-NoExit", "-Command", $frontendScript)

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "  Backend   ->  http://localhost:5000/api/ping"
Write-Host "  Frontend  ->  http://localhost:5173"
Write-Host "  Theme     ->  Emerald (Primary)"
Write-Host "  AI Engine ->  Integrated Direct Python Subprocess"
Write-Host "==========================================" -ForegroundColor Cyan

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
