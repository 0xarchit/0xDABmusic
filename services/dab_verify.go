package services

import (
	"fmt"
	"net/http"
)

func (s *DABService) VerifyToken(token string) bool {
	url := fmt.Sprintf("%s/auth/me", s.config.DABAPIBase)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/1337.0.0.0 Safari/537.36")
	req.Header.Set("Authorization", "Bearer "+token)

	req.AddCookie(&http.Cookie{Name: "session", Value: token})

	resp, err := s.client.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == 200
}
