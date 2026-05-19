# search.ps1 — Supermemory 検索エントリポイント
[CmdletBinding()]
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$SearchArgs
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

function Find-ProjectRoot {
    $d = (Get-Location).Path
    while ($true) {
        if (Test-Path (Join-Path $d '.claude\memory')) {
            return $d
        }
        $parent = Split-Path -Parent $d
        if ($parent -eq $d) { break }
        $d = $parent
    }
    return (Get-Location).Path
}

$ProjectRoot = Find-ProjectRoot

$venvPython = Join-Path $ProjectRoot '.venv\Scripts\python.exe'
if (Test-Path $venvPython) {
    $py = $venvPython
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $py = (Get-Command python).Source
} else {
    Write-Error '[error] python not found'
    exit 2
}

function Show-Usage {
    Write-Host "Usage:"
    Write-Host "  search.ps1 <query>"
    Write-Host "  search.ps1 --legacy <query>"
    Write-Host "  search.ps1 --trace  <name>"
    Write-Host "  search.ps1 --vector <query>"
    Write-Host "  search.ps1 --reindex"
    Write-Host ""
    Write-Host "  --legacy  : migration_links search"
    Write-Host "  --trace   : name lineage trace"
    Write-Host "  --vector  : vector search (sqlite-vec)"
    Write-Host "  --reindex : rebuild index"
}

if ($SearchArgs.Count -eq 0) {
    Show-Usage
    exit 1
}

$mode = $SearchArgs[0]
[string[]]$rest = @()
if ($SearchArgs.Count -gt 1) {
    $rest = [string[]]$SearchArgs[1..($SearchArgs.Count - 1)]
}

switch ($mode) {
    { $_ -eq '-h' -or $_ -eq '--help' } {
        Show-Usage
        exit 0
    }
    '--trace' {
        if ($rest.Count -eq 0) {
            Write-Error 'Usage: search.ps1 --trace <name>'
            exit 1
        }
        $tracePy = Join-Path $ScriptDir 'trace.py'
        if (-not (Test-Path $tracePy)) {
            Write-Error "[error] trace.py not found: $tracePy"
            exit 2
        }
        if (-not $env:SUPERMEMORY_DB) {
            $env:SUPERMEMORY_DB = Join-Path $ProjectRoot '.claude\memory\memory.db'
        }
        & $py $tracePy @rest
        exit $LASTEXITCODE
    }
    '--legacy' {
        $legacyPy = Join-Path $ScriptDir 'search-with-migration.py'
        if (-not (Test-Path $legacyPy)) {
            Write-Error "[error] search-with-migration.py not found: $legacyPy"
            exit 2
        }
        & $py $legacyPy @rest
        exit $LASTEXITCODE
    }
    '--vector' {
        $env:SUPERMEMORY_VECTOR = '1'
        $searchPy = Join-Path $ScriptDir 'search.py'
        & $py $searchPy --vector --root $ProjectRoot @rest
        exit $LASTEXITCODE
    }
    '--reindex' {
        $indexPy = Join-Path $ScriptDir 'index.py'
        if (-not (Test-Path $indexPy)) {
            Write-Error "[error] index.py not found: $indexPy"
            exit 2
        }
        & $py $indexPy @rest
        exit $LASTEXITCODE
    }
    default {
        $searchPy = Join-Path $ScriptDir 'search.py'
        & $py $searchPy --root $ProjectRoot @SearchArgs
        exit $LASTEXITCODE
    }
}
