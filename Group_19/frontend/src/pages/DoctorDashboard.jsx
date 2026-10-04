import { useState, useEffect } from 'react'
import {
  Search, Stethoscope, User, Shield, Brain, Pill, Send,
  AlertTriangle, CheckCircle2, Clock, Calendar, ChevronRight,
  TrendingUp, TrendingDown, Minus, RefreshCw, Loader2, AlertCircle,
  FileText, Activity, Heart, Sparkles, MessageSquare, Check
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import RiskGauge from '../components/RiskGauge'

const riskColor = (cat) => ({
  LOW: '#059669',
  MODERATE: '#d97706',
  HIGH: '#dc2626',
  VERY_HIGH: '#991b1b'
}[cat] || '#d97706')

const riskBadgeClass = (cat) => ({
  LOW: 'badge-low',
  MODERATE: 'badge-moderate',
  HIGH: 'badge-high',
  VERY_HIGH: 'badge-high'
}[cat] || 'badge-moderate')

export default function DoctorDashboard() {
  const { user } = useAuth()
  const [searchId, setSearchId] = useState('')
  const [searching, setSearching] = useState(false)
  const [patientData, setPatientData] = useState(null)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [recentFeedbacks, setRecentFeedbacks] = useState([])

  // Feedback form state
  const [feedbackText, setFeedbackText] = useState('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState('')
  const [feedbackError, setFeedbackError] = useState('')

  // Active viewing tab
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'm1' | 'm2' | 'm3' | 'feedback'

  // Load recent patient suggestions on mount
  useEffect(() => {
    api.get('/doctor/recent-patients')
      .then(res => {
        setSuggestions(res.data.patientSuggestions || [])
        setRecentFeedbacks(res.data.recentFeedbacks || [])
      })
      .catch(() => {})
  }, [])

  const handleSearch = async (targetId) => {
    const idToSearch = (targetId || searchId).trim()
    if (!idToSearch) {
      setError('Please enter a valid Patient ID to search.')
      return
    }
    setError('')
    setFeedbackSuccess('')
    setFeedbackError('')
    setSearching(true)

    try {
      const res = await api.get(`/doctor/patient/${encodeURIComponent(idToSearch)}`)
      setPatientData(res.data)
      setSearchId(res.data.patient?.patientId || idToSearch)
    } catch (err) {
      setPatientData(null)
      setError(err.response?.data?.message || `No patient found with ID: ${idToSearch}`)
    } finally {
      setSearching(false)
    }
  }

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault()
    if (!patientData?.patient?.patientId) return
    if (!feedbackText.trim()) {
      setFeedbackError('Please enter clinical guidance text.')
      return
    }

    setFeedbackError('')
    setFeedbackSuccess('')
    setSubmittingFeedback(true)

    try {
      const res = await api.post('/doctor/feedback', {
        patientId: patientData.patient.patientId,
        feedback: feedbackText.trim()
      })
      setFeedbackSuccess('Clinical feedback successfully sent to patient.')
      setFeedbackText('')

      // Add to current feedbacks list in UI
      setPatientData(prev => ({
        ...prev,
        feedbacks: [res.data.feedback, ...(prev.feedbacks || [])]
      }))
    } catch (err) {
      setFeedbackError(err.response?.data?.message || 'Failed to submit feedback.')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  const p = patientData?.patient
  const m1 = patientData?.latestRisk
  const m2 = patientData?.latestDisease
  const m3 = patientData?.latestTreatment
  const feedbacks = patientData?.feedbacks || []

  return (
    <div className="fade-in">
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(5,150,105,0.1)', color: 'var(--brand)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              Doctor Portal
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>
              ID: {user?.doctorId || 'DOC-2026-ACTIVE'}
            </span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 0', fontFamily: 'Outfit' }}>
            Clinical Patient Workspace
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Search patient records, review AI multi-modal predictions, and provide clinical guidance
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              {user?.name?.startsWith('Dr.') ? user.name : `Dr. ${user?.name || 'Physician'}`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600 }}>
              {user?.specialization || 'General Medicine'}
            </div>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
            <Stethoscope size={20} />
          </div>
        </div>
      </div>

      <div className="page-container">
        {/* ── Search Patient Section ─────────────────────────────────── */}
        <div className="card" style={{ padding: '20px', marginBottom: 20, background: 'var(--surface)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            🔍 Search Patient by ID
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
          >
            <div style={{ flex: 1, minWidth: 'min(260px, 100%)', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                id="doctor-patient-search"
                type="text"
                className="input"
                style={{ paddingLeft: 38, fontFamily: 'JetBrains Mono', fontSize: 13 }}
                placeholder="Enter Patient ID (e.g. MT-2026-XXXXXXXX)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="btn-primary"
              style={{ fontSize: 13, padding: '10px 22px' }}
            >
              {searching ? <><Loader2 size={15} className="spin" /> Searching...</> : <><Search size={15} /> Search Patient</>}
            </button>
          </form>

          {/* Quick suggestions pills */}
          {suggestions.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Active Patients:</span>
              {suggestions.map((sugg) => (
                <button
                  key={sugg.patientId}
                  type="button"
                  onClick={() => handleSearch(sugg.patientId)}
                  style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 11,
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'JetBrains Mono'
                  }}
                  title={`Click to load ${sugg.name}`}
                >
                  {sugg.patientId} ({sugg.name})
                </button>
              ))}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}
        </div>

        {/* ── Patient Profile & Multi-Module Workspace ───────────────── */}
        {patientData ? (
          <div className="fade-in">
            {/* Patient Header Banner */}
            <div className="card" style={{ padding: '20px 24px', marginBottom: 20, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 50, height: 50, borderRadius: 12, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                    <User size={26} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                        {p?.name}
                      </h3>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: 'JetBrains Mono', color: 'var(--brand)', fontWeight: 700 }}>
                        {p?.patientId}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                      <span>Age: <b>{p?.age} yrs</b></span>
                      <span>Gender: <b>{p?.gender}</b></span>
                      <span>Email: <b>{p?.email}</b></span>
                      <span>Uploaded Records: <b>{patientData.recordsCount}</b></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <span className={`badge ${riskBadgeClass(m1?.riskCategory || 'NOT_EVALUATED')}`} style={{ fontSize: 12, padding: '6px 12px' }}>
                    {m1?.riskCategory ? `${m1.riskCategory} 90-DAY RISK` : 'NOT EVALUATED'}
                  </span>
                </div>
              </div>

              {/* Module Filter Tabs */}
              <div style={{ display: 'flex', gap: 8, marginTop: 18, borderTop: '1px solid var(--border)', paddingTop: 14, flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: '📊 Complete Clinical Profile' },
                  { id: 'm1', label: '🛡️ Module 1: Future Risk' },
                  { id: 'm2', label: '🧠 Module 2: Disease Reasoning' },
                  { id: 'm3', label: '💊 Module 3: Treatments' },
                  { id: 'feedback', label: `💬 Doctor Feedback (${feedbacks.length})` },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: activeTab === t.id ? 'var(--brand)' : 'var(--surface-2)',
                      color: activeTab === t.id ? 'white' : 'var(--text-2)',
                      border: `1px solid ${activeTab === t.id ? 'var(--brand)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Main Clinical Grid ─────────────────────────────────── */}
            <div className="doctor-grid">

              {/* Left Column: Multi-Module Outputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* MODULE 1: FUTURE RISK */}
                {(activeTab === 'all' || activeTab === 'm1') && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m1-accent)' }}>
                          <Shield size={16} />
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                          Module 1: 90-Day Acute Health Risk Assessment
                        </h4>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {m1 ? new Date(m1.createdAt).toLocaleDateString() : 'No data'}
                      </span>
                    </div>

                    {m1 ? (
                      <div>
                        <div className="health-stats-row" style={{ marginBottom: 16 }}>
                          <div className="card-sm" style={{ borderLeft: `3px solid ${riskColor(m1.riskCategory)}` }}>
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Acute Event Probability</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: riskColor(m1.riskCategory), marginTop: 4 }}>
                              {(m1.probabilityPercent || 0).toFixed(1)}%
                            </div>
                            <span className={`badge ${riskBadgeClass(m1.riskCategory)}`} style={{ marginTop: 4 }}>
                              {m1.riskCategory} RISK
                            </span>
                          </div>

                          <div className="card-sm">
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Forecast Horizon</div>
                            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{m1.predictionHorizonDays || 90} Days</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Validated Target</div>
                          </div>

                          <div className="card-sm">
                            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Data Completeness</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand)', marginTop: 4 }}>
                              {m1.dataConfidence?.category || 'HIGH'}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                              {((m1.dataConfidence?.score || 0.9) * 100).toFixed(0)}% Features Present
                            </div>
                          </div>
                        </div>

                        {/* Observation progression table */}
                        {m1.trends && m1.trends.length > 0 && (
                          <div style={{ marginTop: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                              Longitudinal Biomarker Trajectory & Volatility ({m1.trends.length} tracked)
                            </div>
                            <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                                <thead>
                                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Observation</th>
                                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Baseline</th>
                                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Latest</th>
                                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Change (%)</th>
                                    <th style={{ padding: '6px 10px', fontWeight: 700 }}>Trend</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {m1.trends.slice(0, 8).map((t, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                      <td style={{ padding: '6px 10px', fontWeight: 600 }}>{t.observation}</td>
                                      <td style={{ padding: '6px 10px', color: 'var(--muted)' }}>{t.first_value ?? '—'} {t.unit || ''}</td>
                                      <td style={{ padding: '6px 10px', fontWeight: 700 }}>{t.latest_value ?? '—'} {t.unit || ''}</td>
                                      <td style={{ padding: '6px 10px', color: t.percent_change > 0 ? '#dc2626' : t.percent_change < 0 ? '#059669' : 'var(--muted)', fontWeight: 700 }}>
                                        {t.percent_change != null ? `${t.percent_change > 0 ? '+' : ''}${t.percent_change.toFixed(1)}%` : '—'}
                                      </td>
                                      <td style={{ padding: '6px 10px' }}>
                                        <span style={{
                                          fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                          background: t.trend === 'INCREASING' ? 'rgba(220,38,38,0.1)' : t.trend === 'DECREASING' ? 'rgba(5,150,105,0.1)' : 'var(--surface-3)',
                                          color: t.trend === 'INCREASING' ? '#dc2626' : t.trend === 'DECREASING' ? '#059669' : 'var(--muted)'
                                        }}>
                                          {t.trend || 'STABLE'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                        No Module 1 risk prediction records uploaded yet for this patient.
                      </div>
                    )}
                  </div>
                )}

                {/* MODULE 2: DISEASE PREDICTION */}
                {(activeTab === 'all' || activeTab === 'm2') && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(2,132,199,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m2-accent)' }}>
                          <Brain size={16} />
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                          Module 2: Differential Diagnosis & Symptom Reasoning
                        </h4>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {m2 ? new Date(m2.createdAt).toLocaleDateString() : 'No data'}
                      </span>
                    </div>

                    {m2 && m2.predictions?.length > 0 ? (
                      <div>
                        {m2.symptoms?.length > 0 && (
                          <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Reported Symptoms:</span>
                            {m2.symptoms.map((s, idx) => (
                              <span key={idx} style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(2,132,199,0.1)', color: 'var(--m2-accent)', fontSize: 10, fontWeight: 700 }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        )}

                        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Rank</th>
                                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Pathology / Condition</th>
                                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Probability Match</th>
                                <th style={{ padding: '8px 10px', fontWeight: 700 }}>Confidence</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m2.predictions.slice(0, 5).map((pred, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '8px 10px', fontWeight: 800, color: 'var(--brand)' }}>#{i + 1}</td>
                                  <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--text)' }}>{pred.disease || pred.condition}</td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                                        <div style={{ width: `${pred.probability_percent || pred.probability * 100}%`, height: '100%', background: 'var(--m2-accent)' }} />
                                      </div>
                                      <span style={{ fontWeight: 700 }}>{(pred.probability_percent || pred.probability * 100).toFixed(1)}%</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span style={{
                                      fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                                      background: pred.confidence === 'HIGH' ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
                                      color: pred.confidence === 'HIGH' ? '#059669' : '#d97706'
                                    }}>
                                      {pred.confidence || 'HIGH'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                        No Module 2 symptom analysis recorded yet for this patient.
                      </div>
                    )}
                  </div>
                )}

                {/* MODULE 3: TREATMENT RECOMMENDATIONS */}
                {(activeTab === 'all' || activeTab === 'm3') && (
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m3-accent)' }}>
                          <Pill size={16} />
                        </div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                          Module 3: Personalized Treatment & Surveillance Recommendations
                        </h4>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {m3 ? new Date(m3.createdAt).toLocaleDateString() : 'No data'}
                      </span>
                    </div>

                    {m3 && m3.recommendations?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                          <span>Urgency Level: <b style={{ color: riskColor(m3.urgencyLevel) }}>{m3.urgencyLevel?.replace(/_/g, ' ') || 'ROUTINE FOLLOW-UP'}</b></span>
                          <span>Active Protocols: <b>{m3.recommendations.length} Conditions</b></span>
                        </div>

                        {m3.recommendations.map((rec, i) => (
                          <div key={i} style={{ padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                                #{i + 1} {rec.condition || rec.disease}
                              </span>
                              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-3)', fontWeight: 700 }}>
                                {rec.category || 'Clinical Protocol'}
                              </span>
                            </div>

                            {rec.first_line_approach && (
                              <div style={{ fontSize: 11, marginBottom: 6 }}>
                                <b style={{ color: 'var(--brand)' }}>First-Line Clinical Approach: </b>
                                <span style={{ color: 'var(--text-2)' }}>
                                  {Array.isArray(rec.first_line_approach) ? rec.first_line_approach[0] : rec.first_line_approach}
                                </span>
                              </div>
                            )}

                            {rec.medication_classes?.length > 0 && (
                              <div style={{ fontSize: 11, marginTop: 4 }}>
                                <b style={{ color: '#d97706' }}>Medication Classes: </b>
                                <span style={{ color: 'var(--text-2)' }}>{rec.medication_classes.join(', ')}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
                        No Module 3 treatment protocols generated yet for this patient.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Doctor Feedback Form & Historical Log */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Doctor Clinical Feedback Input Card */}
                <div className="card" style={{ border: '2px solid var(--brand)', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                      <MessageSquare size={16} />
                    </div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                      Submit Clinical Feedback
                    </h4>
                  </div>

                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: '0 0 12px', lineHeight: 1.4 }}>
                    Write clinical advice, prescriptions, or follow-up instructions for <b>{p?.name}</b>. This will appear immediately on the patient's dashboard.
                  </p>

                  {feedbackSuccess && (
                    <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} /> {feedbackSuccess}
                    </div>
                  )}

                  {feedbackError && (
                    <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <AlertCircle size={14} /> {feedbackError}
                    </div>
                  )}

                  <form onSubmit={handleFeedbackSubmit}>
                    <textarea
                      id="doctor-feedback-textarea"
                      className="input"
                      rows={5}
                      style={{ width: '100%', resize: 'vertical', fontSize: 12, lineHeight: 1.5, marginBottom: 12 }}
                      placeholder="e.g. Please continue monitoring your glucose levels daily and schedule a 30-day follow-up consultation. Ensure adherence to prescribed antihypertensives."
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                    />

                    <button
                      type="submit"
                      disabled={submittingFeedback}
                      className="btn-primary"
                      style={{ width: '100%', justifyContent: 'center', fontSize: 13, padding: '9px 0' }}
                    >
                      {submittingFeedback ? <><Loader2 size={15} className="spin" /> Submitting...</> : <><Send size={14} /> Send Feedback to Patient</>}
                    </button>
                  </form>
                </div>

                {/* Feedback History Log Card */}
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                      Clinical Feedback Log ({feedbacks.length})
                    </h4>
                  </div>

                  {feedbacks.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {feedbacks.map((fb, idx) => (
                        <div key={idx} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 800, color: 'var(--brand)' }}>{fb.doctorName}</span>
                            <span style={{ fontSize: 9, color: 'var(--muted)' }}>
                              {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>
                            {fb.specialization}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                            {fb.feedback}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                      No previous clinical feedback recorded for this patient.
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        ) : (
          /* Empty Search Prompt */
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 600, margin: '20px auto' }}>
            <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--brand)' }}>
              <Stethoscope size={30} />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'Outfit' }}>
              Search a Patient ID to Begin Review
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420, margin: '0 auto 16px', lineHeight: 1.5 }}>
              Enter any registered Patient ID above (or click an active patient pill) to view their multi-modal health records, 90-day acute risks, disease differentials, and submit guidance notes.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
