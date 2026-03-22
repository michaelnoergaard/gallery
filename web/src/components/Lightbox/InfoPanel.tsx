import { useState } from 'react'
import type { MediaItem } from '../../types/media.ts'
import { formatFileSize, formatDuration, formatDate } from '../../utils/format.ts'
import AddToAlbumModal from '../Albums/AddToAlbumModal.tsx'

interface InfoPanelProps {
  item: MediaItem
  isOpen: boolean
  onClose: () => void
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: 'var(--text-muted)',
  marginBottom: 10,
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: 13,
  padding: '4px 0',
}

const labelStyle: React.CSSProperties = {
  color: 'var(--text-secondary)',
}

const valueStyle: React.CSSProperties = {
  color: 'var(--text-primary)',
  textAlign: 'right',
  wordBreak: 'break-all',
  maxWidth: '60%',
}

export default function InfoPanel({ item, isOpen, onClose }: InfoPanelProps) {
  const [albumModalOpen, setAlbumModalOpen] = useState(false)

  return (
    <>
      {/* Backdrop for closing */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1001,
          }}
        />
      )}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: '#111',
          zIndex: 1002,
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s ease',
          overflowY: 'auto',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
            Details
          </span>
          <button
            onClick={onClose}
            style={{
              fontSize: 18,
              color: 'var(--text-secondary)',
              padding: '2px 6px',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', flex: 1 }}>
          {/* File Info */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitleStyle}>File Info</div>
            <div style={rowStyle}>
              <span style={labelStyle}>Name</span>
              <span style={valueStyle}>{item.file_name}</span>
            </div>
            <div style={rowStyle}>
              <span style={labelStyle}>Size</span>
              <span style={valueStyle}>{formatFileSize(item.file_size)}</span>
            </div>
            {item.width != null && item.height != null && (
              <div style={rowStyle}>
                <span style={labelStyle}>Dimensions</span>
                <span style={valueStyle}>
                  {item.width} &times; {item.height}
                </span>
              </div>
            )}
            <div style={rowStyle}>
              <span style={labelStyle}>Type</span>
              <span style={valueStyle}>{item.mime_type}</span>
            </div>
          </div>

          {/* Date */}
          {item.taken_at && (
            <div style={{ marginBottom: 24 }}>
              <div style={sectionTitleStyle}>Date</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {formatDate(item.taken_at)}
              </div>
            </div>
          )}

          {/* Video duration */}
          {item.media_type === 'video' && item.duration_ms != null && (
            <div style={{ marginBottom: 24 }}>
              <div style={sectionTitleStyle}>Duration</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {formatDuration(item.duration_ms)}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginBottom: 24 }}>
            <div style={sectionTitleStyle}>Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a
                href={`/api/media/${item.id}/file`}
                download={item.file_name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                }}
              >
                Download
              </a>
              <button
                onClick={() => setAlbumModalOpen(true)}
                style={{
                  padding: '10px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                }}
              >
                Add to Album
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddToAlbumModal
        mediaId={item.id}
        isOpen={albumModalOpen}
        onClose={() => setAlbumModalOpen(false)}
      />
    </>
  )
}
