import { useNavigate } from 'react-router-dom'
import type { Album } from '../../types/album.ts'

interface AlbumCardProps {
  album: Album
}

export default function AlbumCard({ album }: AlbumCardProps) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/albums/${album.id}`)}
      style={{
        cursor: 'pointer',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        transition: 'transform 0.2s ease, filter 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)'
        e.currentTarget.style.filter = 'brightness(1.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.filter = 'brightness(1)'
      }}
    >
      {/* Cover image area */}
      <div
        style={{
          aspectRatio: '3 / 2',
          overflow: 'hidden',
          background: album.cover_thumb_url
            ? 'var(--bg-elevated)'
            : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        }}
      >
        {album.cover_thumb_url && (
          <img
            src={album.cover_thumb_url}
            alt={album.name}
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}
      </div>

      {/* Info area */}
      <div style={{ padding: '10px 12px' }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {album.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 2,
          }}
        >
          {album.item_count} {album.item_count === 1 ? 'item' : 'items'}
        </div>
      </div>
    </div>
  )
}
