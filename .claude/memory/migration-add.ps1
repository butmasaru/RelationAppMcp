# migration-add.ps1 — migration_links に1件追加するヘルパー。
#
# Usage:
#   migration-add.ps1 <logical_id> <old_name> <new_name> <kind> [reason]

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$LogicalId,

    [Parameter(Mandatory = $true, Position = 1)]
    [string]$OldName,

    [Parameter(Mandatory = $true, Position = 2)]
    [string]$NewName,

    [Parameter(Mandatory = $true, Position = 3)]
    [ValidateSet('project', 'technology', 'concept', 'path')]
    [string]$Kind,

    [Parameter(Mandatory = $false, Position = 4)]
    [string]$Reason = ''
)

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

if ($env:SUPERMEMORY_DB) {
    $db = $env:SUPERMEMORY_DB
} else {
    $root = Find-ProjectRoot
    $db = Join-Path $root '.claude\memory\memory.db'
}

if (-not (Test-Path $db)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $initPy = Join-Path $scriptDir 'init-migration.py'
    Write-Error "[error] DB not found: $db"
    Write-Host "[hint]  Run: python $initPy" -ForegroundColor Yellow
    exit 2
}

$today = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')

$root = Find-ProjectRoot
$venvPython = Join-Path $root '.venv\Scripts\python.exe'
if (Test-Path $venvPython) {
    $py = $venvPython
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $py = (Get-Command python).Source
} else {
    Write-Error '[error] python not found'
    exit 2
}

$tmpFile = [System.IO.Path]::GetTempFileName() -replace '\.tmp$', '.py'
try {
    $pyContent = @(
        "import sqlite3, sys"
        "db, lid, old, new, kind, dt, reason = sys.argv[1:8]"
        "con = sqlite3.connect(db)"
        "cur = con.cursor()"
        "cur.execute("
        "    'INSERT OR IGNORE INTO migration_links'"
        "    ' (logical_id, old_name, new_name, kind, status, migrated_at, reason)'"
        "    ' VALUES (?, ?, ?, ?, ?, ?, ?)',"
        "    (lid, old, new, kind, 'completed', dt, reason))"
        "con.commit()"
        "changed = cur.rowcount"
        "cur.execute('SELECT COUNT(*) FROM migration_links')"
        "total = cur.fetchone()[0]"
        "con.close()"
        "print(changed)"
        "print(total)"
    ) -join "`n"
    [System.IO.File]::WriteAllText($tmpFile, $pyContent, [System.Text.Encoding]::UTF8)

    $output = & $py $tmpFile $db $LogicalId $OldName $NewName $Kind $today $Reason
    if ($LASTEXITCODE -ne 0) {
        Write-Error '[error] DB operation failed'
        exit 3
    }
} finally {
    if (Test-Path $tmpFile) { Remove-Item $tmpFile -Force -Confirm:$false }
}

$lines  = $output -split "`n" | Where-Object { $_ -ne '' }
$changed = $lines[0].Trim()
$total   = $lines[1].Trim()

if ($changed -eq '0') {
    Write-Host '[skip] duplicate entry (UNIQUE constraint)'
} else {
    Write-Host "[ok] added: $OldName -> $NewName [$Kind]"
}
Write-Host "[ok] migration_links total: $total"
