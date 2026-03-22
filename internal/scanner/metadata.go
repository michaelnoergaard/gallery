package scanner

import (
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"math"
	"os"
	"os/exec"
	"strconv"
	"time"

	"github.com/rwcarlsen/goexif/exif"
)

type Metadata struct {
	Width      *int
	Height     *int
	DurationMs *int
	TakenAt    *time.Time
}

// ExtractImageMetadata reads EXIF data from an image file.
// Falls back to image.DecodeConfig for dimensions and file mtime for TakenAt.
func ExtractImageMetadata(path string) (*Metadata, error) {
	meta := &Metadata{}

	// Try EXIF first
	if err := extractEXIF(path, meta); err != nil {
		// EXIF failed, try image.DecodeConfig for dimensions
		extractImageConfig(path, meta)
	}

	// Fallback TakenAt to file modification time
	if meta.TakenAt == nil {
		if info, err := os.Stat(path); err == nil {
			t := info.ModTime()
			meta.TakenAt = &t
		}
	}

	return meta, nil
}

func extractEXIF(path string, meta *Metadata) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	x, err := exif.Decode(f)
	if err != nil {
		return err
	}

	// DateTimeOriginal
	if dt, err := x.DateTime(); err == nil {
		meta.TakenAt = &dt
	}

	// Dimensions from EXIF
	if tag, err := x.Get(exif.PixelXDimension); err == nil {
		if v, err := tag.Int(0); err == nil {
			meta.Width = &v
		}
	}
	if tag, err := x.Get(exif.PixelYDimension); err == nil {
		if v, err := tag.Int(0); err == nil {
			meta.Height = &v
		}
	}

	// If EXIF didn't have dimensions, fall back to image decode
	if meta.Width == nil || meta.Height == nil {
		extractImageConfig(path, meta)
	}

	return nil
}

func extractImageConfig(path string, meta *Metadata) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return
	}
	if meta.Width == nil {
		meta.Width = &cfg.Width
	}
	if meta.Height == nil {
		meta.Height = &cfg.Height
	}
}

// ExtractVideoMetadata uses ffprobe to get video info.
// Falls back to file modification time for TakenAt.
func ExtractVideoMetadata(path string) (*Metadata, error) {
	meta := &Metadata{}

	if err := extractFFProbe(path, meta); err != nil {
		// ffprobe failed — still return metadata with fallback values
	}

	// Fallback TakenAt to file modification time
	if meta.TakenAt == nil {
		if info, err := os.Stat(path); err == nil {
			t := info.ModTime()
			meta.TakenAt = &t
		}
	}

	return meta, nil
}

type ffprobeOutput struct {
	Format struct {
		Duration string            `json:"duration"`
		Tags     map[string]string `json:"tags"`
	} `json:"format"`
	Streams []struct {
		Width    int    `json:"width"`
		Height   int    `json:"height"`
		CodecType string `json:"codec_type"`
	} `json:"streams"`
}

func extractFFProbe(path string, meta *Metadata) error {
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_format",
		"-show_streams",
		path,
	)

	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("ffprobe: %w", err)
	}

	var probe ffprobeOutput
	if err := json.Unmarshal(output, &probe); err != nil {
		return fmt.Errorf("parse ffprobe output: %w", err)
	}

	// Find video stream for dimensions
	for _, stream := range probe.Streams {
		if stream.CodecType == "video" && stream.Width > 0 && stream.Height > 0 {
			w := stream.Width
			h := stream.Height
			meta.Width = &w
			meta.Height = &h
			break
		}
	}

	// Duration
	if probe.Format.Duration != "" {
		if dur, err := strconv.ParseFloat(probe.Format.Duration, 64); err == nil {
			ms := int(math.Round(dur * 1000))
			meta.DurationMs = &ms
		}
	}

	// creation_time from format tags
	if ct, ok := probe.Format.Tags["creation_time"]; ok {
		// Try common formats
		for _, layout := range []string{
			time.RFC3339,
			"2006-01-02T15:04:05.000000Z",
			"2006-01-02 15:04:05",
		} {
			if t, err := time.Parse(layout, ct); err == nil {
				meta.TakenAt = &t
				break
			}
		}
	}

	return nil
}
