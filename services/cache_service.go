package services

import (
	"crypto/md5"
	"encoding/hex"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type CacheService struct {
	config      *Config
	dabService  *DABService
	cacheDir    string
	imgCacheDir string
	maxSize     int64
	mu          sync.RWMutex
	apiCache    map[string]apiCacheEntry
	apiMu       sync.RWMutex
}

type apiCacheEntry struct {
	Data      interface{}
	ExpiresAt time.Time
}

func NewCacheService(cfg *Config, dab *DABService) *CacheService {
	cacheDir := filepath.Join(cfg.DownloadPath, ".cache")
	imgCacheDir := filepath.Join(cacheDir, "images")
	os.MkdirAll(cacheDir, 0755)
	os.MkdirAll(imgCacheDir, 0755)

	maxSize := cfg.MaxCacheSize
	if maxSize <= 0 {
		maxSize = 1024 * 1024 * 1024
	}

	return &CacheService{
		config:      cfg,
		dabService:  dab,
		cacheDir:    cacheDir,
		imgCacheDir: imgCacheDir,
		maxSize:     maxSize,
		apiCache:    make(map[string]apiCacheEntry),
	}
}

func (s *CacheService) GetCachedAPI(key string) (interface{}, bool) {
	s.apiMu.RLock()
	defer s.apiMu.RUnlock()

	entry, exists := s.apiCache[key]
	if !exists {
		return nil, false
	}

	if time.Now().After(entry.ExpiresAt) {
		return nil, false
	}

	return entry.Data, true
}

func (s *CacheService) SetCachedAPI(key string, data interface{}, duration time.Duration) {
	s.apiMu.Lock()
	defer s.apiMu.Unlock()

	if data == nil || duration < 0 {

		delete(s.apiCache, key)
		return
	}

	s.apiCache[key] = apiCacheEntry{
		Data:      data,
		ExpiresAt: time.Now().Add(duration),
	}
}

func (s *CacheService) DeleteCachedAPI(key string) {
	s.apiMu.Lock()
	defer s.apiMu.Unlock()
	delete(s.apiCache, key)
}

func (s *CacheService) ClearAPICache() {
	s.apiMu.Lock()
	defer s.apiMu.Unlock()
	s.apiCache = make(map[string]apiCacheEntry)
}

func (s *CacheService) GetStream(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	trackID := r.URL.Query().Get("trackId")
	filePath := r.URL.Query().Get("path")

	if filePath != "" {
		http.ServeFile(w, r, filePath)
		return
	}

	if trackID == "" {
		http.Error(w, "trackId required", http.StatusBadRequest)
		return
	}

	cacheFile := filepath.Join(s.cacheDir, trackID+".flac")

	s.mu.RLock()
	if _, err := os.Stat(cacheFile); err == nil {
		s.mu.RUnlock()

		http.ServeFile(w, r, cacheFile)
		return
	}
	s.mu.RUnlock()

	streamURL, err := s.dabService.GetStreamURL(trackID)
	if err != nil {
		http.Error(w, "failed to get stream url: "+err.Error(), http.StatusInternalServerError)
		return
	}

	req, err := http.NewRequest("GET", streamURL, nil)
	if err != nil {
		http.Error(w, "failed to create request: "+err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")

	if strings.Contains(streamURL, "youtube.com") || strings.Contains(streamURL, "googlevideo.com") {
		req.Header.Set("Referer", "https://music.youtube.com/")
		req.Header.Set("Origin", "https://music.youtube.com")
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "failed to fetch stream: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	tmpFile := cacheFile + ".tmp"
	out, err := os.Create(tmpFile)
	if err != nil {

		io.Copy(w, resp.Body)
		return
	}

	for k, v := range resp.Header {
		w.Header()[k] = v
	}
	w.WriteHeader(resp.StatusCode)

	mw := io.MultiWriter(w, out)
	_, err = io.Copy(mw, resp.Body)

	out.Close()

	if err == nil {
		os.Rename(tmpFile, cacheFile)
		go s.enforceCacheLimit()
	} else {
		os.Remove(tmpFile)
	}
}

func (s *CacheService) GetImage(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	url := r.URL.Query().Get("url")
	if url == "" {
		http.Error(w, "url required", http.StatusBadRequest)
		return
	}

	hash := md5.Sum([]byte(url))
	filename := hex.EncodeToString(hash[:]) + ".jpg"
	cacheFile := filepath.Join(s.imgCacheDir, filename)

	s.mu.RLock()
	if _, err := os.Stat(cacheFile); err == nil {
		s.mu.RUnlock()
		http.ServeFile(w, r, cacheFile)
		return
	}
	s.mu.RUnlock()

	resp, err := http.Get(url)
	if err != nil {
		http.Error(w, "failed to fetch image", http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	out, err := os.Create(cacheFile)
	if err != nil {
		io.Copy(w, resp.Body)
		return
	}
	defer out.Close()

	mw := io.MultiWriter(w, out)
	io.Copy(mw, resp.Body)
}

func (s *CacheService) GetTotalSize() (int64, error) {
	var size int64
	err := filepath.Walk(s.cacheDir, func(_ string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			size += info.Size()
		}
		return nil
	})
	return size, err
}

func (s *CacheService) ClearCache() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	os.RemoveAll(s.cacheDir)

	os.MkdirAll(s.cacheDir, 0755)
	os.MkdirAll(s.imgCacheDir, 0755)

	return nil
}

func (s *CacheService) enforceCacheLimit() {
	s.mu.Lock()
	defer s.mu.Unlock()

	var totalSize int64
	type fileInfo struct {
		path string
		size int64
		time time.Time
	}
	var files []fileInfo

	filepath.Walk(s.cacheDir, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		totalSize += info.Size()
		files = append(files, fileInfo{
			path: path,
			size: info.Size(),
			time: info.ModTime(),
		})
		return nil
	})

	if totalSize <= s.maxSize {
		return
	}

	for totalSize > s.maxSize && len(files) > 0 {
		oldestIdx := 0
		for i := 1; i < len(files); i++ {
			if files[i].time.Before(files[oldestIdx].time) {
				oldestIdx = i
			}
		}

		err := os.Remove(files[oldestIdx].path)
		if err == nil {
			totalSize -= files[oldestIdx].size
		}

		files = append(files[:oldestIdx], files[oldestIdx+1:]...)
	}
}

func (s *CacheService) SetMaxSize(size int64) {
	s.mu.Lock()
	s.maxSize = size
	s.mu.Unlock()
	go s.enforceCacheLimit()
}
