package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/lrstanley/go-ytdlp"
)

type YouTubeService struct{}

func NewYouTubeService() *YouTubeService {
	ytdlp.Install(context.Background(), nil)
	return &YouTubeService{}
}

func (s *YouTubeService) IsYouTubeURL(url string) bool {
	return strings.Contains(url, "youtube.com") || strings.Contains(url, "youtu.be")
}

func (s *YouTubeService) GetPlaylistTracks(url string) (*PlaylistInfo, error) {

	dl := ytdlp.New().
		DumpSingleJSON().
		NoWarnings().
		AddHeaders("User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36").
		FlatPlaylist().
		ForceIPv4().
		IgnoreErrors().
		NoCheckCertificates()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	res, err := dl.Run(ctx, url)
	if err != nil {
		errMsg := err.Error()
		if res != nil && res.Stderr != "" {
			errMsg = fmt.Sprintf("%s | Stderr: %s", errMsg, res.Stderr)
		}
		return nil, fmt.Errorf("yt-dlp failed: %s", errMsg)
	}

	var info struct {
		Title       string `json:"title"`
		Description string `json:"description"`
		Entries     []struct {
			Title    string  `json:"title"`
			Uploader string  `json:"uploader"`
			Duration float64 `json:"duration"`
			ID       string  `json:"id"`
			Url      string  `json:"url"`
		} `json:"entries"`

		Uploader string  `json:"uploader"`
		Duration float64 `json:"duration"`
		ID       string  `json:"id"`
	}

	if err := json.Unmarshal([]byte(res.Stdout), &info); err != nil {
		return nil, fmt.Errorf("failed to parse yt-dlp output: %w", err)
	}

	var tracks []TrackInfo

	if len(info.Entries) > 0 {
		for _, e := range info.Entries {
			tracks = append(tracks, TrackInfo{
				Title:    e.Title,
				Artist:   e.Uploader,
				Duration: int(e.Duration * 1000),
				SourceID: e.ID,
			})
		}
		return &PlaylistInfo{
			Name:        info.Title,
			Description: "Imported from YouTube",
			Tracks:      tracks,
		}, nil
	}

	tracks = append(tracks, TrackInfo{
		Title:    info.Title,
		Artist:   info.Uploader,
		Duration: int(info.Duration * 1000),
		SourceID: info.ID,
	})

	return &PlaylistInfo{
		Name:        info.Title,
		Description: "Single YouTube Video",
		Tracks:      tracks,
	}, nil
}
