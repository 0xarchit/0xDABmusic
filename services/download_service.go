package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type DownloadStatus string

const (
	StatusPending     DownloadStatus = "pending"
	StatusDownloading DownloadStatus = "downloading"
	StatusCompleted   DownloadStatus = "completed"
	StatusFailed      DownloadStatus = "failed"
)

type DownloadItem struct {
	ID         string         `json:"id"`
	TrackID    string         `json:"trackId"`
	Title      string         `json:"title"`
	Artist     string         `json:"artist"`
	Album      string         `json:"album"`
	CoverArt   string         `json:"coverArt"`
	Status     DownloadStatus `json:"status"`
	Progress   float64        `json:"progress"`
	Error      string         `json:"error"`
	FilePath   string         `json:"filePath"`
	TotalSize  int64          `json:"totalSize"`
	Downloaded int64          `json:"downloaded"`
}

type DownloadService struct {
	config      *Config
	dabService  *DABService
	queue       []*DownloadItem
	history     []*DownloadItem
	mu          sync.RWMutex
	active      int
	maxActive   int
	updates     chan *DownloadItem
	historyFile string
}

func NewDownloadService(cfg *Config, dab *DABService) *DownloadService {
	dir, _ := GetConfigDir()
	_ = os.MkdirAll(dir, 0755)
	historyFile := filepath.Join(dir, "download_history.json")
	maxActive := cfg.MaxConcurrency
	if maxActive <= 0 {
		maxActive = 1
	}

	ds := &DownloadService{
		config:      cfg,
		dabService:  dab,
		queue:       make([]*DownloadItem, 0),
		history:     make([]*DownloadItem, 0),
		maxActive:   maxActive,
		updates:     make(chan *DownloadItem, 100),
		historyFile: historyFile,
	}

	ds.loadHistory()
	return ds
}

func (s *DownloadService) AddToQueue(track DABTrack) string {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := fmt.Sprintf("%v-%d", track.ID, time.Now().UnixNano())
	item := &DownloadItem{
		ID:       id,
		TrackID:  fmt.Sprintf("%v", track.ID),
		Title:    track.Title,
		Artist:   track.Artist,
		Album:    track.AlbumTitle,
		CoverArt: track.AlbumCover,
		Status:   StatusPending,
	}

	s.queue = append(s.queue, item)
	go s.processQueue()
	return id
}

func (s *DownloadService) processQueue() {
	s.mu.Lock()
	if s.active >= s.maxActive {
		s.mu.Unlock()
		return
	}

	var next *DownloadItem
	for _, item := range s.queue {
		if item.Status == StatusPending {
			next = item
			break
		}
	}

	if next == nil {
		s.mu.Unlock()
		return
	}

	next.Status = StatusDownloading
	s.active++
	s.mu.Unlock()

	go s.downloadTrack(next)
}

func (s *DownloadService) downloadTrack(item *DownloadItem) {
	defer func() {
		s.mu.Lock()
		s.active--
		s.mu.Unlock()
		s.processQueue()
	}()

	streamURL, err := s.dabService.GetStreamURL(item.TrackID)
	if err != nil {
		s.failDownload(item, err.Error())
		return
	}

	fileName := fmt.Sprintf("%s - %s.flac", item.Artist, item.Title)
	fileName = cleanFileName(fileName)
	downloadPath := filepath.Join(s.config.DownloadPath, fileName)

	if err := os.MkdirAll(s.config.DownloadPath, 0755); err != nil {
		s.failDownload(item, err.Error())
		return
	}

	out, err := os.Create(downloadPath)
	if err != nil {
		s.failDownload(item, err.Error())
		return
	}
	defer out.Close()

	client := &http.Client{}
	setHeaders := func(r *http.Request) {
		r.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
		if strings.Contains(streamURL, "youtube.com") || strings.Contains(streamURL, "googlevideo.com") {
			r.Header.Set("Referer", "https://music.youtube.com/")
			r.Header.Set("Origin", "https://music.youtube.com")
		}
		if strings.Contains(streamURL, s.config.DABAPIBase) && s.config.DABAuthToken != "" {
			r.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
		}
	}

	var totalSize int64
	headReq, herr := http.NewRequest("HEAD", streamURL, nil)
	if herr == nil {
		setHeaders(headReq)
		if headResp, err := client.Do(headReq); err == nil {
			cl := headResp.Header.Get("Content-Length")
			_ = headResp.Body.Close()
			if n, perr := strconv.ParseInt(strings.TrimSpace(cl), 10, 64); perr == nil && n > 0 {
				totalSize = n
			}
		}
	}

	req, err := http.NewRequest("GET", streamURL, nil)
	if err != nil {
		s.failDownload(item, err.Error())
		return
	}
	setHeaders(req)

	resp, err := client.Do(req)
	if err != nil {
		s.failDownload(item, err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		s.failDownload(item, fmt.Sprintf("HTTP %d", resp.StatusCode))
		return
	}

	if totalSize <= 0 {
		totalSize = resp.ContentLength
	}
	item.TotalSize = totalSize

	item.FilePath = downloadPath

	buf := make([]byte, 32*1024)
	for {
		n, err := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := out.Write(buf[:n]); werr != nil {
				s.failDownload(item, werr.Error())
				return
			}
			s.mu.Lock()
			item.Downloaded += int64(n)
			if item.TotalSize > 0 {
				item.Progress = float64(item.Downloaded) / float64(item.TotalSize) * 100
			}
			s.mu.Unlock()
			s.emitUpdate(item)
		}
		if err != nil {
			if err == io.EOF {
				break
			}
			s.failDownload(item, err.Error())
			return
		}
	}

	s.mu.Lock()
	item.Status = StatusCompleted
	item.Progress = 100
	s.history = append(s.history, item)

	for i, qItem := range s.queue {
		if qItem.ID == item.ID {
			s.queue = append(s.queue[:i], s.queue[i+1:]...)
			break
		}
	}

	s.mu.Unlock()
	s.saveHistory()
	s.emitUpdate(item)
}

func (s *DownloadService) failDownload(item *DownloadItem, msg string) {
	s.mu.Lock()
	item.Status = StatusFailed
	item.Error = msg
	s.mu.Unlock()
	s.emitUpdate(item)
}

func (s *DownloadService) emitUpdate(item *DownloadItem) {

}

func (s *DownloadService) GetQueue() []DownloadItem {
	s.mu.RLock()
	defer s.mu.RUnlock()

	items := make([]DownloadItem, len(s.queue))
	for i, item := range s.queue {
		items[i] = *item
	}
	return items
}

func cleanFileName(name string) string {
	invalid := []string{"<", ">", ":", "\"", "/", "\\", "|", "?", "*"}
	for _, char := range invalid {
		name = strings.ReplaceAll(name, char, "_")
	}
	return name
}

func (s *DownloadService) GetHistory() []DownloadItem {
	s.mu.RLock()
	defer s.mu.RUnlock()

	items := make([]DownloadItem, len(s.history))
	for i, item := range s.history {
		items[i] = *item
	}
	return items
}

func (s *DownloadService) ClearHistory() error {
	s.mu.Lock()
	s.history = make([]*DownloadItem, 0)
	s.mu.Unlock()
	return s.saveHistory()
}

func (s *DownloadService) saveHistory() error {
	s.mu.RLock()
	data, err := json.Marshal(s.history)
	s.mu.RUnlock()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(s.historyFile), 0755); err != nil {
		return err
	}
	return os.WriteFile(s.historyFile, data, 0644)
}

func (s *DownloadService) loadHistory() {
	data, err := os.ReadFile(s.historyFile)
	if err != nil {
		return
	}
	var items []*DownloadItem
	if err := json.Unmarshal(data, &items); err != nil {
		return
	}
	s.mu.Lock()
	s.history = items
	s.mu.Unlock()
}

func (s *DownloadService) GetDownloadedFilePath(trackID string) (string, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, item := range s.history {
		if item.TrackID == trackID && item.Status == StatusCompleted {
			if _, err := os.Stat(item.FilePath); err == nil {
				return item.FilePath, true
			}
		}
	}
	return "", false
}
