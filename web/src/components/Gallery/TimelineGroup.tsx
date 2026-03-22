import type { MediaItem } from '../../types/media.ts'
import MasonryGrid from './MasonryGrid.tsx'

interface TimelineGroupProps {
  year: number
  month: number
  items: MediaItem[]
  onItemClick: (item: MediaItem, index: number) => void
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export default function TimelineGroup({
  year,
  month,
  items,
  onItemClick,
}: TimelineGroupProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 10,
          padding: '20px var(--grid-gap) 12px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 200,
            color: 'var(--text-primary)',
            letterSpacing: '0.5px',
          }}
        >
          {MONTH_NAMES[month]} {year}
        </h2>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            fontWeight: 400,
          }}
        >
          {items.length}
        </span>
      </div>
      <MasonryGrid items={items} onItemClick={onItemClick} />
    </section>
  )
}
