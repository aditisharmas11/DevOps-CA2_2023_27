import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GoogleAuthButton from '../components/GoogleAuthButton'
import {
  Activity, User, Mail, Lock, Calendar, AlertCircle, Loader2,
  Stethoscope, Shield, CheckCircle2, Award, Hospital, Upload, FileText, X
} from 'lucide-react'

export default function SignupPage() {
  const { signup, googleAuth } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState('patient') // 'patient' | 'doctor'
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    dateOfBirth: '',
    gender: 'Male',
    specialization: 'Cardiology',
    licenseNumber: '',
    hospitalAffiliation: ''
  })
  const [idFile, setIdFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('ID Document file size exceeds 10MB limit.')
      return
    }
    setError('')
    setIdFile(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (role === 'doctor' && !idFile) {
      setError('Please upload your Medical ID or Practice License document for verification.')
      return
    }

    setLoading(true)
    try {
      if (role === 'doctor') {
        const formData = new FormData()
        formData.append('role', 'doctor')
        formData.append('name', form.name)
        formData.append('email', form.email)
        formData.append('password', form.password)
        if (form.dateOfBirth) formData.append('dateOfBirth', form.dateOfBirth)
        if (form.gender) formData.append('gender', form.gender)
        formData.append('specialization', form.specialization || 'General Medicine')
        formData.append('licenseNumber', form.licenseNumber || '')
        formData.append('hospitalAffiliation', form.hospitalAffiliation || '')
        if (idFile) {
          formData.append('idDocument', idFile)
        }
        await signup(formData)
        // Doctors go to status page awaiting admin review
        navigate('/doctor-status')
      } else {
        await signup({
          ...form,
          role: 'patient',
        })
        // Patients are immediately active and go to dashboard
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credential) => {
    setError('')
    setLoading(true)
    try {
      const user = await googleAuth(credential, role)
      if (user?.role === 'doctor') {
        navigate(user?.verificationStatus === 'verified' ? '/doctor' : '/doctor-status')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Google sign-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      {/* Left panel */}
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 380 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
              <Activity size={22} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Outfit', letterSpacing: '-0.5px' }}>MediTwin</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Personalized Health Intelligence</div>
            </div>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, fontFamily: 'Outfit', lineHeight: 1.2, marginBottom: 16 }}>
            {role === 'doctor' ? 'Clinical Decision Support for Doctors' : 'Join MediTwin and take control of health'}
          </h1>
          <p style={{ fontSize: 14, opacity: 0.8, lineHeight: 1.6, marginBottom: 36 }}>
            {role === 'doctor'
              ? 'Access comprehensive multi-modal health records, future acute risk insights, and AI differential diagnoses for your patients.'
              : 'Create your free account and get a unique Patient ID. Ingest health records, test PDFs with OCR, and let AI forecast risks.'}
          </p>

          <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {role === 'doctor' ? 'Doctor Portal Requirements' : 'Patient Account Includes'}
            </div>
            {(role === 'doctor' ? [
              'Unique DOC-YYYY-XXXXXXXX Doctor ID',
              'Upload Medical ID / License document for verification',
              'Module 1 Risk, Module 2 Disease & Module 3 CDSS access',
              'Direct clinical feedback submission to patients'
            ] : [
              'Unique MT-YYYY-XXXXXXXX Patient ID',
              'Instant access — no email verification delay',
              'PDF lab reports with automated OCR and manual vitals entry',
              'Direct feedback notes from verified consulting doctors'
            ]).map(t => (
              <div key={t} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ color: '#86efac', fontWeight: 700 }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right fade-in" style={{ overflowY: 'auto' }}>
        <div style={{ maxWidth: 420, margin: '0 auto', width: '100%', padding: '24px 0' }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, fontFamily: 'Outfit', marginBottom: 6 }}>Create account</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>

          {/* Role selector tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, background: 'var(--surface-2)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => { setRole('patient'); setError('') }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 12px',
                borderRadius: 8, fontSize: 13, fontWeight: role === 'patient' ? 700 : 500, cursor: 'pointer',
                background: role === 'patient' ? 'var(--surface)' : 'transparent',
                color: role === 'patient' ? 'var(--brand)' : 'var(--muted)',
                border: role === 'patient' ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: role === 'patient' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <User size={15} /> Patient
            </button>
            <button
              type="button"
              onClick={() => { setRole('doctor'); setError('') }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '8px 12px',
                borderRadius: 8, fontSize: 13, fontWeight: role === 'doctor' ? 700 : 500, cursor: 'pointer',
                background: role === 'doctor' ? 'var(--surface)' : 'transparent',
                color: role === 'doctor' ? 'var(--m1-accent)' : 'var(--muted)',
                border: role === 'doctor' ? '1px solid var(--border)' : '1px solid transparent',
                boxShadow: role === 'doctor' ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <Stethoscope size={15} /> Doctor / Clinician
            </button>
          </div>

          {error && (
            <div style={{ marginBottom: 18, padding: '11px 14px', borderRadius: 9, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', gap: 9 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Google Quick Sign-Up */}
          <div style={{ marginBottom: 16 }}>
            <GoogleAuthButton
              onGoogleSuccess={handleGoogleSuccess}
              onError={setError}
              role={role}
              label={role === 'doctor' ? 'Sign up as Doctor with Google' : 'Sign up with Google'}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0', color: 'var(--muted)', fontSize: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span>or register with credentials</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                {role === 'doctor' ? 'Full Name (e.g. Dr. Jane Smith)' : 'Full Name'}
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input id="signup-name" type="text" required className="input" style={{ paddingLeft: 36 }}
                  placeholder={role === 'doctor' ? 'Dr. Sarah Connor' : 'John Doe'}
                  value={form.name} onChange={set('name')} />
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                {role === 'doctor' ? 'Official / Hospital Email' : 'Email Address'}
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input id="signup-email" type="email" required className="input" style={{ paddingLeft: 36 }}
                  placeholder={role === 'doctor' ? 'dr.sarah@hospital.org' : 'john@example.com'}
                  value={form.email} onChange={set('email')} />
              </div>
            </div>

            {/* Doctor Specific Fields: Specialization, License, Hospital, ID Document */}
            {role === 'doctor' && (
              <>
                <div className="profile-info-grid" style={{ marginBottom: 14 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                      Specialization
                    </label>
                    <select
                      className="input"
                      value={form.specialization}
                      onChange={set('specialization')}
                      style={{ width: '100%', fontSize: 12, padding: '8px 10px' }}
                    >
                      {['Cardiology', 'Internal Medicine', 'Pulmonology', 'Endocrinology', 'Neurology', 'General Practice', 'Emergency Medicine'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                      Medical License #
                    </label>
                    <input
                      type="text"
                      required
                      className="input"
                      placeholder="e.g. MED-84920"
                      value={form.licenseNumber}
                      onChange={set('licenseNumber')}
                      style={{ fontSize: 12, padding: '8px 10px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                    Hospital / Clinical Affiliation
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Hospital size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: 32, fontSize: 12 }}
                      placeholder="e.g. Metropolitan General Hospital"
                      value={form.hospitalAffiliation}
                      onChange={set('hospitalAffiliation')}
                    />
                  </div>
                </div>

                {/* DOCTOR ID UPLOAD FIELD */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5, color: 'var(--text)' }}>
                    Medical ID / License Document <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                    Upload your Medical Registration Certificate or ID (PDF, JPG, PNG — max 10MB) for Administrator approval.
                  </div>

                  {!idFile ? (
                    <label
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        border: '2px dashed var(--border)',
                        borderRadius: 10,
                        background: 'var(--surface-2)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease',
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (e.dataTransfer.files?.[0]) {
                          handleFileChange({ target: { files: e.dataTransfer.files } })
                        }
                      }}
                    >
                      <Upload size={22} style={{ color: 'var(--brand)', marginBottom: 6 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        Click or drag &amp; drop to upload ID
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        PDF, PNG, JPG, or WEBP (up to 10MB)
                      </div>
                      <input
                        id="doctor-id-file"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                    </label>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 8,
                        background: 'rgba(37,99,235,0.06)',
                        border: '1px solid rgba(37,99,235,0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                        <FileText size={18} style={{ color: '#2563eb', flexShrink: 0 }} />
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                            {idFile.name}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {(idFile.size / (1024 * 1024)).toFixed(2)} MB · {idFile.type || 'Document'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIdFile(null)}
                        className="btn-ghost"
                        style={{ padding: 4, color: '#dc2626' }}
                        title="Remove file"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Date of Birth & Gender */}
            <div className="profile-info-grid" style={{ marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="input"
                  value={form.dateOfBirth}
                  onChange={set('dateOfBirth')}
                  style={{ fontSize: 12, padding: '7px 8px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>
                  Biological Gender
                </label>
                <select
                  className="input"
                  value={form.gender}
                  onChange={set('gender')}
                  style={{ fontSize: 12, padding: '7px 8px' }}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 22 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5, color: 'var(--text-2)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input id="signup-password" type="password" required className="input" style={{ paddingLeft: 36 }}
                  placeholder="At least 6 characters"
                  value={form.password} onChange={set('password')} />
              </div>
            </div>

            <button id="signup-submit" type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}>
              {loading ? <><Loader2 size={16} className="spin" /> Creating account...</> : (role === 'doctor' ? 'Submit Doctor Application →' : 'Create Patient Account →')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
