package services

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type DABService struct {
	config    *Config
	client    *http.Client
	mbService *MusicBrainzService
}

func NewDABService(cfg *Config) *DABService {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	return &DABService{
		config:    cfg,
		client:    &http.Client{Transport: tr},
		mbService: NewMusicBrainzService(),
	}
}

func (s *DABService) logRequest(req *http.Request) {
}

func (s *DABService) logResponse(resp *http.Response, err error) {
}

func (s *DABService) Login(email, password string) (string, error) {
	base := resolveDABAPIBase(s.config)
	endpoint := fmt.Sprintf("%s/auth/login", base)
	payload := map[string]string{
		"email":    email,
		"password": password,
	}
	data, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", endpoint, bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
	origin := originFromBase(base)
	if origin != "" {
		req.Header.Set("Origin", origin)
		req.Header.Set("Referer", origin+"/")
	} else {
		req.Header.Del("Origin")
		req.Header.Del("Referer")
	}

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		msg := strings.TrimSpace(string(b))
		ct := strings.ToLower(resp.Header.Get("Content-Type"))
		lower := strings.ToLower(msg)
		if resp.StatusCode == 403 && (strings.Contains(lower, "just a moment") || strings.Contains(lower, "cf-") || strings.Contains(lower, "cloudflare")) {
			return "", fmt.Errorf("login blocked by Cloudflare at %s. Set BASE to a DAB API endpoint that doesn't require a browser challenge", base)
		}
		if strings.Contains(ct, "text/html") || strings.HasPrefix(lower, "<!doctype") || strings.HasPrefix(lower, "<html") {
			return "", fmt.Errorf("login failed with status: %d", resp.StatusCode)
		}
		if msg != "" {
			return "", fmt.Errorf("login failed with status: %d: %s", resp.StatusCode, msg)
		}
		return "", fmt.Errorf("login failed with status: %d", resp.StatusCode)
	}

	var token string
	for _, cookie := range resp.Cookies() {
		if cookie.Name == "session" {
			token = cookie.Value
			break
		}
	}

	if token == "" {
		return "", fmt.Errorf("session cookie not found")
	}

	return token, nil
}

type AudioQuality struct {
	MaxBitDepth     int     `json:"maximumBitDepth"`
	MaxSamplingRate float64 `json:"maximumSamplingRate"`
	IsHiRes         bool    `json:"isHiRes"`
}

type DABTrack struct {
	ID           interface{}  `json:"id"`
	Title        string       `json:"title"`
	Artist       string       `json:"artist"`
	ArtistID     interface{}  `json:"artistId"`
	AlbumTitle   string       `json:"albumTitle"`
	AlbumCover   string       `json:"albumCover"`
	AlbumID      interface{}  `json:"albumId"`
	ReleaseDate  string       `json:"releaseDate"`
	Genre        string       `json:"genre"`
	Duration     interface{}  `json:"duration"`
	AudioQuality AudioQuality `json:"audioQuality"`
}

type SearchResponse struct {
	Tracks []DABTrack `json:"tracks"`
}

func (s *DABService) Search(query string) ([]DABTrack, error) {

	time.Sleep(600 * time.Millisecond)

	base := resolveDABAPIBase(s.config)
	u, err := url.Parse(base + "/search")
	if err != nil {
		return nil, err
	}

	q := u.Query()
	q.Set("q", query)
	q.Set("type", "track")
	u.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", u.String(), nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "application/json")

	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("search failed: %d", resp.StatusCode)
	}

	var result SearchResponse

	var body bytes.Buffer
	_, err = body.ReadFrom(resp.Body)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(body.Bytes(), &result); err == nil && len(result.Tracks) > 0 {
		return result.Tracks, nil
	}

	var listResult []DABTrack
	if err := json.Unmarshal(body.Bytes(), &listResult); err == nil {
		return listResult, nil
	}

	return []DABTrack{}, nil
}

func (s *DABService) GetStreamURL(trackID interface{}) (string, error) {
	idStr := fmt.Sprintf("%v", trackID)

	if idFloat, ok := trackID.(float64); ok {
		idStr = fmt.Sprintf("%.0f", idFloat)
	} else {

		if val, err := strconv.ParseFloat(idStr, 64); err == nil {
			idStr = fmt.Sprintf("%.0f", val)
		}
	}

	base := resolveDABAPIBase(s.config)
	url := fmt.Sprintf("%s/stream?trackId=%s", base, idStr)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")

	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("failed to get stream url: %d", resp.StatusCode)
	}

	var result struct {
		StreamURL string `json:"url"`
		AltURL    string `json:"streamUrl"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if result.StreamURL != "" {
		return result.StreamURL, nil
	}
	return result.AltURL, nil
}

func (s *DABService) GetAlbumInfo(albumID string) (interface{}, error) {
	url := fmt.Sprintf("%s/api/album?albumId=%s", resolveDABAPIBase(s.config), albumID)
	return s.fetchJSON(url)
}

func (s *DABService) fetchJSON(url string) (interface{}, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result, nil
}

type Library struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	TrackCount int    `json:"trackCount"`
}

type LibrariesResponse struct {
	Libraries []Library `json:"libraries"`
}

type LibraryDetailsResponse struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description"`
	IsPublic    bool       `json:"isPublic"`
	Tracks      []DABTrack `json:"tracks"`
}

type LibraryDetailsWrapper struct {
	Library LibraryDetailsResponse `json:"library"`
}

type FavoritesResponse struct {
	Favorites []DABTrack `json:"favorites"`
}

func (s *DABService) GetFavorites() ([]DABTrack, error) {
	url := fmt.Sprintf("%s/favorites", resolveDABAPIBase(s.config))
	var result FavoritesResponse
	err := s.fetchJSONInto(url, &result)
	return result.Favorites, err
}

func (s *DABService) AddToFavorites(track DABTrack) error {
	url := fmt.Sprintf("%s/favorites", resolveDABAPIBase(s.config))
	payload := map[string]interface{}{
		"track": track,
	}
	data, _ := json.Marshal(payload)
	return s.postJSON(url, data)
}

func (s *DABService) RemoveFromFavorites(trackID string) error {
	url := fmt.Sprintf("%s/favorites?trackId=%s", resolveDABAPIBase(s.config), trackID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to remove from favorites: %d", resp.StatusCode)
	}
	return nil
}

func (s *DABService) GetLibraries() ([]Library, error) {
	url := fmt.Sprintf("%s/libraries", resolveDABAPIBase(s.config))
	var result LibrariesResponse
	err := s.fetchJSONInto(url, &result)
	return result.Libraries, err
}

func (s *DABService) GetLyrics(artist, title string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/lyrics?artist=%s&title=%s",
		resolveDABAPIBase(s.config),
		urlQueryEscape(artist),
		urlQueryEscape(title))

	var result map[string]interface{}
	err := s.fetchJSONInto(url, &result)
	return result, err
}

func (s *DABService) GetAlbumByID(albumID string) (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/album?albumId=%s", resolveDABAPIBase(s.config), albumID)
	var result map[string]interface{}
	err := s.fetchJSONInto(url, &result)
	return result, err
}

type QueueResponse struct {
	Queue []DABTrack `json:"queue"`
}

func (s *DABService) GetQueue() ([]DABTrack, error) {
	url := fmt.Sprintf("%s/queue", resolveDABAPIBase(s.config))
	var result QueueResponse
	err := s.fetchJSONInto(url, &result)
	return result.Queue, err
}

func (s *DABService) SaveQueue(queue []DABTrack) error {
	url := fmt.Sprintf("%s/queue", resolveDABAPIBase(s.config))
	payload := map[string]interface{}{
		"queue": queue,
	}
	data, _ := json.Marshal(payload)
	return s.postJSON(url, data)
}

func (s *DABService) ClearQueue() error {
	url := fmt.Sprintf("%s/queue", resolveDABAPIBase(s.config))
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to clear queue: %d", resp.StatusCode)
	}
	return nil
}

func (s *DABService) UpdateLibrary(libraryID, name, description string, isPublic bool) error {
	url := fmt.Sprintf("%s/libraries/%s", resolveDABAPIBase(s.config), libraryID)
	payload := map[string]interface{}{
		"name":        name,
		"description": description,
		"isPublic":    isPublic,
	}
	data, _ := json.Marshal(payload)

	req, err := http.NewRequest("PATCH", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to update library: %d", resp.StatusCode)
	}
	return nil
}

func (s *DABService) DeleteLibrary(libraryID string) error {
	url := fmt.Sprintf("%s/libraries/%s", resolveDABAPIBase(s.config), libraryID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 && resp.StatusCode != 204 {
		return fmt.Errorf("failed to delete library: %d", resp.StatusCode)
	}
	return nil
}

func (s *DABService) GetCurrentUser() (map[string]interface{}, error) {
	url := fmt.Sprintf("%s/auth/me", resolveDABAPIBase(s.config))
	var result map[string]interface{}
	err := s.fetchJSONInto(url, &result)
	return result, err
}

func urlQueryEscape(s string) string {
	return url.QueryEscape(s)
}

func (s *DABService) GetLibraryDetails(libraryID string) (*LibraryDetailsResponse, error) {

	base := resolveDABAPIBase(s.config)
	url := fmt.Sprintf("%s/libraries/%s?limit=1000", base, libraryID)
	var result LibraryDetailsWrapper
	err := s.fetchJSONInto(url, &result)
	if err == nil {
		return &result.Library, nil
	}

	sharedUrl := fmt.Sprintf("%s/shared/library/%s?limit=1000", base, libraryID)
	errShared := s.fetchJSONInto(sharedUrl, &result)
	if errShared == nil {
		return &result.Library, nil
	}

	return nil, fmt.Errorf("failed to fetch library details: %v (private), %v (shared)", err, errShared)
}

func (s *DABService) fetchJSONInto(url string, target interface{}) error {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
	if origin := originFromBase(resolveDABAPIBase(s.config)); origin != "" {
		req.Header.Set("Origin", origin)
		req.Header.Set("Referer", origin+"/")
	} else {
		req.Header.Del("Origin")
		req.Header.Del("Referer")
	}

	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		msg := strings.TrimSpace(string(b))
		ct := strings.ToLower(resp.Header.Get("Content-Type"))
		lower := strings.ToLower(msg)
		if strings.Contains(ct, "text/html") || strings.HasPrefix(lower, "<!doctype") || strings.HasPrefix(lower, "<html") {
			return fmt.Errorf("request failed: %d", resp.StatusCode)
		}
		if msg != "" {
			return fmt.Errorf("request failed: %d: %s", resp.StatusCode, msg)
		}
		return fmt.Errorf("request failed: %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(target)
}

func (s *DABService) postJSON(url string, data []byte) error {
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
	if s.config.DABAuthToken != "" {
		req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})
	}

	s.logRequest(req)
	resp, err := s.client.Do(req)
	s.logResponse(resp, err)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		return fmt.Errorf("request failed: %d", resp.StatusCode)
	}
	return nil
}
