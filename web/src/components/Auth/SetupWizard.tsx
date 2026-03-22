import { type CSSProperties, type FormEvent, useState } from 'react'
import { useSetup } from '../../hooks/useAuth.ts'
import { useNavigate } from 'react-router-dom'

const styles = {
  wrapper: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-primary)',
  } satisfies CSSProperties,
  card: {
    width: '100%',
    maxWidth: 400,
    padding: '48px 36px',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  } satisfies CSSProperties,
  title: {
    fontSize: 22,
    fontWeight: 300,
    textAlign: 'center' as const,
    color: 'var(--text-primary)',
    margin: '0 0 8px 0',
  } satisfies CSSProperties,
  subtitle: {
    fontSize: 13,
    textAlign: 'center' as const,
    color: 'var(--text-secondary)',
    margin: '0 0 32px 0',
  } satisfies CSSProperties,
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    marginBottom: 20,
  } satisfies CSSProperties,
  label: {
    fontSize: 12,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  } satisfies CSSProperties,
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: 14,
    background: 'var(--accent)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
    transition: 'border-color 0.2s',
  } satisfies CSSProperties,
  hint: {
    fontSize: 11,
    color: 'var(--text-muted)',
    marginTop: 2,
  } satisfies CSSProperties,
  button: {
    width: '100%',
    padding: '12px 0',
    marginTop: 8,
    fontSize: 14,
    fontWeight: 500,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    color: 'var(--text-primary)',
    background: 'var(--accent-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  } satisfies CSSProperties,
  buttonHover: {
    background: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'var(--text-muted)',
  } satisfies CSSProperties,
  error: {
    marginTop: 16,
    fontSize: 13,
    color: '#e55',
    textAlign: 'center' as const,
  } satisfies CSSProperties,
}

export default function SetupWizard() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clientError, setClientError] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const setup = useSetup()
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setClientError(null)

    if (password.length < 8) {
      setClientError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setClientError('Passwords do not match')
      return
    }

    setup.mutate(
      { username, password },
      { onSuccess: () => navigate('/') },
    )
  }

  const displayError =
    clientError ??
    (setup.isError
      ? setup.error instanceof Error
        ? setup.error.message
        : 'Setup failed'
      : null)

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Welcome to Gallery</h1>
        <p style={styles.subtitle}>
          Create your admin account to get started
        </p>

        <div style={styles.field}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <span style={styles.hint}>Minimum 8 characters</span>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Confirm Password</label>
          <input
            style={styles.input}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={setup.isPending}
          style={{
            ...styles.button,
            ...(hovered ? styles.buttonHover : {}),
            opacity: setup.isPending ? 0.6 : 1,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {setup.isPending ? 'Creating...' : 'Create Account'}
        </button>

        {displayError && <p style={styles.error}>{displayError}</p>}
      </form>
    </div>
  )
}
