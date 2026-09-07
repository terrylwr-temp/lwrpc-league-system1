param([Parameter(Mandatory=$true)][string]$ManifestJson)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$parsed = $ManifestJson | ConvertFrom-Json
if ($parsed.status -ne 'PROPOSED_NOT_APPROVED_FOR_MUTATION' -or $parsed.project_id -ne 'glikrmmgirilnmamxxyl') { throw 'Unexpected manifest scope' }
$id = [guid]::Parse($parsed.manifest_id).ToString()
$folder = 'C:\Users\t_ade\.codex\private-artifacts\lms0723'
New-Item -ItemType Directory -Path $folder -Force | Out-Null
$acl = [System.Security.AccessControl.DirectorySecurity]::new()
$acl.SetAccessRuleProtection($true,$false)
$userSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
$acl.SetOwner($userSid)
foreach($sid in @($userSid,[System.Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
 $acl.AddAccessRule([System.Security.AccessControl.FileSystemAccessRule]::new($sid,'FullControl','ContainerInherit,ObjectInherit','None','Allow'))
}
Set-Acl -LiteralPath $folder -AclObject $acl
$actual = Get-Acl -LiteralPath $folder
if (-not $actual.AreAccessRulesProtected) { throw 'Folder inheritance not disabled' }
foreach($rule in $actual.Access) {
 $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
 if($sid -notin @($userSid.Value,'S-1-5-18')) { throw 'Unexpected ACL principal' }
}
$path = Join-Path $folder ($id+'.manifest.dpapi')
if(Test-Path -LiteralPath $path) { throw 'Manifest already exists; refusing overwrite' }
$utf8 = [System.Text.UTF8Encoding]::new($false)
$plain = $utf8.GetBytes($ManifestJson)
$sha = [System.Security.Cryptography.SHA256]::Create()
$hash = [BitConverter]::ToString($sha.ComputeHash($plain)).Replace('-','').ToLowerInvariant()
$entropy = $utf8.GetBytes('LMS-0723-identity-review-v1')
$encrypted = [System.Security.Cryptography.ProtectedData]::Protect($plain,$entropy,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
[IO.File]::WriteAllBytes($path,$encrypted)
$reopened = [IO.File]::ReadAllBytes($path)
$decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect($reopened,$entropy,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)
$verify = [BitConverter]::ToString($sha.ComputeHash($decrypted)).Replace('-','').ToLowerInvariant()
if($verify -ne $hash -or $utf8.GetString($decrypted) -cne $ManifestJson) { throw 'Protected manifest read-back verification failed' }
$metadata = [ordered]@{manifest_id=$id;manifest_version=1;status=$parsed.status;reviewed_at=$parsed.reviewed_at;
 path=$path;plaintext_sha256=$hash;ciphertext_sha256=([BitConverter]::ToString($sha.ComputeHash($reopened)).Replace('-','').ToLowerInvariant());
 candidate_count=@($parsed.candidates).Count;counts=$parsed.counts;total_auth=$parsed.total_auth;
 protection='Windows DPAPI CurrentUser + ACL current user/SYSTEM only';entropy_label='LMS-0723-identity-review-v1';
 readback_verified=$true;exact_server_json_preserved=$true;backup_role_row_count=(@($parsed.candidates | ForEach-Object {$_.backup_role_rows})).Count}
$metadataJson = $metadata | ConvertTo-Json -Depth 8
[IO.File]::WriteAllText((Join-Path $folder ($id+'.reference.json')),$metadataJson,$utf8)
Write-Output $metadataJson
[Array]::Clear($plain,0,$plain.Length)
[Array]::Clear($decrypted,0,$decrypted.Length)
