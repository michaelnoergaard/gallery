import { useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFolders } from '../hooks/useFolders.ts'
import MasonryGrid from '../components/Gallery/MasonryGrid.tsx'
import Lightbox from '../components/Lightbox/Lightbox.tsx'
import EmptyState from '../components/EmptyState.tsx'
import type { MediaItem } from '../types/media.ts'

const monthNames = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function formatFolderName(name: string, parentPath: string): string {
  // If inside a year folder, format month number as month name
  if (parentPath && /^\d{4}$/.test(parentPath)) {
    const monthNum = parseInt(name, 10)
    if (monthNum >= 1 && monthNum <= 12) {
      return monthNames[monthNum]
    }
  }
  return name
}

function Breadcrumbs({
  path,
  onNavigate,
}: {
  path: string
  onNavigate: (path: string) => void
}) {
  const segments = path ? path.split('/') : []

  return (
    <nav style={breadcrumbNav}>
      <button
        onClick={() => onNavigate('')}
        style={{
          ...breadcrumbBtn,
          color: segments.length === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        Folders
      </button>
      {segments.map((seg, i) => {
        const segPath = segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        const parentPath = segments.slice(0, i).join('/')
        const label = formatFolderName(seg, parentPath)
        return (
          <span key={segPath} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={breadcrumbSep}>/</span>
            <button
              onClick={() => onNavigate(segPath)}
              style={{
                ...breadcrumbBtn,
                color: isLast ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {label}
            </button>
          </span>
        )
      })}
    </nav>
  )
}

function FolderCard({
  displayName,
  onClick,
}: {
  displayName: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} style={folderCardStyle}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
      <span style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 4 }}>
        {displayName}
      </span>
    </button>
  )
}

export default function FoldersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const path = searchParams.get('path') || ''
  const { data, isLoading } = useFolders(path)

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const navigate = useCallback(
    (newPath: string) => {
      if (newPath) {
        setSearchParams({ path: newPath })
      } else {
        setSearchParams({})
      }
      setLightboxIndex(null)
    },
    [setSearchParams],
  )

  const items: MediaItem[] = useMemo(() => data?.items ?? [], [data])

  const handleItemClick = useCallback((_item: MediaItem, index: number) => {
    setLightboxIndex(index)
  }, [])

  if (isLoading) {
    return (
      <div style={loadingStyle}>
        Loading...
      </div>
    )
  }

  const hasFolders = data?.folders && data.folders.length > 0
  const hasItems = items.length > 0

  return (
    <div style={{ paddingTop: 'var(--nav-height)' }}>
      <div style={headerStyle}>
        <Breadcrumbs path={path} onNavigate={navigate} />
        {data?.total_items ? (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {data.total_items} items
          </span>
        ) : null}
      </div>

      {hasFolders && (
        <div style={folderGridStyle}>
          {data!.folders.map((folder) => (
            <FolderCard
              key={folder.path}
              displayName={formatFolderName(folder.name, path)}
              onClick={() => navigate(folder.path)}
            />
          ))}
        </div>
      )}

      {hasItems && <MasonryGrid items={items} onItemClick={handleItemClick} />}

      {!hasFolders && !hasItems && (
        <EmptyState
          title="No files in this folder"
          subtitle="This folder does not contain any media."
        />
      )}

      {lightboxIndex != null && (
        <Lightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  )
}

// --- Styles ---

const breadcrumbNav: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: 2,
}

const breadcrumbBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '2px 4px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family)',
}

const breadcrumbSep: React.CSSProperties = {
  color: 'var(--text-muted)',
  fontSize: 12,
  margin: '0 2px',
  userSelect: 'none',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px 12px',
}

const folderGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  padding: '0 20px 20px',
}

const folderCardStyle: React.CSSProperties = {
  width: 120,
  height: 100,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#111',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
  padding: 8,
  fontFamily: 'var(--font-family)',
}

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '80vh',
  color: 'var(--text-muted)',
  fontSize: 13,
  paddingTop: 'var(--nav-height)',
}

