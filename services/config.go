package services

import (
	"encoding/json"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

type Config struct {
	SpotifyClientID     string `json:"SPOTIFY_CLIENT_ID"`
	SpotifyClientSecret string `json:"SPOTIFY_CLIENT_SECRET"`
	SpotifyRedirectURI  string `json:"SPOTIFY_REDIRECT_URI"`
	DABAPIBase          string `json:"DAB_API_BASE"`
	DABAuthToken        string `json:"DAB_AUTH_TOKEN,omitempty"`
	DABEmail            string `json:"DAB_EMAIL,omitempty"`
	DABPassword         string `json:"DAB_PASSWORD,omitempty"`
	FuzzyMatchScale     int    `json:"FUZZY_MATCH_SCALE"`
	MaxConcurrency      int    `json:"MAX_CONCURRENCY"`
	SpotifyAccessToken  string `json:"SPOTIFY_ACCESS_TOKEN,omitempty"`
	SpotifyRefreshToken string `json:"SPOTIFY_REFRESH_TOKEN,omitempty"`
	SpotifyTokenExpiry  string `json:"SPOTIFY_TOKEN_EXPIRY,omitempty"`
	DownloadPath        string `json:"DOWNLOAD_PATH"`
	MaxCacheSize        int64  `json:"MAX_CACHE_SIZE"`
}

func GetConfigDir() (string, error) {
	userConfigDir, err := os.UserConfigDir()
	if err == nil && userConfigDir != "" {
		newDir := filepath.Join(userConfigDir, "0xDABmusic")
		home, herr := os.UserHomeDir()
		if herr == nil && home != "" {
			oldDir := filepath.Join(home, ".0xdabmusic")
			altOldDir := filepath.Join(home, ".0xDABmusic")
			if dirExists(oldDir) && !dirExists(newDir) {
				return oldDir, nil
			}
			if dirExists(altOldDir) && !dirExists(newDir) {
				return altOldDir, nil
			}
		}
		return newDir, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".0xdabmusic"), nil
}

func dirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		return false
	}
	return info.IsDir()
}

func defaultDownloadPath() string {
	home, err := os.UserHomeDir()
	if err != nil || home == "" {
		return "0xDABmusic"
	}
	if runtime.GOOS == "windows" {
		return filepath.Join(home, "Music", "0xDABmusic")
	}
	return filepath.Join(home, "Downloads", "0xDABmusic")
}

func looksLikeWindowsAbsolutePath(path string) bool {
	if len(path) < 2 {
		return false
	}
	ch := path[0]
	if !(ch >= 'A' && ch <= 'Z' || ch >= 'a' && ch <= 'z') {
		return false
	}
	return path[1] == ':'
}

func resolveDownloadPath(path string) string {
	home, _ := os.UserHomeDir()
	p := strings.TrimSpace(path)
	if p == "" {
		p = defaultDownloadPath()
	}
	if strings.HasPrefix(p, "~") && home != "" {
		if p == "~" {
			p = home
		} else if strings.HasPrefix(p, "~/") || strings.HasPrefix(p, "~\\") {
			suffix := strings.TrimLeft(p[2:], "\\/")
			p = filepath.Join(home, suffix)
		}
	}
	if runtime.GOOS != "windows" {
		if looksLikeWindowsAbsolutePath(p) {
			p = defaultDownloadPath()
		} else {
			p = strings.ReplaceAll(p, "\\", string(filepath.Separator))
		}
	}
	if !filepath.IsAbs(p) && home != "" {
		p = filepath.Join(home, p)
	}
	p = filepath.Clean(p)
	if err := os.MkdirAll(p, 0755); err == nil {
		return p
	}
	configDir, err := GetConfigDir()
	if err == nil {
		fallback := filepath.Join(configDir, "downloads")
		if err := os.MkdirAll(fallback, 0755); err == nil {
			return fallback
		}
	}
	return p
}

func LoadConfig() (*Config, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "config.json")

	if _, err := os.Stat(path); os.IsNotExist(err) {
		cfg := &Config{
			SpotifyClientID:     "",
			SpotifyClientSecret: "",
			SpotifyRedirectURI:  "http://127.0.0.1:8888/callback",
			DABAPIBase:          "https://dabmusic.xyz/api",
			FuzzyMatchScale:     85,
			MaxConcurrency:      3,
			DownloadPath:        defaultDownloadPath(),
			MaxCacheSize:        1024 * 1024 * 1024,
		}
		dotEnvBase := normalizeDABAPIBase(readDotEnvValue("BASE"))
		if dotEnvBase == "" {
			dotEnvBase = normalizeDABAPIBase(readDotEnvValue("DAB_API_BASE"))
		}
		if dotEnvBase != "" {
			cfg.DABAPIBase = dotEnvBase
		}
		cfg.DownloadPath = resolveDownloadPath(cfg.DownloadPath)
		return cfg, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}

	if cfg.FuzzyMatchScale == 0 {
		cfg.FuzzyMatchScale = 85
	}
	if cfg.MaxConcurrency <= 0 {
		cfg.MaxConcurrency = 3
	}
	if cfg.MaxCacheSize == 0 {
		cfg.MaxCacheSize = 1024 * 1024 * 1024
	}
	if cfg.DABAPIBase == "" {
		cfg.DABAPIBase = "https://dabmusic.xyz/api"
	}
	dotEnvBase := normalizeDABAPIBase(readDotEnvValue("BASE"))
	if dotEnvBase == "" {
		dotEnvBase = normalizeDABAPIBase(readDotEnvValue("DAB_API_BASE"))
	}
	if dotEnvBase != "" {
		if cfg.DABAPIBase == "" || cfg.DABAPIBase == "https://dabmusic.xyz/api" || cfg.DABAPIBase == "https://dab.yeet.su/api" {
			cfg.DABAPIBase = dotEnvBase
		}
	}
	if cfg.DownloadPath == "" {
		cfg.DownloadPath = defaultDownloadPath()
	}
	cfg.DownloadPath = resolveDownloadPath(cfg.DownloadPath)
	return &cfg, nil
}

func SaveConfig(cfg *Config) error {
	dir, err := GetConfigDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}
	path := filepath.Join(dir, "config.json")
	data, err := json.MarshalIndent(cfg, "", "    ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
