# pre-compact-flush.ps1 - PreCompact Hook
# コンテキスト圧縮の直前にマーカーを daily ログへ追記する。

$ErrorActionPreference = 'SilentlyContinue'
try {
    $projectRoot = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { Get-Location }
    $dailyDir    = if ($env:CLAUDE_DAILY_DIR) { $env:CLAUDE_DAILY_DIR } else { Join-Path $projectRoot '.claude\memory\daily' }
    $date        = Get-Date -Format 'yyyy-MM-dd'
    $time        = Get-Date -Format 'HH:mm'
    $logFile     = Join-Path $dailyDir "$date.md"

    if (-not (Test-Path $dailyDir)) {
        New-Item -ItemType Directory -Force -Path $dailyDir | Out-Null
    }
    if (-not (Test-Path $logFile)) {
        Set-Content -Path $logFile -Value "# $date daily log`n" -Encoding utf8
    }

    $entry = "`n## $time - PreCompact flush`n- (PreCompact Hook)`n"
    Add-Content -Path $logFile -Value $entry -Encoding utf8

    Write-Host "[supermemory] compact flush -> daily/$date.md" -ForegroundColor DarkCyan
    Write-Output '{"status": "ok", "message": "pre-compact flush logged"}'
} catch {
    Write-Output '{"status": "ok"}'
} finally {
    exit 0
}
