package db

import (
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"
)

type MediaItem struct {
	ID            int64
	FilePath      string
	FileName      string
	FileSize      int64
	FileHash      string
	MediaType     string // "image" or "video"
	MimeType      string
	Width         *int
	Height        *int
	DurationMs    *int
	TakenAt       *time.Time
	Year          int
	Month         int
	ThumbnailPath *string
	IndexedAt     time.Time
	UpdatedAt     time.Time
}

type MediaListParams struct {
	Year   *int
	Month  *int
	Search string // search by file_name
	Page   int    // 1-based
	Limit  int    // default 50, max 200
}

type MediaListResult struct {
	Items      []*MediaItem
	Total      int
	Page       int
	TotalPages int
}

func (db *DB) InsertMediaItem(item *MediaItem) error {
	result, err := db.Exec(
		`INSERT INTO media_items (file_path, file_name, file_size, file_hash, media_type, mime_type,
			width, height, duration_ms, taken_at, year, month, thumbnail_path, indexed_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		item.FilePath, item.FileName, item.FileSize, item.FileHash, item.MediaType, item.MimeType,
		item.Width, item.Height, item.DurationMs, item.TakenAt, item.Year, item.Month, item.ThumbnailPath,
	)
	if err != nil {
		return fmt.Errorf("insert media item: %w", err)
	}
	id, _ := result.LastInsertId()
	item.ID = id
	return nil
}

func (db *DB) GetMediaByHash(hash string) (*MediaItem, error) {
	return db.scanMediaItem(
		`SELECT id, file_path, file_name, file_size, file_hash, media_type, mime_type,
			width, height, duration_ms, taken_at, year, month, thumbnail_path, indexed_at, updated_at
		FROM media_items WHERE file_hash = ?`, hash,
	)
}

func (db *DB) GetMediaByID(id int64) (*MediaItem, error) {
	return db.scanMediaItem(
		`SELECT id, file_path, file_name, file_size, file_hash, media_type, mime_type,
			width, height, duration_ms, taken_at, year, month, thumbnail_path, indexed_at, updated_at
		FROM media_items WHERE id = ?`, id,
	)
}

func (db *DB) scanMediaItem(query string, args ...any) (*MediaItem, error) {
	item := &MediaItem{}
	err := db.QueryRow(query, args...).Scan(
		&item.ID, &item.FilePath, &item.FileName, &item.FileSize, &item.FileHash,
		&item.MediaType, &item.MimeType, &item.Width, &item.Height, &item.DurationMs,
		&item.TakenAt, &item.Year, &item.Month, &item.ThumbnailPath,
		&item.IndexedAt, &item.UpdatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("scan media item: %w", err)
	}
	return item, nil
}

func (db *DB) ListMedia(params MediaListParams) (*MediaListResult, error) {
	// Clamp limit
	if params.Limit <= 0 {
		params.Limit = 50
	}
	if params.Limit > 200 {
		params.Limit = 200
	}
	// Default page
	if params.Page <= 0 {
		params.Page = 1
	}

	var conditions []string
	var args []any

	if params.Year != nil {
		conditions = append(conditions, "year = ?")
		args = append(args, *params.Year)
	}
	if params.Month != nil {
		conditions = append(conditions, "month = ?")
		args = append(args, *params.Month)
	}
	if params.Search != "" {
		conditions = append(conditions, "file_name LIKE ?")
		args = append(args, "%"+params.Search+"%")
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	var total int
	countQuery := "SELECT COUNT(*) FROM media_items " + whereClause
	if err := db.QueryRow(countQuery, args...).Scan(&total); err != nil {
		return nil, fmt.Errorf("count media: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(params.Limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	offset := (params.Page - 1) * params.Limit
	listQuery := fmt.Sprintf(
		`SELECT id, file_path, file_name, file_size, file_hash, media_type, mime_type,
			width, height, duration_ms, taken_at, year, month, thumbnail_path, indexed_at, updated_at
		FROM media_items %s ORDER BY taken_at DESC LIMIT ? OFFSET ?`, whereClause,
	)
	listArgs := append(args, params.Limit, offset)

	rows, err := db.Query(listQuery, listArgs...)
	if err != nil {
		return nil, fmt.Errorf("list media: %w", err)
	}
	defer rows.Close()

	var items []*MediaItem
	for rows.Next() {
		item := &MediaItem{}
		if err := rows.Scan(
			&item.ID, &item.FilePath, &item.FileName, &item.FileSize, &item.FileHash,
			&item.MediaType, &item.MimeType, &item.Width, &item.Height, &item.DurationMs,
			&item.TakenAt, &item.Year, &item.Month, &item.ThumbnailPath,
			&item.IndexedAt, &item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan media row: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate media rows: %w", err)
	}

	return &MediaListResult{
		Items:      items,
		Total:      total,
		Page:       params.Page,
		TotalPages: totalPages,
	}, nil
}

func (db *DB) UpdateThumbnailPath(id int64, path string) error {
	_, err := db.Exec(
		"UPDATE media_items SET thumbnail_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
		path, id,
	)
	if err != nil {
		return fmt.Errorf("update thumbnail path: %w", err)
	}
	return nil
}

func (db *DB) DeleteMediaByPath(path string) error {
	_, err := db.Exec("DELETE FROM media_items WHERE file_path = ?", path)
	if err != nil {
		return fmt.Errorf("delete media by path: %w", err)
	}
	return nil
}

func (db *DB) ListAllPaths() ([]string, error) {
	rows, err := db.Query("SELECT file_path FROM media_items")
	if err != nil {
		return nil, fmt.Errorf("list all paths: %w", err)
	}
	defer rows.Close()

	var paths []string
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			return nil, fmt.Errorf("scan path: %w", err)
		}
		paths = append(paths, p)
	}
	return paths, rows.Err()
}

func (db *DB) GetMediaWithoutThumbnail(limit int) ([]*MediaItem, error) {
	rows, err := db.Query(
		`SELECT id, file_path, file_name, file_size, file_hash, media_type, mime_type,
			width, height, duration_ms, taken_at, year, month, thumbnail_path, indexed_at, updated_at
		FROM media_items WHERE thumbnail_path IS NULL LIMIT ?`, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("get media without thumbnail: %w", err)
	}
	defer rows.Close()

	var items []*MediaItem
	for rows.Next() {
		item := &MediaItem{}
		if err := rows.Scan(
			&item.ID, &item.FilePath, &item.FileName, &item.FileSize, &item.FileHash,
			&item.MediaType, &item.MimeType, &item.Width, &item.Height, &item.DurationMs,
			&item.TakenAt, &item.Year, &item.Month, &item.ThumbnailPath,
			&item.IndexedAt, &item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan media row: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
