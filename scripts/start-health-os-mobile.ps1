$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectRoot "logs"
$LogFile = Join-Path $LogDir "health-os-mobile.log"
$Npm = "C:\Program Files\nodejs\npm.cmd"

Set-Location $ProjectRoot
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

$env:NODE_ENV = "production"
$env:PORT = "8000"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Starting Health OS mobile server on 0.0.0.0:8000" | Add-Content -Path $LogFile

& $Npm run start:mobile *>> $LogFile
