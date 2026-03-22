package scanner

import (
	"log"
	"mime"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"gallery/internal/db"
)

var supportedImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
	".gif": true, ".bmp": true, ".tiff": true, ".tif": true,
}

var supportedVideoExts = map[string]bool{
	".mp4": true, ".mov": true, ".mkv": true, ".avi": true,
	".wmv": true, ".webm": true, ".m4v": true,
}

// mimeOverrides provides MIME types for extensions that may not be
// registered in the system MIME database.
var mimeOverrides = map[string]string{
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".png":  "image/png",
	".gif":  "image/gif",
	".webp": "image/webp",
	".bmp":  "image/bmp",
	".tiff": "image/tiff",
	".tif":  "image/tiff",
	".mp4":  "video/mp4",
	".mov":  "video/quicktime",
	".mkv":  "video/x-matroska",
	".avi":  "video/x-msvideo",
	".wmv":  "video/x-ms-wmv",
	".webm": "video/webm",
	".m4v":  "video/x-m4v",
}

type ScanStatus struct {
	mu            sync.RWMutex
	Running       bool      `json:"running"`
	FilesFound    int       `json:"files_found"`
	FilesIndexed  int       `json:"files_indexed"`
	FilesSkipped  int       `json:"files_skipped"`
	ThumbsPending int       `json:"thumbs_pending"`
	StartedAt     time.Time `json:"started_at,omitempty"`
	Error         string    `json:"error,omitempty"`
}

func (s *ScanStatus) setRunning(running bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Running = running
	if running {
		s.StartedAt = time.Now()
		s.FilesFound = 0
		s.FilesIndexed = 0
		s.FilesSkipped = 0
		s.ThumbsPending = 0
		s.Error = ""
	}
}

func (s *ScanStatus) setError(err string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.Error = err
	s.Running = false
}

func (s *ScanStatus) incFound() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.FilesFound++
}

func (s *ScanStatus) incIndexed() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.FilesIndexed++
}

func (s *ScanStatus) incSkipped() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.FilesSkipped++
}

func (s *ScanStatus) incThumbsPending() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ThumbsPending++
}

func (s *ScanStatus) snapshot() ScanStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return ScanStatus{
		Running:       s.Running,
		FilesFound:    s.FilesFound,
		FilesIndexed:  s.FilesIndexed,
		FilesSkipped:  s.FilesSkipped,
		ThumbsPending: s.ThumbsPending,
		StartedAt:     s.StartedAt,
		Error:         s.Error,
	}
}

type Scanner struct {
	db         *db.DB
	mediaDir   string
	workers    int
	thumbQueue chan int64 // channel of media item IDs needing thumbnails
	status     *ScanStatus
	scanMu     sync.Mutex // prevents concurrent scans
}

func New(database *db.DB, mediaDir string, workers int, thumbQueue chan int64) *Scanner {
	return &Scanner{
		db:         database,
		mediaDir:   mediaDir,
		workers:    workers,
		thumbQueue: thumbQueue,
		status:     &ScanStatus{},
	}
}

// Status returns a snapshot of the current scan status.
func (s *Scanner) Status() ScanStatus {
	return s.status.snapshot()
}

type fileJob struct {
	path      string
	info      os.FileInfo
	mediaType string // "image" or "video"
}

// Scan walks the media directory, indexes new files, and removes deleted ones.
func (s *Scanner) Scan() {
	// Prevent concurrent scans
	if !s.scanMu.TryLock() {
		log.Println("scanner: scan already in progress, skipping")
		return
	}
	defer s.scanMu.Unlock()

	s.status.setRunning(true)
	defer func() {
		s.status.mu.Lock()
		s.status.Running = false
		s.status.mu.Unlock()
	}()

	log.Printf("scanner: starting scan of %s", s.mediaDir)

	// Pre-load known paths to avoid re-hashing already-indexed files
	existingPaths, err := s.db.ListAllPaths()
	if err != nil {
		s.status.setError(err.Error())
		log.Printf("scanner: failed to list existing paths: %v", err)
		return
	}
	knownPaths := make(map[string]bool, len(existingPaths))
	for _, p := range existingPaths {
		knownPaths[p] = true
	}

	// Collect files to process; also track which paths are on disk for cleanup
	diskPaths := make(map[string]bool)
	var diskPathsMu sync.Mutex

	jobs := make(chan fileJob, s.workers*2)
	var wg sync.WaitGroup

	// Start workers
	for i := 0; i < s.workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for job := range jobs {
				s.processFile(job)
			}
		}()
	}

	// Walk the directory tree
	walkErr := filepath.Walk(s.mediaDir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			log.Printf("scanner: walk error at %s: %v", path, err)
			return nil // continue walking
		}
		if info.IsDir() {
			return nil
		}

		ext := strings.ToLower(filepath.Ext(info.Name()))
		var mediaType string
		if supportedImageExts[ext] {
			mediaType = "image"
		} else if supportedVideoExts[ext] {
			mediaType = "video"
		} else {
			return nil // unsupported extension
		}

		s.status.incFound()

		diskPathsMu.Lock()
		diskPaths[path] = true
		diskPathsMu.Unlock()

		// Skip if already indexed by path
		if knownPaths[path] {
			s.status.incSkipped()
			return nil
		}

		jobs <- fileJob{path: path, info: info, mediaType: mediaType}
		return nil
	})
	close(jobs)
	wg.Wait()

	if walkErr != nil {
		s.status.setError(walkErr.Error())
		log.Printf("scanner: walk failed: %v", walkErr)
		return
	}

	// Detect and clean up deleted files
	s.cleanupDeleted(existingPaths, diskPaths)

	log.Printf("scanner: scan complete — found=%d indexed=%d skipped=%d",
		s.status.FilesFound, s.status.FilesIndexed, s.status.FilesSkipped)
}

func (s *Scanner) processFile(job fileJob) {
	// Hash the file
	hash, err := HashFile(job.path)
	if err != nil {
		log.Printf("scanner: hash error for %s: %v", job.path, err)
		return
	}

	// Check if already indexed by hash (duplicate file at different path)
	existingByHash, err := s.db.GetMediaByHash(hash)
	if err != nil {
		log.Printf("scanner: db error checking hash for %s: %v", job.path, err)
		return
	}
	if existingByHash != nil {
		s.status.incSkipped()
		return
	}

	// Determine MIME type
	ext := strings.ToLower(filepath.Ext(job.path))
	mimeType := mimeOverrides[ext]
	if mimeType == "" {
		mimeType = mime.TypeByExtension(ext)
	}
	if mimeType == "" {
		mimeType = "application/octet-stream"
	}

	// Extract metadata
	var meta *Metadata
	if job.mediaType == "image" {
		meta, err = ExtractImageMetadata(job.path)
	} else {
		meta, err = ExtractVideoMetadata(job.path)
	}
	if err != nil {
		log.Printf("scanner: metadata error for %s: %v (continuing with defaults)", job.path, err)
		meta = &Metadata{}
	}

	// Determine taken_at, year, month
	takenAt := meta.TakenAt
	if takenAt == nil {
		t := job.info.ModTime()
		takenAt = &t
	}
	year := takenAt.Year()
	month := int(takenAt.Month())

	item := &db.MediaItem{
		FilePath:  job.path,
		FileName:  job.info.Name(),
		FileSize:  job.info.Size(),
		FileHash:  hash,
		MediaType: job.mediaType,
		MimeType:  mimeType,
		Width:     meta.Width,
		Height:    meta.Height,
		DurationMs: meta.DurationMs,
		TakenAt:   takenAt,
		Year:      year,
		Month:     month,
	}

	if err := s.db.InsertMediaItem(item); err != nil {
		// Could be a duplicate path from a concurrent insert — treat as skipped
		log.Printf("scanner: insert error for %s: %v", job.path, err)
		s.status.incSkipped()
		return
	}

	s.status.incIndexed()

	// Queue for thumbnail generation
	if s.thumbQueue != nil {
		select {
		case s.thumbQueue <- item.ID:
			s.status.incThumbsPending()
		default:
			log.Printf("scanner: thumbnail queue full, skipping thumb for %s", job.path)
		}
	}
}

func (s *Scanner) cleanupDeleted(existingPaths []string, diskPaths map[string]bool) {
	deleted := 0
	for _, p := range existingPaths {
		if !diskPaths[p] {
			if err := s.db.DeleteMediaByPath(p); err != nil {
				log.Printf("scanner: error deleting %s: %v", p, err)
				continue
			}
			deleted++
		}
	}

	if deleted > 0 {
		log.Printf("scanner: cleaned up %d deleted files", deleted)
	}
}
