# Gallery

A fast, self-hosted media gallery for photos and videos. Point it at a directory, and Gallery indexes your files, generates thumbnails, and serves a responsive web UI.

<!-- TODO: Add screenshot -->

## Features

- **Masonry grid layout** -- responsive, virtualized grid that handles large libraries smoothly
- **Albums** -- organize media into curated albums
- **Folder browsing** -- navigate your media by its original directory structure
- **Multi-user auth** -- JWT-based authentication with admin and standard user roles
- **Video transcoding** -- on-the-fly transcoding via FFmpeg with a 10 GB LRU cache
- **Thumbnail generation** -- concurrent thumbnail pipeline for both images and videos
- **Background scanning** -- automatic periodic scans detect new and changed files
- **EXIF metadata extraction** -- reads camera, date, and location data from photos
- **Content deduplication** -- file hashing prevents duplicate entries
- **Single binary + Docker** -- deploy as a standalone binary or a multi-stage Docker image

## Quick Start

Create a `docker-compose.yml`:

```yaml
services:
  gallery:
    image: ghcr.io/michaelnoergaard/gallery:master
    ports:
      - "8080:8080"
    volumes:
      - /path/to/your/photos:/media:ro
      - gallery-data:/data
    environment:
      - GALLERY_SECRET=change-me-to-a-random-string
    restart: unless-stopped

volumes:
  gallery-data:
```

Then run:

```bash
docker compose up -d
```

Gallery will start scanning your media directory and be available at `http://localhost:8080`.

## Configuration

All configuration is done through environment variables.

| Variable | Default | Required | Description |
|---|---|---|---|
| `GALLERY_SECRET` | -- | **Yes** | Secret key used for signing JWT tokens. Must be set. |
| `GALLERY_MEDIA_DIR` | `/media` | No | Path to the directory containing your photos and videos. Mount read-only. |
| `GALLERY_DATA_DIR` | `/data` | No | Path for the SQLite database, thumbnails, and transcoding cache. Should be a persistent volume. |
| `GALLERY_PORT` | `8080` | No | HTTP port the server listens on. |
| `GALLERY_SCAN_WORKERS` | `8` | No | Number of concurrent workers for scanning and indexing files. |
| `GALLERY_THUMB_WORKERS` | `4` | No | Number of concurrent workers for generating thumbnails. |
| `GALLERY_SCAN_INTERVAL` | `30m` | No | How often to re-scan the media directory for changes. Accepts Go duration strings (`10m`, `1h`, etc.). |

## Development

You need Go 1.25+, Node.js 22+, and FFmpeg installed locally.

Run the backend and frontend in two terminals:

```bash
# Terminal 1 -- Go backend (with hot reload via `go run`)
export GALLERY_SECRET=dev-secret
export GALLERY_MEDIA_DIR=./test-media
export GALLERY_DATA_DIR=./data
make dev-backend
```

```bash
# Terminal 2 -- Vite dev server with HMR
make dev-frontend
```

The Vite dev server proxies API requests to the Go backend. Open `http://localhost:5173` during development.

### Other commands

```bash
make build    # Build the Docker image
make test     # Run Go tests
```

## Tech Stack

- **Backend:** Go, Chi router, SQLite (via modernc.org/sqlite, pure Go)
- **Frontend:** React 19, TypeScript, Vite, TanStack Query, Zustand, React Virtuoso
- **Media processing:** FFmpeg (video transcoding + thumbnails), disintegration/imaging (image thumbnails)
- **Auth:** bcrypt passwords, JWT tokens
- **Deployment:** Multi-stage Docker build (Alpine)

## License

[MIT](LICENSE)
