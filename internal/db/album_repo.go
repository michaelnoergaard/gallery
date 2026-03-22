package db

import (
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"
)

type Album struct {
	ID            int64   `json:"id"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	CoverMediaID  *int64  `json:"cover_media_id"`
	CoverThumbURL *string `json:"cover_thumb_url,omitempty"`
	CreatedBy     int64   `json:"created_by"`
	CreatorName   string  `json:"creator_name,omitempty"`
	ItemCount     int     `json:"item_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AlbumItem struct {
	AlbumID   int64     `json:"album_id"`
	MediaID   int64     `json:"media_id"`
	SortOrder int       `json:"sort_order"`
	AddedAt   time.Time `json:"added_at"`
}

func (db *DB) CreateAlbum(name, description string, createdBy int64) (*Album, error) {
	result, err := db.Exec(
		`INSERT INTO albums (name, description, created_by, created_at, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
		name, description, createdBy,
	)
	if err != nil {
		return nil, fmt.Errorf("insert album: %w", err)
	}

	id, _ := result.LastInsertId()
	return db.GetAlbum(id)
}

func (db *DB) GetAlbum(id int64) (*Album, error) {
	album := &Album{}
	var description sql.NullString
	var coverMediaID sql.NullInt64

	err := db.QueryRow(
		`SELECT a.id, a.name, a.description, a.cover_media_id, a.created_by, u.username,
			a.created_at, a.updated_at,
			(SELECT COUNT(*) FROM album_items ai WHERE ai.album_id = a.id) AS item_count
		FROM albums a
		JOIN users u ON u.id = a.created_by
		WHERE a.id = ?`, id,
	).Scan(
		&album.ID, &album.Name, &description, &coverMediaID, &album.CreatedBy,
		&album.CreatorName, &album.CreatedAt, &album.UpdatedAt, &album.ItemCount,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("get album: %w", err)
	}

	if description.Valid {
		album.Description = description.String
	}
	if coverMediaID.Valid {
		album.CoverMediaID = &coverMediaID.Int64
		thumbURL := fmt.Sprintf("/api/media/%d/thumb", coverMediaID.Int64)
		album.CoverThumbURL = &thumbURL
	}

	return album, nil
}

func (db *DB) ListAlbums() ([]*Album, error) {
	rows, err := db.Query(
		`SELECT a.id, a.name, a.description, a.cover_media_id, a.created_by, u.username,
			a.created_at, a.updated_at,
			(SELECT COUNT(*) FROM album_items ai WHERE ai.album_id = a.id) AS item_count
		FROM albums a
		JOIN users u ON u.id = a.created_by
		ORDER BY a.updated_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list albums: %w", err)
	}
	defer rows.Close()

	var albums []*Album
	for rows.Next() {
		album := &Album{}
		var description sql.NullString
		var coverMediaID sql.NullInt64

		if err := rows.Scan(
			&album.ID, &album.Name, &description, &coverMediaID, &album.CreatedBy,
			&album.CreatorName, &album.CreatedAt, &album.UpdatedAt, &album.ItemCount,
		); err != nil {
			return nil, fmt.Errorf("scan album: %w", err)
		}

		if description.Valid {
			album.Description = description.String
		}
		if coverMediaID.Valid {
			album.CoverMediaID = &coverMediaID.Int64
			thumbURL := fmt.Sprintf("/api/media/%d/thumb", coverMediaID.Int64)
			album.CoverThumbURL = &thumbURL
		}

		albums = append(albums, album)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate album rows: %w", err)
	}

	return albums, nil
}

func (db *DB) UpdateAlbum(id int64, name, description string, coverMediaID *int64) error {
	_, err := db.Exec(
		`UPDATE albums SET name = ?, description = ?, cover_media_id = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?`,
		name, description, coverMediaID, id,
	)
	if err != nil {
		return fmt.Errorf("update album: %w", err)
	}
	return nil
}

func (db *DB) DeleteAlbum(id int64) error {
	_, err := db.Exec("DELETE FROM albums WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("delete album: %w", err)
	}
	return nil
}

func (db *DB) AddItemsToAlbum(albumID int64, mediaIDs []int64) error {
	if len(mediaIDs) == 0 {
		return nil
	}

	// Get current max sort_order
	var maxOrder int
	err := db.QueryRow(
		"SELECT COALESCE(MAX(sort_order), 0) FROM album_items WHERE album_id = ?", albumID,
	).Scan(&maxOrder)
	if err != nil {
		return fmt.Errorf("get max sort order: %w", err)
	}

	// Build batch insert
	var placeholders []string
	var args []any
	for i, mediaID := range mediaIDs {
		placeholders = append(placeholders, "(?, ?, ?)")
		args = append(args, albumID, mediaID, maxOrder+i+1)
	}

	query := fmt.Sprintf(
		"INSERT OR IGNORE INTO album_items (album_id, media_id, sort_order) VALUES %s",
		strings.Join(placeholders, ", "),
	)

	_, err = db.Exec(query, args...)
	if err != nil {
		return fmt.Errorf("add items to album: %w", err)
	}

	// Update album's updated_at
	_, err = db.Exec("UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", albumID)
	if err != nil {
		return fmt.Errorf("update album timestamp: %w", err)
	}

	return nil
}

func (db *DB) RemoveItemFromAlbum(albumID, mediaID int64) error {
	_, err := db.Exec(
		"DELETE FROM album_items WHERE album_id = ? AND media_id = ?",
		albumID, mediaID,
	)
	if err != nil {
		return fmt.Errorf("remove item from album: %w", err)
	}

	// Update album's updated_at
	_, err = db.Exec("UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", albumID)
	if err != nil {
		return fmt.Errorf("update album timestamp: %w", err)
	}

	return nil
}

func (db *DB) GetAlbumItems(albumID int64, page, limit int) (*MediaListResult, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	if page <= 0 {
		page = 1
	}

	// Count total items in album
	var total int
	err := db.QueryRow(
		"SELECT COUNT(*) FROM album_items WHERE album_id = ?", albumID,
	).Scan(&total)
	if err != nil {
		return nil, fmt.Errorf("count album items: %w", err)
	}

	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages == 0 {
		totalPages = 1
	}

	offset := (page - 1) * limit

	rows, err := db.Query(
		`SELECT m.id, m.file_path, m.file_name, m.file_size, m.file_hash, m.media_type, m.mime_type,
			m.width, m.height, m.duration_ms, m.taken_at, m.year, m.month, m.thumbnail_path,
			m.indexed_at, m.updated_at
		FROM album_items ai
		JOIN media_items m ON m.id = ai.media_id
		WHERE ai.album_id = ?
		ORDER BY ai.sort_order
		LIMIT ? OFFSET ?`,
		albumID, limit, offset,
	)
	if err != nil {
		return nil, fmt.Errorf("get album items: %w", err)
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
			return nil, fmt.Errorf("scan album item: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate album items: %w", err)
	}

	return &MediaListResult{
		Items:      items,
		Total:      total,
		Page:       page,
		TotalPages: totalPages,
	}, nil
}

func (db *DB) ReorderAlbumItems(albumID int64, mediaIDs []int64) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(
		"UPDATE album_items SET sort_order = ? WHERE album_id = ? AND media_id = ?",
	)
	if err != nil {
		return fmt.Errorf("prepare statement: %w", err)
	}
	defer stmt.Close()

	for i, mediaID := range mediaIDs {
		if _, err := stmt.Exec(i+1, albumID, mediaID); err != nil {
			return fmt.Errorf("update sort order: %w", err)
		}
	}

	// Update album's updated_at
	if _, err := tx.Exec("UPDATE albums SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", albumID); err != nil {
		return fmt.Errorf("update album timestamp: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
