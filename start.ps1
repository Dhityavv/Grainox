param(
    [switch]$Dev,
    [switch]$NoBrowser
)

$ErrorActionPreference = 'Stop'
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Join-Path $RootDir 'backend'
$FrontendDir = Join-Path $RootDir 'frontend'
$PythonExe = Join-Path $BackendDir '.venv\Scripts\python.exe'

if (-not (Test-Path $PythonExe)) {
    Write-Host "[Setup] Creating Python venv in backend\.venv..." -ForegroundColor Cyan
    python -m venv (Join-Path $BackendDir '.venv')
    & $PythonExe -m pip install -r (Join-Path $BackendDir 'requirements.txt')
}

if (-not $Dev) {
    $DistIndex = Join-Path $FrontendDir 'dist\index.html'
    if (-not (Test-Path $DistIndex)) {
        Write-Host "[Setup] Building frontend bundle..." -ForegroundColor Cyan
        Push-Location $FrontendDir
        if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
            npm install
        }
        npm run build
        Pop-Location
    }

    Write-Host "Starting Archyl AI Studio at http://127.0.0.1:8000 ..." -ForegroundColor Green
    if (-not $NoBrowser) {
        Start-Job -ScriptBlock {
            Start-Sleep -Seconds 2
            Start-Process "http://127.0.0.1:8000"
        } | Out-Null
    }
    Push-Location $BackendDir
    & $PythonExe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
    Pop-Location
} else {
    Write-Host "Starting Archyl AI Dev Mode (Backend :8000 + Frontend :5173)..." -ForegroundColor Green
    $BackendProc = Start-Process -FilePath $PythonExe -ArgumentList '-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload' -WorkingDirectory $BackendDir -PassThru
    try {
        if (-not $NoBrowser) {
            Start-Job -ScriptBlock {
                Start-Sleep -Seconds 2
                Start-Process "http://localhost:5173"
            } | Out-Null
        }
        Push-Location $FrontendDir
        npm run dev
        Pop-Location
    } finally {
        if ($BackendProc -and -not $BackendProc.HasExited) {
            Stop-Process -Id $BackendProc.Id -Force
        }
    }
}

