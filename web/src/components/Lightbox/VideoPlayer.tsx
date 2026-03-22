import { useRef, useEffect } from 'react'
import type { MediaItem } from '../../types/media.ts'

interface VideoPlayerProps {
  item: MediaItem
}

export default function VideoPlayer({ item }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      video.play().catch(() => {
        // autoplay may be blocked by browser
      })
    }
    return () => {
      if (video) {
        video.pause()
      }
    }
  }, [item.id])

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
      <video
        ref={videoRef}
        key={item.id}
        src={`/api/media/${item.id}/file`}
        controls
        style={{
          maxWidth: '100%',
          maxHeight: 'calc(100vh - 120px)',
          objectFit: 'contain',
          background: '#000',
          outline: 'none',
        }}
      />
    </div>
  )
}
