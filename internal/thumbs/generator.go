package thumbs

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"

	"gallery/internal/db"
)

type Generator struct {
	db      *db.DB
	dataDir string
	workers int
	queue   chan int64
	wg      sync.WaitGroup
	stopCh  chan struct{}
}

func New(database *db.DB, dataDir string, workers int, queue chan int64) *Generator {
	return &Generator{
		db:      database,
		dataDir: dataDir,
		workers: workers,
		queue:   queue,
		stopCh:  make(chan struct{}),
	}
}

func (g *Generator) Start() {
	for i := 0; i < g.workers; i++ {
		g.wg.Add(1)
		go g.worker(i)
	}
	log.Printf("Thumbnail generator started with %d workers", g.workers)
}

func (g *Generator) Stop() {
	close(g.stopCh)
	g.wg.Wait()
	log.Println("Thumbnail generator stopped")
}

func (g *Generator) worker(id int) {
	defer g.wg.Done()
	for {
		select {
		case <-g.stopCh:
			return
		case mediaID, ok := <-g.queue:
			if !ok {
				return
			}
			if err := g.generate(mediaID); err != nil {
				log.Printf("Thumbnail worker %d: error for media %d: %v", id, mediaID, err)
			}
		}
	}
}

func (g *Generator) generate(mediaID int64) error {
	item, err := g.db.GetMediaByID(mediaID)
	if err != nil || item == nil {
		return fmt.Errorf("media item %d not found", mediaID)
	}

	// Build output path
	thumbDir := filepath.Join(g.dataDir, "thumbnails", fmt.Sprintf("%d", item.Year), fmt.Sprintf("%02d", item.Month))
	if err := os.MkdirAll(thumbDir, 0755); err != nil {
		return fmt.Errorf("create thumb dir: %w", err)
	}
	thumbPath := filepath.Join(thumbDir, item.FileHash+".jpg")

	// Skip if already exists on disk
	if _, err := os.Stat(thumbPath); err == nil {
		return g.db.UpdateThumbnailPath(item.ID, thumbPath)
	}

	// Generate based on type
	var genErr error
	switch item.MediaType {
	case "image":
		genErr = generateImageThumb(item.FilePath, thumbPath)
	case "video":
		genErr = generateVideoThumb(item.FilePath, thumbPath)
	default:
		return fmt.Errorf("unknown media type: %s", item.MediaType)
	}

	if genErr != nil {
		return genErr
	}

	// Update DB with thumbnail path
	return g.db.UpdateThumbnailPath(item.ID, thumbPath)
}
