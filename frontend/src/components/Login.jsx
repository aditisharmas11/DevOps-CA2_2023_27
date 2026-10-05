import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input, Label } from './ui/input';
import { Heart, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Footer from './Footer.jsx';

export default function Login() {
  const { setToken, setUsername } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const res = await api.post('/api/auth/login', form)
      setToken(res.data.token)
      setUsername(form.username)
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('username', form.username)
      setSuccess('Login successful! Redirecting...')
      setTimeout(() => navigate('/dashboard'), 500)
    } catch (err) {
      setError(err?.response?.data || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  function handleSocialLogin(provider) {
    // Placeholder for social login
    alert(`${provider} login will be implemented soon!`)
  }

  return (
    <div style={{ background: 'linear-gradient(to bottom, #fef3f2, #fdf2f8, #f3e8ff)', minHeight: '100vh' }}>
      <div style={{ padding: '20px 0' }}>
        <div className="container" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" style={{ marginRight: 4 }} />
              Back
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'linear-gradient(135deg, #ec4899, #9333ea)', padding: 8, borderRadius: 10, color: '#fff' }}>
                <Heart className="h-5 w-5" fill="currentColor" />
              </div>
              <span style={{ fontWeight: 800, fontSize: 20 }}>SoulMate</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 480, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1f2937', marginBottom: 8 }}>
            Welcome Back
          </h1>
          <p style={{ color: '#6b7280', fontSize: 16 }}>
            Sign in to continue your journey to find your soulmate
          </p>
        </div>

        <Card style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <CardHeader style={{ textAlign: 'center', paddingBottom: 8 }}>
            <CardTitle style={{ fontSize: 24 }}>Login to Your Account</CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 24 }}>
            {error && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ fontSize: 18 }}>✅</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={onSubmit} style={{ display: 'grid', gap: 20 }}>
              <div>
                <Label htmlFor="username" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Username
                </Label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Mail className="h-5 w-5" style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    zIndex: 1
                  }} />
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => {
                      setForm({ ...form, username: e.target.value })
                      setError('')
                    }}
                    placeholder="Enter your username"
                    required
                    style={{
                      width: '100%',
                      paddingLeft: 40,
                      height: 48,
                      fontSize: 16,
                      border: '2px solid #e5e7eb',
                      borderRadius: 10,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>
                  Password
                </Label>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Lock className="h-5 w-5" style={{ 
                    position: 'absolute', 
                    left: 12, 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    zIndex: 1
                  }} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => {
                      setForm({ ...form, password: e.target.value })
                      setError('')
                    }}
                    placeholder="Enter your password"
                    required
                    style={{
                      width: '100%',
                      paddingLeft: 40,
                      paddingRight: 48,
                      height: 48,
                      fontSize: 16,
                      border: '2px solid #e5e7eb',
                      borderRadius: 10,
                      boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" style={{ color: '#9ca3af' }} />
                    ) : (
                      <Eye className="h-5 w-5" style={{ color: '#9ca3af' }} />
                    )}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: 16, height: 16, cursor: 'pointer' }} />
                  <span style={{ fontSize: 14, color: '#6b7280' }}>Remember me</span>
                </label>
                <Link to="#" style={{ fontSize: 14, color: '#9333ea', textDecoration: 'none', fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 48,
                  background: 'linear-gradient(135deg, #ec4899, #9333ea)',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s',
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4)'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.transform = 'translateY(-2px)'
                    e.target.style.boxShadow = '0 6px 16px rgba(236, 72, 153, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 4px 12px rgba(236, 72, 153, 0.4)'
                }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ 
                      width: 16, 
                      height: 16, 
                      border: '2px solid #fff', 
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Signing in...
                  </span>
                ) : (
                  'Sign In'
                )}
              </Button>

              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
                <span style={{ color: '#9ca3af', fontSize: 14 }}>Or continue with</span>
                <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('Google')}
                  style={{
                    height: 48,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.background = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.background = '#fff'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin('Facebook')}
                  style={{
                    height: 48,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontWeight: 600,
                    transition: 'all 0.3s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#d1d5db'
                    e.target.style.background = '#f9fafb'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb'
                    e.target.style.background = '#fff'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </Button>
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center', paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
              <p style={{ color: '#6b7280', fontSize: 14 }}>
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  style={{ 
                    color: '#9333ea', 
                    textDecoration: 'none', 
                    fontWeight: 700,
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#7c3aed'}
                  onMouseLeave={(e) => e.target.style.color = '#9333ea'}
                >
                  Sign up now
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators */}
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>Secure Login</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>Privacy Protected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, background: '#9333ea', borderRadius: '50%' }} />
              <span style={{ fontSize: 13, color: '#6b7280' }}>Trusted Platform</span>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
