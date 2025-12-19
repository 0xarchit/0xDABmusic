# Build Script for 0xDABmusic (Windows + Linux Packages)

# Ensure we are in the correct directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

# Read Version
$VersionJson = Get-Content "version.json" | ConvertFrom-Json
$Version = $VersionJson.code
Write-Host "Detected Version: $Version" -ForegroundColor Cyan

# Update wails.json version
$WailsConfig = Get-Content "wails.json" | ConvertFrom-Json
if ($WailsConfig.info.productVersion -ne $Version) {
    Write-Host "Updating wails.json version to $Version..." -ForegroundColor Yellow
    $WailsConfig.info.productVersion = $Version
    $WailsConfig | ConvertTo-Json -Depth 10 | Set-Content "wails.json"
}

Write-Host "Starting 0xDABmusic Build Process..." -ForegroundColor Cyan

# 1. Build Windows Version
Write-Host "`n[1/2] Building Windows Executable..." -ForegroundColor Yellow
wails build -platform windows/amd64 -clean -ldflags "-s -w"
if ($LASTEXITCODE -eq 0) {
    $WinOutput = "build/bin/0xDABmusic_${Version}_win.exe"
    Move-Item -Path "build/bin/0xDABmusic.exe" -Destination $WinOutput -Force
    Write-Host "Windows build successful: $WinOutput" -ForegroundColor Green
} else {
    Write-Host "Windows build failed!" -ForegroundColor Red
    exit 1
}

# 2. Build Linux Packages via Docker
Write-Host "`n[2/2] Building Linux Packages (Debian & Arch) via Docker..." -ForegroundColor Yellow

# Check if Docker is running
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Docker is not running. Please start Docker Desktop to build Linux packages." -ForegroundColor Red
    exit 1
}

# Run the build using docker-compose
# --build ensures we have the latest environment
# --rm removes the container after it finishes
Write-Host "Starting Docker build container..."
$Env:VERSION = $Version
docker-compose run --rm builder

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nLinux Build Successful!" -ForegroundColor Green
} else {
    Write-Host "`nLinux Build Failed!" -ForegroundColor Red
    exit 1
}

# Cleanup (Optional: remove the volume used for node_modules to save space)
# docker volume rm dabhounds_frontend_node_modules 2> $null


Write-Host "`nBuild Complete!" -ForegroundColor Green
Write-Host "Artifacts are in 'build/bin/':"
Write-Host "- Windows: 0xDABmusic_${Version}_win.exe"
Write-Host "- Ubuntu/Debian: 0xDABmusic_${Version}_amd64.deb"
Write-Host "- Arch Linux: 0xDABmusic-${Version}-x86_64.pkg.tar.zst"
