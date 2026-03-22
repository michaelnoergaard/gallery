import type { MediaItem } from '../../types/media.ts'
import MediaCard from './MediaCard.tsx'

interface MasonryGridProps {
  items: MediaItem[]
  onItemClick: (item: MediaItem, index: number) => void
}

const masonryStyle: React.CSSProperties = {
  columnCount: 5,
  columnGap: 'var(--grid-gap)',
  padding: '0 var(--grid-gap)',
}

const mediaQuery = `
@media (max-width: 1440px) { .masonry-grid { column-count: 4 !important; } }
@media (max-width: 1024px) { .masonry-grid { column-count: 3 !important; } }
@media (max-width: 640px)  { .masonry-grid { column-count: 2 !important; } }
`

export default function MasonryGrid({ items, onItemClick }: MasonryGridProps) {
  return (
    <>
      <style>{mediaQuery}</style>
      <div className="masonry-grid" style={masonryStyle}>
        {items.map((item, index) => (
          <MediaCard
            key={item.id}
            item={item}
            index={index}
            onClick={() => onItemClick(item, index)}
          />
        ))}
      </div>
    </>
  )
}
