package services

import (
	"fmt"
	"strings"

	"github.com/michiwend/gomusicbrainz"
)

type MusicBrainzService struct {
	client *gomusicbrainz.WS2Client
}

func NewMusicBrainzService() *MusicBrainzService {
	client, _ := gomusicbrainz.NewWS2Client(
		"https://musicbrainz.org/ws/2",
		"0xDABmusic",
		"2.1.1",
		"https://github.com/0xArchit/0xDABmusic",
	)
	return &MusicBrainzService{
		client: client,
	}
}

func (s *MusicBrainzService) ResolveTrackMetadata(title, artist string) (*TrackInfo, error) {

	cTitle := escapeLucene(cleanMBString(title))
	cArtist := escapeLucene(cleanMBString(artist))

	query := fmt.Sprintf("recording:(%s) AND artist:(%s)", cTitle, cArtist)

	resp, err := s.client.SearchRecording(query, 1, 0)
	if err != nil {
		return nil, err
	}

	if len(resp.Recordings) == 0 {

		query = fmt.Sprintf("recording:(%s)", cTitle)
		resp, err = s.client.SearchRecording(query, 1, 0)
		if err != nil || len(resp.Recordings) == 0 {
			return nil, nil
		}
	}

	rec := resp.Recordings[0]

	artistName := ""
	if len(rec.ArtistCredit.NameCredits) > 0 {
		artistName = rec.ArtistCredit.NameCredits[0].Artist.Name
	}

	isrc := ""

	return &TrackInfo{
		Title:    rec.Title,
		Artist:   artistName,
		ISRC:     isrc,
		Duration: rec.Length,
	}, nil
}

func cleanMBString(s string) string {

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

func escapeLucene(s string) string {

	special := []string{"+", "-", "&&", "||", "!", "(", ")", "{", "}", "[", "]", "^", "\"", "~", "*", "?", ":", "\\", "/"}
	for _, char := range special {
		s = strings.ReplaceAll(s, char, "\\"+char)
	}
	return s
}
