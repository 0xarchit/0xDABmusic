package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

type CreateLibraryPayload struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsPublic    bool   `json:"isPublic"`
}

type CreateLibraryResponse struct {
	Library struct {
		ID string `json:"id"`
	} `json:"library"`
}

type AudioQualityPayload struct {
	MaxBitDepth     int     `json:"maximumBitDepth"`
	MaxSamplingRate float64 `json:"maximumSamplingRate"`
	IsHiRes         bool    `json:"isHiRes"`
}

type DABTrackPayload struct {
	ID           string              `json:"id"`
	Title        string              `json:"title"`
	Artist       string              `json:"artist"`
	ArtistID     interface{}         `json:"artistId"`
	AlbumTitle   string              `json:"albumTitle"`
	AlbumCover   string              `json:"albumCover"`
	AlbumID      interface{}         `json:"albumId"`
	ReleaseDate  string              `json:"releaseDate"`
	Genre        string              `json:"genre"`
	Duration     interface{}         `json:"duration"`
	AudioQuality AudioQualityPayload `json:"audioQuality"`
}

type AddTrackRequest struct {
	Track DABTrackPayload `json:"track"`
}

type TransferStats struct {
	Total   int `json:"total"`
	Matched int `json:"matched"`
	Added   int `json:"added"`
	Failed  int `json:"failed"`
}

func (s *DABService) CreateLibrary(name, description string, tracks []TrackInfo, onProgress func(string), onTrackStatus func(int, string, string)) (*TransferStats, error) {
	if s.config.DABAuthToken == "" {
		return nil, fmt.Errorf("not logged in to DAB")
	}

	stats := &TransferStats{
		Total: len(tracks),
	}

	onProgress("Searching and matching tracks...")

	type MatchedTrackInfo struct {
		Track         DABTrack
		OriginalIndex int
	}
	var matchedTracks []MatchedTrackInfo

	concurrency := s.config.MaxConcurrency
	if concurrency <= 0 {
		concurrency = 1
	}

	sem := make(chan struct{}, concurrency)
	var wg sync.WaitGroup
	var mu sync.Mutex

	for i, t := range tracks {
		wg.Add(1)
		go func(i int, t TrackInfo) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			prefix := fmt.Sprintf("[%d/%d]", i+1, len(tracks))
			onTrackStatus(i, "searching", "")

			var results []DABTrack
			var err error
			var searchSource TrackInfo = t

			query1 := fmt.Sprintf("%s %s", t.Artist, t.Title)
			results, err = s.Search(query1)

			cleanArtist := cleanMetadata(t.Artist)
			cleanTitle := cleanMetadata(t.Title)

			if err == nil && len(results) == 0 {

				if cleanArtist != t.Artist || cleanTitle != t.Title {
					query2 := fmt.Sprintf("%s %s", cleanArtist, cleanTitle)
					results, err = s.Search(query2)
				}

				if err == nil && len(results) == 0 && cleanTitle != "" {
					results, err = s.Search(cleanTitle)
				}
			}

			if err == nil && len(results) == 0 {
				onProgress(fmt.Sprintf("%s ℹ Resolving via MusicBrainz...", prefix))
				mbTrack, mbErr := s.mbService.ResolveTrackMetadata(t.Title, t.Artist)
				if mbErr != nil {
					onProgress(fmt.Sprintf("%s ⚠ MusicBrainz error: %v", prefix, mbErr))
				} else if mbTrack != nil {
					onProgress(fmt.Sprintf("%s ℹ MusicBrainz found: %s - %s", prefix, mbTrack.Artist, mbTrack.Title))

					searchSource = *mbTrack

					query4 := fmt.Sprintf("%s %s", mbTrack.Artist, mbTrack.Title)

					results, err = s.Search(query4)

					if err == nil && len(results) == 0 {

						results, err = s.Search(mbTrack.Title)
					}
				} else {
					onProgress(fmt.Sprintf("%s ℹ MusicBrainz found no match", prefix))
				}
			}

			if err == nil && len(results) == 0 {
				words := strings.Fields(cleanTitle)
				if len(words) > 3 {
					shortTitle := strings.Join(words[:3], " ")

					results, err = s.Search(shortTitle)
				}
			}

			if err != nil {
				onProgress(fmt.Sprintf("%s ✗ Search failed for '%s': %v", prefix, t.Title, err))
				onTrackStatus(i, "not-found", err.Error())
				return
			}

			matchedTrack, score := s.matchTrack(searchSource, results)
			if matchedTrack != nil {
				mu.Lock()
				matchedTracks = append(matchedTracks, MatchedTrackInfo{Track: *matchedTrack, OriginalIndex: i})
				mu.Unlock()
				onProgress(fmt.Sprintf("%s ✓ Matched: %s - %s (Score: %d%%)", prefix, matchedTrack.Artist, matchedTrack.Title, score))
				onTrackStatus(i, "found", "")
			} else {
				onProgress(fmt.Sprintf("%s ⚠ No match found for '%s - %s' (Best Score: %d%%, Candidates: %d)", prefix, t.Artist, t.Title, score, len(results)))
				onTrackStatus(i, "not-found", "")
			}

			time.Sleep(100 * time.Millisecond)
		}(i, t)
	}
	wg.Wait()

	if len(matchedTracks) == 0 {
		onProgress("No tracks matched. Aborting library creation.")
		return stats, fmt.Errorf("no tracks matched")
	}

	stats.Matched = len(matchedTracks)

	onProgress(fmt.Sprintf("Creating library '%s' with %d tracks...", name, len(matchedTracks)))
	libraryID, err := s.createLibraryEntity(name, description)
	if err != nil {
		return stats, fmt.Errorf("failed to create library: %v", err)
	}
	onProgress("Library container created. Adding tracks...")

	var addedCount int
	var failedCount int
	var statsMu sync.Mutex

	for i, mt := range matchedTracks {
		wg.Add(1)
		go func(i int, mt MatchedTrackInfo) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			prefix := fmt.Sprintf("[%d/%d]", i+1, len(matchedTracks))

			onTrackStatus(mt.OriginalIndex, "adding", "")

			var err error
			maxRetries := 3
			for attempt := 0; attempt < maxRetries; attempt++ {
				if attempt > 0 {
					delay := time.Duration(attempt*2) * time.Second
					onProgress(fmt.Sprintf("%s ⏳ Retry %d/%d after %v...", prefix, attempt, maxRetries-1, delay))
					time.Sleep(delay)
				}

				err = s.AddTrackToLibrary(libraryID, mt.Track)
				if err == nil {
					break
				}

				if strings.Contains(err.Error(), "429") {
					continue
				} else {
					break
				}
			}

			if err != nil {
				onProgress(fmt.Sprintf("%s ✗ Failed to add '%s': %v", prefix, mt.Track.Title, err))
				onTrackStatus(mt.OriginalIndex, "error", err.Error())
				statsMu.Lock()
				failedCount++
				statsMu.Unlock()
			} else {
				onProgress(fmt.Sprintf("%s ✓ Added '%s'", prefix, mt.Track.Title))
				onTrackStatus(mt.OriginalIndex, "added", "")
				statsMu.Lock()
				addedCount++
				statsMu.Unlock()
			}

			time.Sleep(500 * time.Millisecond)
		}(i, mt)
	}
	wg.Wait()

	stats.Added = addedCount
	stats.Failed = failedCount + (len(tracks) - len(matchedTracks))

	onProgress("Conversion complete!")
	return stats, nil
}

func (s *DABService) createLibraryEntity(name, description string) (string, error) {
	url := fmt.Sprintf("%s/libraries", s.config.DABAPIBase)
	payload := CreateLibraryPayload{
		Name:        name,
		Description: description,
		IsPublic:    true,
	}

	data, _ := json.Marshal(payload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return "", err
	}

	s.setHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {
		return "", fmt.Errorf("status %d", resp.StatusCode)
	}

	var result CreateLibraryResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Library.ID, nil
}

func (s *DABService) AddTrackToLibrary(libraryID string, track DABTrack) error {

	details, err := s.GetLibraryDetails(libraryID)
	if err == nil && details != nil {
		targetID := fmt.Sprintf("%v", track.ID)
		for _, t := range details.Tracks {
			existingID := fmt.Sprintf("%v", t.ID)
			if existingID == targetID {
				return fmt.Errorf("track already exists in library")
			}
		}
	}

	url := fmt.Sprintf("%s/libraries/%s/tracks", s.config.DABAPIBase, libraryID)

	var idStr string
	switch v := track.ID.(type) {
	case string:
		idStr = v
	case float64:
		idStr = fmt.Sprintf("%.0f", v)
	case int:
		idStr = fmt.Sprintf("%d", v)
	default:
		idStr = fmt.Sprintf("%v", v)
	}

	payloadTrack := DABTrackPayload{
		ID:          idStr,
		Title:       track.Title,
		Artist:      track.Artist,
		AlbumTitle:  track.AlbumTitle,
		AlbumCover:  track.AlbumCover,
		ReleaseDate: track.ReleaseDate,
		Genre:       track.Genre,
	}

	if track.ArtistID != nil {
		payloadTrack.ArtistID = track.ArtistID
	} else {
		payloadTrack.ArtistID = 0
	}

	if track.AlbumID != nil {
		payloadTrack.AlbumID = track.AlbumID
	} else {
		payloadTrack.AlbumID = ""
	}

	if track.Duration != nil {
		payloadTrack.Duration = track.Duration
	} else {
		payloadTrack.Duration = 0
	}

	if track.AudioQuality.MaxBitDepth == 0 && track.AudioQuality.MaxSamplingRate == 0 {
		payloadTrack.AudioQuality = AudioQualityPayload{
			MaxBitDepth:     24,
			MaxSamplingRate: 96.0,
			IsHiRes:         true,
		}
	} else {
		payloadTrack.AudioQuality = AudioQualityPayload{
			MaxBitDepth:     track.AudioQuality.MaxBitDepth,
			MaxSamplingRate: track.AudioQuality.MaxSamplingRate,
			IsHiRes:         track.AudioQuality.IsHiRes,
		}
	}

	requestPayload := AddTrackRequest{Track: payloadTrack}

	data, _ := json.Marshal(requestPayload)
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(data))
	if err != nil {
		return err
	}

	s.setHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 && resp.StatusCode != 201 {

		var body bytes.Buffer
		body.ReadFrom(resp.Body)
		return fmt.Errorf("status %d: %s", resp.StatusCode, body.String())
	}
	return nil
}

func (s *DABService) RemoveTrackFromLibrary(libraryID, trackID string) error {
	url := fmt.Sprintf("%s/libraries/%s/tracks/%s", s.config.DABAPIBase, libraryID, trackID)
	req, err := http.NewRequest("DELETE", url, nil)
	if err != nil {
		return err
	}

	s.setHeaders(req)

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("failed to remove track: %d", resp.StatusCode)
	}
	return nil
}

func (s *DABService) setHeaders(req *http.Request) {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept-Encoding", "gzip, deflate, br")

	req.Header.Set("Authorization", "Bearer "+s.config.DABAuthToken)
	req.AddCookie(&http.Cookie{Name: "session", Value: s.config.DABAuthToken})

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	req.Header.Set("Origin", "https://dabmusic.xyz")
	req.Header.Set("Referer", "https://dabmusic.xyz/")
	req.Header.Set("Sec-Ch-Ua", `"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"`)
	req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
	req.Header.Set("Sec-Ch-Ua-Platform", `"Windows"`)
	req.Header.Set("Sec-Fetch-Dest", "empty")
	req.Header.Set("Sec-Fetch-Mode", "cors")
	req.Header.Set("Sec-Fetch-Site", "same-origin")
	req.Header.Set("Cache-Control", "no-cache")
	req.Header.Set("Pragma", "no-cache")
}

func (s *DABService) matchTrack(source TrackInfo, candidates []DABTrack) (*DABTrack, int) {
	if len(candidates) == 0 {
		return nil, 0
	}

	if source.ISRC != "" {
		for _, c := range candidates {

			_ = c
		}
	}

	threshold := s.config.FuzzyMatchScale
	if threshold == 0 {
		threshold = 70
	}

	var bestMatch *DABTrack
	bestScore := 0

	sourceStr := fmt.Sprintf("%s %s", source.Artist, source.Title)

	for _, c := range candidates {
		candidateStr := fmt.Sprintf("%s %s", c.Artist, c.Title)
		score := calculateSimilarity(sourceStr, candidateStr)

		if score > bestScore {
			bestScore = score
			bestMatch = &c
		}
	}

	if bestScore >= threshold {
		return bestMatch, bestScore
	}

	return nil, bestScore
}

func calculateSimilarity(s1, s2 string) int {
	s1 = normalizeString(s1)
	s2 = normalizeString(s2)

	tokens1 := strings.Fields(s1)
	tokens2 := strings.Fields(s2)

	if len(tokens1) == 0 || len(tokens2) == 0 {
		return 0
	}

	matches := 0
	t2Map := make(map[string]bool)
	for _, t := range tokens2 {
		t2Map[t] = true
	}

	for _, t1 := range tokens1 {
		if t2Map[t1] {
			matches++
		}
	}

	minLen := len(tokens1)
	if len(tokens2) < minLen {
		minLen = len(tokens2)
	}

	if minLen == 0 {
		return 0
	}

	return (matches * 100) / minLen
}

func normalizeString(s string) string {
	s = strings.ToLower(s)

	s = strings.ReplaceAll(s, "(", " ")
	s = strings.ReplaceAll(s, ")", " ")
	s = strings.ReplaceAll(s, "[", " ")
	s = strings.ReplaceAll(s, "]", " ")
	s = strings.ReplaceAll(s, "{", " ")
	s = strings.ReplaceAll(s, "}", " ")
	s = strings.ReplaceAll(s, "-", " ")
	s = strings.ReplaceAll(s, "_", " ")
	s = strings.ReplaceAll(s, ",", " ")
	s = strings.ReplaceAll(s, ".", " ")
	s = strings.ReplaceAll(s, "&", " ")
	s = strings.ReplaceAll(s, "|", " ")
	s = strings.ReplaceAll(s, "/", " ")
	s = strings.ReplaceAll(s, "\\", " ")
	s = strings.ReplaceAll(s, "\"", " ")
	s = strings.ReplaceAll(s, "'", " ")

	keywords := []string{
		"feat", "ft", "remix", "original mix", "official video", "official audio",
		"music video", "lyrics", "lyric video", "official music video", "full video",
		"hd", "hq", "4k", "mv", "official", "live", "performance",
	}

	for _, k := range keywords {
		s = strings.ReplaceAll(s, k, " ")
	}

	return strings.Join(strings.Fields(s), " ")
}

func cleanMetadata(s string) string {

	if idx := strings.Index(s, "("); idx != -1 {
		s = s[:idx]
	}
	if idx := strings.Index(s, "["); idx != -1 {
		s = s[:idx]
	}

	if idx := strings.Index(s, " - "); idx != -1 {
		s = s[:idx]
	}

	if idx := strings.Index(s, ","); idx != -1 {
		s = s[:idx]
	}

	return strings.TrimSpace(s)
}
