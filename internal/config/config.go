package config

import (
	"os"
	"strconv"
	"time"
)

// Config holds all configuration values for the gallery server.
type Config struct {
	MediaDir     string
	DataDir      string
	Secret       string
	Port         string
	ScanWorkers  int
	ThumbWorkers int
	ScanInterval time.Duration
}

// Load reads configuration from environment variables and returns a Config.
// It panics if GALLERY_SECRET is not set.
func Load() Config {
	secret := os.Getenv("GALLERY_SECRET")
	if secret == "" {
		panic("GALLERY_SECRET environment variable is required")
	}

	return Config{
		MediaDir:     envOrDefault("GALLERY_MEDIA_DIR", "/media"),
		DataDir:      envOrDefault("GALLERY_DATA_DIR", "/data"),
		Secret:       secret,
		Port:         envOrDefault("GALLERY_PORT", "8080"),
		ScanWorkers:  envOrDefaultInt("GALLERY_SCAN_WORKERS", 8),
		ThumbWorkers: envOrDefaultInt("GALLERY_THUMB_WORKERS", 4),
		ScanInterval: envOrDefaultDuration("GALLERY_SCAN_INTERVAL", 30*time.Minute),
	}
}

func envOrDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envOrDefaultInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func envOrDefaultDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
}
