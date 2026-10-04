import { useAuth } from '../context/AuthContext'
import { useTheme, themes } from '../context/ThemeContext'
import { User, Mail, Calendar, Shield, Palette } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAuth()
  const { themeKey, setThemeKey } = useTheme()

  const age = user?.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Profile & Settings</h2>
      </div>
      <div className="page-container" style={{ maxWidth: 720 }}>

        {/* Patient Info */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-brand), var(--color-brand-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: 'white' }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--color-brand)', fontFamily: 'JetBrains Mono', marginTop: 2 }}>{user?.patientId}</div>
              <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
                Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
              </div>
            </div>
          </div>

          <div className="profile-info-grid">
            {[
              { icon: Mail,     label: 'Email',        val: user?.email },
              { icon: Shield,   label: user?.role === 'doctor' ? 'Doctor ID' : 'Patient ID', val: user?.role === 'doctor' ? user?.doctorId : user?.patientId, mono: true },
              { icon: User,     label: user?.role === 'doctor' ? 'Clinical Role' : 'Gender', val: user?.role === 'doctor' ? (user?.specialization || 'Doctor') : (user?.gender || '—') },
              { icon: Calendar, label: user?.role === 'doctor' ? 'Specialization' : 'Age', val: user?.role === 'doctor' ? (user?.specialization || 'General Medicine') : (age ? `${age} years` : '—') },
            ].map(({ icon: Icon, label, val, mono }) => (
              <div key={label} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, color: 'var(--color-muted)', fontSize: 11 }}>
                  <Icon size={13} /> {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, fontFamily: mono ? 'JetBrains Mono' : 'inherit', color: mono ? 'var(--color-brand)' : 'var(--color-text)' }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theme picker */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Palette size={16} style={{ color: 'var(--color-brand)' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Interface Theme</h3>
          </div>
          <div className="profile-themes-grid">
            {Object.entries(themes).map(([key, theme]) => (
              <div key={key} onClick={() => setThemeKey(key)} style={{
                padding: '12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                border: `2px solid ${themeKey === key ? theme['--color-brand'] : 'var(--color-border)'}`,
                background: themeKey === key ? `${theme['--color-brand']}10` : 'var(--color-surface-2)',
                transition: 'all 0.2s',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: theme['--color-brand'], margin: '0 auto 8px', boxShadow: themeKey === key ? `0 0 14px ${theme['--color-brand']}` : 'none' }} />
                <div style={{ fontSize: 11, fontWeight: 600, color: themeKey === key ? theme['--color-brand'] : 'var(--color-muted)' }}>{theme.name}</div>
                <div style={{ fontSize: 16 }}>{theme.emoji}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
