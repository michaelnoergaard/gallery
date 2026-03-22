import { useState, type CSSProperties, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore.ts'
import { useAdminStats, useAdminUsers, useCreateUser, useDeleteUser } from '../hooks/useAdmin.ts'
import { useScanStatus, useTriggerScan } from '../hooks/useMedia.ts'
import type { AdminStats } from '../hooks/useAdmin.ts'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

// -- Styles --

const styles = {
  page: {
    padding: '32px 40px',
    maxWidth: 960,
    margin: '0 auto',
  } satisfies CSSProperties,

  heading: {
    fontSize: 20,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 20,
    marginTop: 40,
  } satisfies CSSProperties,

  pageTitle: {
    fontSize: 24,
    fontWeight: 500,
    color: 'var(--text-primary)',
    marginBottom: 8,
    marginTop: 0,
  } satisfies CSSProperties,

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  } satisfies CSSProperties,

  statCard: {
    background: '#111',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 16px',
    textAlign: 'center' as const,
  } satisfies CSSProperties,

  statNumber: {
    fontSize: 28,
    fontWeight: 600,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  } satisfies CSSProperties,

  statLabel: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginTop: 6,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } satisfies CSSProperties,

  btn: {
    padding: '8px 16px',
    fontSize: 13,
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-primary)',
    border: 'none',
    cursor: 'pointer',
  } satisfies CSSProperties,

  btnDanger: {
    padding: '6px 12px',
    fontSize: 12,
    borderRadius: 'var(--radius-md)',
    background: 'rgba(255,255,255,0.06)',
    color: '#c44',
    border: 'none',
    cursor: 'pointer',
  } satisfies CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 14,
  } satisfies CSSProperties,

  th: {
    textAlign: 'left' as const,
    padding: '10px 12px',
    color: 'var(--text-secondary)',
    fontWeight: 400,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid #1a1a1a',
  } satisfies CSSProperties,

  td: {
    padding: '12px',
    borderBottom: '1px solid #1a1a1a',
    color: 'var(--text-primary)',
  } satisfies CSSProperties,

  formOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  } satisfies CSSProperties,

  formBox: {
    background: '#111',
    borderRadius: 'var(--radius-lg)',
    padding: '28px 24px',
    width: 360,
    maxWidth: '90vw',
  } satisfies CSSProperties,

  formTitle: {
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 20,
    marginTop: 0,
    color: 'var(--text-primary)',
  } satisfies CSSProperties,

  inputGroup: {
    marginBottom: 14,
  } satisfies CSSProperties,

  label: {
    display: 'block',
    fontSize: 12,
    color: 'var(--text-secondary)',
    marginBottom: 6,
  } satisfies CSSProperties,

  input: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    background: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
  } satisfies CSSProperties,

  select: {
    width: '100%',
    padding: '8px 12px',
    fontSize: 14,
    background: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
    appearance: 'auto' as const,
  } satisfies CSSProperties,

  formActions: {
    display: 'flex',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 20,
  } satisfies CSSProperties,

  scanSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap' as const,
  } satisfies CSSProperties,

  scanInfo: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  } satisfies CSSProperties,

  error: {
    fontSize: 13,
    color: '#c44',
    marginTop: 8,
  } satisfies CSSProperties,

  badge: {
    display: 'inline-block',
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-secondary)',
  } satisfies CSSProperties,
}

// -- Stat Cards --

function StatCard({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statNumber}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  )
}

function StatsSection({ stats }: { stats: AdminStats }) {
  return (
    <div style={styles.statsGrid}>
      <StatCard value={stats.total_media.toLocaleString()} label="Total Media" />
      <StatCard value={stats.total_images.toLocaleString()} label="Images" />
      <StatCard value={stats.total_videos.toLocaleString()} label="Videos" />
      <StatCard value={stats.total_albums.toLocaleString()} label="Albums" />
      <StatCard value={stats.total_users.toLocaleString()} label="Users" />
      <StatCard value={formatBytes(stats.total_size_bytes)} label="Storage Used" />
      {stats.thumbs_pending > 0 && (
        <StatCard value={stats.thumbs_pending.toLocaleString()} label="Thumbs Pending" />
      )}
    </div>
  )
}

// -- Scan Control --

function ScanSection() {
  const { data: scanStatus } = useScanStatus()
  const triggerScan = useTriggerScan()

  return (
    <div style={styles.scanSection}>
      <button
        style={{
          ...styles.btn,
          opacity: scanStatus?.running ? 0.5 : 1,
        }}
        disabled={scanStatus?.running}
        onClick={() => triggerScan.mutate()}
        onMouseEnter={(e) => {
          if (!scanStatus?.running) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        }}
      >
        {scanStatus?.running ? 'Scanning...' : 'Trigger Scan'}
      </button>
      {scanStatus?.running && (
        <span style={styles.scanInfo}>
          Found {scanStatus.files_found} / Indexed {scanStatus.files_indexed} / Skipped{' '}
          {scanStatus.files_skipped}
        </span>
      )}
    </div>
  )
}

// -- Create User Modal --

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const createUser = useCreateUser()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    createUser.mutate(
      { username, password, role },
      {
        onSuccess: () => onClose(),
      },
    )
  }

  return (
    <div style={styles.formOverlay} onClick={onClose}>
      <form
        style={styles.formBox}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 style={styles.formTitle}>Create User</h3>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            required
            autoFocus
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Role</label>
          <select
            style={styles.select}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="viewer">Viewer</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {createUser.isError && (
          <div style={styles.error}>
            {(createUser.error as Error).message || 'Failed to create user'}
          </div>
        )}

        <div style={styles.formActions}>
          <button
            type="button"
            style={styles.btn}
            onClick={onClose}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ ...styles.btn, opacity: createUser.isPending ? 0.5 : 1 }}
            disabled={createUser.isPending}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            {createUser.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}

// -- User Table --

function UsersSection() {
  const { data: users } = useAdminUsers()
  const deleteUser = useDeleteUser()
  const currentUser = useAuthStore((s) => s.user)
  const [showCreate, setShowCreate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  function handleDelete(id: number) {
    deleteUser.mutate(id, {
      onSuccess: () => setConfirmDelete(null),
    })
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={styles.heading}>Users</h2>
        <button
          style={styles.btn}
          onClick={() => setShowCreate(true)}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
        >
          Create User
        </button>
      </div>

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Username</th>
            <th style={styles.th}>Role</th>
            <th style={styles.th}>Created</th>
            <th style={{ ...styles.th, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((u) => (
            <tr key={u.id}>
              <td style={styles.td}>{u.username}</td>
              <td style={styles.td}>
                <span style={styles.badge}>{u.role}</span>
              </td>
              <td style={{ ...styles.td, color: 'var(--text-secondary)' }}>
                {formatDate(u.created_at)}
              </td>
              <td style={{ ...styles.td, textAlign: 'right' }}>
                {confirmDelete === u.id ? (
                  <span style={{ fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)', marginRight: 8 }}>
                      Are you sure?
                    </span>
                    <button
                      style={{ ...styles.btnDanger, marginRight: 4 }}
                      onClick={() => handleDelete(u.id)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                      }
                    >
                      Yes
                    </button>
                    <button
                      style={styles.btn}
                      onClick={() => setConfirmDelete(null)}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                      }
                    >
                      No
                    </button>
                  </span>
                ) : currentUser?.id !== u.id ? (
                  <button
                    style={styles.btnDanger}
                    onClick={() => setConfirmDelete(u.id)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                    }
                  >
                    Delete
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showCreate && <CreateUserForm onClose={() => setShowCreate(false)} />}
    </>
  )
}

// -- Main Page --

export default function AdminPage() {
  const user = useAuthStore((s) => s.user)
  const { data: stats, isLoading } = useAdminStats()

  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>Admin</h1>

      <h2 style={{ ...styles.heading, marginTop: 8 }}>System Stats</h2>
      {isLoading ? (
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
      ) : stats ? (
        <StatsSection stats={stats} />
      ) : null}

      <h2 style={styles.heading}>Library Scan</h2>
      <ScanSection />

      <UsersSection />
    </div>
  )
}
