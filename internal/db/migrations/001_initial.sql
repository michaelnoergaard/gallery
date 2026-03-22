-- Users
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'viewer',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Media items
CREATE TABLE IF NOT EXISTS media_items (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path       TEXT NOT NULL UNIQUE,
    file_name       TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    file_hash       TEXT NOT NULL,
    media_type      TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    width           INTEGER,
    height          INTEGER,
    duration_ms     INTEGER,
    taken_at        DATETIME,
    year            INTEGER NOT NULL,
    month           INTEGER NOT NULL,
    thumbnail_path  TEXT,
    indexed_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Albums
CREATE TABLE IF NOT EXISTS albums (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    cover_media_id  INTEGER REFERENCES media_items(id) ON DELETE SET NULL,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Album items
CREATE TABLE IF NOT EXISTS album_items (
    album_id    INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    media_id    INTEGER NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    added_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (album_id, media_id)
);

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_media_year_month ON media_items(year, month);
CREATE INDEX IF NOT EXISTS idx_media_hash ON media_items(file_hash);
CREATE INDEX IF NOT EXISTS idx_media_taken_at ON media_items(taken_at);
CREATE INDEX IF NOT EXISTS idx_album_items_album ON album_items(album_id, sort_order);
