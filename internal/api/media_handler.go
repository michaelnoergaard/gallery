package api

import (
	"log"
	"net/http"
	"os"
	"strconv"

	"gallery/internal/db"
	"gallery/internal/media"

	"github.com/go-chi/chi/v5"
)

// GET /api/media - list media items with pagination and filters
func (s *Server) handleListMedia(w http.ResponseWriter, r *http.Request) {
	params := db.MediaListParams{
		Page:  1,
		Limit: 50,
	}

	if v := r.URL.Query().Get("year"); v != "" {
		year, err := strconv.Atoi(v)
		if err == nil {
			params.Year = &year
		}
	}
	if v := r.URL.Query().Get("month"); v != "" {
		month, err := strconv.Atoi(v)
		if err == nil {
			params.Month = &month
		}
	}
	if v := r.URL.Query().Get("page"); v != "" {
		page, err := strconv.Atoi(v)
		if err == nil && page > 0 {
			params.Page = page
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		limit, err := strconv.Atoi(v)
		if err == nil && limit > 0 {
			params.Limit = limit
		}
	}
	if v := r.URL.Query().Get("q"); v != "" {
		params.Search = v
	}

	result, err := s.db.ListMedia(params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list media")
		return
	}
	writeJSON(w, http.StatusOK, result)
}

// GET /api/media/{id} - get single media item
func (s *Server) handleGetMedia(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid media id")
		return
	}

	item, err := s.db.GetMediaByID(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get media")
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "media not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

// GET /api/media/{id}/thumb - serve thumbnail
func (s *Server) handleMediaThumb(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid media id")
		return
	}

	item, err := s.db.GetMediaByID(id)
	if err != nil || item == nil {
		writeError(w, http.StatusNotFound, "media not found")
		return
	}

	if item.ThumbnailPath == nil || *item.ThumbnailPath == "" {
		// Return a placeholder SVG when no thumbnail is available
		w.Header().Set("Content-Type", "image/svg+xml")
		w.Header().Set("Cache-Control", "no-cache")
		w.Write([]byte(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#1a1a1a"/></svg>`))
		return
	}

	// Set caching headers for generated thumbnails
	w.Header().Set("Cache-Control", "public, max-age=86400, immutable")
	http.ServeFile(w, r, *item.ThumbnailPath)
}

// GET /api/media/{id}/file - serve original file with range request support
func (s *Server) handleMediaFile(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid media id")
		return
	}

	item, err := s.db.GetMediaByID(id)
	if err != nil || item == nil {
		writeError(w, http.StatusNotFound, "media not found")
		return
	}

	// Check file exists
	if _, err := os.Stat(item.FilePath); os.IsNotExist(err) {
		writeError(w, http.StatusNotFound, "file not found on disk")
		return
	}

	// For non-browser-compatible videos, transcode on demand
	if item.MediaType == "video" && !media.BrowserCompatible(item.MimeType) && s.transcoder != nil {
		transcodedPath, err := s.transcoder.GetTranscodedPath(item.FilePath, item.FileHash)
		if err != nil {
			log.Printf("transcode error for media %d: %v", id, err)
			// Fall back to serving original file
		} else {
			w.Header().Set("Content-Type", "video/mp4")
			http.ServeFile(w, r, transcodedPath)
			return
		}
	}

	// Set content type
	w.Header().Set("Content-Type", item.MimeType)

	// Use http.ServeFile which handles range requests automatically
	http.ServeFile(w, r, item.FilePath)
}
