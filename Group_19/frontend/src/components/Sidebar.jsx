import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme, themes } from '../context/ThemeContext'
import { useDiseaseJob } from '../context/DiseaseJobContext'
import {
  Activity, LayoutDashboard, TrendingUp, Brain, Pill,
  Clock, FileText, Bell, Settings, LogOut, ChevronRight,
  Stethoscope, Search, UserCheck, ShieldCheck, Users, Loader2, CheckCircle2, X
} from 'lucide-react'

const PATIENT_NAV = [
  {
    label: 'Modules',
    items: [
      { icon: LayoutDashboard, label: 'Overview',         path: '/dashboard' },
      { icon: TrendingUp,      label: 'Future Risk',      path: '/health' },
      { icon: Brain,           label: 'Disease Predict',  path: '/disease' },
      { icon: Pill,            label: 'Treatment',        path: '/treatment' },
      { icon: Search,          label: 'Find a Doctor',    path: '/find-doctor' },
    ]
  },
  {
    label: 'Analytics',
    items: [
      { icon: Clock,    label: 'Health Timeline', path: '/timeline' },
      { icon: FileText, label: 'Reports',         path: '/reports' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: Bell,     label: 'Alerts',   path: '/alerts',   badge: null },
      { icon: Settings, label: 'Settings', path: '/profile' },
    ]
  },
]

const DOCTOR_NAV = [
  {
    label: 'Clinical Portal',
    items: [
      { icon: Stethoscope, label: 'Doctor Workspace', path: '/doctor' },
      { icon: FileText,    label: 'Clinical Reports', path: '/reports' },
      { icon: Bell,        label: 'Alerts Monitor',   path: '/alerts' },
    ]
  },
  {
    label: 'Account',
    items: [
      { icon: Settings, label: 'Doctor Profile', path: '/profile' },
    ]
  },
]

const ADMIN_NAV = [
  {
    label: 'Governance & Access',
    items: [
      { icon: ShieldCheck, label: 'Admin Dashboard',  path: '/admin' },
      { icon: Stethoscope, label: 'Doctor Approvals', path: '/admin' },
      { icon: Users,       label: 'Patient Registry', path: '/admin' },
    ]
  },
  {
    label: 'Account',
    items: [
      { icon: Settings,    label: 'Admin Profile',    path: '/profile' },
    ]
  },
]

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth()
  const { themeKey, setThemeKey } = useTheme()
  const { job } = useDiseaseJob()
  const location = useLocation()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'
  const isDoctor = user?.role === 'doctor'
  const navSections = isAdmin ? ADMIN_NAV : isDoctor ? DOCTOR_NAV : PATIENT_NAV

  const age = user?.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: isAdmin
                ? 'linear-gradient(135deg, #7c3aed, #4f46e5)'
                : isDoctor
                  ? 'linear-gradient(135deg, #059669, #0d9488)'
                  : 'linear-gradient(135deg, #2563eb, #4f46e5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {isAdmin ? <ShieldCheck size={18} color="white" /> : isDoctor ? <Stethoscope size={18} color="white" /> : <Activity size={17} color="white" />}
            </div>
            <div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 15, color: 'white', letterSpacing: '-0.3px' }}>
                MediTwin {isAdmin ? (
                  <span style={{ fontSize: 9, background: 'rgba(124,58,237,0.35)', padding: '1px 5px', borderRadius: 4, color: '#c4b5fd', fontWeight: 800 }}>ADMIN</span>
                ) : isDoctor ? (
                  <span style={{ fontSize: 9, background: 'rgba(5,150,105,0.3)', padding: '1px 5px', borderRadius: 4, color: '#86efac', fontWeight: 700 }}>CLINICIAN</span>
                ) : null}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                {isAdmin ? 'System Governance' : isDoctor ? 'Doctor Workspace' : 'Health Intelligence'}
              </div>
            </div>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close Menu">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navSections.map(section => (
          <div key={section.label}>
            <div className="nav-section-label">{section.label}</div>
            {section.items.map(({ icon: Icon, label, path, badge }) => {
              const active = location.pathname === path
              return (
                <Link key={label} to={path} onClick={onClose} style={{ textDecoration: 'none' }}>
                  <div className={`nav-item ${active ? 'active' : ''}`}>
                    <Icon size={15} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{label}</span>
                    {badge && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: '#ef4444', color: 'white', borderRadius: 99, padding: '1px 5px' }}>{badge}</span>
                    )}
                    {active && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
                  </div>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* User card at bottom */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: isAdmin ? '#7c3aed' : isDoctor ? '#059669' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'white', flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isDoctor ? (user.name.startsWith('Dr.') ? user.name : `Dr. ${user.name}`) : user?.name || 'User'}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
              {isAdmin ? (user.adminId || 'ADMIN') : isDoctor ? (user.doctorId || 'DOCTOR') : (user.patientId || 'PATIENT')}
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            title="Sign out"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 4, borderRadius: 5 }}
          >
            <LogOut size={13} />
          </button>
        </div>

        {/* Theme dot picker */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>
          <span>Theme</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {Object.entries(themes).map(([k, t]) => (
              <button
                key={k}
                title={t.name}
                onClick={() => setThemeKey(k)}
                className={`theme-dot ${themeKey === k ? 'active' : ''}`}
                style={{ background: t.dot }}
              />
            ))}
          </div>
        </div>

        {/* Background prediction indicator */}
        {job && (job.status === 'running' || job.status === 'done') && (
          <Link to="/disease" style={{ textDecoration: 'none' }}>
            <div style={{
              marginTop: 8, padding: '7px 10px', borderRadius: 7,
              background: job.status === 'running' ? 'rgba(2,132,199,0.15)' : 'rgba(5,150,105,0.15)',
              border: `1px solid ${job.status === 'running' ? 'rgba(2,132,199,0.3)' : 'rgba(5,150,105,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer'
            }}>
              {job.status === 'running'
                ? <Loader2 size={12} className="spin" style={{ color: 'var(--m2-accent)', flexShrink: 0 }} />
                : <CheckCircle2 size={12} style={{ color: '#34d399', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: job.status === 'running' ? 'rgba(56,189,248,0.9)' : 'rgba(52,211,153,0.9)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {job.status === 'running' ? 'AI Prediction Running…' : 'Prediction Complete!'}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {job.status === 'running' ? 'Click to view Disease page' : 'View results →'}
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  )
}
