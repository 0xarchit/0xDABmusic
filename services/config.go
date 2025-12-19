package services

import (
	"encoding/json"
	"os"
	"path/filepath"
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
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".0xdabmusic"), nil
}

func LoadConfig() (*Config, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return nil, err
	}
	path := filepath.Join(dir, "config.json")

	if _, err := os.Stat(path); os.IsNotExist(err) {
		home, _ := os.UserHomeDir()
		return &Config{
			SpotifyClientID:     "",
			SpotifyClientSecret: "",
			SpotifyRedirectURI:  "http://127.0.0.1:8888/callback",
			DABAPIBase:          "https://dabmusic.xyz/api",
			FuzzyMatchScale:     85,
			DownloadPath:        filepath.Join(home, "Music", "0xDABmusic"),
			MaxCacheSize:        1024 * 1024 * 1024,
		}, nil
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
	if cfg.MaxCacheSize == 0 {
		cfg.MaxCacheSize = 1024 * 1024 * 1024
	}
	if cfg.DownloadPath == "" {
		home, _ := os.UserHomeDir()
		cfg.DownloadPath = filepath.Join(home, "Music", "0xDABmusic")
	}
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
