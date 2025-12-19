package main

import (
	"0xDABmusic/services"
	"context"
	_ "embed"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os/exec"
	stdruntime "runtime"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed version.json
var versionFile []byte

type AppVersion struct {
	Code string `json:"code"`
}

type App struct {
	ctx             context.Context
	spotifyService  *services.SpotifyService
	dabService      *services.DABService
	youtubeService  *services.YouTubeService
	downloadService *services.DownloadService
	cacheService    *services.CacheService
	config          *services.Config
	historyManager  *services.HistoryManager
}

func NewApp() *App {
	cfg, _ := services.LoadConfig()
	hm, _ := services.NewHistoryManager()
	dabService := services.NewDABService(cfg)

	return &App{
		spotifyService:  services.NewSpotifyService(cfg),
		dabService:      dabService,
		youtubeService:  services.NewYouTubeService(),
		downloadService: services.NewDownloadService(cfg, dabService),
		cacheService:    services.NewCacheService(cfg, dabService),
		config:          cfg,
		historyManager:  hm,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	a.spotifyService.TryRestoreSession()

	go func() {
		http.HandleFunc("/stream", a.cacheService.GetStream)
		http.HandleFunc("/image", a.cacheService.GetImage)
		http.ListenAndServe(":34116", nil)
	}()
}

func (a *App) OpenBrowser(url string) {
	runtime.BrowserOpenURL(a.ctx, url)
}

func (a *App) OpenMusicFolder() error {
	if stdruntime.GOOS == "windows" {
		return exec.Command("explorer", a.config.DownloadPath).Start()
	}
	runtime.BrowserOpenURL(a.ctx, "file:///"+a.config.DownloadPath)
	return nil
}

func (a *App) OpenConfigFolder() error {
	dir, err := services.GetConfigDir()
	if err != nil {
		return err
	}
	if stdruntime.GOOS == "windows" {
		return exec.Command("explorer", dir).Start()
	}
	runtime.BrowserOpenURL(a.ctx, "file:///"+dir)
	return nil
}

func (a *App) GetTotalCacheSize() (string, error) {
	size, err := a.cacheService.GetTotalSize()
	if err != nil {
		return "0 B", err
	}

	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size), nil
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp]), nil
}

func (a *App) ClearAllCache() error {
	return a.cacheService.ClearCache()
}

func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) SpotifyLogin() (string, error) {
	if a.config.SpotifyClientID == "" || a.config.SpotifyClientSecret == "" {
		return "", fmt.Errorf("spotify credentials not set")
	}

	a.spotifyService.StartCallbackServer("8888", func(code string) {
		err := a.spotifyService.ExchangeCode(code)
		if err != nil {
			runtime.EventsEmit(a.ctx, "spotify-auth-error", err.Error())
		} else {
			runtime.EventsEmit(a.ctx, "spotify-authenticated", true)
		}
	})

	url, err := a.spotifyService.StartAuth(a.config.SpotifyClientID, a.config.SpotifyClientSecret, a.config.SpotifyRedirectURI)
	return url, err
}

func (a *App) GetSpotifyPlaylist(url string) (*services.PlaylistInfo, error) {

	if a.youtubeService.IsYouTubeURL(url) {
		return a.youtubeService.GetPlaylistTracks(url)
	}
	return a.spotifyService.GetPlaylistTracks(url)
}

func (a *App) SaveConfig(clientID, clientSecret string) error {
	a.config.SpotifyClientID = clientID
	a.config.SpotifyClientSecret = clientSecret
	return services.SaveConfig(a.config)
}

func (a *App) SaveGeneralSettings(fuzzyScale int, maxConcurrency int, maxCacheSize int64) error {
	a.config.FuzzyMatchScale = fuzzyScale
	a.config.MaxConcurrency = maxConcurrency
	a.config.MaxCacheSize = maxCacheSize
	a.cacheService.SetMaxSize(maxCacheSize)
	return services.SaveConfig(a.config)
}

func (a *App) GetConfig() *services.Config {
	return a.config
}

func (a *App) DABLogin(email, password string) error {
	token, err := a.dabService.Login(email, password)
	if err != nil {
		return err
	}
	a.config.DABAuthToken = token
	a.config.DABEmail = email
	a.config.DABPassword = password
	return services.SaveConfig(a.config)
}

func (a *App) CreateDABLibrary(name, description string, tracks []services.TrackInfo) (*services.TransferStats, error) {
	return a.dabService.CreateLibrary(name, description, tracks, func(msg string) {
		runtime.EventsEmit(a.ctx, "conversion-log", msg)
	}, func(index int, status string, errorMsg string) {
		runtime.EventsEmit(a.ctx, "track-status", map[string]interface{}{
			"index":  index,
			"status": status,
			"error":  errorMsg,
		})
	})
}

func (a *App) AddToLibrary(libraryID string, track services.TrackInfo) error {

	duration := float64(track.Duration) / 1000.0

	dabTrack := services.DABTrack{
		ID:          track.SourceID,
		Title:       track.Title,
		Artist:      track.Artist,
		AlbumTitle:  track.AlbumTitle,
		AlbumCover:  track.AlbumCover,
		ReleaseDate: track.ReleaseDate,
		Genre:       track.Genre,
		Duration:    duration,
		AudioQuality: services.AudioQuality{
			MaxBitDepth:     24,
			MaxSamplingRate: 96.0,
			IsHiRes:         true,
		},
	}

	err := a.dabService.AddTrackToLibrary(libraryID, dabTrack)
	if err == nil {

		a.cacheService.SetCachedAPI("lib_details_"+libraryID, nil, -1)
		a.cacheService.SetCachedAPI("libraries", nil, -1)
	}
	return err
}

func (a *App) RemoveFromLibrary(libraryID, trackID string) error {
	err := a.dabService.RemoveTrackFromLibrary(libraryID, trackID)
	if err == nil {

		a.cacheService.SetCachedAPI("lib_details_"+libraryID, nil, -1)
		a.cacheService.SetCachedAPI("libraries", nil, -1)
	}
	return err
}

func (a *App) CheckDABSession() bool {

	if a.config.DABAuthToken != "" {
		if a.dabService.VerifyToken(a.config.DABAuthToken) {
			return true
		}
	}

	if a.config.DABEmail != "" && a.config.DABPassword != "" {
		token, err := a.dabService.Login(a.config.DABEmail, a.config.DABPassword)
		if err == nil {
			a.config.DABAuthToken = token
			services.SaveConfig(a.config)
			return true
		}
	}

	return false
}

func (a *App) CheckSpotifySession() bool {
	return a.spotifyService.IsAuthenticated()
}

func (a *App) Logout() {
	a.config.DABAuthToken = ""
	a.config.DABEmail = ""
	a.config.DABPassword = ""
	services.SaveConfig(a.config)
}

func (a *App) GetTransferHistory() ([]services.TransferRecord, error) {
	return a.historyManager.LoadRecords()
}

func (a *App) RecordTransfer(record services.TransferRecord) error {
	return a.historyManager.AddRecord(record)
}

func (a *App) ClearTransferHistory() error {
	return a.historyManager.ClearHistory()
}

func (a *App) DeleteTransferRecord(id string) error {
	return a.historyManager.DeleteRecord(id)
}

func (a *App) DownloadTrack(track services.DABTrack) string {
	return a.downloadService.AddToQueue(track)
}

func (a *App) GetDownloadQueue() []services.DownloadItem {
	return a.downloadService.GetQueue()
}

func (a *App) GetDownloadHistory() []services.DownloadItem {
	return a.downloadService.GetHistory()
}

func (a *App) ClearDownloadHistory() error {
	return a.downloadService.ClearHistory()
}

func (a *App) SearchDAB(query string) ([]services.DABTrack, error) {
	return a.dabService.Search(query)
}

func (a *App) GetStreamURL(trackID interface{}) (string, error) {
	idStr := fmt.Sprintf("%v", trackID)
	if idFloat, ok := trackID.(float64); ok {
		idStr = fmt.Sprintf("%.0f", idFloat)
	} else {
		if val, err := strconv.ParseFloat(idStr, 64); err == nil {
			idStr = fmt.Sprintf("%.0f", val)
		}
	}

	if path, ok := a.downloadService.GetDownloadedFilePath(idStr); ok {
		return fmt.Sprintf("http://localhost:34116/stream?trackId=%s&path=%s", idStr, url.QueryEscape(path)), nil
	}

	return fmt.Sprintf("http://localhost:34116/stream?trackId=%s", idStr), nil
}

func (a *App) GetFavorites() ([]services.DABTrack, error) {
	if cached, ok := a.cacheService.GetCachedAPI("favorites"); ok {
		if cached != nil {
			return cached.([]services.DABTrack), nil
		}
	}
	favs, err := a.dabService.GetFavorites()
	if err == nil {
		a.cacheService.SetCachedAPI("favorites", favs, 5*time.Minute)
	}
	return favs, err
}

func (a *App) AddToFavorites(track services.DABTrack) error {
	err := a.dabService.AddToFavorites(track)
	if err == nil {

		a.cacheService.SetCachedAPI("favorites", nil, -1)
	}
	return err
}

func (a *App) RemoveFromFavorites(trackID string) error {
	err := a.dabService.RemoveFromFavorites(trackID)
	if err == nil {

		a.cacheService.SetCachedAPI("favorites", nil, -1)
	}
	return err
}

func (a *App) GetLyrics(artist, title string) (map[string]interface{}, error) {
	return a.dabService.GetLyrics(artist, title)
}

func (a *App) GetAlbumByID(albumID string) (map[string]interface{}, error) {
	return a.dabService.GetAlbumByID(albumID)
}

func (a *App) DeleteLibrary(libraryID string) error {
	err := a.dabService.DeleteLibrary(libraryID)
	if err == nil {
		a.cacheService.SetCachedAPI("libraries", nil, -1)
		a.cacheService.SetCachedAPI("lib_details_"+libraryID, nil, -1)
	}
	return err
}

func (a *App) GetQueue() ([]services.DABTrack, error) {
	return a.dabService.GetQueue()
}

func (a *App) SaveQueue(queue []services.DABTrack) error {
	return a.dabService.SaveQueue(queue)
}

func (a *App) ClearQueue() error {
	return a.dabService.ClearQueue()
}

func (a *App) UpdateLibrary(libraryID, name, description string, isPublic bool) error {
	err := a.dabService.UpdateLibrary(libraryID, name, description, isPublic)
	if err == nil {
		a.cacheService.SetCachedAPI("libraries", nil, -1)
		a.cacheService.SetCachedAPI("lib_details_"+libraryID, nil, -1)
	}
	return err
}

func (a *App) GetCurrentUser() (map[string]interface{}, error) {
	return a.dabService.GetCurrentUser()
}

func (a *App) GetLibraries() ([]services.Library, error) {
	if cached, ok := a.cacheService.GetCachedAPI("libraries"); ok {
		if cached != nil {
			return cached.([]services.Library), nil
		}
	}
	libs, err := a.dabService.GetLibraries()
	if err == nil {
		a.cacheService.SetCachedAPI("libraries", libs, 5*time.Minute)
	}
	return libs, err
}

func (a *App) RefreshLibraries() ([]services.Library, error) {

	a.cacheService.SetCachedAPI("libraries", nil, -1)
	libs, err := a.dabService.GetLibraries()
	if err == nil {
		a.cacheService.SetCachedAPI("libraries", libs, 5*time.Minute)
	}
	return libs, err
}

func (a *App) GetLibraryDetails(id string) (*services.LibraryDetailsResponse, error) {
	cacheKey := "lib_details_" + id
	if cached, ok := a.cacheService.GetCachedAPI(cacheKey); ok {
		if cached != nil {
			return cached.(*services.LibraryDetailsResponse), nil
		}
	}
	details, err := a.dabService.GetLibraryDetails(id)
	if err == nil {
		a.cacheService.SetCachedAPI(cacheKey, details, 5*time.Minute)
	}
	return details, err
}

func (a *App) GetAppVersion() string {
	var v AppVersion
	if err := json.Unmarshal(versionFile, &v); err != nil {
		return "unknown"
	}
	return v.Code
}
