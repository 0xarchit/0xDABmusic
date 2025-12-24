<div align="center">
  <img src="https://dab.0xarchit.is-a.dev/logo.png" alt="0xDABmusic Logo" width="120" height="120">
  
  # 0xDABmusic
  
  **Next Gen Music Player for the Audiophile Era**

  <!-- Row 1: Status & Identity -->
  [![License](https://img.shields.io/github/license/0xarchit/0xDABmusic?style=flat-square)](LICENSE)
  [![Release](https://img.shields.io/github/v/release/0xarchit/0xDABmusic?style=flat-square&color=22d3ee)](https://github.com/0xarchit/0xDABmusic/releases/latest)
  [![Build Status](https://img.shields.io/github/actions/workflow/status/0xarchit/0xDABmusic/release.yml?style=flat-square&label=Build%20Status)](https://github.com/0xarchit/0xDABmusic/actions/workflows/release.yml)
  [![Website](https://img.shields.io/website?url=https%3A%2F%2Fdab.0xarchit.is-a.dev&style=flat-square)](https://dab.0xarchit.is-a.dev/)
  [![Dependencies](https://img.shields.io/badge/dependencies-up--to--date-brightgreen?style=flat-square)](#)

  [![Stars](https://img.shields.io/github/stars/0xarchit/0xDABmusic?style=flat-square&color=yellow)](https://github.com/0xarchit/0xDABmusic/stargazers)
  [![Downloads](https://img.shields.io/github/downloads/0xarchit/0xDABmusic/total?style=flat-square&color=orange)](https://github.com/0xarchit/0xDABmusic/releases)
  [![Repo Size](https://img.shields.io/github/repo-size/0xarchit/0xDABmusic?style=flat-square&color=blue)](https://github.com/0xarchit/0xDABmusic)
  [![Issues](https://img.shields.io/github/issues/0xarchit/0xDABmusic?style=flat-square&color=red)](https://github.com/0xarchit/0xDABmusic/issues)
  [![Last Commit](https://img.shields.io/github/last-commit/0xarchit/0xDABmusic?style=flat-square&color=green)](https://github.com/0xarchit/0xDABmusic/commits/main)


  <p align="center">
    <a href="https://dab.0xarchit.is-a.dev/">🌐 Website</a> •
    <a href="https://github.com/0xarchit/0xDABmusic/releases">📥 Download</a> •
    <a href="https://github.com/0xarchit/0xDABmusic/issues">🐛 Report Bug</a>
  </p>
</div>

---

## 🚀 Why 0xDABmusic?

0xDABmusic isn't just another music player. It's a high-performance, native application built with **Go** and **Wails**, designed for those who demand quality and privacy.

- **⚡ Native Performance:** Written in Go, ensuring lightning-fast startup and low resource usage.
- **🎧 Studio Quality:** Full support for FLAC and high-fidelity artifacts.
- **🔒 Privacy First:** Your library stays local. No ads, no tracking, no subscription walls.
- **🛠️ Power Tools:** Built-in lyrics synchronization, Spotify playlist import, and smart conversion.

---

## 📥 Installation

Choose the version that fits your workflow.

### Windows
Download the **Windows Bundle (Zip)**. It contains:
- **Setup (.exe)**: Full installer (Recommended).
- **Portable (.exe)**: Standalone executable.

> **Note:** If Microsoft Defender warns you, strict "More Info" -> "Run Anyway".

### macOS
Download the **macOS Bundle (Zip)**. It contains:
- **Installer (.dmg)**: Drag and drop to Applications.
- **Portable (.app)**: Run directly.

> **Note:** Since we don't have an Apple Developer ID yet, you may need to **Right Click > Open** the app for the first time if you see "App is damaged" or "Unidentified Developer".

### Linux

**Debian / Ubuntu:**
```bash
sudo dpkg -i 0xDABmusic_<version>_amd64.deb
```

**.deb Package Dependencies:**

The .deb package for 0xDABmusic depends on system libraries, especially WebKitGTK (libwebkit2gtk). This library is not bundled with the app and must be installed on your system.

**Ubuntu 24.04 and newer:**
```
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.1-0
```

**Ubuntu 22.04 and older:**
```
sudo apt-get update
sudo apt-get install libwebkit2gtk-4.0-37
```

If you get dependency errors, make sure you are using the .deb built for your Ubuntu version. The .deb built on Ubuntu 24.04+ will not work on older Ubuntu, and vice versa.

**Arch Linux:**
```bash
sudo pacman -U ./0xDABmusic-<version>-*-x86_64.pkg.tar.zst
```

**Arch Linux Dependencies (required):**

0xDABmusic requires WebKitGTK (the `webkit2gtk` package) to be installed on your system.

```bash
sudo pacman -S --needed webkit2gtk-4.1
```

---

## 🚀 Getting Started

### 1. Create a DAB Account
0xDABmusic requires a DAB account to access cloud features.
- Register at **[dab.yeet.su](https://dab.yeet.su/)**
- Use these credentials to log in to the app.

### 2. Spotify Integration (Recommended)
To enable playlist imports and enhanced metadata:
1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and log in.
2. Click **"Create App"**.
3. Fill in the details:
   - **App Name:** `0xDABmusic`
   - **App Description:** `music`
   - **Redirect URI:** `http://127.0.0.1:8888/callback`
   - **Which API/SDKs are you planning to use?**: Select **"Web API"**.
4. Once created, go to **Settings** in your dashboard.
5. Copy the **Client ID** and **Client Secret**.
6. Open **0xDABmusic > Settings** and paste them into the Spotify configuration section.

---

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🎵 Library Management</h3>
      <ul>
        <li>Organize tracks, artists, and albums</li>
        <li>Create Public/Private playlists</li>
        <li>Batch import and export</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🔍 Smart Search</h3>
      <ul>
        <li>Global search across library and online</li>
        <li>Filter by bitrate, format, or duration</li>
        <li>Instant results</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🎤 Synced Lyrics</h3>
      <ul>
        <li>Real-time lyrics display</li>
        <li>Auto-fetch for supported tracks</li>
        <li>Karaoke-style highlighting</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📡 Spotify Integration</h3>
      <ul>
        <li>Import playlists directly from Spotify</li>
        <li>Convert streaming tracks to local files</li>
        <li>Keep your collection in sync</li>
      </ul>
    </td>
  </tr>
</table>

---



## 📈 Star History

<a href="https://star-history.com/#0xarchit/0xDABmusic&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=0xarchit/0xDABmusic&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=0xarchit/0xDABmusic&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=0xarchit/0xDABmusic&type=Date" />
 </picture>
</a>

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/0xarchit">0xArchit</a> using 
  <a href="https://wails.io">Wails</a> & <a href="https://react.dev">React</a>.
</p>
