import { useState, useEffect, useCallback, type CSSProperties } from 'react'
import { useAlbums, useCreateAlbum, useAddToAlbum } from '../../hooks/useAlbums.ts'

interface AddToAlbumModalProps {
  mediaId: number
  isOpen: boolean
  onClose: () => void
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 2000,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } satisfies CSSProperties,
  card: {
    width: '100%',
    maxWidth: 360,
    padding: '24px',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    maxHeight: '70vh',
    display: 'flex',
    flexDirection: 'column' as const,
  } satisfies CSSProperties,
  title: {
    fontSize: 15,
    fontWeight: 500,
    color: 'var(--text-primary)',
    margin: '0 0 16px 0',
  } satisfies CSSProperties,
  list: {
    flex: 1,
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
    marginBottom: 16,
  } satisfies CSSProperties,
  albumRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--text-primary)',
    transition: 'background 0.15s ease',
  } satisfies CSSProperties,
  checkbox: {
    width: 16,
    height: 16,
    accentColor: 'var(--text-secondary)',
    cursor: 'pointer',
    flexShrink: 0,
  } satisfies CSSProperties,
  actions: {
    display: 'flex',
    gap: 10,
  } satisfies CSSProperties,
  cancelBtn: {
    flex: 1,
    padding: '10px 0',
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontFamily: 'var(--font-family)',
  } satisfies CSSProperties,
  addBtn: {
    flex: 1,
    padding: '10px 0',
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: 'var(--text-primary)',
    background: 'var(--accent-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background 0.2s',
    fontFamily: 'var(--font-family)',
  } satisfies CSSProperties,
  newAlbumInput: {
    width: '100%',
    padding: '8px 10px',
    fontSize: 13,
    background: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
    fontFamily: 'var(--font-family)',
    marginTop: 4,
  } satisfies CSSProperties,
}

export default function AddToAlbumModal({ mediaId, isOpen, onClose }: AddToAlbumModalProps) {
  const { data: albums, isLoading } = useAlbums()
  const addToAlbum = useAddToAlbum()
  const createAlbum = useCreateAlbum()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showNewInput, setShowNewInput] = useState(false)
  const [newAlbumName, setNewAlbumName] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelected(new Set())
      setShowNewInput(false)
      setNewAlbumName('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  const toggleAlbum = useCallback((albumId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(albumId)) {
        next.delete(albumId)
      } else {
        next.add(albumId)
      }
      return next
    })
  }, [])

  const handleAdd = useCallback(async () => {
    const promises: Promise<unknown>[] = []

    for (const albumId of selected) {
      promises.push(addToAlbum.mutateAsync({ albumId, mediaIds: [mediaId] }))
    }

    if (showNewInput && newAlbumName.trim()) {
      promises.push(
        createAlbum.mutateAsync({ name: newAlbumName.trim(), description: '' }).then((album) =>
          addToAlbum.mutateAsync({ albumId: album.id, mediaIds: [mediaId] }),
        ),
      )
    }

    await Promise.all(promises)
    onClose()
  }, [selected, showNewInput, newAlbumName, mediaId, addToAlbum, createAlbum, onClose])

  if (!isOpen) return null

  const hasSelection = selected.size > 0 || (showNewInput && newAlbumName.trim())

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Add to Album</h3>

        <div style={styles.list}>
          {isLoading && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 10px' }}>
              Loading...
            </div>
          )}

          {albums?.map((album) => (
            <div
              key={album.id}
              style={styles.albumRow}
              onClick={() => toggleAlbum(album.id)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(album.id)}
                onChange={() => toggleAlbum(album.id)}
                style={styles.checkbox}
              />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {album.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {album.item_count}
              </span>
            </div>
          ))}

          {/* Create New Album option */}
          {!showNewInput ? (
            <div
              style={{
                ...styles.albumRow,
                color: 'var(--text-secondary)',
                marginTop: 4,
                borderTop: '1px solid var(--border)',
                paddingTop: 12,
              }}
              onClick={() => setShowNewInput(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1, fontWeight: 300 }}>+</span>
              <span>Create New Album</span>
            </div>
          ) : (
            <div style={{ marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <input
                style={styles.newAlbumInput}
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="New album name"
                autoFocus
              />
            </div>
          )}
        </div>

        <div style={styles.actions}>
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.addBtn,
              opacity: hasSelection ? 1 : 0.5,
            }}
            disabled={!hasSelection}
            onClick={handleAdd}
            onMouseEnter={(e) => {
              if (hasSelection) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  )
}
