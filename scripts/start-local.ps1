# 프런트와 API를 함께 켭니다. 기존 서버가 있으면 중복 실행하지 않습니다.
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectPath
$pythonPath = Join-Path $projectPath '.runtime/python/python.exe'
if (!(Test-Path -LiteralPath $pythonPath)) { $pythonPath = Join-Path $projectPath '.venv/Scripts/python.exe' }
if (!(Test-Path -LiteralPath $pythonPath)) { throw 'Python 환경을 먼저 준비해 주세요.' }
$env:DATABASE_URL = 'sqlite:///' + ($projectPath.Replace('\', '/') + '/backend/startin.db')
$env:CORS_ORIGINS = 'http://127.0.0.1:5175,http://localhost:5175'
$env:COOKIE_SECURE = 'false'
$env:BACKEND_URL = 'http://127.0.0.1:8000'
# 파일 복사 중 Windows가 감시 핸들을 잠가도 서버가 종료되지 않도록 합니다.
$env:CHOKIDAR_USEPOLLING = 'true'
New-Item -ItemType Directory -Path '.cache' -Force | Out-Null
# 포트 조회 권한 대신 HTTP 응답으로 이미 켜진 서버를 확인합니다.
function Test-LocalServer([string]$url) {
  try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true }
  catch { return $false }
}
if (!(Test-LocalServer 'http://127.0.0.1:8000/api/health')) {
  Start-Process -FilePath $pythonPath -ArgumentList '-m','uvicorn','backend.app.main:app','--host','127.0.0.1','--port','8000' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput '.cache/local-api.stdout.log' -RedirectStandardError '.cache/local-api.stderr.log' | Out-Null
}
if (!(Test-LocalServer 'http://127.0.0.1:5175/main')) {
  Start-Process -FilePath (Get-Command node).Source -ArgumentList 'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175','--strictPort' -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput '.cache/local-web.stdout.log' -RedirectStandardError '.cache/local-web.stderr.log' | Out-Null
}
Write-Output '프런트: http://127.0.0.1:5175/main / API: http://127.0.0.1:8000'
