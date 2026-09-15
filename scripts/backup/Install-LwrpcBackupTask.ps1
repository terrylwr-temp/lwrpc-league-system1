[CmdletBinding()]
param(
    [ValidateSet('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')]
    [string]$DayOfWeek = 'Sunday',
    [datetime]$At = '03:00',
    [string]$TaskName = 'LWRPC Supabase Weekly Backup'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$backupScript = Join-Path $PSScriptRoot 'Invoke-LwrpcBackup.ps1'
if (-not (Test-Path -LiteralPath $backupScript)) { throw "Missing $backupScript" }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'backup-secrets.dpapi.json'))) {
    throw 'Run Initialize-LwrpcBackup.ps1 before installing the task.'
}

$powerShell = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$backupScript`""
$action = New-ScheduledTaskAction -Execute $powerShell -Argument $arguments -WorkingDirectory $PSScriptRoot
$trigger = New-ScheduledTaskTrigger -Weekly -WeeksInterval 1 -DaysOfWeek $DayOfWeek -At $At
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 2) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Encrypted weekly off-site backup of the LWRPC Supabase database.' -Force | Out-Null
Write-Host "Installed task '$TaskName' for $DayOfWeek at $($At.ToString('HH:mm'))."
Write-Host 'This secure DPAPI configuration runs while this Windows user is signed in. Windows may wake the computer.'
