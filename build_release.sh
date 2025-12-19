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
command -v nfpm >/dev/null 2>&1 || { echo >&2 "nfpm is required but not installed. Aborting."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo >&2 "python3 is required but not installed. Aborting."; exit 1; }

# Read Version
VERSION=$(python3 -c "import json; print(json.load(open('version.json'))['code'])")
echo "Detected Version: $VERSION"

# Export VERSION for nfpm
export VERSION

# Ensure pkg-config can find WebKitGTK on Ubuntu runners
export PKG_CONFIG_PATH="/usr/lib/x86_64-linux-gnu/pkgconfig:${PKG_CONFIG_PATH}"

# Update wails.json version
python3 -c "import json; data=json.load(open('wails.json')); data['info']['productVersion']='$VERSION'; json.dump(data, open('wails.json', 'w'), indent=2)"
echo "Updated wails.json version to $VERSION"

echo "Starting 0xDABmusic Build Process..."

# 1. Build Linux
echo -e "\n[1/2] Building Linux Package..."
# Install frontend dependencies if needed
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

wails build -platform linux/amd64 -clean -ldflags "-s -w"

if [ ! -f build/bin/0xDABmusic ] && [ ! -x build/bin/0xDABmusic ]; then
    echo "Linux binary not found at build/bin/0xDABmusic"
    exit 1
fi

# Package with nfpm
echo "Packaging .deb..."
nfpm pkg --packager deb --target build/bin/
echo "Packaging Arch Linux..."
nfpm pkg --packager archlinux --target build/bin/

mkdir -p build/artifacts
cp -f build/bin/0xDABmusic build/artifacts/ 2>/dev/null || true
cp -f build/bin/*.deb build/artifacts/ 2>/dev/null || true
cp -f build/bin/*.pkg.tar.zst build/artifacts/ 2>/dev/null || true

# 2. Build Windows (Cross-compile)
echo -e "\n[2/2] Building Windows Executable..."

if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    echo "MinGW not found. Attempting to install..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get update && sudo apt-get install -y mingw-w64
    elif [ -f /etc/arch-release ]; then
        sudo pacman -S --noconfirm mingw-w64-gcc
    elif [ -f /etc/fedora-release ]; then
        sudo dnf install -y mingw64-gcc
    else
        echo "Unsupported distribution. Please install mingw-w64 manually."
        # Don't exit, just skip windows build if we can't install
        echo "Skipping Windows build."
    fi
fi

if command -v x86_64-w64-mingw32-gcc &> /dev/null; then
    if [ ! -f assets/appicon.ico ] && [ -f assets/appicon.png ]; then
        if command -v icotool >/dev/null 2>&1; then
            icotool -c -o assets/appicon.ico assets/appicon.png || true
        elif command -v convert >/dev/null 2>&1; then
            convert assets/appicon.png -define icon:auto-resize=256,128,64,48,32,16 assets/appicon.ico || true
        fi
    fi
    # Try Wails build with windres (native icon embedding)
    wails build -platform windows/amd64 -clean -ldflags "-s -w" || true
    # If icon is still not embedded, use go-winres as fallback
    if [ -f build/bin/0xDABmusic.exe ]; then
        mv build/bin/0xDABmusic.exe "build/bin/0xDABmusic_${VERSION}_win.exe"
        echo "Windows build successful: build/bin/0xDABmusic_${VERSION}_win.exe"
        # Print resources for sanity check (wrestool preferred)
        if command -v wrestool >/dev/null 2>&1; then
            echo "Resource list for build/bin/0xDABmusic_${VERSION}_win.exe:"
            wrestool -l "build/bin/0xDABmusic_${VERSION}_win.exe" || true
            if ! wrestool -l "build/bin/0xDABmusic_${VERSION}_win.exe" | grep -q "type=14 --name=1"; then
                echo "Warning: group_icon resource name is not 1. Installer/Explorer might show a default icon." >&2
            fi
        elif command -v icotool >/dev/null 2>&1; then
            echo "Ico list for build/bin/0xDABmusic_${VERSION}_win.exe:"
            icotool -l "build/bin/0xDABmusic_${VERSION}_win.exe" 2>/dev/null || true
        else
            echo "No resource inspection tool (wrestool/icotool) available."
        fi
        cp -f "build/bin/0xDABmusic_${VERSION}_win.exe" build/artifacts/ 2>/dev/null || true
        ICON_COUNT=0
        if command -v wrestool >/dev/null 2>&1; then
            ICON_COUNT=$(wrestool -l "build/bin/0xDABmusic_${VERSION}_win.exe" 2>/dev/null | grep -i -c 'icon\|rt_icon\|RT_ICON\|ICON') || ICON_COUNT=0
        elif command -v icotool >/dev/null 2>&1; then
            # icotool may return non-zero for EXE; ignore errors
            ICON_COUNT=$(icotool -l "build/bin/0xDABmusic_${VERSION}_win.exe" 2>/dev/null | grep -c 'icon') || ICON_COUNT=0
        else
            echo "Warning: neither 'wrestool' nor 'icotool' available to check icons; skipping icon verification." >&2
            ICON_COUNT=0
        fi

        if [ "$ICON_COUNT" -eq 0 ]; then
            echo "No icon found in Windows exe, using go-winres fallback..."
            # Ensure we have an .ico to embed
            if [ ! -f assets/appicon.ico ]; then
                if [ -f assets/appicon.png ]; then
                    if command -v icotool >/dev/null 2>&1; then
                        echo "Generating ICO from PNG using icotool..."
                        icotool -c -o assets/appicon.ico assets/appicon.png || true
                    elif command -v convert >/dev/null 2>&1; then
                        echo "Generating ICO from PNG using ImageMagick convert..."
                        convert assets/appicon.png -define icon:auto-resize=256,128,64,48,32,16 assets/appicon.ico || true
                    else
                        echo "Warning: missing assets/appicon.ico and no tool to generate it; skipping icon embed." >&2
                        ICON_SKIPPED=1
                    fi
                else
                    echo "Warning: missing assets/appicon.ico and assets/appicon.png; cannot embed icon. Continuing without failing build." >&2
                    ICON_SKIPPED=1
                fi
            fi

            if [ -z "${ICON_SKIPPED:-}" ]; then
                # Preferred embed using akavel/rsrc (creates rsrc.syso with group icon id 1)
                go install github.com/akavel/rsrc@latest
                export PATH="$(go env GOPATH)/bin:$PATH"
                ICO_PATH=""
                if [ -f assets/appicon.ico ]; then
                    ICO_PATH="assets/appicon.ico"
                elif [ -f assets.appicon.ico ]; then
                    ICO_PATH="assets.appicon.ico"
                fi
                if [ -z "$ICO_PATH" ]; then
                    echo "No .ico available to embed; skipping resource embed." >&2
                    ICON_SKIPPED=1
                else
                    echo "Trying rsrc (preferred) to embed icon..."
                    rsrc -ico "$ICO_PATH" -o rsrc.syso 2>/dev/null || {
                        echo "rsrc failed, falling back to go-winres..." >&2
                        go install github.com/tc-hib/go-winres@latest
                        export PATH="$(go env GOPATH)/bin:$PATH"
                        go-winres generate --in "$ICO_PATH" --out winres.syso 2>/dev/null || { echo "go-winres generate failed, skipping embed." >&2; ICON_SKIPPED=1; }
                        if [ -z "${ICON_SKIPPED:-}" ]; then
                            mv winres.syso rsrc.syso
                        fi
                    }
                fi
                if [ -z "${ICON_SKIPPED:-}" ]; then
                    mv rsrc.syso .
                    # Copy icon into build/windows so NSIS installer uses it
                    mkdir -p build/windows
                    cp -f "$ICO_PATH" build/windows/icon.ico || true
                    # Rebuild with resource compiled in
                    wails build -platform windows/amd64 -clean -ldflags "-s -w" || { echo "Wails build failed after embedding resources." >&2; exit 1; }
                    mv build/bin/0xDABmusic.exe "build/bin/0xDABmusic_${VERSION}_win.exe"
                    cp -f "build/bin/0xDABmusic_${VERSION}_win.exe" build/artifacts/ 2>/dev/null || true
                    rm -f rsrc.syso
                fi
            fi
        fi
    fi
fi

echo -e "\nBuild Complete!"
echo "Artifacts are in 'build/artifacts/':"
ls -lh build/artifacts/
