import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import SearchBar from './SearchBar.tsx'
import UserMenu from './UserMenu.tsx'

const NAV_LINKS = [
  { to: '/', label: 'TIMELINE' },
  { to: '/albums', label: 'ALBUMS' },
  { to: '/folders', label: 'FOLDERS' },
]

export default function NavBar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--nav-height)',
          background: '#0a0a0a',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          zIndex: 100,
          gap: 32,
        }}
      >
        {/* Logo */}
        <span
          style={{
            fontSize: 14,
            fontWeight: 300,
            letterSpacing: 3,
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            marginRight: 8,
            flexShrink: 0,
          }}
        >
          GALLERY
        </span>

        {/* Nav links - desktop */}
        <div className="nav-links-desktop" style={{ display: 'flex', gap: 24 }}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: isActive ? 'var(--text-primary)' : '#666',
                textDecoration: 'none',
                paddingBottom: 4,
                borderBottom: isActive
                  ? '2px solid white'
                  : '2px solid transparent',
                transition: 'color 0.15s ease, border-color 0.15s ease',
              })}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search - desktop */}
        <div className="nav-search-desktop">
          <SearchBar />
        </div>

        {/* User menu */}
        <UserMenu />

        {/* Hamburger - mobile */}
        <div
          className="nav-hamburger"
          onClick={() => setMobileMenuOpen((o) => !o)}
          style={{
            display: 'none',
            flexDirection: 'column',
            gap: 4,
            cursor: 'pointer',
            padding: 4,
            marginLeft: 8,
          }}
        >
          <span style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 1 }} />
          <span style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 1 }} />
          <span style={{ width: 18, height: 2, background: 'var(--text-secondary)', borderRadius: 1 }} />
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            position: 'fixed',
            top: 'var(--nav-height)',
            left: 0,
            right: 0,
            background: '#0a0a0a',
            borderBottom: '1px solid var(--border)',
            zIndex: 99,
            padding: '12px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileMenuOpen(false)}
              style={({ isActive }) => ({
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: isActive ? 'var(--text-primary)' : '#666',
                textDecoration: 'none',
                padding: '6px 0',
                transition: 'color 0.15s ease',
              })}
            >
              {label}
            </NavLink>
          ))}
          <div style={{ paddingTop: 4 }}>
            <SearchBar />
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-search-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
        }
      `}</style>
    </>
  )
}
