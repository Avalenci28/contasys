import './Skeleton.css'

export function SkeletonLine({ width = '100%', height = 16, borderRadius = 8 }) {
  return <div className="skeleton" style={{ width, height, borderRadius }} />
}

export function SkeletonCard() {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14,
      padding: 16, boxShadow: 'var(--shadow)' }}>
      <SkeletonLine width="40%" height={12} />
      <div style={{ marginTop: 10 }}>
        <SkeletonLine width="60%" height={28} />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 12, padding: '12px 16px',
          borderBottom: '1px solid var(--border-color)' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonLine key={j} height={14}
              width={j === 0 ? '70%' : j === cols-1 ? '40%' : '85%'} />
          ))}
        </div>
      ))}
    </div>
  )
}

