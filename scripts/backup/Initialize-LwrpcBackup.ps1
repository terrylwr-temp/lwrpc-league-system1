[CmdletBinding()]
param(
    [string]$OffsiteFolder = (Join-Path $env:OneDrive "LWRPC-Backups\Supabase"),
    [string]$SevenZipPath = "$env:ProgramFiles\7-Zip\7z.exe",
    [string]$PgDumpPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not $env:OneDrive -and -not $PSBoundParameters.ContainsKey('OffsiteFolder')) {
    throw 'OneDrive was not detected. Run this script with -OffsiteFolder "C:\path\inside\Dropbox-or-OneDrive".'
}

function Read-ClipboardSecret([string]$Prompt) {
    Write-Host $Prompt
    Write-Host 'Copy the value, return to this window, and press ENTER. Do not paste it into PowerShell.'
    Read-Host | Out-Null
    $value = $null
    $lastClipboardError = $null
    foreach ($attempt in 1..20) {
        try {
            $value = Get-Clipboard -Raw -ErrorAction Stop
            break
        }
        catch {
            $lastClipboardError = $_
            Start-Sleep -Milliseconds 250
        }
    }
    if ($null -eq $value) {
        throw "Windows kept the clipboard locked for five seconds. Copy the value again and rerun setup. Last error: $($lastClipboardError.Exception.Message)"
    }
    if ([string]::IsNullOrWhiteSpace($value)) { throw 'The clipboard was empty.' }
    foreach ($attempt in 1..10) {
        try {
            Set-Clipboard -Value ' ' -ErrorAction Stop
            break
        }
        catch {
            if ($attempt -eq 10) {
                Write-Warning 'Windows would not clear the clipboard. Copy harmless text after setup to replace the secret.'
            }
            Start-Sleep -Milliseconds 200
        }
    }
    $value.Trim()
}

$dbUrlPlain = Read-ClipboardSecret 'STEP 1: Copy the complete Supabase SESSION POOLER URI containing the database password.'
if ($dbUrlPlain -notmatch '^postgres(?:ql)?://') { throw 'The clipboard does not begin with postgres:// or postgresql://.' }
if ($dbUrlPlain -match '\[YOUR-PASSWORD\]') { throw 'Replace [YOUR-PASSWORD] with the real database password before copying the URI.' }
if ($dbUrlPlain -notmatch ':5432/(?:postgres)(?:\?|$)') { throw 'This does not appear to be a Session Pooler URI using port 5432.' }

$archivePasswordPlain = Read-ClipboardSecret 'STEP 2: Copy the new backup-archive password from your password manager.'
try {
    if ($archivePasswordPlain.Length -lt 16) { throw 'Use an archive password containing at least 16 characters.' }
}
finally {
    try { Set-Clipboard -Value ' ' -ErrorAction Stop } catch { Write-Warning 'Copy harmless text now to replace the password still held by the clipboard.' }
}

$managementTokenPlain = Read-ClipboardSecret 'STEP 3: Copy a Supabase personal access token from Account > Access Tokens.'
if ($managementTokenPlain.Length -lt 20) { throw 'The Supabase personal access token appears too short.' }

if ($dbUrlPlain -notmatch 'postgres(?:ql)?://postgres\.([a-z0-9]+):') {
    throw 'The project reference could not be extracted from the Session Pooler URI.'
}
$projectRef = $Matches[1]

try {
    $null = Invoke-RestMethod -Method Get -Uri "https://api.supabase.com/v1/projects/$projectRef" -Headers @{ Authorization = "Bearer $managementTokenPlain" }
}
catch {
    throw "The Supabase Management API token or project reference could not be verified: $($_.Exception.Message)"
}

if (-not (Test-Path -LiteralPath $SevenZipPath -PathType Leaf)) {
    throw "7-Zip was not found at $SevenZipPath. Install 7-Zip or supply -SevenZipPath."
}

if (-not $PgDumpPath) {
    $candidates = @(
        "$env:ProgramFiles\pgAdmin 4\runtime\pg_dump.exe"
        Get-ChildItem "$env:ProgramFiles\PostgreSQL\*\bin\pg_dump.exe" -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | ForEach-Object FullName
    )
    $PgDumpPath = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_ -PathType Leaf) } | Select-Object -First 1
}
if (-not $PgDumpPath) {
    throw 'pg_dump.exe was not found. Install pgAdmin 4 or supply -PgDumpPath with its complete path.'
}
$pgBin = Split-Path -Parent $PgDumpPath
$pgDumpAllPath = Join-Path $pgBin 'pg_dumpall.exe'
if (-not (Test-Path -LiteralPath $pgDumpAllPath -PathType Leaf)) { throw "Missing $pgDumpAllPath" }

$config = [ordered]@{
    OffsiteFolder = $OffsiteFolder
    SevenZipPath = $SevenZipPath
    PgDumpPath = $PgDumpPath
    PgDumpAllPath = $pgDumpAllPath
    ProjectRef = $projectRef
    WeeklyRetentionCount = 12
    MonthlyRetentionCount = 12
    MinimumRolesBytes = 100
    MinimumSchemaBytes = 1000
    MinimumDataBytes = 1000
}

$secrets = [ordered]@{
    DatabaseUrl = ConvertFrom-SecureString (ConvertTo-SecureString $dbUrlPlain -AsPlainText -Force)
    ArchivePassword = ConvertFrom-SecureString (ConvertTo-SecureString $archivePasswordPlain -AsPlainText -Force)
    ManagementAccessToken = ConvertFrom-SecureString (ConvertTo-SecureString $managementTokenPlain -AsPlainText -Force)
}
$dbUrlPlain = $null
$archivePasswordPlain = $null
$managementTokenPlain = $null

$configPath = Join-Path $PSScriptRoot 'backup-config.json'
$secretPath = Join-Path $PSScriptRoot 'backup-secrets.dpapi.json'
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8
$secrets | ConvertTo-Json | Set-Content -LiteralPath $secretPath -Encoding UTF8

New-Item -ItemType Directory -Force -Path (Join-Path $OffsiteFolder 'Weekly') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OffsiteFolder 'Monthly') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $OffsiteFolder 'Logs') | Out-Null

Write-Host "Configuration created: $configPath"
Write-Host 'Secrets are encrypted for the current Windows user and computer.'
Write-Host "PostgreSQL backup tool: $PgDumpPath"
Write-Host 'Next: run .\Invoke-LwrpcBackup.ps1 once, then install the scheduled task.'
