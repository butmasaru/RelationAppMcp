# post-tool-memory-index.ps1 - PostToolUse Hook
# .claude/memory/ 配下の md 編集時のみ index.py を呼んで再インデックス。

$ErrorActionPreference = 'SilentlyContinue'
try {
    $projectRoot = if ($env:CLAUDE_PROJECT_DIR) { $env:CLAUDE_PROJECT_DIR } else { (Get-Location).Path }
    $memoryDir   = Join-Path $projectRoot '.claude\memory'
    $indexScript = Join-Path $memoryDir 'index.py'

    $projectHash = [System.Math]::Abs($projectRoot.GetHashCode()).ToString()
    $mutexName   = "Global\supermemory-index-$projectHash"

    $rawInput = try {
        $reader = [System.IO.StreamReader]::new([Console]::OpenStandardInput())
        $buf    = New-Object char[] 65536
        $read   = $reader.Read($buf, 0, 65536)
        [string]::new($buf, 0, $read)
    } catch { '{}' }
    if ([string]::IsNullOrWhiteSpace($rawInput)) { $rawInput = '{}' }

    $filePath = ''
    try {
        $parsed   = $rawInput | ConvertFrom-Json
        $filePath = if ($parsed.tool_input -and $parsed.tool_input.file_path) { $parsed.tool_input.file_path } else { '' }
    } catch {
        $filePath = ''
    }

    $skip = $true
    if ($filePath -and ($filePath -like "$memoryDir\*" -or $filePath -like "*/.claude/memory/*")) {
        $skip = $false
    }

    if ($skip -or -not (Test-Path $indexScript)) {
        Write-Output '{"status": "ok", "message": "skipped"}'
        exit 0
    }

    $mutex   = [System.Threading.Mutex]::new($false, $mutexName)
    $acquired = $false
    try {
        $acquired = $mutex.WaitOne(0)
    } catch {
        $acquired = $false
    }

    if (-not $acquired) {
        Write-Output '{"status": "ok", "message": "indexer already running"}'
        exit 0
    }

    $python = if ($env:CLAUDE_VENV_PYTHON) { $env:CLAUDE_VENV_PYTHON } else { 'python' }
    $baseName = [System.IO.Path]::GetFileName($filePath)

    Start-Process -NoNewWindow -FilePath $python -ArgumentList "`"$indexScript`"", '--file', "`"$filePath`""

    Write-Host "[supermemory] recorded: $baseName" -ForegroundColor DarkCyan
    Write-Output "{`"status`": `"ok`", `"message`": `"reindex triggered: $baseName`"}"
} catch {
    Write-Output '{"status": "ok"}'
} finally {
    exit 0
}
