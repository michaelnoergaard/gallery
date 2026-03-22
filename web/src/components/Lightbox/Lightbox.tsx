import { useState, useEffect, useCallback, useRef } from 'react'
import type { MediaItem } from '../../types/media.ts'
import ImageViewer from './ImageViewer.tsx'
import VideoPlayer from './VideoPlayer.tsx'
import InfoPanel from './InfoPanel.tsx'
import { formatFileSize } from '../../utils/format.ts'
import { mediaUrl } from '../../api/client.ts'

interface LightboxProps {
  items: MediaItem[]
  initialIndex: number
  onClose: () => void
}

export default function Lightbox({ items, initialIndex, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [infoPanelOpen, setInfoPanelOpen] = useState(false)
  const [fadeKey, setFadeKey] = useState(0)
  const overlayRef = useRef<HTMLDivElement>(null)

  const item = items[currentIndex]

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        setCurrentIndex(index)
        setFadeKey((k) => k + 1)
      }
    },
    [items.length],
  )

  const goPrev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex])
  const goNext = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goPrev()
          break
        case 'ArrowRight':
          e.preventDefault()
          goNext()
          break
        case 'Escape':
          e.preventDefault()
          if (infoPanelOpen) {
            setInfoPanelOpen(false)
          } else {
            onClose()
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext, onClose, infoPanelOpen])

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Preload adjacent images
  useEffect(() => {
    const preload = (index: number) => {
      const adj = items[index]
      if (adj && adj.media_type === 'image') {
        const img = new Image()
        img.src = mediaUrl(`/api/media/${adj.id}/file`)
      }
    }
    preload(currentIndex - 1)
    preload(currentIndex + 1)
  }, [currentIndex, items])

  // Click backdrop to close
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) {
        onClose()
      }
    },
    [onClose],
  )

  if (!item) return null

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 1003,
          fontSize: 24,
          color: 'rgba(255,255,255,0.5)',
          padding: '4px 10px',
          lineHeight: 1,
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)'
        }}
      >
        &times;
      </button>

      {/* Info panel toggle */}
      <button
        onClick={() => setInfoPanelOpen((o) => !o)}
        style={{
          position: 'fixed',
          top: 16,
          right: 56,
          zIndex: 1003,
          fontSize: 18,
          color: infoPanelOpen ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
          padding: '4px 10px',
          lineHeight: 1,
          transition: 'color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = infoPanelOpen
            ? 'rgba(255,255,255,0.9)'
            : 'rgba(255,255,255,0.5)'
        }}
        title="Toggle info panel"
      >
        &#8505;
      </button>

      {/* Left arrow */}
      {currentIndex > 0 && (
        <button
          onClick={goPrev}
          style={{
            position: 'fixed',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1003,
            fontSize: 36,
            color: 'rgba(255,255,255,0.3)',
            padding: '40px 16px',
            lineHeight: 1,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
          }}
        >
          &#8249;
        </button>
      )}

      {/* Right arrow */}
      {currentIndex < items.length - 1 && (
        <button
          onClick={goNext}
          style={{
            position: 'fixed',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1003,
            fontSize: 36,
            color: 'rgba(255,255,255,0.3)',
            padding: '40px 16px',
            lineHeight: 1,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
          }}
        >
          &#8250;
        </button>
      )}

      {/* Media content */}
      <div
        key={fadeKey}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '60px 80px 0',
          animation: 'lightboxFadeIn 0.2s ease',
        }}
      >
        {item.media_type === 'video' ? (
          <VideoPlayer item={item} />
        ) : (
          <ImageViewer item={item} />
        )}
      </div>

      {/* Bottom info bar */}
      <div
        style={{
          width: '100%',
          padding: '12px 20px',
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: 'var(--text-secondary)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
            {item.file_name}
          </span>
          {item.width != null && item.height != null && (
            <span>
              {item.width} &times; {item.height}
            </span>
          )}
          <span>{formatFileSize(item.file_size)}</span>
        </div>
        <span>
          {currentIndex + 1} / {items.length}
        </span>
      </div>

      {/* Info panel */}
      <InfoPanel
        item={item}
        isOpen={infoPanelOpen}
        onClose={() => setInfoPanelOpen(false)}
      />

      {/* Fade-in animation */}
      <style>{`
        @keyframes lightboxFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
