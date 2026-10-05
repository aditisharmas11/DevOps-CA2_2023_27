import { useEffect, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext.jsx'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'

export default function Profile() {
  const { username } = useAuth()
  const [form, setForm] = useState({ firstName: '', middleName: '', surname: '', gender: 'Male', forWhom: 'self', dob: '', age: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/api/profile/user-info', { params: { username } })
        if (!cancelled) setForm({
          firstName: res.data.firstName || '',
          middleName: res.data.middleName || '',
          surname: res.data.surname || '',
          gender: res.data.gender || 'Male',
          forWhom: res.data.forWhom || 'self',
          dob: res.data.dob || '',
          age: res.data.age || '',
        })
      } catch (err) {
        if (!cancelled) setError(err?.response?.data || 'Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (username) load()
    return () => { cancelled = true }
  }, [username])

  async function onSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setOk('')
    try {
      await api.put('/api/profile/user-info', form, { params: { username } })
      setOk('Profile updated')
    } catch (err) {
      setError(err?.response?.data || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Header variant="private" />
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18, margin: '18px auto' }}>
        <aside className="sm-card" style={{ padding: 16 }}>
          <div style={{ display: 'grid', justifyItems: 'center', gap: 10 }}>
            <div style={{ width: 72, height: 72, borderRadius: 999, background: 'var(--sm-color-primary)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 22 }}>
              {(form.firstName || 'R')[0]}{(form.surname || 'K')[0]}
            </div>
            <div style={{ fontWeight: 800 }}>{form.firstName || 'Rajesh'} {form.surname || 'Kumar'}</div>
            <div className="muted">{form.age || '28'} years / Senior Software Engineer</div>
            <div className="muted">Mumbai • Hinduism</div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Profile Complete</div>
            <div style={{ height: 8, background: '#eee', borderRadius: 999 }}>
              <div style={{ width: '80%', height: 8, borderRadius: 999, background: 'var(--sm-color-primary)' }} />
            </div>
          </div>
          <div style={{ marginTop: 14 }}>
            <div className="sm-grid-2">
              <Stat title="Interests Sent" value="23" />
              <Stat title="Interests Received" value="18" />
              <Stat title="Profile Views" value="154" />
              <Stat title="Shortlisted" value="9" />
            </div>
          </div>
        </aside>

        <main style={{ display: 'grid', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>Profile</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/profile/complete" className="sm-btn">Complete Matchmaking Profile</a>
              <button className="sm-btn sm-btn-primary" disabled={saving} onClick={onSave}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </div>

          <div className="sm-card" style={{ padding: 16 }}>
            <Tabs />
          </div>

          {loading && <div className="muted">Loading…</div>}
          {error && <div className="error">{String(error)}</div>}
          {ok && <div className="ok">{ok}</div>}

          {!loading && (
            <div className="sm-grid-2">
              <section className="sm-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>About Me</div>
                <div className="muted">I am a devotee aspiring for a Krishna-conscious household.</div>
              </section>
              <section className="sm-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Basic Details</div>
                <div className="sm-grid-2">
                  <KV k="Birth Date" v={form.dob || '—'} />
                  <KV k="Religion" v="Hindu" />
                  <KV k="Caste" v="—" />
                  <KV k="Height" v="—" />
                </div>
              </section>
              <section className="sm-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Professional Details</div>
                <div className="sm-grid-2">
                  <KV k="Education" v="—" />
                  <KV k="Occupation" v="—" />
                  <KV k="Company" v="—" />
                  <KV k="Annual Income" v="—" />
                </div>
              </section>
              <section className="sm-card" style={{ padding: 16 }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Lifestyle</div>
                <div className="sm-grid-2">
                  <KV k="Diet" v="—" />
                  <KV k="Drinking" v="—" />
                  <KV k="Smoking" v="—" />
                  <KV k="Hobbies" v="—" />
                </div>
              </section>
            </div>
          )}

          <form onSubmit={onSave} className="sm-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Edit Basic Info</div>
            <div className="sm-grid-2">
              <label className="field"><span className="sm-label">First Name</span><input className="sm-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label>
              <label className="field"><span className="sm-label">Middle Name</span><input className="sm-input" value={form.middleName} onChange={(e) => setForm({ ...form, middleName: e.target.value })} /></label>
              <label className="field"><span className="sm-label">Surname</span><input className="sm-input" value={form.surname} onChange={(e) => setForm({ ...form, surname: e.target.value })} /></label>
              <label className="field"><span className="sm-label">Gender</span><select className="sm-input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}><option>Male</option><option>Female</option></select></label>
              <label className="field"><span className="sm-label">For Whom</span><select className="sm-input" value={form.forWhom} onChange={(e) => setForm({ ...form, forWhom: e.target.value })}><option value="self">Self</option><option value="son/daughter">Son/Daughter</option><option value="relative">Relative</option></select></label>
              <label className="field"><span className="sm-label">Date of Birth</span><input className="sm-input" type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} /></label>
              <label className="field"><span className="sm-label">Age</span><input className="sm-input" type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="sm-btn sm-btn-primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </main>
      </div>
      <Footer />
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...props} />
    </label>
  )
}

function Select({ label, options, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select {...props}>
        {options.map(([v, t]) => (
          <option key={v} value={v}>{t}</option>
        ))}
      </select>
    </label>
  )
}

function Tabs() {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      {['About Me','Family','Preferences','Settings'].map((t, i) => (
        <div key={t} style={{ padding: '6px 0', borderBottom: `2px solid ${i===0 ? 'var(--sm-color-primary)' : 'transparent'}`, color: i===0 ? 'var(--sm-color-primary)' : 'var(--sm-text-body)', fontWeight: 700 }}>{t}</div>
      ))}
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{k}</div>
      <div style={{ fontWeight: 700 }}>{v}</div>
    </div>
  )
}

function Stat({ title, value }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 12 }}>{title}</div>
      <div style={{ fontWeight: 800, fontSize: 20 }}>{value}</div>
    </div>
  )
}


