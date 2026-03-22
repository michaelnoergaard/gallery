package api

import (
	"encoding/json"
	"net/http"
	"strconv"

	"gallery/internal/auth"

	"github.com/go-chi/chi/v5"
)

type AdminStats struct {
	TotalMedia    int   `json:"total_media"`
	TotalImages   int   `json:"total_images"`
	TotalVideos   int   `json:"total_videos"`
	TotalAlbums   int   `json:"total_albums"`
	TotalUsers    int   `json:"total_users"`
	TotalSizeBytes int64 `json:"total_size_bytes"`
	ThumbsPending int   `json:"thumbs_pending"`
	DBSizeBytes   int64 `json:"db_size_bytes"`
}

type AdminUser struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

type CreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

// GET /api/admin/stats
func (s *Server) handleAdminStats(w http.ResponseWriter, r *http.Request) {
	var stats AdminStats

	if err := s.db.QueryRow("SELECT COUNT(*) FROM media_items").Scan(&stats.TotalMedia); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}
	if err := s.db.QueryRow("SELECT COUNT(*) FROM media_items WHERE media_type='image'").Scan(&stats.TotalImages); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}
	if err := s.db.QueryRow("SELECT COUNT(*) FROM media_items WHERE media_type='video'").Scan(&stats.TotalVideos); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}
	if err := s.db.QueryRow("SELECT COALESCE(SUM(file_size), 0) FROM media_items").Scan(&stats.TotalSizeBytes); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}
	if err := s.db.QueryRow("SELECT COUNT(*) FROM media_items WHERE thumbnail_path IS NULL").Scan(&stats.ThumbsPending); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}
	if err := s.db.QueryRow("SELECT COUNT(*) FROM albums").Scan(&stats.TotalAlbums); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}
	if err := s.db.QueryRow("SELECT COUNT(*) FROM users").Scan(&stats.TotalUsers); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to query stats")
		return
	}

	writeJSON(w, http.StatusOK, stats)
}

// GET /api/admin/users
func (s *Server) handleListAdminUsers(w http.ResponseWriter, r *http.Request) {
	users, err := s.db.ListUsers()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list users")
		return
	}

	result := make([]AdminUser, 0, len(users))
	for _, u := range users {
		email := ""
		if u.Email.Valid {
			email = u.Email.String
		}
		result = append(result, AdminUser{
			ID:        u.ID,
			Username:  u.Username,
			Email:     email,
			Role:      u.Role,
			CreatedAt: u.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	writeJSON(w, http.StatusOK, result)
}

// POST /api/admin/users
func (s *Server) handleCreateAdminUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Username) < 3 {
		writeError(w, http.StatusBadRequest, "username must be at least 3 characters")
		return
	}
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	if req.Role != "admin" && req.Role != "viewer" {
		writeError(w, http.StatusBadRequest, "role must be 'admin' or 'viewer'")
		return
	}

	// Check if username already exists
	existing, err := s.db.GetUserByUsername(req.Username)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to check username")
		return
	}
	if existing != nil {
		writeError(w, http.StatusConflict, "username already exists")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user, err := s.db.CreateUser(req.Username, "", hash, req.Role)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	writeJSON(w, http.StatusCreated, AdminUser{
		ID:        user.ID,
		Username:  user.Username,
		Role:      user.Role,
		CreatedAt: user.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// DELETE /api/admin/users/{id}
func (s *Server) handleDeleteAdminUser(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	// Cannot delete yourself
	currentUser := auth.GetUser(r.Context())
	if currentUser != nil && currentUser.UserID == id {
		writeError(w, http.StatusBadRequest, "cannot delete yourself")
		return
	}

	if err := s.db.DeleteUser(id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete user")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
