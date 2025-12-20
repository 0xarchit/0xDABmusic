#!/bin/bash

# Build Script for 0xDABmusic

# Exit on error
set -e

# Ensure we are in the project root
cd "$(dirname "$0")"

# Check for required tools
command -v go >/dev/null 2>&1 || { echo >&2 "Go is required but not installed. Aborting."; exit 1; }
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed. Aborting."; exit 1; }
command -v wails >/dev/null 2>&1 || { echo >&2 "Wails is required but not installed. Aborting."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo >&2 "python3 is required but not installed. Aborting."; exit 1; }

# OS Detection
OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')

# Platform-specific checks
if [ "$OS_NAME" == "linux" ]; then
    command -v nfpm >/dev/null 2>&1 || { echo >&2 "nfpm is required for Linux builds but not installed. Aborting."; exit 1; }
fi

# Read Version
VERSION=$(python3 -c "import json; print(json.load(open('version.json'))['code'])")
echo "Detected Version: $VERSION"

# Export VERSION for nfpm
export VERSION

# Ensure pkg-config can find WebKitGTK on Ubuntu runners (Linux)
if [ "$OS_NAME" == "linux" ]; then
    export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:${PKG_CONFIG_PATH}"
fi

# Update wails.json version
python3 -c "import json; data=json.load(open('wails.json')); data['info']['productVersion']='$VERSION'; json.dump(data, open('wails.json', 'w'), indent=2)"
echo "Updated wails.json version to $VERSION"

echo "Starting 0xDABmusic Build Process..."
mkdir -p build/artifacts

build_linux() {
    echo -e "\nBuilding Linux Package..."
    cd frontend && npm install && cd ..
    wails build -platform linux/amd64 -clean -ldflags "-s -w"
    if [ ! -f build/bin/0xDABmusic ]; then echo "Linux build failed"; exit 1; fi
    nfpm pkg --packager deb --target build/bin/
    nfpm pkg --packager archlinux --target build/bin/

    # Zip Artifacts
    echo "Zipping Linux Artifacts..."
    cd build/bin
    zip -r "../artifacts/0xDABmusic_${VERSION}_linux_amd64.zip" "0xDABmusic"
    zip -r "../artifacts/0xDABmusic_${VERSION}_linux_deb.zip" *.deb
    zip -r "../artifacts/0xDABmusic_${VERSION}_linux_arch.zip" *.pkg.tar.zst
    cd ../..
}


# Build Execution Logic
if [ "$OS_NAME" == "linux" ]; then
    build_linux
fi

echo -e "\nBuild Complete!"
ls -lh build/artifacts/
