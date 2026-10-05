import { useState } from 'react'
import {  useLocation } from 'react-router-dom'
import api from '../api/client'
import { useRouter } from '../hooks/useRouter'
import { useAuth } from '../auth/AuthContext.jsx'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { Label, Input, Textarea } from '../components/ui/input'
import Footer from '../components/Footer.jsx'

export default function Register() {
  const { navigate } = useRouter()
  const { setToken, setUsername } = useAuth()
  const location = useLocation()
  const isStep2 = location.pathname.endsWith('/step2')
  const isStep3 = location.pathname.endsWith('/step3')

  const [form, setForm] = useState({
    username: '', email: '', phone: '', password: '',
    firstName: '', surname: '', gender: 'Male', dob: '', age: ''
  })
  const [step2, setStep2] = useState({
    maritalStatus: 'Single', city: '', country: '', education: '', occupation: '', annualIncome: ''
  })
  const [step3, setStep3] = useState({
    aboutMe: '', hobbies: '', faith: '', caste: '', foodHabits: '', partnerPreferences: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStep1(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...form,
        dob: form.dob ? form.dob : null,
        age: form.age ? Number(form.age) : null,
      }
      await api.post('/api/auth/register', payload)
      // Auto-login after registration to get token for profile steps
      try {
        const loginRes = await api.post('/api/auth/login', {
          username: form.username,
          password: form.password
        })
        const token = loginRes.data.token
        setToken(token)
        setUsername(form.username)
        localStorage.setItem('token', token)
        localStorage.setItem('username', form.username)
        navigate('/register/step2')
      } catch (loginErr) {
        setError('Registration successful but auto-login failed. Please login manually.')
        navigate('/login')
      }
    } catch (err) {
      setError(err?.response?.data || 'Registration failed')
    } finally { setLoading(false) }
  }

  async function handleStep2(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/profile/step2', step2)
      console.log('Step 2 saved:', res.data)
      navigate('/register/step3')
    } catch (err) {
      console.error('Step 2 error:', err)
      setError(err?.response?.data || 'Failed to save details. Make sure you are logged in.')
    } finally { setLoading(false) }
  }

  async function handleStep3(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Convert hobbies and partnerPreferences from string to array if needed
      const payload = {
        ...step3,
        hobbies: step3.hobbies ? step3.hobbies.split(',').map(h => h.trim()).filter(Boolean) : [],
        partnerPreferences: step3.partnerPreferences ? step3.partnerPreferences.split(',').map(p => p.trim()).filter(Boolean) : []
      }
      const res = await api.post('/api/profile/step3', payload)
      console.log('Step 3 saved:', res.data)
      navigate('/dashboard')
    } catch (err) {
      console.error('Step 3 error:', err)
      setError(err?.response?.data || 'Failed to save details. Make sure you are logged in.')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ background: 'var(--sm-color-bg-alt)', minHeight: '100vh' }}>
      <div className="container" style={{ maxWidth: 760, margin: '0 auto', padding: '24px 0' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ background: 'var(--sm-color-primary)', padding: 8, borderRadius: 8, color: '#fff' }}>♡</div>
              <div style={{ fontWeight: 800 }}>SoulMate</div>
            </div>
            <Button variant="ghost" onClick={() => navigate('landing')}>Back to Home</Button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800 }}>Create Your Account</div>
            <div className="muted">{!isStep2 && !isStep3 ? 'Step 1' : isStep2 ? 'Step 2' : 'Step 3'} of 3</div>
          </div>
          <Progress value={!isStep2 && !isStep3 ? 33 : isStep2 ? 66 : 100} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{!isStep2 && !isStep3 ? 'Basic Information' : isStep2 ? 'Personal Details' : 'Complete Your Profile'}</CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="error">{String(error)}</div>}

            {!isStep2 && !isStep3 && (
              <form onSubmit={handleStep1} className="form-grid">
                <label className="field"><span>Username</span><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
                <label className="field"><span>Email</span><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
                <label className="field"><span>Phone</span><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
                <label className="field"><span>Password</span><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
                <label className="field"><span>First Name</span><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
                <label className="field"><span>Surname</span><Input value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} /></label>
                <label className="field"><span>Date of Birth</span><Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></label>
                <label className="field"><span>Age</span><Input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
                <div className="actions"><Button className="sm-btn-primary" disabled={loading} type="submit">{loading ? 'Submitting…' : 'Register'}</Button></div>
              </form>
            )}

            {isStep2 && (
              <form onSubmit={handleStep2} className="form-grid">
                <label className="field"><span>Marital Status</span><Input value={step2.maritalStatus} onChange={(e) => setStep2({ ...step2, maritalStatus: e.target.value })} /></label>
                <label className="field"><span>City</span><Input value={step2.city} onChange={(e) => setStep2({ ...step2, city: e.target.value })} /></label>
                <label className="field"><span>Country</span><Input value={step2.country} onChange={(e) => setStep2({ ...step2, country: e.target.value })} /></label>
                <div className="actions"><Button className="sm-btn-primary" disabled={loading} type="submit">{loading ? 'Saving…' : 'Continue'}</Button></div>
              </form>
            )}

            {isStep3 && (
              <form onSubmit={handleStep3} className="form-grid">
                <label className="field"><span>Faith</span><Input value={step3.faith} onChange={(e) => setStep3({ ...step3, faith: e.target.value })} /></label>
                <label className="field"><span>Caste</span><Input value={step3.caste} onChange={(e) => setStep3({ ...step3, caste: e.target.value })} /></label>
                <label className="field" style={{ gridColumn: '1 / -1' }}><span>About Me</span><Textarea value={step3.aboutMe} onChange={(e) => setStep3({ ...step3, aboutMe: e.target.value })} /></label>
                <div className="actions"><Button className="sm-btn-primary" disabled={loading} type="submit">{loading ? 'Saving…' : 'Finish Registration'}</Button></div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
 
