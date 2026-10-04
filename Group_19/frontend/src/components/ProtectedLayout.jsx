import { useState, useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import { Menu, X, Activity, ShieldCheck, Stethoscope } from 'lucide-react'

export default function ProtectedLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Automatically close mobile sidebar drawer on route navigation
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading MediTwin...</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  // Force pending/rejected doctors to the status page (only when not already on /doctor-status)
  if (
    user.role === 'doctor' &&
    user.verificationStatus !== 'verified' &&
    location.pathname !== '/doctor-status' &&
    location.pathname !== '/profile'
  ) {
    return <Navigate to="/doctor-status" replace />
  }

  const isAdmin = user.role === 'admin'
  const isDoctor = user.role === 'doctor'

  return (
    <div className="app-layout">
      {/* ── Mobile Top Header (Visible on <= 1024px) ────────────────── */}
      <header className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileNavOpen(prev => !prev)}
          aria-label={mobileNavOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="mobile-brand">
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: isAdmin
              ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
              : isDoctor
                ? 'linear-gradient(135deg, #059669, #0d9488)'
                : 'linear-gradient(135deg, #2563eb, #4f46e5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {isAdmin ? <ShieldCheck size={16} color="white" /> : isDoctor ? <Stethoscope size={16} color="white" /> : <Activity size={16} color="white" />}
          </div>
          <span className="mobile-brand-name">
            MediTwin
          </span>
          {isAdmin ? (
            <span style={{ fontSize: 9, background: 'rgba(124,58,237,0.35)', padding: '1px 5px', borderRadius: 4, color: '#c4b5fd', fontWeight: 800 }}>ADMIN</span>
          ) : isDoctor ? (
            <span style={{ fontSize: 9, background: 'rgba(5,150,105,0.3)', padding: '1px 5px', borderRadius: 4, color: '#86efac', fontWeight: 700 }}>DOCTOR</span>
          ) : null}
        </div>

        <div className="mobile-user-avatar">
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
      </header>

      {/* ── Mobile Drawer Backdrop Overlay ──────────────────────────── */}
      <div
        className={`sidebar-backdrop ${mobileNavOpen ? 'active' : ''}`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar Component ────────────────────────────────────────── */}
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      {/* ── Main Scrollable Page Content ─────────────────────────────── */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}
