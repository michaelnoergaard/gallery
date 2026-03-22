import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore.ts'
import { useLogout } from '../../hooks/useAuth.ts'

export default function UserMenu() {
  const user = useAuthStore((s) => s.user)
  const logoutMutation = useLogout()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const initial = user?.username ? user.username.charAt(0).toUpperCase() : '?'
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.5px',
          cursor: 'pointer',
          transition: 'background 0.15s ease',
          border: open ? '1px solid var(--text-muted)' : '1px solid transparent',
        }}
      >
        {initial}
      </div>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 8,
            width: 200,
            background: '#111',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            zIndex: 90,
            overflow: 'hidden',
          }}
        >
          {/* User info */}
          <div style={{ padding: '14px 16px 10px' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: 4,
              }}
            >
              {user?.username ?? 'Unknown'}
            </div>
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 3,
                background: isAdmin ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)',
                color: isAdmin ? '#818cf8' : 'var(--text-muted)',
              }}
            >
              {user?.role ?? 'viewer'}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '0 12px' }} />

          {/* Menu items */}
          <div style={{ padding: '6px 0' }}>
            {isAdmin && (
              <div
                onClick={() => {
                  setOpen(false)
                  navigate('/admin')
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'background 0.1s ease, color 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--accent-hover)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                Admin
              </div>
            )}
            <div
              onClick={() => {
                setOpen(false)
                logoutMutation.mutate()
              }}
              style={{
                padding: '8px 16px',
                fontSize: 12,
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'background 0.1s ease, color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--accent-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }}
            >
              Logout
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
