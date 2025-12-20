#!/bin/bash

# Build Script for 0xDABmusic (Linux + macOS)

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
    cp -f build/bin/*.deb build/artifacts/ 2>/dev/null || true
    cp -f build/bin/*.pkg.tar.zst build/artifacts/ 2>/dev/null || true
    cp -f build/bin/0xDABmusic build/artifacts/0xDABmusic_${VERSION}_linux_amd64 2>/dev/null || true
}

build_macos() {
    echo -e "\nBuilding macOS Universal App..."
    cd frontend && npm install && cd ..
    wails build -platform darwin/universal -clean -ldflags "-s -w"
    APP="build/bin/0xDABmusic.app"
    if [ -d "$APP" ]; then
        echo "Fixing permissions (ALL binaries)..."
        find "$APP/Contents/MacOS" -type f -exec chmod +x {} \;
        echo "Removing local dev artifacts..."
        find "$APP" -name "Info.dev.plist" -delete
        echo "Removing quarantine attributes..."
        xattr -rc "$APP"
        echo "Ad-hoc signing entire app bundle..."
        codesign --force --deep --sign - "$APP"
        echo "Verifying signature..."
        codesign --verify --deep --strict "$APP" || exit 1
        echo "Packaging macOS Universal DMG..."
        mkdir -p build/artifacts
        hdiutil create \
          -volname "0xDABmusic" \
          -srcfolder "$APP" \
          -ov -format UDZO \
          "build/artifacts/0xDABmusic_${VERSION}_macos_universal.dmg"
        echo "macOS DMG created successfully"
    else
        echo "macOS build failed"
        exit 1
    fi
}


# Build Execution Logic
if [ "$OS_NAME" == "linux" ]; then
    build_linux
elif [ "$OS_NAME" == "darwin" ]; then
    build_macos
fi

echo -e "\nBuild Complete!"
ls -lh build/artifacts/
