<#
.SYNOPSIS
Pousse le dépôt JOBMASTER AI sur GitHub (crée le remote et push).
Usage:
  powershell -ExecutionPolicy Bypass -File scripts/push-github.ps1 -Username VOTRE-PSEUDO
#>
param(
  [Parameter(Mandatory = $true)]
  [string]$Username
)

$ErrorActionPreference = "Stop"
$env:Path = "$env:Path;C:\Program Files\Git\cmd"

Write-Output "=== PRÉPARATION DU PUSH GITHUB ==="
Write-Output "Pseudo GitHub : $Username"
Write-Output "Dépôt : https://github.com/$Username/jobmaster-ai.git"
Write-Output ""

# Vérifier qu'on est dans le bon dossier
if (-not (Test-Path "package.json")) {
  throw "Exécutez ce script depuis le dossier jobmaster-ai."
}

# Ajouter ou remplacer le remote
$existing = git remote get-url origin 2>$null
if ($existing) {
  Write-Output "Remote existant : $existing"
  git remote set-url origin "https://github.com/$Username/jobmaster-ai.git"
  Write-Output "Remote mis à jour."
} else {
  git remote add origin "https://github.com/$Username/jobmaster-ai.git"
  Write-Output "Remote ajouté."
}

# Vérifier la branche
git branch -M main
Write-Output "Branche : main"
Write-Output ""

# Pousser
Write-Output "=== PUSH EN COURS ==="
Write-Output "Si GitHub vous demande vos identifiants :"
Write-Output "  - Username : $Username"
Write-Output "  - Password : un Personal Access Token (pas votre mot de passe !)"
Write-Output "    Créez-en un sur https://github.com/settings/tokens (cochez 'repo')"
Write-Output ""
git push -u origin main

Write-Output ""
Write-Output "=== TERMINÉ ==="
Write-Output "Vérifiez : https://github.com/$Username/jobmaster-ai"
