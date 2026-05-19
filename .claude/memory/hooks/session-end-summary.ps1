# session-end-summary.ps1 - SessionEnd Hook
# セッション終了時に簡易サマリを daily ログへ追記する。
# Hook Protocol: stdin=JSON, stdout=JSON, exit 0

$ErrorActionPreference = 'SilentlyContinue'
try {
    $projectRoot = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { Get-Location }
    $memoryDir   = Join-Path $projectRoot '.claude\memory'
    $dailyDir    = if ($env:CLAUDE_DAILY_DIR) { $env:CLAUDE_DAILY_DIR } else { Join-Path $memoryDir 'daily' }
    $date        = Get-Date -Format 'yyyy-MM-dd'
    $time        = Get-Date -Format 'HH:mm'
    $logFile     = Join-Path $dailyDir "$date.md"

    $rawInput = try { [Console]::In.ReadToEnd() } catch { '{}' }
    if ([string]::IsNullOrWhiteSpace($rawInput)) { $rawInput = '{}' }

    $sessionId = 'unknown'
    try {
        $parsed    = $rawInput | ConvertFrom-Json
        $sessionId = if ($parsed.session_id) { $parsed.session_id } else { 'unknown' }
    } catch {
        $sessionId = 'unknown'
    }
    $sessionId = $sessionId -replace '[^a-zA-Z0-9_\-]', ''
    if ([string]::IsNullOrWhiteSpace($sessionId)) { $sessionId = 'unknown' }

    if (-not (Test-Path $dailyDir)) {
        New-Item -ItemType Directory -Force -Path $dailyDir | Out-Null
    }
    if (-not (Test-Path $logFile)) {
        Set-Content -Path $logFile -Value "# $date daily log`n" -Encoding utf8
    }

    $entry = "`n## $time - session end`n- Session: $sessionId`n- (SessionEnd Hook)`n"
    Add-Content -Path $logFile -Value $entry -Encoding utf8

    Write-Host "[supermemory] session end -> daily/$date.md" -ForegroundColor DarkCyan
    Write-Output '{"status": "ok", "message": "session end logged"}'
} catch {
    Write-Output '{"status": "ok"}'
} finally {
    exit 0
}
