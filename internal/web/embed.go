package web

import (
	"embed"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed dist/*
var distFS embed.FS

// Handler returns an http.Handler that serves the embedded SPA.
// For any path that doesn't match a static file, it serves index.html
// (SPA client-side routing).
func Handler() http.Handler {
	subFS, err := fs.Sub(distFS, "dist")
	if err != nil {
		panic("failed to create sub filesystem: " + err.Error())
	}

	fileServer := http.FileServer(http.FS(subFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Try to serve the exact file
		cleanPath := path.Clean(r.URL.Path)
		if cleanPath == "/" {
			cleanPath = "/index.html"
		}

		// Check if the file exists in the embedded FS
		if f, err := subFS.Open(strings.TrimPrefix(cleanPath, "/")); err == nil {
			f.Close()

			// Long cache for Vite hashed assets
			if strings.HasPrefix(cleanPath, "/assets/") {
				w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
			}

			fileServer.ServeHTTP(w, r)
			return
		}

		// File not found — serve index.html for SPA routing
		indexFile, err := subFS.Open("index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		defer indexFile.Close()

		stat, _ := indexFile.Stat()
		content, _ := fs.ReadFile(subFS, "index.html")

		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		http.ServeContent(w, r, "index.html", stat.ModTime(), strings.NewReader(string(content)))
	})
}
