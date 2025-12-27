package services

import (
	"bufio"
	"net/url"
	"os"
	"path/filepath"
	"strings"
)

func resolveDABAPIBase(cfg *Config) string {
	base := ""
	if cfg != nil {
		base = strings.TrimSpace(cfg.DABAPIBase)
	}
	if base == "" {
		base = strings.TrimSpace(os.Getenv("BASE"))
	}
	if base == "" {
		base = strings.TrimSpace(os.Getenv("DAB_API_BASE"))
	}
	if base == "" {
		base = strings.TrimSpace(readDotEnvValue("BASE"))
	}
	if base == "" {
		base = strings.TrimSpace(readDotEnvValue("DAB_API_BASE"))
	}
	base = normalizeDABAPIBase(base)
	if base == "" {
		base = "https://dabmusic.xyz/api"
	}
	return base
}

func normalizeDABAPIBase(base string) string {
	base = strings.TrimSpace(base)
	base = strings.TrimRight(base, "/")
	if base == "" {
		return ""
	}
	u, err := url.Parse(base)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return base
	}
	if u.Path == "" || u.Path == "/" {
		u.Path = "/api"
	}
	if u.Path == "/api/" {
		u.Path = "/api"
	}
	return strings.TrimRight(u.String(), "/")
}

func originFromBase(base string) string {
	u, err := url.Parse(base)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return ""
	}
	return u.Scheme + "://" + u.Host
}

func readDotEnvValue(key string) string {
	key = strings.TrimSpace(key)
	if key == "" {
		return ""
	}

	paths := make([]string, 0, 3)
	if dir, err := GetConfigDir(); err == nil && dir != "" {
		paths = append(paths, filepath.Join(dir, ".env"))
	}
	if wd, err := os.Getwd(); err == nil && wd != "" {
		paths = append(paths, filepath.Join(wd, ".env"))
	}
	if exe, err := os.Executable(); err == nil && exe != "" {
		paths = append(paths, filepath.Join(filepath.Dir(exe), ".env"))
	}

	seen := map[string]struct{}{}
	for _, p := range paths {
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		if v, ok := readDotEnvFileValue(p, key); ok {
			return v
		}
	}
	return ""
}

func readDotEnvFileValue(path string, key string) (string, bool) {
	f, err := os.Open(path)
	if err != nil {
		return "", false
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "#") {
			continue
		}
		i := strings.IndexByte(line, '=')
		if i <= 0 {
			continue
		}
		k := strings.TrimSpace(line[:i])
		if k != key {
			continue
		}
		v := strings.TrimSpace(line[i+1:])
		if len(v) >= 2 {
			if (v[0] == '"' && v[len(v)-1] == '"') || (v[0] == '\'' && v[len(v)-1] == '\'') {
				v = v[1 : len(v)-1]
			}
		}
		return v, true
	}
	return "", false
}
