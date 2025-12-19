#!/bin/bash

# Build Script for 0xDABmusic (Linux + Windows Cross-Compile)

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

# Detect OS
OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')

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

build_windows() {
    echo -e "\nBuilding Windows Executable..."
    if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
        echo "MinGW not found. Skipping Windows build."; return
    fi
    
    # 1. Ensure ICO exists
    if [ ! -f assets/appicon.ico ] && [ -f assets/appicon.png ]; then
        if command -v icotool >/dev/null 2>&1; then
            icotool -c -o assets/appicon.ico assets/appicon.png || true
        elif command -v convert >/dev/null 2>&1; then
            convert assets/appicon.png -define icon:auto-resize=256,128,64,48,32,16 assets/appicon.ico || true
        fi
    fi

    # 2. Initial Wails Build
    wails build -platform windows/amd64 -clean -ldflags "-s -w" || true
    
    # 3. Check for Icon and Fallback
    if [ -f build/bin/0xDABmusic.exe ]; then
        ICON_COUNT=0
        if command -v wrestool >/dev/null 2>&1; then
            ICON_COUNT=$(wrestool -l "build/bin/0xDABmusic.exe" 2>/dev/null | grep -i -c 'icon\|rt_icon\|RT_ICON\|ICON') || ICON_COUNT=0
        fi

        if [ "$ICON_COUNT" -eq 0 ]; then
            echo "No icon found in Windows exe, using fallbacks..."
            ICO_PATH=""
            [ -f assets/appicon.ico ] && ICO_PATH="assets/appicon.ico"
            
            if [ -n "$ICO_PATH" ]; then
                # Try rsrc (preferred for ID 1)
                if command -v rsrc >/dev/null 2>&1; then
                    rsrc -ico "$ICO_PATH" -o rsrc.syso 2>/dev/null && {
                        mv rsrc.syso .
                        mkdir -p build/windows
                        cp -f "$ICO_PATH" build/windows/icon.ico || true
                        wails build -platform windows/amd64 -clean -ldflags "-s -w" || exit 1
                    }
                elif command -v go-winres >/dev/null 2>&1; then
                    go-winres generate --in "$ICO_PATH" --out rsrc.syso 2>/dev/null && {
                        wails build -platform windows/amd64 -clean -ldflags "-s -w" || exit 1
                    }
                fi
                rm -f rsrc.syso 2>/dev/null
            fi
        fi
        mv build/bin/0xDABmusic.exe "build/artifacts/0xDABmusic_${VERSION}_windows_amd64.exe"
    fi
}

build_macos() {
    echo -e "\nBuilding macOS Universal App..."
    cd frontend && npm install && cd ..
    wails build -platform darwin/universal -clean -ldflags "-s -w"
    if [ -d "build/bin/0xDABmusic.app" ]; then
        echo "Packaging macOS Universal .dmg..."
        hdiutil create -volname "0xDABmusic" -srcfolder "build/bin/0xDABmusic.app" -ov -format UDZO "build/artifacts/0xDABmusic_${VERSION}_macos_universal.dmg"
        echo "macOS DMG created: build/artifacts/0xDABmusic_${VERSION}_macos_universal.dmg"
    else
        echo "macOS build failed"; exit 1
    fi
}

OS_NAME=$(uname -s | tr '[:upper:]' '[:lower:]')

if [ "$OS_NAME" == "linux" ]; then
    export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:${PKG_CONFIG_PATH}"
    case "$1" in
        "linux") build_linux ;;
        "windows") build_windows ;;
        *) build_linux; build_windows ;;
    esac
elif [ "$OS_NAME" == "darwin" ]; then
    build_macos
fi

echo -e "\nBuild Complete!"
ls -lh build/artifacts/
