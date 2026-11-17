$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

function J($o) { $o | ConvertTo-Json -Depth 10 -Compress }

# Connexion admin
$login = J @{ email = "johnsalvador064@gmail.com"; password = "AdminPassword1234!" }
$me = Invoke-RestMethod -Uri "$base/api/auth/login" -Method Post -Body $login -ContentType "application/json" -SessionVariable adm -TimeoutSec 60
Write-Output ("ROLE=" + $me.data.role)

# Créer un utilisateur cible
$u = Invoke-RestMethod -Uri "$base/api/auth/register" -Method Post -Body (J @{
  full_name = "Utilisateur Test"; email = ("test" + [DateTime]::UtcNow.Ticks + "@exemple.fr"); password = "TestPassword1234!"
}) -ContentType "application/json" -TimeoutSec 60
$targetId = $u.data.id
Write-Output ("TARGET=" + $u.data.email + " credits=" + $u.data.credits_balance)

# Attribution de crédits
$attrib = Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch `
  -Body (J @{ id = $targetId; action = "credits"; amount = 250; reason = "Test admin" }) `
  -ContentType "application/json" -WebSession $adm -TimeoutSec 60
Write-Output ("ATTRIBUTION ok=" + $attrib.ok)

$users = Invoke-RestMethod -Uri "$base/api/admin/users" -WebSession $adm -TimeoutSec 60
$after = $users.data | Where-Object { $_.id -eq $targetId } | Select-Object -First 1
Write-Output ("NEW CREDITS=" + $after.credits_balance)

# Promotion admin SANS vérification -> doit être bloquée
try {
  Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch `
    -Body (J @{ id = $targetId; action = "role"; role = "admin" }) `
    -ContentType "application/json" -WebSession $adm -TimeoutSec 60
  Write-Output "PROMO SANS VERIF = ACCEPTEE (BUG)"
} catch {
  Write-Output ("PROMO SANS VERIF BLOQUEE = " + $_.Exception.Response.StatusCode.value__)
}

# Suspension
$susp = Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch `
  -Body (J @{ id = $targetId; action = "suspend" }) `
  -ContentType "application/json" -WebSession $adm -TimeoutSec 60
Write-Output ("SUSPENSION ok=" + $susp.ok)
$users2 = Invoke-RestMethod -Uri "$base/api/admin/users" -WebSession $adm -TimeoutSec 60
$after2 = $users2.data | Where-Object { $_.id -eq $targetId } | Select-Object -First 1
Write-Output ("STATUS=" + $after2.status)

# Réactivation
Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch `
  -Body (J @{ id = $targetId; action = "activate" }) `
  -ContentType "application/json" -WebSession $adm -TimeoutSec 60 | Out-Null
Write-Output "REACTIVATION ok"

# Journal d'activité
$logs = Invoke-RestMethod -Uri "$base/api/admin/logs" -WebSession $adm -TimeoutSec 60
Write-Output ("AUDIT LOGS=" + $logs.data.Count)
