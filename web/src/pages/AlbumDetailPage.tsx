import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAlbum, useAlbumItems, useUpdateAlbum, useDeleteAlbum } from '../hooks/useAlbums.ts'
import { useAuthStore } from '../stores/authStore.ts'
import MasonryGrid from '../components/Gallery/MasonryGrid.tsx'
import Lightbox from '../components/Lightbox/Lightbox.tsx'
import AlbumEditor from '../components/Albums/AlbumEditor.tsx'
import EmptyState from '../components/EmptyState.tsx'
import type { MediaItem } from '../types/media.ts'

export default function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const albumId = Number(id) || 0
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const { data: album, isLoading: albumLoading } = useAlbum(albumId)
  const [page, setPage] = useState(1)
  const { data: itemsData, isLoading: itemsLoading } = useAlbumItems(albumId, page, 200)

  const updateAlbum = useUpdateAlbum()
  const deleteAlbum = useDeleteAlbum()

  const [editorOpen, setEditorOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const items = useMemo(() => itemsData?.items ?? [], [itemsData])

  const canEdit = user && album && (user.id === album.created_by || user.role === 'admin')

  const handleItemClick = useCallback(
    (_item: MediaItem, index: number) => {
      setLightboxIndex(index)
    },
    [],
  )

  const handleSave = useCallback(
    (name: string, description: string) => {
      updateAlbum.mutate(
        { id: albumId, name, description },
        { onSuccess: () => setEditorOpen(false) },
      )
    },
    [updateAlbum, albumId],
  )

  const handleDelete = useCallback(() => {
    if (!window.confirm('Delete this album? Items will not be deleted.')) return
    deleteAlbum.mutate(albumId, {
      onSuccess: () => navigate('/albums'),
    })
  }, [deleteAlbum, albumId, navigate])

  if (albumLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          paddingTop: 'var(--nav-height)',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        Loading...
      </div>
    )
  }

  if (!album) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh',
          paddingTop: 'var(--nav-height)',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      >
        Album not found
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 'var(--nav-height)' }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 16px' }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/albums')}
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            padding: 0,
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          &#8592; Albums
        </button>

        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 300,
              letterSpacing: 2,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {album.name}
          </h1>

          {canEdit && (
            <>
              <button
                onClick={() => setEditorOpen(true)}
                title="Edit album"
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                  padding: '4px 6px',
                  lineHeight: 1,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                &#9998;
              </button>
              <button
                onClick={handleDelete}
                title="Delete album"
                style={{
                  fontSize: 14,
                  color: 'var(--text-muted)',
                  padding: '4px 6px',
                  lineHeight: 1,
                  transition: 'color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#e55'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}
              >
                &#10005;
              </button>
            </>
          )}
        </div>

        {/* Description */}
        {album.description && (
          <p
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              margin: '8px 0 0',
              lineHeight: 1.5,
            }}
          >
            {album.description}
          </p>
        )}

        {/* Item count */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginTop: 8,
          }}
        >
          {album.item_count} {album.item_count === 1 ? 'item' : 'items'}
        </div>
      </div>

      {/* Items grid */}
      {itemsLoading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 0',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Loading items...
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="This album is empty"
          subtitle="Add media to this album to see it here."
        />
      ) : (
        <>
          <MasonryGrid items={items} onItemClick={handleItemClick} />

          {/* Pagination */}
          {itemsData && itemsData.total_pages > 1 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 8,
                padding: '24px 0 48px',
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                  background: 'var(--accent)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                }}
              >
                Previous
              </button>
              <span
                style={{
                  padding: '8px 12px',
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                }}
              >
                {page} / {itemsData.total_pages}
              </span>
              <button
                disabled={page >= itemsData.total_pages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: '8px 16px',
                  fontSize: 13,
                  color: page >= itemsData.total_pages ? 'var(--text-muted)' : 'var(--text-primary)',
                  background: 'var(--accent)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  opacity: page >= itemsData.total_pages ? 0.5 : 1,
                  cursor: page >= itemsData.total_pages ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightboxIndex != null && (
        <Lightbox
          items={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Editor modal */}
      <AlbumEditor
        album={album}
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
