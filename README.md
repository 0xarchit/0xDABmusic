# 0xDABmusic

0xDABmusic is a modern, cross-platform desktop application for music management, streaming, and downloading. It enables users to organize, play, and download music with advanced features like lyrics synchronization, Spotify integration, and robust download management. Built with Go, React (TypeScript), and Wails, it delivers a native experience on Windows and Linux.

- **Platforms:** Windows, Linux (Debian/Ubuntu, Arch)
- **Technologies:** Go, React, TypeScript, Wails, TailwindCSS

---

## Installation

### Windows
- Download the latest Windows executable from the `build/bin/` directory or the official release page.
- Double-click to install or run. No additional dependencies required.
- If prompted by antivirus or Windows Defender, allow the app to run (unsigned by default).

### Linux
- **Debian/Ubuntu:**
  - Install the `.deb` package from `build/bin/`:
    ```sh
    sudo dpkg -i 0xDABmusic_<version>_amd64.deb
    ```
- **Arch Linux:**
  - Install the `.pkg.tar.zst` package:
    ```sh
    sudo pacman -U 0xDABmusic-<version>-x86_64.pkg.tar.zst
    ```
- All required dependencies are bundled. No need for Node.js or Go at runtime.

#### Prerequisites (for building from source)
- Go 1.21+
- Node.js 22.x (for frontend build)
- Docker (for Linux packaging)
- Wails CLI (`go install github.com/wailsapp/wails/v2/cmd/wails@latest`)

---

## Getting Started

1. **Launch 0xDABmusic** from your applications menu or by running the executable.
2. On first launch, log in or register for a DAB account. Guest mode is not supported; authentication is required for full functionality.
3. Optionally, connect your Spotify account for playlist import and enhanced features. Spotify login is handled securely via OAuth.
4. Configure your download folder and general settings in the Settings page.

---

## Features Overview

### Music Library Management
- Create, edit, and delete personal music libraries
- Set libraries as public or private
- Share public libraries with others (read-only)
- Library management is accessible from the sidebar under "Library"

### Favorites System
- Mark any track as a favorite for quick access
- Favorites are managed in the "Favorites" section

### Search
- Powerful search for tracks, albums, and artists across your libraries and public content
- Search bar is always accessible at the top of the main view

### Playback System
- Integrated audio player with mini and expanded modes
- Queue management: add, remove, reorder tracks
- Persistent queue: queue state is saved between sessions
- Synchronized lyrics display (when available)

### Download Management
- Download queue with progress tracking
- Download history with retry and error handling
- Clear or manage download history from the Downloads page

### Recently Played
- Tracks your listening history
- Option to clear/reset history
- Accessible from the sidebar

### User Profile & Statistics
- View and edit your profile
- See listening statistics and activity

### Settings & Customization
- Configure download paths, concurrency, cache size, and more
- Access via the sidebar under "Settings"

### Session Management & Security
- Secure token-based authentication
- Session restoration on startup
- Manual logout option in profile menu

---

## Advanced Features

- **Public Library Sharing:** Share your libraries with others via public links; supports pagination for large libraries.
- **Metadata Inspection:** View detailed audio metadata (tags, format, bitrate) for each track.
- **Album/Artist Browser:** Browse and explore albums and artists with detailed views.
- **Lyrics Synchronization:** Real-time, synced lyrics display for supported tracks.
- **Power-User Workflows:**
  - Batch add/remove tracks to/from libraries
  - Drag-and-drop queue management
  - Keyboard shortcuts for playback and navigation

---

## UI / UX Highlights

- **Sidebar Navigation:** Quick access to Library, Downloads, Favorites, Recently Played, Settings, and Profile.
- **Responsive Layout:** Adapts to various window sizes for optimal usability.
- **Tooltips & Notifications:** Contextual tooltips and toast notifications provide feedback for actions and errors.
- **Accessibility:** Keyboard navigation and high-contrast color scheme for improved accessibility.

---

## Versioning

- The app version is defined in `version.json` (field: `code`).
- On build, the version propagates to:
  - The UI (About dialog, window title)
  - Build artifacts (filenames, installer metadata)
  - Release notes
- To update the version:
  1. Edit `version.json`
  2. Run the build script (`build_release.ps1` or Docker build)
  3. The version is automatically synced in `wails.json` and all outputs

---

## Usage Tips (Power Users)

- **Force Refresh:** Use the "Clear All Cache" option in Settings to reset cached data.
- **Copy Shareable Links:** Open libraries go to setting to make public and then copy public URLs.
- **Manage Large Queues:** Use batch selection and removal tools in the queue manager.
- **Performance:** Lower concurrency and cache size in Settings for better performance on low-end systems.

---

## Troubleshooting

- **Login Issues:**
  - Ensure your credentials are correct; reset password if needed.
  - Check network connectivity for API access.
- **Spotify Auth Problems:**
  - Make sure your Spotify account is active and permissions are granted.
- **Network/API Failures:**
  - Retry after checking your internet connection.
  - Some features require external APIs (Spotify, lyrics); ensure they are reachable.
- **Build/Install Errors:**
  - For Windows, run the installer as administrator if you encounter permission errors.
  - For Linux, ensure all dependencies are installed and Docker is running for packaging.
- **Platform Quirks:**
  - On Windows, antivirus may flag unsigned executables; allow the app manually.
  - On Linux, set executable permissions if needed: `chmod +x 0xDABmusic*`

---

## Contributing & Building from Source

1. **Clone the repository:**
   ```sh
   git clone https://github.com/0xarchit/0xDABmusic
   cd 0xDABmusic
   ```
2. **Install prerequisites:**
   - Go 1.21+
   - Node.js 22.x
   - Wails CLI
   - Docker (for Linux packaging)
3. **Install frontend dependencies:**
   ```sh
   cd frontend
   npm install
   cd ..
   ```
4. **Build (Development):**
   ```sh
   wails dev
   ```
5. **Build (Production):**
   - **Windows (Full Release with Docker):**
     ```powershell
     ./build_release.ps1
     ```
   - **Windows (Native Only - No Docker):**
     ```powershell
     ./build_windows.ps1
     ```
     *Requires MinGW-w64 (GCC) in PATH.*
   - **Linux:**
     ```bash
     chmod +x build_release.sh
     ./build_release.sh
     ```

### Setting up MinGW-w64 on Windows
If you want to build natively on Windows without Docker (using `build_windows.ps1`), you need a C compiler.
1. **Check if installed:** Open PowerShell and run `gcc --version`.
2. **Install (if missing):**
   - Download **MinGW-w64** via [MSYS2](https://www.msys2.org/) (Recommended) or [w64devkit](https://github.com/skeeto/w64devkit).
   - Or download standalone binaries from [winlibs.com](https://winlibs.com/).
   - Add the `bin` folder to your System PATH environment variable.
   - Restart your terminal and verify with `gcc --version`.
6. **Update Version:**
   - Edit `version.json` and rerun the build script.

**Contribution Guidelines:**
- Use feature branches and submit pull requests for all changes
- Write clear commit messages
- Follow code style and linting rules

---

## Credits & License

- **License:** MIT
- **Major Dependencies:**
  - [Wails](https://wails.io/)
  - [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
  - [TailwindCSS](https://tailwindcss.com/)
- **Contact & Support:**
  - For issues, open a ticket on the Issues page
  - For questions or support, contact the maintainer at [mail@0xarchit.is-a.dev]
