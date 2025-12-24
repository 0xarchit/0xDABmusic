package services

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

type TransferRecord struct {
	ID            string `json:"id"`
	PlaylistName  string `json:"playlistName"`
	SourceURL     string `json:"sourceURL"`
	TotalTracks   int    `json:"totalTracks"`
	MatchedTracks int    `json:"matchedTracks"`
	AddedTracks   int    `json:"addedTracks"`
	FailedTracks  int    `json:"failedTracks"`
	Status        string `json:"status"`
	CreatedAt     string `json:"createdAt"`
	CompletedAt   string `json:"completedAt"`
	LibraryID     string `json:"libraryID"`
	ErrorMessage  string `json:"errorMessage,omitempty"`
	Duration      int    `json:"duration"`
	Source        string `json:"source"`
}

type HistoryManager struct {
	historyFile string
}

func NewHistoryManager() (*HistoryManager, error) {
	dir, err := GetConfigDir()
	if err != nil {
		return nil, err
	}
	_ = os.MkdirAll(dir, 0755)

	historyFile := filepath.Join(dir, "transfer_history.json")
	return &HistoryManager{historyFile: historyFile}, nil
}

func (hm *HistoryManager) AddRecord(record TransferRecord) error {
	records, _ := hm.LoadRecords()

	if record.ID == "" {
		record.ID = fmt.Sprintf("transfer_%d", time.Now().UnixMilli())
	}
	if record.CreatedAt == "" {
		record.CreatedAt = time.Now().Format(time.RFC3339)
	}

	records = append(records, record)

	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(hm.historyFile), 0755); err != nil {
		return err
	}
	return os.WriteFile(hm.historyFile, data, 0644)
}

func (hm *HistoryManager) LoadRecords() ([]TransferRecord, error) {
	data, err := os.ReadFile(hm.historyFile)
	if err != nil {
		if os.IsNotExist(err) {
			return []TransferRecord{}, nil
		}
		return nil, err
	}

	var records []TransferRecord
	err = json.Unmarshal(data, &records)
	if err != nil {
		return nil, err
	}

	return records, nil
}

func (hm *HistoryManager) ClearHistory() error {
	data, _ := json.MarshalIndent([]TransferRecord{}, "", "  ")
	if err := os.MkdirAll(filepath.Dir(hm.historyFile), 0755); err != nil {
		return err
	}
	return os.WriteFile(hm.historyFile, data, 0644)
}

func (hm *HistoryManager) UpdateRecord(id string, updates map[string]interface{}) error {
	records, err := hm.LoadRecords()
	if err != nil {
		return err
	}

	for i, r := range records {
		if r.ID == id {
			if status, ok := updates["status"].(string); ok {
				records[i].Status = status
			}
			if libraryID, ok := updates["libraryID"].(string); ok {
				records[i].LibraryID = libraryID
			}
			if addedTracks, ok := updates["addedTracks"].(int); ok {
				records[i].AddedTracks = addedTracks
			}
			if failedTracks, ok := updates["failedTracks"].(int); ok {
				records[i].FailedTracks = failedTracks
			}
			if errorMsg, ok := updates["errorMessage"].(string); ok {
				records[i].ErrorMessage = errorMsg
			}
			if completedAt, ok := updates["completedAt"].(time.Time); ok {
				records[i].CompletedAt = completedAt.Format(time.RFC3339)
				created, _ := time.Parse(time.RFC3339, records[i].CreatedAt)
				records[i].Duration = int(completedAt.Sub(created).Seconds())
			}
			break
		}
	}

	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(hm.historyFile), 0755); err != nil {
		return err
	}
	return os.WriteFile(hm.historyFile, data, 0644)
}

func (hm *HistoryManager) DeleteRecord(id string) error {
	records, err := hm.LoadRecords()
	if err != nil {
		return err
	}

	filtered := []TransferRecord{}
	for _, r := range records {
		if r.ID != id {
			filtered = append(filtered, r)
		}
	}

	data, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(hm.historyFile), 0755); err != nil {
		return err
	}
	return os.WriteFile(hm.historyFile, data, 0644)
}
