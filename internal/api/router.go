package api

import (
	"encoding/json"
	"net/http"
	"time"

	"gallery/internal/auth"
	"gallery/internal/db"
	"gallery/internal/media"
	"gallery/internal/web"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// ScanStatus represents the current state of a media scan operation.
type ScanStatus struct {
	Running      bool `json:"running"`
	FilesFound   int  `json:"files_found"`
	FilesIndexed int  `json:"files_indexed"`
	FilesSkipped int  `json:"files_skipped"`
	ThumbsPending int `json:"thumbs_pending"`
}

// ScannerService is implemented by the scanner package to avoid circular imports.
type ScannerService interface {
	Scan()
	Status() ScanStatus
}

type Server struct {
	router     chi.Router
	db         *db.DB
	secret     string
	scanner    ScannerService
	mediaDir   string
	transcoder *media.Transcoder
}

func NewServer(database *db.DB, secret string) *Server {
	s := &Server{
		db:     database,
		secret: secret,
	}
	s.setupRoutes()
	return s
}

// SetScanner configures the scanner service for scan trigger and status endpoints.
func (s *Server) SetScanner(sc ScannerService) {
	s.scanner = sc
}

// SetMediaDir configures the media directory path.
func (s *Server) SetMediaDir(dir string) {
	s.mediaDir = dir
}

// SetTranscoder configures the video transcoder for on-demand transcoding.
func (s *Server) SetTranscoder(t *media.Transcoder) {
	s.transcoder = t
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

func (s *Server) setupRoutes() {
	r := chi.NewRouter()

	// Global middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RealIP)
	r.Use(corsMiddleware)

	// Rate limiter for login
	loginLimiter := auth.NewRateLimiter(5, time.Minute)

	// Public auth routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Get("/setup", s.handleSetupStatus)
		r.Post("/setup", s.handleSetup)
		r.With(auth.RateLimitMiddleware(loginLimiter)).Post("/login", s.handleLogin)
		r.Post("/refresh", s.handleRefresh)
		r.Post("/logout", s.handleLogout)
	})

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Protected API routes
	r.Route("/api", func(r chi.Router) {
		r.Use(auth.AuthMiddleware(s.secret))

		// Folder browsing
		r.Get("/folders", s.handleListFolders)

		// Media routes
		r.Get("/media", s.handleListMedia)
		r.Get("/media/{id}", s.handleGetMedia)
		r.Get("/media/{id}/thumb", s.handleMediaThumb)
		r.Get("/media/{id}/file", s.handleMediaFile)

		// Album routes
		r.Get("/albums", s.handleListAlbums)
		r.Post("/albums", s.handleCreateAlbum)
		r.Get("/albums/{id}", s.handleGetAlbum)
		r.Put("/albums/{id}", s.handleUpdateAlbum)
		r.Delete("/albums/{id}", s.handleDeleteAlbum)
		r.Post("/albums/{id}/items", s.handleAddAlbumItems)
		r.Delete("/albums/{id}/items/{mediaId}", s.handleRemoveAlbumItem)
		r.Get("/albums/{id}/items", s.handleGetAlbumItems)
		r.Put("/albums/{id}/items/reorder", s.handleReorderAlbumItems)

		// Scan routes
		r.Get("/scan/status", s.handleScanStatus)
		r.With(auth.RequireAdmin).Post("/scan", s.handleTriggerScan)

		// Admin routes
		r.Route("/admin", func(r chi.Router) {
			r.Use(auth.RequireAdmin)
			r.Get("/users", s.handleListAdminUsers)
			r.Post("/users", s.handleCreateAdminUser)
			r.Delete("/users/{id}", s.handleDeleteAdminUser)
			r.Get("/stats", s.handleAdminStats)
		})
	})

	// SPA fallback - serve embedded React app for non-API routes
	spaHandler := web.Handler()
	r.NotFound(spaHandler.ServeHTTP)

	s.router = r
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
