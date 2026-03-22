package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gallery/internal/api"
	"gallery/internal/config"
	"gallery/internal/db"
	"gallery/internal/media"
	"gallery/internal/scanner"
	"gallery/internal/thumbs"
)

// scannerAdapter wraps scanner.Scanner to implement api.ScannerService
type scannerAdapter struct {
	s *scanner.Scanner
}

func (a *scannerAdapter) Scan() { a.s.Scan() }
func (a *scannerAdapter) Status() api.ScanStatus {
	st := a.s.Status()
	return api.ScanStatus{
		Running:       st.Running,
		FilesFound:    st.FilesFound,
		FilesIndexed:  st.FilesIndexed,
		FilesSkipped:  st.FilesSkipped,
		ThumbsPending: st.ThumbsPending,
	}
}

func main() {
	cfg := config.Load()

	// Open database
	database, err := db.Open(cfg.DataDir)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer database.Close()

	// Create API server
	server := api.NewServer(database, cfg.Secret)
	server.SetMediaDir(cfg.MediaDir)

	// Thumbnail generator
	thumbQueue := make(chan int64, 1000)
	thumbGen := thumbs.New(database, cfg.DataDir, cfg.ThumbWorkers, thumbQueue)
	thumbGen.Start()
	defer thumbGen.Stop()

	// Video transcoder (10GB LRU cache)
	transcoder := media.NewTranscoder(cfg.DataDir, 10)
	server.SetTranscoder(transcoder)

	// File scanner
	mediaScanner := scanner.New(database, cfg.MediaDir, cfg.ScanWorkers, thumbQueue)
	server.SetScanner(&scannerAdapter{s: mediaScanner})

	// Initial scan on startup
	go mediaScanner.Scan()

	// Periodic rescans
	go func() {
		ticker := time.NewTicker(cfg.ScanInterval)
		defer ticker.Stop()
		for range ticker.C {
			log.Println("Starting periodic scan...")
			mediaScanner.Scan()
		}
	}()

	// Create HTTP server
	httpServer := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.Port),
		Handler:      server,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Gallery server starting on :%s", cfg.Port)
		log.Printf("Media directory: %s", cfg.MediaDir)
		log.Printf("Data directory: %s", cfg.DataDir)
		if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	// Wait for shutdown signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server stopped")
}
