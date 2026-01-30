# Windows에서 Redis 시작 스크립트 (Docker 사용)
# 프로젝트 루트(lol-ai-project)에서 실행하거나, 이 스크립트가 있는 위치 기준으로 상위 두 단계가 프로젝트 루트여야 함.

$ProjectRoot = if ($PSScriptRoot) { Join-Path $PSScriptRoot "..\.." } else { Split-Path (Get-Location) -Parent }
$ComposePath = Join-Path $ProjectRoot "docker-compose.yml"

if (-not (Test-Path $ComposePath)) {
    Write-Host "docker-compose.yml을 찾을 수 없습니다. 프로젝트 루트에서 실행해 주세요." -ForegroundColor Red
    exit 1
}

Write-Host "Redis 컨테이너 시작 중 (localhost:6379)..." -ForegroundColor Cyan
Set-Location $ProjectRoot
docker compose up -d redis 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Redis가 정상적으로 시작되었습니다. 백엔드 서버를 실행하면 'Redis 연결 성공' 메시지가 표시됩니다." -ForegroundColor Green
} else {
    Write-Host "Docker가 설치되어 있지 않거나 실행 중이 아닐 수 있습니다." -ForegroundColor Yellow
    Write-Host "대안: backend\docs\REDIS-WINDOWS.md 를 참고하여 Memurai 설치 또는 WSL에서 Redis를 실행하세요." -ForegroundColor Yellow
    exit 1
}
