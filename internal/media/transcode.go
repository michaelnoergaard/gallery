package media

import (
	"crypto/sha256"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"sync"
	"time"
)

// BrowserCompatible checks if a MIME type can be played natively in browsers.
func BrowserCompatible(mimeType string) bool {
	switch mimeType {
	case "video/mp4", "video/webm", "video/ogg":
		return true
	default:
		return false
	}
}

// Transcoder handles on-demand video transcoding with an LRU disk cache.
type Transcoder struct {
	cacheDir   string
	maxCacheGB int
	mu         sync.Mutex
	inProgress map[string]chan struct{} // prevents duplicate transcodes
}

// NewTranscoder creates a Transcoder that stores transcoded files under dataDir/transcoded.
func NewTranscoder(dataDir string, maxCacheGB int) *Transcoder {
	cacheDir := filepath.Join(dataDir, "transcoded")
	os.MkdirAll(cacheDir, 0755)

	if maxCacheGB <= 0 {
		maxCacheGB = 10
	}

	return &Transcoder{
		cacheDir:   cacheDir,
		maxCacheGB: maxCacheGB,
		inProgress: make(map[string]chan struct{}),
	}
}

// GetTranscodedPath returns the path to a transcoded MP4 for the given source file.
// If the transcoded version doesn't exist, it creates it.
// Returns the path to the transcoded file, or empty string + error if it fails.
func (t *Transcoder) GetTranscodedPath(srcPath, fileHash string) (string, error) {
	dstPath := filepath.Join(t.cacheDir, fileHash+".mp4")

	// Check if already cached
	if info, err := os.Stat(dstPath); err == nil {
		// Validate: check source mtime vs cache mtime
		srcInfo, srcErr := os.Stat(srcPath)
		if srcErr == nil && srcInfo.ModTime().Before(info.ModTime()) {
			// Cache is valid (newer than source)
			// Update access time for LRU tracking
			now := time.Now()
			os.Chtimes(dstPath, now, now)
			return dstPath, nil
		}
		// Source is newer, re-transcode
		os.Remove(dstPath)
	}

	// Check if another goroutine is already transcoding this file
	t.mu.Lock()
	if ch, ok := t.inProgress[fileHash]; ok {
		t.mu.Unlock()
		<-ch // Wait for the other transcode to complete
		if _, err := os.Stat(dstPath); err == nil {
			return dstPath, nil
		}
		return "", fmt.Errorf("concurrent transcode failed for %s", fileHash)
	}

	// Mark as in progress
	doneCh := make(chan struct{})
	t.inProgress[fileHash] = doneCh
	t.mu.Unlock()

	defer func() {
		t.mu.Lock()
		delete(t.inProgress, fileHash)
		close(doneCh)
		t.mu.Unlock()
	}()

	// Evict old files if cache is too large
	t.evictIfNeeded()

	// Transcode using FFmpeg
	log.Printf("transcoder: transcoding %s -> %s", srcPath, dstPath)

	tmpPath := dstPath + ".tmp"
	cmd := exec.Command("ffmpeg",
		"-i", srcPath,
		"-c:v", "libx264",
		"-preset", "fast",
		"-crf", "23",
		"-c:a", "aac",
		"-b:a", "128k",
		"-movflags", "+faststart", // enables progressive download
		"-y",
		tmpPath,
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		os.Remove(tmpPath)
		return "", fmt.Errorf("ffmpeg transcode failed: %w\noutput: %s", err, string(output))
	}

	// Rename tmp to final (atomic on same filesystem)
	if err := os.Rename(tmpPath, dstPath); err != nil {
		os.Remove(tmpPath)
		return "", fmt.Errorf("rename transcoded file: %w", err)
	}

	log.Printf("transcoder: completed %s", fileHash)
	return dstPath, nil
}

// evictIfNeeded removes oldest-accessed files until cache is under maxCacheGB.
func (t *Transcoder) evictIfNeeded() {
	entries, err := os.ReadDir(t.cacheDir)
	if err != nil {
		return
	}

	type fileEntry struct {
		path    string
		size    int64
		modTime time.Time
	}

	var files []fileEntry
	var totalSize int64

	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		path := filepath.Join(t.cacheDir, e.Name())
		files = append(files, fileEntry{path: path, size: info.Size(), modTime: info.ModTime()})
		totalSize += info.Size()
	}

	maxBytes := int64(t.maxCacheGB) * 1024 * 1024 * 1024
	if totalSize <= maxBytes {
		return
	}

	// Sort by modification time (oldest first for LRU eviction)
	sort.Slice(files, func(i, j int) bool {
		return files[i].modTime.Before(files[j].modTime)
	})

	for _, f := range files {
		if totalSize <= maxBytes {
			break
		}
		log.Printf("transcoder: evicting %s (%d MB)", filepath.Base(f.path), f.size/1024/1024)
		os.Remove(f.path)
		totalSize -= f.size
	}
}

// CacheKey generates a deterministic cache key from a file path.
func CacheKey(path string) string {
	h := sha256.Sum256([]byte(path))
	return fmt.Sprintf("%x", h[:8]) // short hash, collision unlikely for this use case
}
