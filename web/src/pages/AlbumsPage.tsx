import { useState, useCallback } from 'react'
import { useAlbums, useCreateAlbum } from '../hooks/useAlbums.ts'
import AlbumGrid from '../components/Albums/AlbumGrid.tsx'
import AlbumEditor from '../components/Albums/AlbumEditor.tsx'
import EmptyState from '../components/EmptyState.tsx'

export default function AlbumsPage() {
  const { data: albums, isLoading } = useAlbums()
  const createAlbum = useCreateAlbum()
  const [editorOpen, setEditorOpen] = useState(false)

  const handleSave = useCallback(
    (name: string, description: string) => {
      createAlbum.mutate(
        { name, description },
        { onSuccess: () => setEditorOpen(false) },
      )
    },
    [createAlbum],
  )

  if (isLoading) {
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

  return (
    <div style={{ paddingTop: 'var(--nav-height)' }}>
      <h1
        style={{
          fontSize: 22,
          fontWeight: 300,
          letterSpacing: 2,
          color: 'var(--text-primary)',
          padding: '28px 20px 20px',
          margin: 0,
        }}
      >
        Albums
      </h1>

      {(albums ?? []).length === 0 ? (
        <EmptyState
          icon="+"
          title="No albums yet"
          subtitle="Create your first album to organize your media."
          action={{ label: 'Create Album', onClick: () => setEditorOpen(true) }}
        />
      ) : (
        <AlbumGrid albums={albums ?? []} onNewAlbum={() => setEditorOpen(true)} />
      )}

      <AlbumEditor
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
