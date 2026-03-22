import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Virtuoso } from 'react-virtuoso'
import { useMediaList, useScanStatus } from '../hooks/useMedia.ts'
import TimelineGroup from '../components/Gallery/TimelineGroup.tsx'
import Lightbox from '../components/Lightbox/Lightbox.tsx'
import EmptyState from '../components/EmptyState.tsx'
import type { MediaItem } from '../types/media.ts'

interface MonthGroup {
  key: string
  year: number
  month: number
  items: MediaItem[]
}

function groupByMonth(items: MediaItem[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()
  for (const item of items) {
    const key = `${item.year}-${item.month}`
    let group = map.get(key)
    if (!group) {
      group = { key, year: item.year, month: item.month, items: [] }
      map.set(key, group)
    }
    group.items.push(item)
  }
  // Sort descending: newest month first
  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })
}

export default function TimelinePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const searchQuery = searchParams.get('q') || ''

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMediaList(searchQuery ? { q: searchQuery } : {})

  const { data: scanStatus } = useScanStatus()

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 800)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const allItems = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((p) => p.items ?? [])
  }, [data])

  const groups = useMemo(() => groupByMonth(allItems), [allItems])

  // Build a lookup from item id to its flat index in allItems
  const itemIndexMap = useMemo(() => {
    const map = new Map<number, number>()
    allItems.forEach((item, i) => map.set(item.id, i))
    return map
  }, [allItems])

  const handleItemClick = useCallback(
    (item: MediaItem, _index: number) => {
      const flatIndex = itemIndexMap.get(item.id)
      if (flatIndex != null) {
        setLightboxIndex(flatIndex)
      }
    },
    [itemIndexMap],
  )

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleClearSearch = () => {
    setSearchParams({})
  }

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    )
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={searchQuery ? '?' : '!'}
        title={searchQuery ? 'No results found' : 'No media found'}
        subtitle={
          searchQuery
            ? `No media matching "${searchQuery}".`
            : 'Run a scan to index your media library.'
        }
        action={
          searchQuery
            ? { label: 'Clear search', onClick: handleClearSearch }
            : undefined
        }
      />
    )
  }

  return (
    <div style={{ paddingTop: 'var(--nav-height)' }}>
      {/* Search banner */}
      {searchQuery && (
        <div
          style={{
            padding: '10px 20px',
            fontSize: 13,
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>
            Search results for <strong style={{ color: 'var(--text-primary)' }}>'{searchQuery}'</strong>
          </span>
          <button
            onClick={handleClearSearch}
            style={{
              padding: '3px 10px',
              fontSize: 11,
              background: 'var(--accent)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            Clear search
          </button>
        </div>
      )}

      {/* Scan status banner */}
      {scanStatus?.running && (
        <div
          style={{
            padding: '8px 20px',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#4ade80',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          Scanning... {scanStatus.files_indexed} indexed, {scanStatus.thumbs_pending} thumbnails pending
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
        </div>
      )}

      <Virtuoso
        useWindowScroll
        data={groups}
        endReached={handleEndReached}
        overscan={600}
        itemContent={(_index, group) => (
          <TimelineGroup
            key={group.key}
            year={group.year}
            month={group.month}
            items={group.items}
            onItemClick={handleItemClick}
          />
        )}
      />

      {isFetchingNextPage && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0 48px',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          Loading more...
        </div>
      )}

      {lightboxIndex != null && (
        <Lightbox
          items={allItems}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {showScrollTop && (
        <button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          style={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
            transition: 'opacity 0.2s ease',
            zIndex: 100,
          }}
        >
          &#8593;
        </button>
      )}
    </div>
  )
}
