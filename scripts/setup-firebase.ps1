<#
.SYNOPSIS
Configure automatiquement Firestore dans .env.local à partir du fichier JSON
de compte de service téléchargé depuis la console Firebase.
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$JsonPath
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $root ".env.local"

if (-not (Test-Path $JsonPath)) { throw "Fichier introuvable : $JsonPath" }
$sa = Get-Content -Raw $JsonPath | ConvertFrom-Json
if (-not $sa.private_key -or -not $sa.client_email) {
  throw "Ce fichier n'est pas une clé de compte de service Firebase."
}

# JSON sur une seule ligne (évite les problèmes de sauts de ligne dans .env)
$oneLine = ($sa | ConvertTo-Json -Compress -Depth 10) -replace "`r","" -replace "`n","\n"

$lines = Get-Content $envPath
$out = @()
$done = $false
foreach ($line in $lines) {
  if ($line -match '^FIREBASE_SERVICE_ACCOUNT=') {
    $out += "FIREBASE_SERVICE_ACCOUNT=$oneLine"
    $done = $true
  } elseif ($line -match '^DATA_BACKEND=') {
    $out += "DATA_BACKEND=firestore"
  } else {
    $out += $line
  }
}
if (-not $done) {
  $out += "FIREBASE_SERVICE_ACCOUNT=$oneLine"
  $out += "DATA_BACKEND=firestore"
}
[IO.File]::WriteAllLines($envPath, $out, [Text.UTF8Encoding]::new($false))

Write-Output "OK : Firestore active pour le projet $($sa.project_id)"
Write-Output "Prochaine etape : npm run build && npm start"
