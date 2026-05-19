# session-start-context.ps1 - SessionStart Hook
# セッション開始時に直近の daily ログと MEMORY.md のパスを stdout に案内する。
# 失敗してもセッションは止めない（必ず exit 0）。

$ErrorActionPreference = 'SilentlyContinue'
try {
    $projectRoot = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { Get-Location }
    $memoryDir   = Join-Path $projectRoot '.claude\memory'
    $dailyDir    = if ($env:CLAUDE_DAILY_DIR) { $env:CLAUDE_DAILY_DIR } else { Join-Path $memoryDir 'daily' }
    $today       = Get-Date -Format 'yyyy-MM-dd'
    $yesterday   = (Get-Date).AddDays(-1).ToString('yyyy-MM-dd')

    $lines = @()
    if (Test-Path (Join-Path $memoryDir 'MEMORY.md')) {
        $lines += "HOT: $(Join-Path $memoryDir 'MEMORY.md')"
    }
    if (Test-Path (Join-Path $dailyDir "$today.md")) {
        $lines += "Today: $(Join-Path $dailyDir "$today.md")"
    }
    if (Test-Path (Join-Path $dailyDir "$yesterday.md")) {
        $lines += "Yesterday: $(Join-Path $dailyDir "$yesterday.md")"
    }

    if ($lines.Count -eq 0) {
        Write-Host "[supermemory] ready (no memories yet)" -ForegroundColor DarkCyan
        Write-Output '{"status": "ok", "message": "no memory files yet"}'
    } else {
        $count = $lines.Count
        Write-Host "[supermemory] loaded ($count sources)" -ForegroundColor DarkCyan
        $context = ($lines | ForEach-Object { "- $_" }) -join '\n'
        $json = '{"status": "ok", "additionalContext": "Memory locations:\n' + $context + '"}'
        Write-Output $json
    }
} catch {
    Write-Output '{"status": "ok"}'
} finally {
    exit 0
}
