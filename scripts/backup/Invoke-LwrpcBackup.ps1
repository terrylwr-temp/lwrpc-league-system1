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

function Invoke-External([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE." }
}

function Remove-OldFiles([string]$Folder, [string]$Filter, [int]$Keep) {
    $files = @(Get-ChildItem -LiteralPath $Folder -File -Filter $Filter | Sort-Object LastWriteTimeUtc -Descending)
    if ($files.Count -gt $Keep) {
        $files | Select-Object -Skip $Keep | Remove-Item -Force
    }
}

function Protect-ConfigurationValue($Value, [string]$PropertyName = '') {
    if ($PropertyName -match '(?i)(secret|password|passwd|token|api.?key|private.?key|signing.?key)') {
        return '[REDACTED - RESTORE FROM PASSWORD MANAGER]'
    }
    if ($null -eq $Value) { return $null }
    if ($Value -is [System.Collections.IDictionary]) {
        $safe = [ordered]@{}
        foreach ($key in $Value.Keys) { $safe[$key] = Protect-ConfigurationValue $Value[$key] ([string]$key) }
        return $safe
    }
    if ($Value -is [pscustomobject]) {
        $safe = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            $safe[$property.Name] = Protect-ConfigurationValue $property.Value $property.Name
        }
        return $safe
    }
    if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
        return @($Value | ForEach-Object { Protect-ConfigurationValue $_ $PropertyName })
    }
    $Value
}

$mutex = [Threading.Mutex]::new($false, 'LWRPC-Supabase-Backup')
if (-not $mutex.WaitOne(0)) { throw 'Another LWRPC backup is already running.' }

$workFolder = $null
$dbUrlPlain = $null
$archivePasswordPlain = $null
$managementTokenPlain = $null
try {
    $config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    $secrets = Get-Content -LiteralPath $SecretPath -Raw | ConvertFrom-Json
    $dbUrlPlain = ConvertTo-PlainText ($secrets.DatabaseUrl | ConvertTo-SecureString)
    $archivePasswordPlain = ConvertTo-PlainText ($secrets.ArchivePassword | ConvertTo-SecureString)
    $managementTokenPlain = ConvertTo-PlainText ($secrets.ManagementAccessToken | ConvertTo-SecureString)

    if (-not (Test-Path -LiteralPath $config.PgDumpPath -PathType Leaf)) { throw "Missing pg_dump at $($config.PgDumpPath)." }
    if (-not (Test-Path -LiteralPath $config.PgDumpAllPath -PathType Leaf)) { throw "Missing pg_dumpall at $($config.PgDumpAllPath)." }

    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
    $workFolder = Join-Path ([IO.Path]::GetTempPath()) "LWRPC-Supabase-$stamp"
    New-Item -ItemType Directory -Path $workFolder | Out-Null

    $roles = Join-Path $workFolder 'roles.sql'
    $schema = Join-Path $workFolder 'schema.sql'
    $data = Join-Path $workFolder 'data.sql'

    Invoke-External $config.PgDumpAllPath @('--dbname',$dbUrlPlain,'--roles-only','--no-role-passwords','--file',$roles)
    Invoke-External $config.PgDumpPath @('--dbname',$dbUrlPlain,'--schema-only','--no-owner','--no-subscriptions','--file',$schema)
    Invoke-External $config.PgDumpPath @('--dbname',$dbUrlPlain,'--data-only','--no-owner','--no-subscriptions','--file',$data)

    $configurationStatus = 'success'
    try {
        $headers = @{ Authorization = "Bearer $managementTokenPlain" }
        $baseUrl = "https://api.supabase.com/v1/projects/$($config.ProjectRef)"
        $projectConfiguration = Invoke-RestMethod -Method Get -Uri $baseUrl -Headers $headers
        $authConfiguration = Invoke-RestMethod -Method Get -Uri "$baseUrl/config/auth" -Headers $headers

        Protect-ConfigurationValue $projectConfiguration | ConvertTo-Json -Depth 30 |
            Set-Content -LiteralPath (Join-Path $workFolder 'supabase-project-config.redacted.json') -Encoding UTF8
        Protect-ConfigurationValue $authConfiguration | ConvertTo-Json -Depth 30 |
            Set-Content -LiteralPath (Join-Path $workFolder 'supabase-auth-config.redacted.json') -Encoding UTF8
        [ordered]@{
            recoveryAction = 'Generate new publishable and secret keys in the replacement Supabase project, update Vercel environment variables, and redeploy.'
            exportedSecretValues = $false
            reason = 'Project API keys are project-specific and Secrets Read is intentionally not granted to this backup token.'
        } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $workFolder 'supabase-api-key-recovery.json') -Encoding UTF8

        Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'RECOVERY-CONFIGURATION-CHECKLIST.md') -Destination $workFolder
    }
    catch {
        $configurationStatus = 'failed'
        "Configuration snapshot failed at $((Get-Date).ToUniversalTime().ToString('o')). Re-run the backup after checking the Management API token. Error: $($_.Exception.Message)" |
            Set-Content -LiteralPath (Join-Path $workFolder 'CONFIGURATION-SNAPSHOT-FAILED.txt') -Encoding UTF8
        Write-Warning "The database dump succeeded, but the Supabase configuration snapshot failed: $($_.Exception.Message)"
    }

    $minimums = @{
        $roles = [int64]$config.MinimumRolesBytes
        $schema = [int64]$config.MinimumSchemaBytes
        $data = [int64]$config.MinimumDataBytes
    }
    foreach ($path in $minimums.Keys) {
        $item = Get-Item -LiteralPath $path
        if ($item.Length -lt $minimums[$path]) { throw "$($item.Name) is unexpectedly small ($($item.Length) bytes)." }
    }

    $weeklyFolder = Join-Path $config.OffsiteFolder 'Weekly'
    $monthlyFolder = Join-Path $config.OffsiteFolder 'Monthly'
    $logFolder = Join-Path $config.OffsiteFolder 'Logs'
    New-Item -ItemType Directory -Force -Path $weeklyFolder,$monthlyFolder,$logFolder | Out-Null

    $archive = Join-Path $weeklyFolder "LWRPC-Supabase-$stamp.7z"
    Invoke-External $config.SevenZipPath @('a','-t7z','-mx=9','-mhe=on',("-p$archivePasswordPlain"),$archive,(Join-Path $workFolder '*'))
    Invoke-External $config.SevenZipPath @('t',("-p$archivePasswordPlain"),$archive)

    $hash = Get-FileHash -LiteralPath $archive -Algorithm SHA256
    "$($hash.Hash.ToLowerInvariant())  $([IO.Path]::GetFileName($archive))" |
        Set-Content -LiteralPath "$archive.sha256" -Encoding ASCII

    $monthPrefix = Get-Date -Format 'yyyy-MM'
    if (-not (Get-ChildItem -LiteralPath $monthlyFolder -Filter "LWRPC-Supabase-$monthPrefix*.7z" -File -ErrorAction SilentlyContinue)) {
        Copy-Item -LiteralPath $archive -Destination $monthlyFolder
        Copy-Item -LiteralPath "$archive.sha256" -Destination $monthlyFolder
    }

    Remove-OldFiles $weeklyFolder '*.7z' ([int]$config.WeeklyRetentionCount)
    Remove-OldFiles $weeklyFolder '*.sha256' ([int]$config.WeeklyRetentionCount)
    Remove-OldFiles $monthlyFolder '*.7z' ([int]$config.MonthlyRetentionCount)
    Remove-OldFiles $monthlyFolder '*.sha256' ([int]$config.MonthlyRetentionCount)

    [ordered]@{
        status = 'success'
        completedUtc = (Get-Date).ToUniversalTime().ToString('o')
        archive = $archive
        archiveBytes = (Get-Item -LiteralPath $archive).Length
        sha256 = $hash.Hash.ToLowerInvariant()
        configurationSnapshot = $configurationStatus
    } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $logFolder 'last-success.json') -Encoding UTF8

    Write-Host "Backup completed and verified: $archive"
}
catch {
    try {
        if (Test-Path -LiteralPath $ConfigPath) {
            $failureConfig = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
            $failureLogFolder = Join-Path $failureConfig.OffsiteFolder 'Logs'
            New-Item -ItemType Directory -Force -Path $failureLogFolder | Out-Null
            [ordered]@{
                status = 'failed'
                failedUtc = (Get-Date).ToUniversalTime().ToString('o')
                message = $_.Exception.Message
            } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $failureLogFolder 'last-failure.json') -Encoding UTF8
        }
    } catch { }
    throw
}
finally {
    $dbUrlPlain = $null
    $archivePasswordPlain = $null
    $managementTokenPlain = $null
    if ($workFolder -and (Test-Path -LiteralPath $workFolder)) {
        Remove-Item -LiteralPath $workFolder -Recurse -Force
    }
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
