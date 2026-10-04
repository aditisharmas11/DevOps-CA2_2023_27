import { useState, useEffect } from 'react'
import {
  ShieldCheck, Stethoscope, Users, FileText, CheckCircle2,
  XCircle, Clock, AlertTriangle, Search, Filter, RefreshCw,
  Loader2, UserCheck, ShieldAlert, Award, Hospital, ChevronRight, X,
  Eye, ExternalLink
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('doctors') // 'doctors' | 'patients'
  const [doctorFilter, setDoctorFilter] = useState('all') // 'all' | 'pending' | 'verified' | 'rejected'
  const [doctorSearch, setDoctorSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [alertMsg, setAlertMsg] = useState({ type: '', text: '' })

  // Document viewer modal state
  const [viewingDocument, setViewingDocument] = useState(null)

  // Rejection modal state
  const [rejectingDoctor, setRejectingDoctor] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const [statsRes, doctorsRes, patientsRes] = await Promise.all([
        api.get('/admin/stats').catch(() => ({ data: null })),
        api.get('/admin/doctors').catch(() => ({ data: [] })),
        api.get('/admin/patients').catch(() => ({ data: [] })),
      ])

      setStats(statsRes.data)
      setDoctors(doctorsRes.data || [])
      setPatients(patientsRes.data || [])
    } catch (err) {
      setAlertMsg({ type: 'error', text: 'Failed to load administrator records.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const handleVerifyDoctor = async (docId, docName) => {
    setActionLoading(true)
    setAlertMsg({ type: '', text: '' })
    try {
      const res = await api.post(`/admin/doctors/${docId}/verify`)
      setAlertMsg({ type: 'success', text: res.data.message || `Dr. ${docName} verified successfully!` })
      await loadAdminData()
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to verify doctor.' })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectDoctorSubmit = async (e) => {
    e.preventDefault()
    if (!rejectingDoctor) return
    setActionLoading(true)
    setAlertMsg({ type: '', text: '' })

    try {
      const res = await api.post(`/admin/doctors/${rejectingDoctor._id || rejectingDoctor.doctorId}/reject`, {
        reason: rejectionReason || 'Medical credentials could not be verified by administrator.'
      })
      setAlertMsg({ type: 'success', text: res.data.message || 'Doctor application rejected.' })
      setRejectingDoctor(null)
      setRejectionReason('')
      await loadAdminData()
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.response?.data?.message || 'Failed to reject doctor application.' })
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered Doctors
  const filteredDoctors = doctors.filter(doc => {
    const matchesFilter = doctorFilter === 'all' || doc.verificationStatus === doctorFilter
    const matchesSearch = !doctorSearch ||
      doc.name?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.doctorId?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.email?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.specialization?.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      doc.licenseNumber?.toLowerCase().includes(doctorSearch.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Filtered Patients
  const filteredPatients = patients.filter(p => {
    return !patientSearch ||
      p.name?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.patientId?.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(patientSearch.toLowerCase())
  })

  return (
    <div className="fade-in" style={{ padding: '24px', maxWidth: 1280, margin: '0 auto' }}>
      
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
              MediTwin Administration & Governance
            </h2>
            <span className="badge badge-low" style={{ fontSize: 11, padding: '3px 8px' }}>
              <ShieldCheck size={12} style={{ marginRight: 4 }} /> Admin Tier
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            Manage clinical credentials, verify medical providers, and oversee patient records
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-ghost" onClick={loadAdminData} title="Refresh Data" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span style={{ fontSize: 12, marginLeft: 6 }}>Refresh</span>
          </button>
        </div>
      </div>

      <div className="page-container">

      {/* ── Alerts & Notifications ───────────────────────────────────── */}
      {alertMsg.text && (
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8,
          background: alertMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${alertMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
          color: alertMsg.type === 'success' ? '#059669' : '#dc2626',
          fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {alertMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            {alertMsg.text}
          </div>
          <button className="btn-ghost" onClick={() => setAlertMsg({ type: '', text: '' })} style={{ padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── KPI Stat Cards ───────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        
        {/* Card 1: Total Doctors */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Total Doctors</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <Stethoscope size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text)' }}>
            {stats?.totalDoctors ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            {(stats?.verifiedDoctors || 0)} active verified
          </div>
        </div>

        {/* Card 2: Pending Approval */}
        <div className="card" style={{ padding: '16px 20px', borderLeft: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#d97706' }}>Pending Approvals</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: '#d97706' }}>
            {stats?.pendingDoctors ?? '0'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Requires admin license review
          </div>
        </div>

        {/* Card 3: Registered Patients */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Total Patients</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(13,148,136,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text)' }}>
            {stats?.totalPatients ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            Individual patient accounts
          </div>
        </div>

        {/* Card 4: Clinical Records */}
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)' }}>Health Records</span>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text)' }}>
            {stats?.totalHealthRecords ?? '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
            PDF reports & manual entries
          </div>
        </div>

      </div>

      {/* ── Main Tab Navigation ──────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 20 }}>
        <button
          className={activeTab === 'doctors' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setActiveTab('doctors')}
          style={{ fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Stethoscope size={15} />
          Doctor Credential Review
          {(stats?.pendingDoctors || 0) > 0 && (
            <span style={{
              fontSize: 11, padding: '2px 7px', borderRadius: 10,
              background: '#dc2626', color: '#fff', fontWeight: 800
            }}>
              {stats.pendingDoctors}
            </span>
          )}
        </button>

        <button
          className={activeTab === 'patients' ? 'btn-primary' : 'btn-ghost'}
          onClick={() => setActiveTab('patients')}
          style={{ fontSize: 13, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Users size={15} />
          Patient Registry ({patients.length})
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 1: DOCTORS VERIFICATION CENTER                             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'doctors' && (
        <div className="card">
          
          {/* Controls Bar: Filters & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
            
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 6, background: 'var(--surface-2)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
              {[
                { id: 'all', label: `All (${doctors.length})` },
                { id: 'pending', label: `Pending Review (${doctors.filter(d => d.verificationStatus === 'pending').length})` },
                { id: 'verified', label: `Verified (${doctors.filter(d => d.verificationStatus === 'verified').length})` },
                { id: 'rejected', label: `Rejected (${doctors.filter(d => d.verificationStatus === 'rejected').length})` },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDoctorFilter(f.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                    fontWeight: doctorFilter === f.id ? 700 : 500,
                    background: doctorFilter === f.id ? 'var(--surface)' : 'transparent',
                    color: doctorFilter === f.id ? 'var(--brand)' : 'var(--muted)',
                    border: doctorFilter === f.id ? '1px solid var(--border)' : '1px solid transparent',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search by name, ID, license..."
                className="input"
                value={doctorSearch}
                onChange={e => setDoctorSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 12, paddingRight: 10, paddingTop: 6, paddingBottom: 6 }}
              />
            </div>
          </div>

          {/* Doctors Table */}
          {filteredDoctors.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
              <Stethoscope size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
              <div style={{ fontSize: 14, fontWeight: 700 }}>No doctor applications match the selected filter</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 14px' }}>Physician / Doctor</th>
                    <th style={{ padding: '10px 14px' }}>Doctor ID</th>
                    <th style={{ padding: '10px 14px' }}>Specialization</th>
                    <th style={{ padding: '10px 14px' }}>License / Affiliation</th>
                    <th style={{ padding: '10px 14px' }}>Medical ID Document</th>
                    <th style={{ padding: '10px 14px' }}>Credential Status</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Admin Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDoctors.map(doc => {
                    const isPending = doc.verificationStatus === 'pending'
                    const isVerified = doc.verificationStatus === 'verified'
                    const isRejected = doc.verificationStatus === 'rejected'

                    return (
                      <tr key={doc._id || doc.doctorId} style={{ borderBottom: '1px solid var(--border)' }}>
                        
                        {/* Doctor Name & Email */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text)' }}>
                            {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{doc.email}</div>
                        </td>

                        {/* Doctor ID */}
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--text-2)' }}>
                            {doc.doctorId || '—'}
                          </span>
                        </td>

                        {/* Specialization */}
                        <td style={{ padding: '12px 14px' }}>
                          <span className="badge badge-low" style={{ fontSize: 11 }}>
                            {doc.specialization || 'General Medicine'}
                          </span>
                        </td>

                        {/* License & Hospital */}
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                            Lic: {doc.licenseNumber || 'Not provided'}
                          </div>
                          {doc.hospitalAffiliation && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Hospital size={11} /> {doc.hospitalAffiliation}
                            </div>
                          )}
                        </td>

                        {/* ID Document Preview Cell */}
                        <td style={{ padding: '12px 14px' }}>
                          {doc.doctorIdDocument?.url ? (
                            <button
                              type="button"
                              onClick={() => setViewingDocument({
                                name: doc.name,
                                doctorId: doc.doctorId,
                                document: doc.doctorIdDocument,
                                id: doc._id || doc.doctorId,
                                isPending,
                              })}
                              className="btn-ghost"
                              style={{
                                fontSize: 11,
                                padding: '4px 8px',
                                borderRadius: 6,
                                background: 'rgba(37,99,235,0.08)',
                                color: '#2563eb',
                                border: '1px solid rgba(37,99,235,0.25)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title="Inspect uploaded ID document"
                            >
                              <Eye size={12} /> View Document
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>
                              No file attached
                            </span>
                          )}
                        </td>

                        {/* Credential Status */}
                        <td style={{ padding: '12px 14px' }}>
                          {isVerified && (
                            <span className="badge badge-low" style={{ fontSize: 11, padding: '3px 8px' }}>
                              <CheckCircle2 size={11} style={{ marginRight: 3 }} /> Verified
                            </span>
                          )}
                          {isPending && (
                            <span className="badge badge-moderate" style={{ fontSize: 11, padding: '3px 8px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}>
                              <Clock size={11} style={{ marginRight: 3 }} /> Pending Review
                            </span>
                          )}
                          {isRejected && (
                            <span className="badge badge-high" style={{ fontSize: 11, padding: '3px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca' }} title={doc.rejectionReason}>
                              <XCircle size={11} style={{ marginRight: 3 }} /> Rejected
                            </span>
                          )}
                        </td>

                        {/* Admin Action Buttons */}
                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {!isVerified && (
                              <button
                                className="btn-primary"
                                onClick={() => handleVerifyDoctor(doc._id || doc.doctorId, doc.name)}
                                disabled={actionLoading}
                                style={{ fontSize: 11, padding: '5px 12px', background: '#059669' }}
                                title="Approve credentials"
                              >
                                <CheckCircle2 size={12} /> Verify
                              </button>
                            )}

                            {!isRejected && (
                              <button
                                className="btn-ghost"
                                onClick={() => { setRejectingDoctor(doc); setRejectionReason('') }}
                                disabled={actionLoading}
                                style={{ fontSize: 11, padding: '5px 10px', color: '#dc2626', border: '1px solid #fecaca' }}
                                title="Reject credentials"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TAB 2: PATIENT REGISTRY (READ-ONLY OVERSIGHT)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'patients' && (
        <div className="card">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                Registered Patients Directory
              </h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                High-level directory oversight (patient clinical records remain strictly confidential)
              </div>
            </div>

            <div style={{ position: 'relative', width: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                type="text"
                placeholder="Search patient name, ID, email..."
                className="input"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 12, paddingRight: 10, paddingTop: 6, paddingBottom: 6 }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '10px 14px' }}>Patient Name</th>
                  <th style={{ padding: '10px 14px' }}>Patient ID</th>
                  <th style={{ padding: '10px 14px' }}>Email Address</th>
                  <th style={{ padding: '10px 14px' }}>Gender</th>
                  <th style={{ padding: '10px 14px' }}>Health Records</th>
                  <th style={{ padding: '10px 14px' }}>Registered On</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map(p => (
                  <tr key={p.id || p.patientId} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text)' }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'var(--brand)' }}>
                        {p.patientId || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)' }}>
                      {p.email}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {p.gender || 'Not specified'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-low" style={{ fontSize: 11 }}>
                        {p.healthRecordsCount} record(s)
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: 'var(--muted)', fontSize: 12 }}>
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ── Rejection Modal ──────────────────────────────────────────── */}
      {rejectingDoctor && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={20} style={{ color: '#dc2626' }} />
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                  Reject Doctor Application
                </h3>
              </div>
              <button className="btn-ghost" onClick={() => setRejectingDoctor(null)} style={{ padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 16 }}>
              You are rejecting the medical credentials for <b>Dr. {rejectingDoctor.name}</b> (Doctor ID: <code>{rejectingDoctor.doctorId}</code>).
            </p>

            <form onSubmit={handleRejectDoctorSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>
                  Reason for Rejection (shown to doctor):
                </label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  placeholder="e.g. Medical license number is invalid or cannot be confirmed with medical council registry."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  style={{ width: '100%', fontSize: 13, padding: 10 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setRejectingDoctor(null)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={actionLoading || !rejectionReason.trim()}
                  style={{ background: '#dc2626' }}
                >
                  {actionLoading ? <><Loader2 size={14} className="spin" /> Rejecting...</> : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Doctor ID Document Viewer Modal ────────────────────────────── */}
      {viewingDocument && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="card" style={{ maxWidth: 840, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={18} style={{ color: 'var(--brand)' }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                    Doctor ID / Medical License Document
                  </h3>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Applicant: <b>{viewingDocument.name}</b> (Doctor ID: <code style={{ color: 'var(--brand)' }}>{viewingDocument.doctorId}</code>)
                </div>
              </div>
              <button className="btn-ghost" onClick={() => setViewingDocument(null)} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Document Content View */}
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface-2)', borderRadius: 8, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 380 }}>
              {viewingDocument.document?.url?.toLowerCase().endsWith('.pdf') || viewingDocument.document?.mimetype === 'application/pdf' ? (
                <iframe
                  src={viewingDocument.document.url}
                  title="Doctor ID Document"
                  style={{ width: '100%', height: '58vh', border: 'none', borderRadius: 6 }}
                />
              ) : (
                <img
                  src={viewingDocument.document?.url}
                  alt={`ID Document for Dr. ${viewingDocument.name}`}
                  style={{ maxWidth: '100%', maxHeight: '58vh', objectFit: 'contain', borderRadius: 6, boxShadow: 'var(--shadow-sm)' }}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
              <a
                href={viewingDocument.document?.url}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
              >
                <ExternalLink size={14} /> Open in Full Tab
              </a>

              <div style={{ display: 'flex', gap: 10 }}>
                {viewingDocument.isPending && (
                  <button
                    className="btn-primary"
                    onClick={async () => {
                      const id = viewingDocument.id
                      const name = viewingDocument.name
                      setViewingDocument(null)
                      await handleVerifyDoctor(id, name)
                    }}
                    disabled={actionLoading}
                    style={{ fontSize: 12, background: '#059669', padding: '7px 16px' }}
                  >
                    <CheckCircle2 size={13} /> Approve Credentials
                  </button>
                )}
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setViewingDocument(null)}
                  style={{ fontSize: 12, padding: '7px 16px' }}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      </div>
    </div>
  )
}
