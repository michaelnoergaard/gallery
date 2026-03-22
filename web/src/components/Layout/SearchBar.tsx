import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client.ts'
import type { MediaItem, MediaListResult } from '../../types/media.ts'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MediaItem[]>([])
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, limit: '6', page: '1' })
      const data = await apiClient.get<MediaListResult>(`/api/media?${params}`)
      setResults(data.items)
      setOpen(data.items.length > 0)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedIdx(-1)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }

  const handleSubmit = () => {
    if (!query.trim()) return
    setOpen(false)
    inputRef.current?.blur()
    navigate(`/?q=${encodeURIComponent(query.trim())}`)
  }

  const handleResultClick = (item: MediaItem) => {
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
    navigate(`/?q=${encodeURIComponent(item.file_name)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    } else if (e.key === 'Enter') {
      if (selectedIdx >= 0 && selectedIdx < results.length) {
        handleResultClick(results[selectedIdx])
      } else {
        handleSubmit()
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, -1))
    }
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cleanup debounce
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const formatDate = (item: MediaItem) => {
    if (!item.taken_at) return ''
    try {
      return new Date(item.taken_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return ''
    }
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid transparent',
          borderColor: focused ? 'var(--text-muted)' : 'transparent',
          transition: 'width 0.25s ease, border-color 0.2s ease, background 0.2s ease',
          width: focused ? 280 : 200,
          height: 32,
          overflow: 'hidden',
        }}
      >
        {/* Search icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#666"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ marginLeft: 10, flexShrink: 0 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            setFocused(true)
            if (query.trim() && results.length > 0) setOpen(true)
          }}
          onBlur={() => setFocused(false)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            height: '100%',
            fontSize: 12,
            padding: '0 10px 0 8px',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        />
        {loading && (
          <div
            style={{
              width: 14,
              height: 14,
              marginRight: 8,
              border: '2px solid var(--text-muted)',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'search-spin 0.6s linear infinite',
              flexShrink: 0,
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            width: 320,
            background: '#111',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 90,
            overflow: 'hidden',
          }}
        >
          {results.map((item, idx) => (
            <div
              key={item.id}
              onMouseDown={() => handleResultClick(item)}
              onMouseEnter={() => setSelectedIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                cursor: 'pointer',
                background: idx === selectedIdx ? 'var(--accent-hover)' : 'transparent',
                transition: 'background 0.1s ease',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: 'var(--accent)',
                }}
              >
                {item.thumbnail_path && (
                  <img
                    src={`/api/thumbs/${item.thumbnail_path}`}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    loading="lazy"
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.file_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {formatDate(item)}
                </div>
              </div>
            </div>
          ))}
          <div
            onMouseDown={handleSubmit}
            style={{
              padding: '8px 12px',
              fontSize: 11,
              color: 'var(--text-secondary)',
              borderTop: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Press Enter to see all results
          </div>
        </div>
      )}

      <style>{`@keyframes search-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
