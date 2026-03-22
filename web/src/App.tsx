import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSetupStatus } from './hooks/useAuth.ts'
import { useAuthStore } from './stores/authStore.ts'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import NavBar from './components/Layout/NavBar.tsx'
import TimelinePage from './pages/TimelinePage.tsx'
import AlbumsPage from './pages/AlbumsPage.tsx'
import AlbumDetailPage from './pages/AlbumDetailPage.tsx'
import FoldersPage from './pages/FoldersPage.tsx'
import AdminPage from './pages/AdminPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import SetupPage from './pages/SetupPage.tsx'

function AppRoutes() {
  const { data, isLoading } = useSetupStatus()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          color: 'var(--text-muted)',
          fontSize: 14,
        }}
      />
    )
  }

  const needsSetup = data?.needs_setup === true

  if (needsSetup) {
    if (location.pathname !== '/setup') {
      return <Navigate to="/setup" replace />
    }
    return (
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    )
  }

  if (!isAuthenticated) {
    if (location.pathname !== '/login') {
      return <Navigate to="/login" replace />
    }
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <div>
      <NavBar />
      <Routes>
        <Route path="/" element={<TimelinePage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/albums/:id" element={<AlbumDetailPage />} />
        <Route path="/folders" element={<FoldersPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/setup" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppRoutes />
    </ErrorBoundary>
  )
}
