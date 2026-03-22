import { useState, useCallback } from 'react'
import type { MediaItem } from '../../types/media.ts'
import { mediaUrl } from '../../api/client.ts'

interface ImageViewerProps {
  item: MediaItem
}

export default function ImageViewer({ item }: ImageViewerProps) {
  const [loaded, setLoaded] = useState(false)
  const handleLoad = useCallback(() => setLoaded(true), [])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        maxHeight: 'calc(100vh - 120px)',
      }}
    >
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Loading...
        </div>
      )}
      <img
        src={mediaUrl(`/api/media/${item.id}/file`)}
        alt={item.file_name}
        onLoad={handleLoad}
        draggable={false}
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 120px)',
          objectFit: 'contain',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
          userSelect: 'none',
        }}
      />
    </div>
  )
}
