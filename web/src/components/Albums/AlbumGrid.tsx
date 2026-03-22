import type { Album } from '../../types/album.ts'
import AlbumCard from './AlbumCard.tsx'

interface AlbumGridProps {
  albums: Album[]
  onNewAlbum: () => void
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
  padding: '0 20px',
}

const mediaQuery = `
@media (max-width: 1024px) { .album-grid { grid-template-columns: repeat(3, 1fr) !important; } }
@media (max-width: 768px)  { .album-grid { grid-template-columns: repeat(2, 1fr) !important; } }
`

export default function AlbumGrid({ albums, onNewAlbum }: AlbumGridProps) {
  return (
    <>
      <style>{mediaQuery}</style>
      <div className="album-grid" style={gridStyle}>
        {albums.map((album) => (
          <AlbumCard key={album.id} album={album} />
        ))}

        {/* New Album card */}
        <div
          onClick={onNewAlbum}
          style={{
            cursor: 'pointer',
            borderRadius: 'var(--radius-md)',
            border: '2px dashed #333',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            aspectRatio: '3 / 2',
            transition: 'border-color 0.2s ease, background 0.2s ease',
            background: 'transparent',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-muted)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#333'
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span
            style={{
              fontSize: 32,
              color: 'var(--text-muted)',
              lineHeight: 1,
              fontWeight: 300,
            }}
          >
            +
          </span>
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 8,
            }}
          >
            New Album
          </span>
        </div>
      </div>
    </>
  )
}
