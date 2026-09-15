[CmdletBinding()]
param(
    [string]$ConfigPath = (Join-Path $PSScriptRoot 'backup-config.json'),
    [string]$SecretPath = (Join-Path $PSScriptRoot 'backup-secrets.dpapi.json')
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function ConvertTo-PlainText([Security.SecureString]$Value) {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$secrets = Get-Content -LiteralPath $SecretPath -Raw | ConvertFrom-Json
$password = ConvertTo-PlainText ($secrets.ArchivePassword | ConvertTo-SecureString)
$extractFolder = Join-Path ([IO.Path]::GetTempPath()) "LWRPC-Backup-Test-$([guid]::NewGuid().ToString('N'))"

try {
    $archive = Get-ChildItem -LiteralPath (Join-Path $config.OffsiteFolder 'Weekly') -Filter '*.7z' -File |
        Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if (-not $archive) { throw 'No weekly backup archive was found.' }

    $checksumFile = "$($archive.FullName).sha256"
    if (-not (Test-Path -LiteralPath $checksumFile)) { throw 'The checksum file is missing.' }
    $expected = ((Get-Content -LiteralPath $checksumFile -Raw).Trim() -split '\s+')[0]
    $actual = (Get-FileHash -LiteralPath $archive.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -cne $expected) { throw 'The archive checksum does not match.' }

    New-Item -ItemType Directory -Path $extractFolder | Out-Null
    & $config.SevenZipPath 'x' '-y' ("-p$password") ("-o$extractFolder") $archive.FullName | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "7-Zip extraction failed with exit code $LASTEXITCODE." }

    foreach ($name in 'roles.sql','schema.sql','data.sql','supabase-project-config.redacted.json','supabase-auth-config.redacted.json','supabase-api-key-recovery.json','RECOVERY-CONFIGURATION-CHECKLIST.md') {
        $path = Join-Path $extractFolder $name
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "$name is missing from the archive." }
        if ((Get-Item -LiteralPath $path).Length -eq 0) { throw "$name is empty." }
    }

    if (Test-Path -LiteralPath (Join-Path $extractFolder 'CONFIGURATION-SNAPSHOT-FAILED.txt')) {
        throw 'The archive reports that the Supabase configuration snapshot failed.'
    }

    Write-Host "PASS: database, configuration snapshot, checksum, decryption, extraction, and required-file checks succeeded for $($archive.Name)."
    Write-Host 'This integrity test does not replace the periodic restore test described in README.md.'
}
finally {
    $password = $null
    if (Test-Path -LiteralPath $extractFolder) { Remove-Item -LiteralPath $extractFolder -Recurse -Force }
}
