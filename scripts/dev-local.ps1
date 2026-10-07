$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectPath
$pythonPath = Join-Path $projectPath '.venv/Scripts/python.exe'
if (!(Test-Path -LiteralPath $pythonPath)) {
  throw '프로젝트의 .venv Python 환경을 먼저 준비해 주세요.'
}
# 운영 서버와 분리된 로컬 데이터만 사용합니다.
New-Item -ItemType Directory -Path (Join-Path $projectPath '.cache') -Force | Out-Null
$env:DATABASE_URL = 'sqlite:///' + ($projectPath.Replace('\', '/') + '/.cache/logout-route-20261007-test.db')
$env:CORS_ORIGINS = 'http://127.0.0.1:5175,http://localhost:5175'
$env:COOKIE_SECURE = 'false'
$env:BACKEND_URL = 'http://127.0.0.1:8002'
$apiProcess = Start-Process -FilePath $pythonPath -ArgumentList '-m','uvicorn','backend.app.main:app','--host','127.0.0.1','--port','8002' -WorkingDirectory $projectPath -WindowStyle Hidden -PassThru
try {
  npm run dev -- --port 5175 --strictPort
} finally {
  # 이 실행에서 만든 API 프로세스만 종료합니다.
  if (!$apiProcess.HasExited) { Stop-Process -Id $apiProcess.Id }
}
