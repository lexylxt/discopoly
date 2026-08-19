$ErrorActionPreference = "Stop"

Write-Host "Applying Discopoly V4 patch..." -ForegroundColor Cyan

$patchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Get-Location

$files = @(
  "worker\index.js",
  "src\lobby.ts",
  "src\discord.ts",
  "src\App.tsx",
  "src\styles.css",
  "wrangler.jsonc",
  "package.json",
  ".env.example",
  "README-V4.md"
)

foreach ($file in $files) {
  $source = Join-Path $patchRoot $file
  $dest = Join-Path $projectRoot $file
  $destDir = Split-Path -Parent $dest
  if ($destDir -and !(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  }
  Copy-Item -Force $source $dest
  Write-Host "  updated $file"
}

Write-Host ""
Write-Host "Patch applied. Next:" -ForegroundColor Green
Write-Host "  npm install"
Write-Host "  npm run build"
Write-Host "  npx wrangler secret put SESSION_SECRET"
Write-Host "  git add ."
Write-Host '  git commit -m "Add Discord OAuth and multiplayer lobby"'
Write-Host "  git push"
