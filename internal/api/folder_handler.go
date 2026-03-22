package api

import (
	"fmt"
	"net/http"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

// FolderEntry represents a subdirectory in the folder listing.
type FolderEntry struct {
	Name string `json:"name"`
	Path string `json:"path"`
}

// FolderResult is the response for the folder browsing endpoint.
type FolderResult struct {
	Path       string        `json:"path"`
	Parent     string        `json:"parent"`
	Folders    []FolderEntry `json:"folders"`
	Items      interface{}   `json:"items"`
	TotalItems int           `json:"total_items"`
}

// GET /api/folders?path= — browse media directory structure by year/month
func (s *Server) handleListFolders(w http.ResponseWriter, r *http.Request) {
	rawPath := r.URL.Query().Get("path")

	// Clean and validate the path to prevent directory traversal
	cleanPath := filepath.Clean(rawPath)
	if cleanPath == "." {
		cleanPath = ""
	}

	// Reject any path that tries to escape via ../
	if strings.Contains(cleanPath, "..") {
		writeError(w, http.StatusBadRequest, "invalid path")
		return
	}

	// If a non-empty path is given, verify it resolves within media root
	if cleanPath != "" {
		absPath := filepath.Join(s.mediaDir, cleanPath)
		absPath = filepath.Clean(absPath)
		mediaRoot := filepath.Clean(s.mediaDir)
		if !strings.HasPrefix(absPath, mediaRoot) {
			writeError(w, http.StatusBadRequest, "invalid path")
			return
		}
	}

	parts := strings.Split(cleanPath, "/")
	if cleanPath == "" {
		parts = nil
	}

	switch len(parts) {
	case 0:
		// Root level: show distinct years
		s.handleFolderRoot(w)
	case 1:
		// Year level: show months for this year
		year, err := strconv.Atoi(parts[0])
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid year")
			return
		}
		s.handleFolderYear(w, year, parts[0])
	default:
		// Year/month level: show media items
		year, err := strconv.Atoi(parts[0])
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid year")
			return
		}
		month, err := strconv.Atoi(parts[1])
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid month")
			return
		}
		s.handleFolderMonth(w, year, month, cleanPath)
	}
}

func (s *Server) handleFolderRoot(w http.ResponseWriter) {
	rows, err := s.db.Query("SELECT DISTINCT year FROM media_items ORDER BY year DESC")
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query years")
		return
	}
	defer rows.Close()

	var folders []FolderEntry
	for rows.Next() {
		var year int
		if err := rows.Scan(&year); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan year")
			return
		}
		name := strconv.Itoa(year)
		folders = append(folders, FolderEntry{Name: name, Path: name})
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to iterate years")
		return
	}

	writeJSON(w, http.StatusOK, FolderResult{
		Path:       "",
		Parent:     "",
		Folders:    folders,
		Items:      []interface{}{},
		TotalItems: 0,
	})
}

func (s *Server) handleFolderYear(w http.ResponseWriter, year int, yearStr string) {
	rows, err := s.db.Query(
		"SELECT DISTINCT month FROM media_items WHERE year = ? ORDER BY month DESC", year,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query months")
		return
	}
	defer rows.Close()

	var folders []FolderEntry
	for rows.Next() {
		var month int
		if err := rows.Scan(&month); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan month")
			return
		}
		name := fmt.Sprintf("%02d", month)
		folders = append(folders, FolderEntry{Name: name, Path: yearStr + "/" + name})
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to iterate months")
		return
	}

	// Sort descending
	sort.Slice(folders, func(i, j int) bool {
		return folders[i].Name > folders[j].Name
	})

	writeJSON(w, http.StatusOK, FolderResult{
		Path:       yearStr,
		Parent:     "",
		Folders:    folders,
		Items:      []interface{}{},
		TotalItems: 0,
	})
}

func (s *Server) handleFolderMonth(w http.ResponseWriter, year, month int, path string) {
	// Get parent (the year folder)
	parent := strconv.Itoa(year)

	// Query media items for this year/month
	rows, err := s.db.Query(
		`SELECT id, file_path, file_name, file_size, file_hash, media_type, mime_type,
			width, height, duration_ms, taken_at, year, month, thumbnail_path, indexed_at, updated_at
		FROM media_items WHERE year = ? AND month = ? ORDER BY taken_at DESC`,
		year, month,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query media")
		return
	}
	defer rows.Close()

	var items []interface{}
	for rows.Next() {
		var item struct {
			ID            int64   `json:"id"`
			FilePath      string  `json:"file_path"`
			FileName      string  `json:"file_name"`
			FileSize      int64   `json:"file_size"`
			FileHash      string  `json:"file_hash"`
			MediaType     string  `json:"media_type"`
			MimeType      string  `json:"mime_type"`
			Width         *int    `json:"width"`
			Height        *int    `json:"height"`
			DurationMs    *int    `json:"duration_ms"`
			TakenAt       *string `json:"taken_at"`
			Year          int     `json:"year"`
			Month         int     `json:"month"`
			ThumbnailPath *string `json:"thumbnail_path"`
			IndexedAt     string  `json:"indexed_at"`
			UpdatedAt     string  `json:"updated_at"`
		}
		if err := rows.Scan(
			&item.ID, &item.FilePath, &item.FileName, &item.FileSize, &item.FileHash,
			&item.MediaType, &item.MimeType, &item.Width, &item.Height, &item.DurationMs,
			&item.TakenAt, &item.Year, &item.Month, &item.ThumbnailPath,
			&item.IndexedAt, &item.UpdatedAt,
		); err != nil {
			writeError(w, http.StatusInternalServerError, "failed to scan media item")
			return
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to iterate media items")
		return
	}
	if items == nil {
		items = []interface{}{}
	}

	writeJSON(w, http.StatusOK, FolderResult{
		Path:       path,
		Parent:     parent,
		Folders:    []FolderEntry{},
		Items:      items,
		TotalItems: len(items),
	})
}
