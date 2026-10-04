import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain, X, Loader2, AlertCircle, ChevronRight,
  RefreshCw, CheckCircle2, Clock, Sparkles
} from 'lucide-react'
import api from '../lib/api'
import { useDiseaseJob } from '../context/DiseaseJobContext'

const COMMON_SYMPTOMS = [
  'Fever', 'Headache', 'Fatigue', 'Cough', 'Chest Pain', 'Shortness of Breath',
  'Nausea', 'Vomiting', 'Diarrhea', 'Body Pain', 'Dizziness', 'Sore Throat',
  'Loss of Appetite', 'Sweating', 'Chills', 'Joint Pain', 'Back Pain', 'Rash',
]

const confColor = {
  HIGH: '#059669',
  MEDIUM: '#d97706',
  LOW: '#dc2626'
}

export default function DiseasePage() {
  const { job, startPrediction, clearJob } = useDiseaseJob()
  const [inputText, setInputText]   = useState('')
  const [selected, setSelected]     = useState([])
  const [age, setAge]               = useState(30)
  const [sex, setSex]               = useState('male')
  const [localResult, setLocalResult] = useState(null)
  const [history, setHistory]       = useState([])
  const [error, setError]           = useState('')
  const [pageLoading, setPageLoading] = useState(true)

  const loadLatest = () => {
    setPageLoading(true)
    Promise.all([
      api.get('/disease/latest').then(r => r.data).catch(() => null),
      api.get('/disease/history').then(r => r.data).catch(() => [])
    ]).then(([latest, hist]) => {
      if (latest && latest.predictions) {
        setLocalResult(latest)
      }
      if (Array.isArray(hist)) {
        setHistory(hist)
      }
    }).finally(() => setPageLoading(false))
  }

  useEffect(() => { loadLatest() }, [])

  // When a background job completes, refresh the result view
  useEffect(() => {
    if (job?.status === 'done' && job?.result) {
      setLocalResult(job.result)
      loadLatest()
    }
    if (job?.status === 'error' && job?.error) {
      setError(job.error)
    }
  }, [job?.status]) // eslint-disable-line

  const toggleSymptom = (s) =>
    setSelected(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])

  const handleSubmit = async () => {
    if (selected.length === 0 && !inputText.trim()) {
      setError('Please enter a symptom description or select at least one symptom from the list.')
      return
    }
    setError('')
    const symptoms = selected.length > 0 ? selected : []
    const text = inputText.trim() || symptoms.join(', ')
    // Fire-and-forget: background job, user can navigate away
    startPrediction({ inputText: text, symptoms, age, sex })
  }

  // Prefer job result if fresh, else fall back to locally loaded result
  const result = (job?.status === 'done' && job?.result) ? job.result : localResult
  const jobRunning = job?.status === 'running'

  const predictions = result?.predictions || []
  const topCond = predictions[0]

  return (
    <div className="fade-in">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
            Module 2 — Disease Prediction from Symptoms
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            DDXPlus Hybrid Neural Classifier · 49 Medical Pathologies
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
            borderRadius: 8, background: 'rgba(2,132,199,0.1)', color: 'var(--m2-accent)',
            border: '1px solid rgba(2,132,199,0.25)', fontSize: 12, fontWeight: 700
          }}>
            <Brain size={14} />
            Clinical Evidence Extractor
          </div>
          <button className="btn-ghost" onClick={loadLatest} title="Refresh Latest">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* ── Background Prediction Status Banner ────────────────────── */}
      {jobRunning && (
        <div style={{
          margin: '16px 16px 0',
          padding: '12px 16px', borderRadius: 10,
          background: 'rgba(2,132,199,0.08)', border: '1px solid rgba(2,132,199,0.25)',
          display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'
        }}>
          <Loader2 size={16} className="spin" style={{ color: 'var(--m2-accent)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m2-accent)' }}>AI Prediction Running in Background</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>You can navigate freely — results will appear here when ready.</div>
          </div>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>
            <Clock size={11} style={{ display: 'inline', marginRight: 3 }} />
            Started {new Date(job.startedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      <div className="page-container disease-grid">

        {/* ── Left Column: Symptom Input & Parameters ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Free Text Input */}
          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
              Describe Symptoms in Natural Language
            </h3>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="e.g., Patient presents with persistent high fever, productive cough, night sweats, and fatigue for 2 weeks..."
              style={{
                width: '100%', minHeight: 90, padding: '10px 12px', borderRadius: 8,
                background: 'var(--surface-2)', border: '1.5px solid var(--border)',
                color: 'var(--text)', fontSize: 13, outline: 'none', resize: 'vertical',
                fontFamily: 'Inter', lineHeight: 1.5
              }}
            />
          </div>

          {/* Quick Symptom Chips */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Quick-Select Symptoms</h3>
              {selected.length > 0 && (
                <button
                  onClick={() => setSelected([])}
                  style={{ fontSize: 11, color: 'var(--danger)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMON_SYMPTOMS.map(s => {
                const active = selected.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    style={{
                      padding: '5px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                      background: active ? 'rgba(5,150,105,0.12)' : 'var(--surface-2)',
                      color: active ? 'var(--brand)' : 'var(--muted)',
                      fontWeight: active ? 700 : 500,
                      transition: 'all 0.15s',
                    }}
                  >
                    {active ? `✓ ${s}` : `+ ${s}`}
                  </button>
                )
              })}
            </div>

            {selected.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', width: '100%', marginBottom: 2 }}>Selected ({selected.length}):</span>
                {selected.map(s => (
                  <span key={s} style={{ padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(5,150,105,0.15)', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {s}
                    <X size={11} style={{ cursor: 'pointer' }} onClick={() => toggleSymptom(s)} />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Demographics Card */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Patient Demographics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Age</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  className="input"
                  style={{ padding: '7px 10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Biological Sex</label>
                <select
                  value={sex}
                  onChange={e => setSex(e.target.value)}
                  className="input"
                  style={{ padding: '7px 10px' }}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={jobRunning}
            style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
          >
            {jobRunning ? (
              <><Loader2 size={16} className="spin" /> Prediction Running in Background...</>
            ) : (
              <><Brain size={16} /> Predict Condition &amp; Pathologies</>
            )}
          </button>
          {jobRunning && (
            <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', marginTop: -8 }}>
              You can navigate to other pages while this runs.
            </div>
          )}
        </div>

        {/* ── Right Column: AI Predictions & Differential Diagnosis ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {predictions.length > 0 ? (
            <div className="card m2-card fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <span className="badge badge-low" style={{ marginBottom: 4 }}>DDXPlus Neural Classification</span>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'Outfit' }}>
                    Predicted Condition: {topCond?.disease || topCond?.condition}
                  </h3>
                </div>
                <span style={{
                  fontSize: 13, padding: '4px 12px', borderRadius: 99, fontWeight: 800,
                  background: `${confColor[topCond?.confidence] || '#059669'}18`,
                  color: confColor[topCond?.confidence] || '#059669',
                  border: `1px solid ${confColor[topCond?.confidence] || '#059669'}40`
                }}>
                  {topCond?.confidence || 'HIGH'} CONFIDENCE
                </span>
              </div>

              {/* Differential Diagnosis Rankings */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
                  Differential Diagnosis Ranking ({predictions.length} Conditions)
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {predictions.map((p, i) => {
                    const probPct = p.probability_percent || (p.probability ? p.probability * 100 : 0)
                    const color = confColor[p.confidence] || (i === 0 ? 'var(--brand)' : 'var(--muted)')
                    return (
                      <div key={i} style={{ padding: '10px 14px', borderRadius: 10, background: i === 0 ? 'var(--surface-2)' : 'transparent', border: `1px solid ${i === 0 ? 'var(--border)' : 'transparent'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ width: 22, height: 22, borderRadius: 6, background: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: i === 0 ? 800 : 600, color: 'var(--text)' }}>
                              {p.disease || p.condition}
                            </span>
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: `${color}15`, color, fontWeight: 700 }}>
                              {p.confidence}
                            </span>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 800, color }}>
                            {probPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${probPct}%`,
                              background: i === 0 ? 'linear-gradient(90deg, var(--brand), var(--accent))' : 'var(--muted-2)'
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Action Banner to View Treatment */}
              <div style={{ padding: '14px 16px', borderRadius: 10, background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                    Personalized Clinical Treatment Recommendations Ready
                  </div>
                  <div style={{ fontSize: 11, color: '#047857', marginTop: 2 }}>
                    Module 3 has generated first-line therapy, medication classes, and safety checks for this prediction.
                  </div>
                </div>
                <Link to="/treatment" className="btn-primary" style={{ flexShrink: 0, textDecoration: 'none', fontSize: 12, padding: '7px 14px' }}>
                  View Treatment Plan →
                </Link>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 350 }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(2,132,199,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Brain size={32} style={{ color: 'var(--m2-accent)' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'Outfit' }}>
                No Symptom Analysis Performed Yet
              </h3>
              <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 360, lineHeight: 1.5 }}>
                Select symptoms or describe patient complaints on the left to generate differential pathology rankings and confidence estimates.
              </p>
            </div>
          )}

          {/* Past Analyses Session Log */}
          {history.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Previous Symptom Inferences</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.slice(0, 4).map((h, i) => (
                  <div key={i} className="alert-item" style={{ marginBottom: 0 }}>
                    <Brain size={14} style={{ color: 'var(--m2-accent)', marginTop: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        {h.predictions?.[0]?.disease || h.predictions?.[0]?.condition || 'Analysis Record'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Symptoms: {h.symptoms?.join(', ') || h.inputText || '—'}
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                      {new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
