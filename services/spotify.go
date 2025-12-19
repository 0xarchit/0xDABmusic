package services

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/zmb3/spotify/v2"
	spotifyauth "github.com/zmb3/spotify/v2/auth"
	"golang.org/x/oauth2"
)

type SpotifyService struct {
	client *spotify.Client
	auth   *spotifyauth.Authenticator
	state  string
	config *Config
}

func NewSpotifyService(cfg *Config) *SpotifyService {
	s := &SpotifyService{
		state:  "0xdabmusic-state",
		config: cfg,
	}
	return s
}

func (s *SpotifyService) IsAuthenticated() bool {
	return s.client != nil
}

type notifyRefreshTokenSource struct {
	new oauth2.TokenSource
	f   func(*oauth2.Token) error
}

func (s *notifyRefreshTokenSource) Token() (*oauth2.Token, error) {
	tok, err := s.new.Token()
	if err != nil {
		return nil, err
	}
	if s.f != nil {
		s.f(tok)
	}
	return tok, nil
}

func (s *SpotifyService) TryRestoreSession() bool {
	if s.config.SpotifyAccessToken == "" || s.config.SpotifyRefreshToken == "" {
		return false
	}

	if s.auth == nil {
		s.auth = spotifyauth.New(
			spotifyauth.WithClientID(s.config.SpotifyClientID),
			spotifyauth.WithClientSecret(s.config.SpotifyClientSecret),
			spotifyauth.WithRedirectURL(s.config.SpotifyRedirectURI),
			spotifyauth.WithScopes(spotifyauth.ScopePlaylistReadPrivate, spotifyauth.ScopePlaylistReadCollaborative),
		)
	}

	expiry, _ := time.Parse(time.RFC3339, s.config.SpotifyTokenExpiry)
	token := &oauth2.Token{
		AccessToken:  s.config.SpotifyAccessToken,
		RefreshToken: s.config.SpotifyRefreshToken,
		Expiry:       expiry,
		TokenType:    "Bearer",
	}

	ctx := context.Background()

	oauthConfig := &oauth2.Config{
		ClientID:     s.config.SpotifyClientID,
		ClientSecret: s.config.SpotifyClientSecret,
		RedirectURL:  s.config.SpotifyRedirectURI,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.spotify.com/authorize",
			TokenURL: "https://accounts.spotify.com/api/token",
		},
		Scopes: []string{spotifyauth.ScopePlaylistReadPrivate, spotifyauth.ScopePlaylistReadCollaborative},
	}

	ts := oauthConfig.TokenSource(ctx, token)
	notifyTS := &notifyRefreshTokenSource{
		new: ts,
		f: func(tok *oauth2.Token) error {
			if tok.AccessToken == s.config.SpotifyAccessToken {
				return nil
			}
			s.config.SpotifyAccessToken = tok.AccessToken
			s.config.SpotifyRefreshToken = tok.RefreshToken
			s.config.SpotifyTokenExpiry = tok.Expiry.Format(time.RFC3339)
			return SaveConfig(s.config)
		},
	}

	if _, err := notifyTS.Token(); err != nil {
		return false
	}

	s.client = spotify.New(oauth2.NewClient(ctx, notifyTS))
	return true
}

func (s *SpotifyService) StartAuth(clientID, clientSecret, redirectURI string) (string, error) {
	s.auth = spotifyauth.New(
		spotifyauth.WithClientID(clientID),
		spotifyauth.WithClientSecret(clientSecret),
		spotifyauth.WithRedirectURL(redirectURI),
		spotifyauth.WithScopes(spotifyauth.ScopePlaylistReadPrivate, spotifyauth.ScopePlaylistReadCollaborative),
	)
	url := s.auth.AuthURL(s.state)
	return url, nil
}

func (s *SpotifyService) ExchangeCode(code string) error {
	ctx := context.Background()
	token, err := s.auth.Exchange(ctx, code)
	if err != nil {
		return err
	}

	s.config.SpotifyAccessToken = token.AccessToken
	s.config.SpotifyRefreshToken = token.RefreshToken
	s.config.SpotifyTokenExpiry = token.Expiry.Format(time.RFC3339)
	SaveConfig(s.config)

	oauthConfig := &oauth2.Config{
		ClientID:     s.config.SpotifyClientID,
		ClientSecret: s.config.SpotifyClientSecret,
		RedirectURL:  s.config.SpotifyRedirectURI,
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://accounts.spotify.com/authorize",
			TokenURL: "https://accounts.spotify.com/api/token",
		},
		Scopes: []string{spotifyauth.ScopePlaylistReadPrivate, spotifyauth.ScopePlaylistReadCollaborative},
	}

	ts := oauthConfig.TokenSource(ctx, token)
	notifyTS := &notifyRefreshTokenSource{
		new: ts,
		f: func(tok *oauth2.Token) error {
			if tok.AccessToken == s.config.SpotifyAccessToken {
				return nil
			}
			s.config.SpotifyAccessToken = tok.AccessToken
			s.config.SpotifyRefreshToken = tok.RefreshToken
			s.config.SpotifyTokenExpiry = tok.Expiry.Format(time.RFC3339)
			return SaveConfig(s.config)
		},
	}

	client := spotify.New(oauth2.NewClient(ctx, notifyTS))
	s.client = client
	return nil
}

func (s *SpotifyService) StartCallbackServer(port string, callback func(code string)) {
	http.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code != "" {
			callback(code)
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("Login successful! You can close this window."))
		} else {
			w.WriteHeader(http.StatusBadRequest)
			w.Write([]byte("Login failed!"))
		}
	})
	go http.ListenAndServe(":"+port, nil)
}

type TrackInfo struct {
	Title       string `json:"title"`
	Artist      string `json:"artist"`
	ISRC        string `json:"isrc"`
	Duration    int    `json:"duration_ms"`
	SpotifyID   string `json:"spotify_id"`
	SourceID    string `json:"source_id"`
	AlbumTitle  string `json:"album_title"`
	AlbumCover  string `json:"album_cover"`
	ReleaseDate string `json:"release_date"`
	Genre       string `json:"genre"`
}

type PlaylistInfo struct {
	Name        string      `json:"name"`
	Description string      `json:"description"`
	Tracks      []TrackInfo `json:"tracks"`
}

func (s *SpotifyService) GetPlaylistTracks(url string) (*PlaylistInfo, error) {
	if s.client == nil {
		return nil, fmt.Errorf("not authenticated")
	}

	ctx := context.Background()

	if strings.Contains(url, "/track/") {

		parts := strings.Split(url, "/")
		lastPart := parts[len(parts)-1]
		trackID := spotify.ID(strings.Split(lastPart, "?")[0])

		track, err := s.client.GetTrack(ctx, trackID)
		if err != nil {
			return nil, err
		}

		var artists []string
		for _, artist := range track.Artists {
			artists = append(artists, artist.Name)
		}

		trackInfo := TrackInfo{
			Title:     track.Name,
			Artist:    strings.Join(artists, ", "),
			ISRC:      track.ExternalIDs["isrc"],
			Duration:  int(track.Duration),
			SpotifyID: string(track.ID),
			SourceID:  string(track.ID),
		}

		return &PlaylistInfo{
			Name:        track.Name,
			Description: "Single Track",
			Tracks:      []TrackInfo{trackInfo},
		}, nil
	}

	if strings.Contains(url, "/album/") {
		parts := strings.Split(url, "/")
		lastPart := parts[len(parts)-1]
		albumID := spotify.ID(strings.Split(lastPart, "?")[0])

		album, err := s.client.GetAlbum(ctx, albumID)
		if err != nil {
			return nil, err
		}

		var tracks []TrackInfo
		offset := 0
		limit := 50
		for {
			page, err := s.client.GetAlbumTracks(ctx, albumID, spotify.Limit(limit), spotify.Offset(offset))
			if err != nil {
				return nil, err
			}

			for _, simpleTrack := range page.Tracks {
				fullTrack, err := s.client.GetTrack(ctx, simpleTrack.ID)
				if err != nil {
					continue
				}

				var artists []string
				for _, artist := range fullTrack.Artists {
					artists = append(artists, artist.Name)
				}

				tracks = append(tracks, TrackInfo{
					Title:     fullTrack.Name,
					Artist:    strings.Join(artists, ", "),
					ISRC:      fullTrack.ExternalIDs["isrc"],
					Duration:  int(fullTrack.Duration),
					SpotifyID: string(fullTrack.ID),
					SourceID:  string(fullTrack.ID),
				})
			}

			if len(page.Tracks) < limit {
				break
			}
			offset += limit
		}

		return &PlaylistInfo{
			Name:        album.Name,
			Description: fmt.Sprintf("Album by %s", album.Artists[0].Name),
			Tracks:      tracks,
		}, nil
	}

	parts := strings.Split(url, "/")
	lastPart := parts[len(parts)-1]
	playlistID := spotify.ID(strings.Split(lastPart, "?")[0])

	playlist, err := s.client.GetPlaylist(ctx, playlistID)
	if err != nil {
		return nil, err
	}

	var tracks []TrackInfo

	offset := 0
	limit := 100
	for {
		page, err := s.client.GetPlaylistItems(ctx, playlistID, spotify.Limit(limit), spotify.Offset(offset))
		if err != nil {
			return nil, err
		}

		for _, item := range page.Items {
			if item.Track.Track == nil {
				continue
			}
			track := item.Track.Track

			var artists []string
			for _, a := range track.Artists {
				artists = append(artists, a.Name)
			}

			tracks = append(tracks, TrackInfo{
				Title:     track.Name,
				Artist:    strings.Join(artists, ", "),
				ISRC:      track.ExternalIDs["isrc"],
				Duration:  int(track.Duration),
				SpotifyID: track.ID.String(),
				SourceID:  track.ExternalURLs["spotify"],
			})
		}

		if len(page.Items) < limit {
			break
		}
		offset += limit
	}

	return &PlaylistInfo{
		Name:        playlist.Name,
		Description: playlist.Description,
		Tracks:      tracks,
	}, nil
}
