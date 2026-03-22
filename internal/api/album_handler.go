package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"gallery/internal/auth"

	"github.com/go-chi/chi/v5"
)

// GET /api/albums — list all albums
func (s *Server) handleListAlbums(w http.ResponseWriter, r *http.Request) {
	albums, err := s.db.ListAlbums()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list albums")
		return
	}
	writeJSON(w, http.StatusOK, albums)
}

// POST /api/albums — create album (any authenticated user)
func (s *Server) handleCreateAlbum(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	album, err := s.db.CreateAlbum(req.Name, req.Description, user.UserID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create album")
		return
	}

	writeJSON(w, http.StatusCreated, album)
}

// GET /api/albums/{id} — get album details
func (s *Server) handleGetAlbum(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	writeJSON(w, http.StatusOK, album)
}

// PUT /api/albums/{id} — update album (creator or admin only)
func (s *Server) handleUpdateAlbum(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	if album.CreatedBy != user.UserID && user.Role != "admin" {
		writeError(w, http.StatusForbidden, "only the album creator or an admin can update this album")
		return
	}

	var req struct {
		Name         string `json:"name"`
		Description  string `json:"description"`
		CoverMediaID *int64 `json:"cover_media_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	if err := s.db.UpdateAlbum(id, req.Name, req.Description, req.CoverMediaID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update album")
		return
	}

	updated, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get updated album")
		return
	}

	writeJSON(w, http.StatusOK, updated)
}

// DELETE /api/albums/{id} — delete album (creator or admin only)
func (s *Server) handleDeleteAlbum(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	if album.CreatedBy != user.UserID && user.Role != "admin" {
		writeError(w, http.StatusForbidden, "only the album creator or an admin can delete this album")
		return
	}

	if err := s.db.DeleteAlbum(id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete album")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// POST /api/albums/{id}/items — add media to album (any authenticated user)
func (s *Server) handleAddAlbumItems(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	var req struct {
		MediaIDs []int64 `json:"media_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.MediaIDs) == 0 {
		writeError(w, http.StatusBadRequest, "media_ids is required")
		return
	}

	if err := s.db.AddItemsToAlbum(id, req.MediaIDs); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add items to album")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "added"})
}

// DELETE /api/albums/{id}/items/{mediaId} — remove item from album (creator or admin only)
func (s *Server) handleRemoveAlbumItem(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	mediaID, err := strconv.ParseInt(chi.URLParam(r, "mediaId"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid media id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	if album.CreatedBy != user.UserID && user.Role != "admin" {
		writeError(w, http.StatusForbidden, "only the album creator or an admin can remove items")
		return
	}

	if err := s.db.RemoveItemFromAlbum(id, mediaID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove item from album")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "removed"})
}

// GET /api/albums/{id}/items — get album items (paginated)
func (s *Server) handleGetAlbumItems(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	page := 1
	limit := 50
	if v := r.URL.Query().Get("page"); v != "" {
		if p, err := strconv.Atoi(v); err == nil && p > 0 {
			page = p
		}
	}
	if v := r.URL.Query().Get("limit"); v != "" {
		if l, err := strconv.Atoi(v); err == nil && l > 0 {
			limit = l
		}
	}

	result, err := s.db.GetAlbumItems(id, page, limit)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album items")
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// PUT /api/albums/{id}/items/reorder — reorder album items (creator or admin only)
func (s *Server) handleReorderAlbumItems(w http.ResponseWriter, r *http.Request) {
	user := auth.GetUser(r.Context())
	if user == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	id, err := strconv.ParseInt(chi.URLParam(r, "id"), 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid album id")
		return
	}

	album, err := s.db.GetAlbum(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to get album")
		return
	}
	if album == nil {
		writeError(w, http.StatusNotFound, "album not found")
		return
	}

	if album.CreatedBy != user.UserID && user.Role != "admin" {
		writeError(w, http.StatusForbidden, "only the album creator or an admin can reorder items")
		return
	}

	var req struct {
		MediaIDs []int64 `json:"media_ids"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.MediaIDs) == 0 {
		writeError(w, http.StatusBadRequest, "media_ids is required")
		return
	}

	if err := s.db.ReorderAlbumItems(id, req.MediaIDs); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to reorder album items")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "reordered"})
}
