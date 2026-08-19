$ErrorActionPreference = "Stop"
$patchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Get-Location

Copy-Item -Force (Join-Path $patchRoot "worker\index.js") (Join-Path $projectRoot "worker\index.js")
Copy-Item -Force (Join-Path $patchRoot "src\lobby.ts") (Join-Path $projectRoot "src\lobby.ts")
Copy-Item -Force (Join-Path $patchRoot "src\App.tsx") (Join-Path $projectRoot "src\App.tsx")
Copy-Item -Force (Join-Path $patchRoot "wrangler.jsonc") (Join-Path $projectRoot "wrangler.jsonc")

$stylesPath = Join-Path $projectRoot "src\styles.css"
$extra = Get-Content -Raw (Join-Path $patchRoot "styles-v5-append.css")
Add-Content -Path $stylesPath -Value $extra

Write-Host ""
Write-Host "Discopoly V5 patch applied." -ForegroundColor Green
Write-Host "Next:"
Write-Host "  npm run build"
Write-Host "  npx wrangler deploy"
