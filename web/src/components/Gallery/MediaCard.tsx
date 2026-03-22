import { useRef, useState, useEffect, useCallback } from 'react'
import type { MediaItem } from '../../types/media.ts'
import { formatDuration } from '../../utils/format.ts'

interface MediaCardProps {
  item: MediaItem
  index?: number
  onClick: () => void
}

export default function MediaCard({ item, index = 0, onClick }: MediaCardProps) {
  const isEager = index < 12
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(isEager)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isEager) return
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [isEager])

  const handleLoad = useCallback(() => setLoaded(true), [])
  const handleError = useCallback(() => {
    setError(true)
    setLoaded(true)
  }, [])

  const aspectRatio =
    item.width && item.height ? item.width / item.height : 4 / 3

  const showShimmer = !loaded && !error

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className="media-card"
      style={{
        position: 'relative',
        marginBottom: 'var(--grid-gap)',
        cursor: 'pointer',
        overflow: 'hidden',
        borderRadius: 'var(--radius-sm)',
        background: showShimmer
          ? 'linear-gradient(90deg, #1a1a1a 25%, #222 50%, #1a1a1a 75%)'
          : '#1a1a1a',
        backgroundSize: showShimmer ? '200% 100%' : undefined,
        animation: showShimmer ? 'shimmer 1.5s infinite linear' : undefined,
        aspectRatio: String(aspectRatio),
      }}
    >
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            color: 'var(--text-muted)',
            fontSize: 11,
          }}
        >
          Failed to load
        </div>
      )}
      {visible && !error && (
        <img
          src={`/api/media/${item.id}/thumb`}
          alt={item.file_name}
          loading={isEager ? 'eager' : 'lazy'}
          onLoad={handleLoad}
          onError={handleError}
          draggable={false}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity 0.3s ease, filter 0.2s ease',
            filter: 'brightness(1)',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.filter =
              'brightness(1.15)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLImageElement).style.filter =
              'brightness(1)'
          }}
        />
      )}

      {item.media_type === 'video' && item.duration_ms != null && (
        <span
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            padding: '2px 6px',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: '16px',
            color: '#fff',
            background: 'rgba(0, 0, 0, 0.6)',
            borderRadius: 'var(--radius-sm)',
            pointerEvents: 'none',
            letterSpacing: '0.3px',
          }}
        >
          {formatDuration(item.duration_ms)}
        </span>
      )}
    </div>
  )
}
