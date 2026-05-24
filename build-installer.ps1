param(
  [switch]$Admin
)

$ErrorActionPreference = "Stop"
$root = "C:\Users\mifcz\Documents\try-monor"

Write-Host "=== Try Monitor - Budowanie instalatora ===" -ForegroundColor Cyan

# Krok 1: Budowa aplikacji
Write-Host "`n[1/4] Budowanie aplikacji..." -ForegroundColor Yellow
$env:Path += ";C:\Program Files\nodejs"
Set-Location -LiteralPath $root
Push-Location $root
try {
  $p = & "C:\Program Files\nodejs\npx.cmd" vite build 2>&1
  if ($LASTEXITCODE -ne 0) { throw "vite build failed: $p" }
  $p = & "C:\Program Files\nodejs\npx.cmd" tsc -p tsconfig.node.json 2>&1
  if ($LASTEXITCODE -ne 0) { throw "tsc failed: $p" }
  Copy-Item -LiteralPath "electron\preload.cjs" -Destination "dist-electron\preload.cjs" -Force
  Write-Host "  OK" -ForegroundColor Green
} finally { Pop-Location }

# Krok 2: Przygotowanie winCodeSign (bez symbolicznych linków)
Write-Host "`n[2/4] Przygotowanie winCodeSign..." -ForegroundColor Yellow
$cacheDir = "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$zipUrl = "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z"

# Sprawdź czy już mamy rozpakowane
$existing = Get-ChildItem -LiteralPath $cacheDir -Directory -ErrorAction SilentlyContinue | Where-Object {
  $_.Name -match '^\d+$' -and (Test-Path "$($_.FullName)\win")
}
if (-not $existing) {
  New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
  $zipPath = "$env:TEMP\winCodeSign.7z"
  Write-Host "  Pobieranie winCodeSign..."
  & "C:\Program Files\nodejs\node.exe" -e "
    const https=require('https'), fs=require('fs'), f=fs.createWriteStream('$zipPath');
    https.get('$zipUrl', r => { if (r.statusCode===302) https.get(r.headers.location, r2 => r2.pipe(f)); else r.pipe(f); });
  " 2>&1
  Write-Host "  Rozpakowywanie..."
  $tmpDir = "$env:TEMP\winCodeSign_extracted"
  if (Test-Path $tmpDir) { Remove-Item -LiteralPath $tmpDir -Recurse -Force }
  New-Item -ItemType Directory -Path $tmpDir -Force | Out-Null
  & "C:\Users\mifcz\Documents\try-monitor\node_modules\7zip-bin\win\x64\7za.exe" x "$zipPath" "-o$tmpDir" -bd -y 2>&1 | Out-Null
  $extracted = Get-ChildItem -LiteralPath $tmpDir -Directory | Select-Object -First 1
  if ($extracted) {
    # Usuń darwin (symlinki)
    if (Test-Path "$($extracted.FullName)\darwin") {
      Remove-Item -LiteralPath "$($extracted.FullName)\darwin" -Recurse -Force -ErrorAction SilentlyContinue
    }
    $targetName = $extracted.Name
    $targetDir = "$cacheDir\$targetName"
    if (Test-Path $targetDir) { Remove-Item -LiteralPath $targetDir -Recurse -Force }
    Move-Item -LiteralPath $extracted.FullName -Destination $targetDir
    Write-Host "  Przygotowano: $targetName" -ForegroundColor Green
  }
  Remove-Item -LiteralPath $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
} else {
  Write-Host "  winCodeSign już gotowy" -ForegroundColor Green
}

# Krok 3: Uruchom electron-builder
Write-Host "`n[3/4] Uruchamianie electron-builder..." -ForegroundColor Yellow
$env:WIN_CSC_LINK = ""
$env:WIN_CSC_KEY_PASSWORD = ""
$env:CSC_LINK = ""
$env:CSC_KEY_PASSWORD = ""
& "C:\Program Files\nodejs\npx.cmd" electron-builder --win nsis 2>&1
if ($LASTEXITCODE -eq 0) {
  Write-Host "  OK" -ForegroundColor Green
} else {
  Write-Host "  electron-builder zakończył się z kodem: $LASTEXITCODE" -ForegroundColor Red
}

# Krok 4: Wynik
Write-Host "`n[4/4] Instalator:" -ForegroundColor Cyan
$installer = Get-ChildItem -LiteralPath "$root\release" -Recurse -Filter "*.exe" | Select-Object -First 1
if ($installer) {
  Write-Host "  $($installer.FullName)" -ForegroundColor Green
  Write-Host "  Rozmiar: $([math]::Round($installer.Length/1MB, 1)) MB" -ForegroundColor Green
} else {
  Write-Host "  Nie znaleziono instalatora - sprawdź release\ folder" -ForegroundColor Red
}

Write-Host "`nGotowe!" -ForegroundColor Cyan
