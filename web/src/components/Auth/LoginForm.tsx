import { type CSSProperties, type FormEvent, useState } from 'react'
import { useLogin } from '../../hooks/useAuth.ts'
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
    maxWidth: 380,
    padding: '48px 36px',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
  } satisfies CSSProperties,
  title: {
    fontSize: 20,
    fontWeight: 300,
    letterSpacing: 6,
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    color: 'var(--text-primary)',
    margin: '0 0 36px 0',
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

export default function LoginForm() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [hovered, setHovered] = useState(false)
  const login = useLogin()
  const navigate = useNavigate()

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(
      { username, password },
      { onSuccess: () => navigate('/') },
    )
  }

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Gallery</h1>

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
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={login.isPending}
          style={{
            ...styles.button,
            ...(hovered ? styles.buttonHover : {}),
            opacity: login.isPending ? 0.6 : 1,
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {login.isPending ? 'Signing in...' : 'Sign In'}
        </button>

        {login.isError && (
          <p style={styles.error}>
            {login.error instanceof Error
              ? login.error.message
              : 'Login failed'}
          </p>
        )}
      </form>
    </div>
  )
}
