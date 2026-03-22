interface EmptyStateProps {
  icon?: string
  title: string
  subtitle?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '40px 20px',
        textAlign: 'center',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: 36,
            opacity: 0.25,
            marginBottom: 12,
            userSelect: 'none',
          }}
        >
          {icon}
        </div>
      )}
      <div
        style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          fontWeight: 400,
          marginBottom: subtitle ? 6 : 0,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            maxWidth: 320,
          }}
        >
          {subtitle}
        </div>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 16,
            padding: '7px 16px',
            fontSize: 12,
            background: 'var(--accent)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--accent-hover)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--accent)'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
