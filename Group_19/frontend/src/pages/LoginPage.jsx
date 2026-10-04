import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleAuthButton from '../components/GoogleAuthButton'
import {
  Activity, Mail, Lock, Loader2, AlertCircle, Heart,
  Shield, TrendingUp, ShieldCheck
} from 'lucide-react'

export default function LoginPage() {
  const { login, googleAuth } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSuccessfulAuth = (user) => {
    if (user?.role === 'admin') {
      navigate('/admin')
    } else if (user?.role === 'doctor') {
      if (user?.verificationStatus === 'verified') {
        navigate('/doctor')
      } else {
        navigate('/doctor-status')
      }
    } else {
      navigate('/dashboard')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const user = await login(form.email, form.password)
      handleSuccessfulAuth(user)
    } catch (err) {
      const data = err.response?.data
      setError(data?.message || 'Sign in failed. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential) => {
    setError('')
    setLoading(true)
    try {
      const user = await googleAuth(credential, 'patient')
      handleSuccessfulAuth(user)
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      {/* Left panel */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 380 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <Activity size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>MediTwin</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Personalized Health Intelligence</div>
            </div>
          </div>

          <h1 style={{ fontSize: 32, fontWeight: 800, fontFamily: 'Outfit', lineHeight: 1.2, marginBottom: 16 }}>
            Your AI Health<br />Intelligence Portal
          </h1>
          <p style={{ fontSize: 15, opacity: 0.8, lineHeight: 1.6, marginBottom: 36 }}>
            Multi-tier clinical decision support system bridging electronic health records, AI disease reasoning, and verified physician workflows.
          </p>

          {/* Feature pills */}
          {[
            { icon: TrendingUp,  text: 'Module 1: 90-Day Acute Risk XGBoost Engine' },
            { icon: Heart,       text: 'Module 2: 49-Pathology Differential Diagnosis' },
            { icon: Shield,      text: 'Module 3: Multimodal Clinical Decision Support' },
            { icon: ShieldCheck, text: '3-Tier Role Access: Patient · Doctor · Admin' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={14} color="white" />
              </div>
              <span style={{ fontSize: 12, opacity: 0.9 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right fade-in">
        <div style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit', marginBottom: 6 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 24 }}>
            Sign in to your MediTwin account
          </p>

          {error && (
            <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 9, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 9 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-in Option */}
          <div style={{ marginBottom: 18 }}>
            <GoogleAuthButton
              onGoogleSuccess={handleGoogleSuccess}
              onError={setError}
              role="patient"
              label="Sign in with Google"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', color: 'var(--muted)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>or sign in with email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  id="login-email"
                  type="email"
                  required
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="your@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-2)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input
                  id="login-password"
                  type="password"
                  required
                  className="input"
                  style={{ paddingLeft: 36 }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
            >
              {loading ? <><Loader2 size={16} className="spin" /> Signing in...</> : 'Sign in to MediTwin'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
