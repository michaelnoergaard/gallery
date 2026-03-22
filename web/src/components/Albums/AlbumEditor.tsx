import { useState, useEffect, useCallback, type FormEvent, type CSSProperties } from 'react'
import type { Album } from '../../types/album.ts'

interface AlbumEditorProps {
  album?: Album
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, description: string) => void
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
    maxWidth: 420,
    padding: '36px 32px',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  } satisfies CSSProperties,
  title: {
    fontSize: 18,
    fontWeight: 300,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: 'var(--text-primary)',
    margin: '0 0 28px 0',
  } satisfies CSSProperties,
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    marginBottom: 20,
  } satisfies CSSProperties,
  label: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  } satisfies CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    background: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'var(--font-family)',
  } satisfies CSSProperties,
  textarea: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    background: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'var(--font-family)',
    resize: 'vertical' as const,
    minHeight: 80,
  } satisfies CSSProperties,
  actions: {
    display: 'flex',
    gap: 10,
    marginTop: 8,
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
    transition: 'background 0.2s, color 0.2s',
    fontFamily: 'var(--font-family)',
  } satisfies CSSProperties,
  submitBtn: {
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
    transition: 'background 0.2s, border-color 0.2s',
    fontFamily: 'var(--font-family)',
  } satisfies CSSProperties,
}

export default function AlbumEditor({ album, isOpen, onClose, onSave }: AlbumEditorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(album?.name ?? '')
      setDescription(album?.description ?? '')
    }
  }, [isOpen, album])

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const trimmed = name.trim()
      if (!trimmed) return
      onSave(trimmed, description.trim())
    },
    [name, description, onSave],
  )

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

  if (!isOpen) return null

  return (
    <div style={styles.overlay} onClick={onClose}>
      <form
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2 style={styles.title}>{album ? 'Edit Album' : 'New Album'}</h2>

        <div style={styles.field}>
          <label style={styles.label}>Name</label>
          <input
            style={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="Album name"
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Description</label>
          <textarea
            style={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div style={styles.actions}>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              ...styles.submitBtn,
              opacity: name.trim() ? 1 : 0.5,
            }}
            disabled={!name.trim()}
            onMouseEnter={(e) => {
              if (name.trim()) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)'
                e.currentTarget.style.borderColor = 'var(--text-muted)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--accent-hover)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
          >
            {album ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
