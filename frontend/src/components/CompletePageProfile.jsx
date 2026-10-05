import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'

export default function CompletePageProfile() {
  const { username } = useAuth()
  const [step, setStep] = useState(2)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState('')
  const [err, setErr] = useState('')

  const [s2, setS2] = useState({ maritalStatus: '', height: '', weight: '', timeOfBirth: '', placeOfBirth: '', motherTongue: '', education: '', occupation: '', annualIncome: '', city: '', country: '', family: { fatherName: '', fatherOccupation: '', motherName: '', motherOccupation: '', brothers: 0, sisters: 0 } })
  const [s3, setS3] = useState({ aboutMe: '', hobbies: [], foodHabits: '', fitness: '', smokingDrinking: '', faith: '', caste: '', religiousPractices: [], partnerPreferences: [] })
  const [s4, setS4] = useState({ profilePhoto: null, additionalPhotos: [], horoscope: null, governmentId: null })

  async function saveStep2() {
    setSaving(true); setOk(''); setErr('')
    try {
      await api.post('/api/profile/step2', s2)
      setOk('Step 2 saved')
      setStep(3)
    } catch (e) { setErr(e?.response?.data || 'Failed to save Step 2') } finally { setSaving(false) }
  }

  async function saveStep3() {
    setSaving(true); setOk(''); setErr('')
    try {
      const body = { ...s3 }
      await api.post('/api/profile/step3', body)
      setOk('Step 3 saved')
      setStep(4)
    } catch (e) { setErr(e?.response?.data || 'Failed to save Step 3') } finally { setSaving(false) }
  }

  async function saveStep4() {
    setSaving(true); setOk(''); setErr('')
    try {
      const fd = new FormData()
      if (s4.profilePhoto) fd.append('profilePhoto', s4.profilePhoto)
      for (const f of s4.additionalPhotos || []) { if (f) fd.append('additionalPhotos', f) }
      if (s4.horoscope) fd.append('horoscope', s4.horoscope)
      if (s4.governmentId) fd.append('governmentId', s4.governmentId)
      await api.post('/api/profile/step4', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setOk('Files uploaded')
    } catch (e) { setErr(e?.response?.data || 'Failed to upload files') } finally { setSaving(false) }
  }

  return (
    <div>
      <Header variant="private" />
      <div className="container" style={{ marginTop: 18, display: 'grid', gap: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 20 }}>Complete Your Profile</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[2,3,4].map(n => (
            <button key={n} className={`sm-btn ${step===n ? 'sm-btn-primary' : ''}`} onClick={() => setStep(n)}>Step {n}</button>
          ))}
        </div>

        {ok && <div className="ok">{ok}</div>}
        {err && <div className="error">{String(err)}</div>}

        {step === 2 && (
          <div className="sm-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <Row label="Marital Status"><input className="sm-input" value={s2.maritalStatus} onChange={e=>setS2({...s2, maritalStatus: e.target.value})} /></Row>
            <Row label="Height"><input className="sm-input" value={s2.height} onChange={e=>setS2({...s2, height: e.target.value})} /></Row>
            <Row label="Weight"><input className="sm-input" value={s2.weight} onChange={e=>setS2({...s2, weight: e.target.value})} /></Row>
            <Row label="Time of Birth"><input className="sm-input" value={s2.timeOfBirth} onChange={e=>setS2({...s2, timeOfBirth: e.target.value})} /></Row>
            <Row label="Place of Birth"><input className="sm-input" value={s2.placeOfBirth} onChange={e=>setS2({...s2, placeOfBirth: e.target.value})} /></Row>
            <Row label="Mother Tongue"><input className="sm-input" value={s2.motherTongue} onChange={e=>setS2({...s2, motherTongue: e.target.value})} /></Row>
            <Row label="Education"><input className="sm-input" value={s2.education} onChange={e=>setS2({...s2, education: e.target.value})} /></Row>
            <Row label="Occupation"><input className="sm-input" value={s2.occupation} onChange={e=>setS2({...s2, occupation: e.target.value})} /></Row>
            <Row label="Annual Income"><input className="sm-input" value={s2.annualIncome} onChange={e=>setS2({...s2, annualIncome: e.target.value})} /></Row>
            <Row label="City"><input className="sm-input" value={s2.city} onChange={e=>setS2({...s2, city: e.target.value})} /></Row>
            <Row label="Country"><input className="sm-input" value={s2.country} onChange={e=>setS2({...s2, country: e.target.value})} /></Row>
            <div style={{ fontWeight: 800, marginTop: 6 }}>Family Details</div>
            <Row label="Father Name"><input className="sm-input" value={s2.family.fatherName} onChange={e=>setS2({...s2, family: {...s2.family, fatherName: e.target.value}})} /></Row>
            <Row label="Father Occupation"><input className="sm-input" value={s2.family.fatherOccupation} onChange={e=>setS2({...s2, family: {...s2.family, fatherOccupation: e.target.value}})} /></Row>
            <Row label="Mother Name"><input className="sm-input" value={s2.family.motherName} onChange={e=>setS2({...s2, family: {...s2.family, motherName: e.target.value}})} /></Row>
            <Row label="Mother Occupation"><input className="sm-input" value={s2.family.motherOccupation} onChange={e=>setS2({...s2, family: {...s2.family, motherOccupation: e.target.value}})} /></Row>
            <Row label="Brothers"><input className="sm-input" type="number" value={s2.family.brothers} onChange={e=>setS2({...s2, family: {...s2.family, brothers: Number(e.target.value)}})} /></Row>
            <Row label="Sisters"><input className="sm-input" type="number" value={s2.family.sisters} onChange={e=>setS2({...s2, family: {...s2.family, sisters: Number(e.target.value)}})} /></Row>
            <div>
              <button className="sm-btn sm-btn-primary" disabled={saving} onClick={saveStep2}>{saving ? 'Saving…' : 'Save & Continue'}</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="sm-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <Row label="About Me"><textarea className="sm-input" value={s3.aboutMe} onChange={e=>setS3({...s3, aboutMe: e.target.value})} /></Row>
            <Row label="Hobbies (comma separated)"><input className="sm-input" value={(s3.hobbies||[]).join(',')} onChange={e=>setS3({...s3, hobbies: e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} /></Row>
            <Row label="Food Habits"><input className="sm-input" value={s3.foodHabits} onChange={e=>setS3({...s3, foodHabits: e.target.value})} /></Row>
            <Row label="Fitness"><input className="sm-input" value={s3.fitness} onChange={e=>setS3({...s3, fitness: e.target.value})} /></Row>
            <Row label="Smoking/Drinking"><input className="sm-input" value={s3.smokingDrinking} onChange={e=>setS3({...s3, smokingDrinking: e.target.value})} /></Row>
            <Row label="Faith"><input className="sm-input" value={s3.faith} onChange={e=>setS3({...s3, faith: e.target.value})} /></Row>
            <Row label="Caste"><input className="sm-input" value={s3.caste} onChange={e=>setS3({...s3, caste: e.target.value})} /></Row>
            <Row label="Religious Practices (comma separated)"><input className="sm-input" value={(s3.religiousPractices||[]).join(',')} onChange={e=>setS3({...s3, religiousPractices: e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} /></Row>
            <Row label="Partner Preferences (comma separated)"><input className="sm-input" value={(s3.partnerPreferences||[]).join(',')} onChange={e=>setS3({...s3, partnerPreferences: e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} /></Row>
            <div>
              <button className="sm-btn sm-btn-primary" disabled={saving} onClick={saveStep3}>{saving ? 'Saving…' : 'Save & Continue'}</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="sm-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <Row label="Profile Photo"><input className="sm-input" type="file" accept="image/*" onChange={e=>setS4({...s4, profilePhoto: e.target.files?.[0] || null})} /></Row>
            <Row label="Additional Photos"><input className="sm-input" type="file" accept="image/*" multiple onChange={e=>setS4({...s4, additionalPhotos: Array.from(e.target.files || [])})} /></Row>
            <Row label="Horoscope (image/pdf)"><input className="sm-input" type="file" accept="image/*,.pdf" onChange={e=>setS4({...s4, horoscope: e.target.files?.[0] || null})} /></Row>
            <Row label="Government ID (image/pdf)"><input className="sm-input" type="file" accept="image/*,.pdf" onChange={e=>setS4({...s4, governmentId: e.target.files?.[0] || null})} /></Row>
            <div>
              <button className="sm-btn sm-btn-primary" disabled={saving} onClick={saveStep4}>{saving ? 'Uploading…' : 'Upload Files'}</button>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}

function Row({ label, children }) {
  return (
    <label className="field">
      <span className="sm-label">{label}</span>
      {children}
    </label>
  )
}


