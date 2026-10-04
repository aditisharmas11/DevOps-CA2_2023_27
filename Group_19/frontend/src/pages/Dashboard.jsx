import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, Shield, Brain, Pill,
  ChevronRight, AlertTriangle, Bell, Upload, RefreshCw,
  Calendar, ArrowRight, Activity, Stethoscope, Heart,
  BarChart2, CheckCircle2, Clock, AlertCircle, PlusCircle,
  Zap, User, FileText, Star, ArrowUpRight, Sparkles, Check
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useDiseaseJob } from '../context/DiseaseJobContext'
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

function TrendIcon({ trend }) {
  if (trend === 'up' || trend === 'INCREASING')   return <TrendingUp size={13} style={{ color: '#dc2626', flexShrink: 0 }} />
  if (trend === 'down' || trend === 'DECREASING') return <TrendingDown size={13} style={{ color: '#059669', flexShrink: 0 }} />
  return <Minus size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-md)' }}>
      <div style={{ color: 'var(--muted)', marginBottom: 5, fontWeight: 600 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ marginBottom: 2 }}>
          <span style={{ color: 'var(--muted)' }}>{p.name}: </span>
          <b style={{ color: p.color }}>{p.value}</b>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { job: diseaseJob } = useDiseaseJob()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [now] = useState(new Date())

  const loadData = () => {
    setLoading(true)
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const risk       = data?.latestRisk
  const disease    = data?.latestDisease
  const treatment  = data?.latestTreatment
  const activities = data?.recentActivities || []
  const riskHistory = data?.riskHistory || []

  const hasRisk     = !!risk
  const hasDisease  = !!(disease && disease.predictions?.length > 0)
  const hasTreatment = !!(treatment && (
    (Array.isArray(treatment.recommendations) && treatment.recommendations.length > 0) ||
    (treatment.recommendations && typeof treatment.recommendations === 'object' && Object.keys(treatment.recommendations).length > 0)
  ))

  const recs = treatment?.recommendations
  const recsArray = Array.isArray(recs)
    ? recs
    : recs && typeof recs === 'object'
      ? Object.values(recs).flat()
      : []

  const riskPct = risk?.probabilityPercent ?? 0
  const riskCat = risk?.riskCategory ?? 'LOW'

  const fullReport = risk?.fullReport || {}
  const progPoints = fullReport?.risk_progression || []
  const progChartData = progPoints.length > 0
    ? progPoints.map(p => ({
        label: p.reference_date ? new Date(p.reference_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Point',
        risk: +(p.risk_percent || (p.risk_probability ? p.risk_probability * 100 : 0)).toFixed(1),
        category: p.risk_category || 'MODERATE'
      }))
    : riskHistory.map(r => ({
        label: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        risk: +(r.probabilityPercent || 0).toFixed(1),
        category: r.riskCategory || 'MODERATE'
      }))

  const actualFindings = (risk?.trends && risk.trends.length > 0)
    ? risk.trends.slice(0, 6).map(t => ({
        name: t.observation,
        value: `${t.latest_value || ''} ${t.unit || ''}`.trim() || 'Recorded',
        trend: t.trend === 'INCREASING' ? 'up' : t.trend === 'DECREASING' ? 'down' : 'stable',
        note: t.trend || 'Stable',
        color: t.trend === 'INCREASING' ? '#dc2626' : t.trend === 'DECREASING' ? '#059669' : '#4b7264',
      }))
    : []

  const coveragePct = risk?.dataConfidence?.feature_coverage_percent || (hasRisk ? 40 : 0)
  const qualityData = hasRisk ? [
    { name: 'Complete', value: Math.round(coveragePct), color: '#059669' },
    { name: 'Missing',  value: Math.round(100 - coveragePct), color: 'var(--border)' },
  ] : []

  const age = user?.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth)) / (1000 * 60 * 60 * 24 * 365.25))
    : null
  const hasAge = age !== null && age > 0
  const hasSex = !!user?.gender || !!user?.sex
  const hasProfileInfo = hasAge || hasSex || !!user?.name

  const profileFields = [hasAge, hasSex, !!user?.name, !!user?.email, hasRisk, hasDisease]
  const profileCompletionPct = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 100)

  // Dynamic next step recommendation based on missing/available data
  const getNextStep = () => {
    if (!hasRisk && !hasDisease) {
      return {
        icon: Upload,
        title: 'Upload your first health report',
        desc: 'Start Future Risk Analysis by entering clinical readings or uploading a lab report.',
        link: '/health',
        cta: 'Upload Health Record',
        color: 'var(--m1-accent)'
      }
    }
    if (!hasDisease) {
      return {
        icon: Brain,
        title: 'Check your symptoms with DDXPlus AI',
        desc: 'Evaluate current symptoms or bodily changes to receive neural differential diagnosis.',
        link: '/disease',
        cta: 'Check Your Symptoms',
        color: 'var(--m2-accent)'
      }
    }
    if (!hasTreatment) {
      return {
        icon: Pill,
        title: 'Generate personalized treatment plan',
        desc: 'Combine risk and symptoms into clinical interventions and dietary guidelines.',
        link: '/treatment',
        cta: 'Generate Recommendations',
        color: 'var(--m3-accent)'
      }
    }
    if (!hasAge || !hasSex) {
      return {
        icon: User,
        title: 'Complete your health profile',
        desc: 'Add date of birth and biological sex for tighter reference ranges and calibrated predictions.',
        link: '/profile',
        cta: 'Complete Profile',
        color: 'var(--brand)'
      }
    }
    return {
      icon: Activity,
      title: 'Review your clinical biomarkers',
      desc: 'Check longitudinal trajectory analysis and trend alerts across your lab metrics.',
      link: '/health',
      cta: 'View Clinical Data',
      color: 'var(--m1-accent)'
    }
  }

  const nextStep = getNextStep()
  const StepIcon = nextStep.icon

  return (
    <div className="fade-in">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'Patient'} 👋
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            AI-Powered Personalized Health Intelligence Platform
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand), var(--brand-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'white' }}>
              {user?.name?.[0] || 'P'}
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>{user?.name || 'Patient'}</div>
              <div style={{ color: 'var(--brand)', fontSize: 10, fontFamily: 'JetBrains Mono' }}>{user?.patientId || 'MT-2026-PATIENT'}</div>
            </div>
          </div>
          <div className="btn-ghost">
            <Calendar size={13} />
            {now.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <button className="btn-ghost" onClick={loadData} title="Refresh Dashboard">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="page-container">

        {/* ── Background Job Alert Banner (if prediction in progress) ── */}
        {diseaseJob && diseaseJob.status === 'running' && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: 'rgba(2,132,199,0.07)', border: '1px solid rgba(2,132,199,0.22)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--m2-accent)', animation: 'pulse 1.2s infinite' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--m2-accent)' }}>
                AI Disease Prediction is running in the background
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                You can browse and use any part of MediTwin. Results will appear automatically when finished.
              </div>
            </div>
            <Link to="/disease" className="btn-ghost" style={{ fontSize: 11, padding: '5px 10px', color: 'var(--m2-accent)', borderColor: 'rgba(2,132,199,0.3)' }}>
              View Progress <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* ── Action-Oriented "Get Started" Banner for New Patients ─────── */}
        {!hasRisk && !hasDisease && (
          <div style={{
            marginBottom: 20, padding: '18px 22px', borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(5,150,105,0.08) 0%, rgba(2,132,199,0.06) 100%)',
            border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Sparkles size={22} style={{ color: 'white' }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit' }}>
                  Welcome to MediTwin! Let's set up your personalized health profile.
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Log your latest lab values or describe your symptoms to generate your clinical digital twin and risk forecast.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link to="/health" className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                <Upload size={13} /> Upload Health Record
              </Link>
              <Link to="/disease" className="btn-ghost" style={{ padding: '8px 16px', fontSize: 12 }}>
                <Brain size={13} /> Check Symptoms
              </Link>
            </div>
          </div>
        )}

        {/* ── Top Row: Health Snapshot + Recommended Next Step ────────── */}
        {(hasRisk || hasDisease || hasProfileInfo) && (
          <div className="dashboard-snapshot-grid">
            {/* Snapshot */}
            <div className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                <User size={14} style={{ color: 'var(--brand)' }} />
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>Your Health Snapshot</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 10, padding: '2px 8px', borderRadius: 99,
                  background: profileCompletionPct >= 80 ? 'rgba(5,150,105,0.12)' : 'rgba(217,119,6,0.12)',
                  color: profileCompletionPct >= 80 ? 'var(--m1-accent)' : 'var(--m3-accent)',
                  fontWeight: 700,
                  border: `1px solid ${profileCompletionPct >= 80 ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.25)'}`
                }}>
                  {profileCompletionPct}% Complete
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                {hasAge && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>Age</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit' }}>{age} yrs</div>
                  </div>
                )}
                {hasSex && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>Sex</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit', textTransform: 'capitalize' }}>
                      {user.gender || user.sex}
                    </div>
                  </div>
                )}
                {hasRisk && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 3 }}>Risk Status</div>
                    <span className={`badge ${riskBadgeClass(riskCat)}`}>
                      {riskCat} ({riskPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
                {hasRisk && risk.createdAt && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>Last Health Record</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                      {new Date(risk.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {hasDisease && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>Last Symptom Assessment</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m2-accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Brain size={12} />
                      {disease.predictions[0]?.disease || disease.predictions[0]?.condition || 'Evaluated'}
                    </div>
                  </div>
                )}
                {!hasRisk && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>Health Records</div>
                    <Link to="/health" style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', textDecoration: 'none' }}>
                      + Enter Data →
                    </Link>
                  </div>
                )}
                {!hasDisease && (
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>Symptom Check</div>
                    <Link to="/disease" style={{ fontSize: 12, fontWeight: 700, color: 'var(--m2-accent)', textDecoration: 'none' }}>
                      + Check Now →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic Next Step card */}
            <div className="card" style={{
              padding: '14px 18px', width: '100%',
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Zap size={13} style={{ color: nextStep.color }} />
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Recommended Next Action
                </span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                  {nextStep.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, lineHeight: 1.3 }}>
                  {nextStep.desc}
                </div>
              </div>
              <Link to={nextStep.link} className="btn-primary" style={{
                padding: '6px 12px', fontSize: 11, alignSelf: 'flex-start',
                background: nextStep.color, borderColor: nextStep.color
              }}>
                <StepIcon size={12} /> {nextStep.cta} <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        )}

        {/* ── Row 1: The 3 Core Module Cards ──────────────────────────── */}
        <div className="dashboard-modules-grid">

          {/* Module 1: Future Risk Prediction */}
          <div className="card m1-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--m1-accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  MODULE 1
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Future Risk Prediction</div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={16} style={{ color: 'var(--m1-accent)' }} />
              </div>
            </div>

            {hasRisk ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                <RiskGauge percent={riskPct} size={110} category={riskCat} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: 5 }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Risk Category</div>
                    <span className={`badge ${riskBadgeClass(riskCat)}`}>{riskCat}</span>
                  </div>
                  <div className="stat-row">
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Horizon</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>{risk.predictionHorizonDays || 90} Days</span>
                  </div>
                  <div className="stat-row">
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Confidence</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--m1-accent)' }}>
                      {risk.dataConfidence?.category || 'HIGH'}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>Last Assessed</span>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {new Date(risk.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '16px 8px', background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)', margin: '4px 0 10px' }}>
                <Shield size={26} style={{ color: 'var(--muted)', opacity: 0.5, marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>No Risk Analysis Yet</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 220, lineHeight: 1.3 }}>
                  Log clinical vitals or upload a lab report to evaluate your health trajectories.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <Link to="/health" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 12 }}>
                {hasRisk ? <><RefreshCw size={12} /> Update Health Data</> : <><Upload size={12} /> Enter Health Data</>}
              </Link>
              <Link to="/health" className="btn-ghost" style={{ padding: '7px 10px' }} title="View Details">
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Module 2: Disease Prediction */}
          <div className="card m2-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--m2-accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  MODULE 2
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Disease Prediction from Symptoms</div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(2,132,199,0.1)', border: '1px solid rgba(2,132,199,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Brain size={16} style={{ color: 'var(--m2-accent)' }} />
              </div>
            </div>

            {diseaseJob && diseaseJob.status === 'running' ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '16px 8px', background: 'rgba(2,132,199,0.06)', borderRadius: 8, border: '1px solid rgba(2,132,199,0.25)' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--m2-accent)', animation: 'pulse 1s infinite', marginBottom: 8 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m2-accent)' }}>Prediction Running in Background…</div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>DDXPlus Neural Network Processing</div>
              </div>
            ) : hasDisease ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>Most Likely Condition:</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit', marginBottom: 8 }}>
                  {disease.predictions[0]?.disease || disease.predictions[0]?.condition || 'Identified'}
                </div>
                {disease.predictions[0]?.probability && (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>
                      <span>Model Confidence</span>
                      <b>{(disease.predictions[0].probability * 100).toFixed(0)}%</b>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${(disease.predictions[0].probability * 100).toFixed(0)}%`, background: 'var(--m2-accent)' }} />
                    </div>
                  </div>
                )}
                {disease.predictions.length > 1 && (
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    +{disease.predictions.length - 1} differential diagnoses evaluated
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '16px 8px', background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)', margin: '4px 0 10px' }}>
                <Brain size={26} style={{ color: 'var(--muted)', opacity: 0.5, marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>No Symptom Analysis</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 220, lineHeight: 1.3 }}>
                  Describe symptoms in natural language for AI neural differential diagnosis.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <Link to="/disease" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 12, background: 'var(--m2-accent)', borderColor: 'var(--m2-accent)' }}>
                <Brain size={12} /> Check Your Symptoms
              </Link>
              <Link to="/disease" className="btn-ghost" style={{ padding: '7px 10px' }} title="View Details">
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

          {/* Module 3: Treatment & Recommendations */}
          <div className="card m3-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--m3-accent)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  MODULE 3
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Treatment & Recommendations</div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Pill size={16} style={{ color: 'var(--m3-accent)' }} />
              </div>
            </div>

            {hasTreatment ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>
                    {recsArray[0]?.condition || recsArray[0]?.disease || 'Personalized Care Plan'}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: treatment.urgencyLevel === 'URGENT_EVALUATION' ? '#fee2e2' : treatment.urgencyLevel === 'HIGH_PRIORITY' ? '#fef3c7' : '#dcfce7',
                    color: treatment.urgencyLevel === 'URGENT_EVALUATION' ? '#dc2626' : treatment.urgencyLevel === 'HIGH_PRIORITY' ? '#d97706' : '#059669',
                    border: `1px solid ${treatment.urgencyLevel === 'URGENT_EVALUATION' ? '#fca5a5' : treatment.urgencyLevel === 'HIGH_PRIORITY' ? '#fde68a' : '#bbf7d0'}`
                  }}>
                    {treatment.urgencyLevel === 'URGENT_EVALUATION' ? 'Urgent Review' : treatment.urgencyLevel === 'HIGH_PRIORITY' ? 'High Priority' : 'Routine Follow-Up'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(() => {
                    const items = []
                    for (const rec of recsArray) {
                      if (Array.isArray(rec.first_line_approach)) {
                        for (const app of rec.first_line_approach) {
                          if (typeof app === 'string' && app.trim()) items.push(app)
                        }
                      } else if (typeof rec.first_line_approach === 'string' && rec.first_line_approach.trim()) {
                        items.push(rec.first_line_approach)
                      }
                      if (Array.isArray(rec.medication_classes) && rec.medication_classes.length > 0) {
                        items.push(`Therapy: ${rec.medication_classes.slice(0, 2).join(', ')}`)
                      }
                    }
                    const displayList = items.length > 0 ? items.slice(0, 3) : [
                      recsArray[0]?.description || 'Clinical maintenance protocol active.'
                    ]
                    return displayList.map((text, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--m3-accent)', marginTop: 5, flexShrink: 0 }} />
                        <span style={{ lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                          {text}
                        </span>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '16px 8px', background: 'var(--surface-2)', borderRadius: 8, border: '1px dashed var(--border)', margin: '4px 0 10px' }}>
                <Pill size={26} style={{ color: 'var(--muted)', opacity: 0.5, marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>No Treatment Plan</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 220, lineHeight: 1.3 }}>
                  Complete an assessment to generate clinical recommendations.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
              <Link to="/treatment" className="btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '7px 0', fontSize: 12, background: 'var(--m3-accent)', borderColor: 'var(--m3-accent)' }}>
                <Pill size={12} /> {hasTreatment ? 'View Recommendations' : 'Generate Recommendations'}
              </Link>
              <Link to="/treatment" className="btn-ghost" style={{ padding: '7px 10px' }} title="View Details">
                <ChevronRight size={13} />
              </Link>
            </div>
          </div>

        </div>

        {/* ── Row 2: Biomarkers, Key Clinical Findings & Risk Progression ─ */}
        <div className="dashboard-middle-grid">

          {/* Biomarker Trajectories */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Biomarker Trajectories</h3>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {hasRisk
                    ? `Tracked across ${risk.historySummary?.total_records || 60} recorded lab observations`
                    : 'Upload patient records to render longitudinal biomarker curves'}
                </div>
              </div>
              {hasRisk && (
                <span className="badge badge-low" style={{ fontSize: 10 }}>Patient Data</span>
              )}
            </div>

            {hasRisk && actualFindings.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                {actualFindings.slice(0, 4).map((f, i) => (
                  <div key={i} className="card-sm">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.name}
                      </span>
                      <TrendIcon trend={f.trend} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{f.value}</div>
                    <div style={{ fontSize: 10, color: f.color, fontWeight: 700, marginTop: 2 }}>{f.note}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px dashed var(--border)', gap: 8, padding: 16
              }}>
                <BarChart2 size={28} style={{ color: 'var(--muted-2)' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>No Biomarker Trajectories Recorded</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 280, lineHeight: 1.4 }}>
                  Log your latest blood panel, lipid profile, or glucose numbers to visualize longitudinal trajectories.
                </div>
                <Link to="/health" className="btn-primary" style={{ padding: '6px 14px', fontSize: 11, marginTop: 2 }}>
                  <PlusCircle size={12} /> Enter Biomarker Data
                </Link>
              </div>
            )}
          </div>

          {/* Key Clinical Findings */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Key Clinical Findings</h3>
              {hasRisk && <span className="badge badge-moderate" style={{ fontSize: 10 }}>Risk Flags</span>}
            </div>

            {hasRisk && actualFindings.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {actualFindings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < actualFindings.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 11 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <TrendIcon trend={f.trend} />
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{f.name}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: f.color }}>{f.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px dashed var(--border)', gap: 6, padding: 12
              }}>
                <Stethoscope size={24} style={{ color: 'var(--muted-2)' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>No Clinical Flags</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>
                  Findings will populate automatically when lab values or clinical vitals are recorded.
                </div>
                <Link to="/health" className="btn-ghost" style={{ padding: '4px 10px', fontSize: 10, marginTop: 2 }}>
                  Run Assessment →
                </Link>
              </div>
            )}
          </div>

          {/* Risk Progression */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Risk Progression</h3>
              <span className="badge badge-low" style={{ fontSize: 10 }}>{hasRisk ? `${riskPct.toFixed(0)}%` : 'No Data'}</span>
            </div>

            {progChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={progChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={riskColor(riskCat)} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={riskColor(riskCat)} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--muted)' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted)' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="risk" name="Risk %" stroke={riskColor(riskCat)} strokeWidth={2} fillOpacity={1} fill="url(#riskGrad)" dot={{ r: 3, fill: riskColor(riskCat) }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{
                height: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', background: 'var(--surface-2)', borderRadius: 10, border: '1px dashed var(--border)', gap: 6, padding: 12
              }}>
                <TrendingUp size={24} style={{ color: 'var(--muted-2)' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Trajectory Pending</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.3 }}>
                  Progression curve updates with each subsequent health assessment over time.
                </div>
              </div>
            )}
          </div>

        </div>

        {/* ── Row 3: Summaries, Activity & Doctor Notes ───────────────── */}
        <div className="dashboard-summary-grid">

          {/* Data Summary */}
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Data Summary</h3>
            {[
              { label: 'Total Records',     val: risk?.historySummary?.total_records ?? 0 },
              { label: 'Observation Types', val: risk?.historySummary?.observation_types ?? 0 },
              { label: 'Unique Dates',      val: risk?.historySummary?.unique_dates ?? 0 },
              { label: 'History Duration',  val: hasRisk ? `${risk?.historySummary?.history_days ?? 0} Days` : '0 Days' },
              { label: 'Coverage',          val: `${coveragePct.toFixed(0)}%` },
            ].map(({ label, val }) => (
              <div key={label} className="stat-row">
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{val}</span>
              </div>
            ))}
            <div className="progress-track" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${coveragePct}%` }} />
            </div>
          </div>

          {/* Data Quality */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, alignSelf: 'flex-start' }}>Data Quality</h3>
            {hasRisk ? (
              <>
                <PieChart width={85} height={85}>
                  <Pie data={qualityData} cx={42} cy={42} innerRadius={26} outerRadius={38} dataKey="value" strokeWidth={0}>
                    {qualityData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)', marginTop: -6, fontFamily: 'Outfit' }}>
                  {(risk.dataConfidence?.percent || 93.3).toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Feature Completeness</div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <Activity size={24} style={{ color: 'var(--muted-2)', marginBottom: 4 }} />
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>No data logged</div>
              </div>
            )}
          </div>

          {/* Recent Health Activities */}
          <div className="card" style={{ gridColumn: 'span 3' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 800, margin: 0 }}>Recent Health Activities</h3>
              <Link to="/timeline" style={{ fontSize: 11, color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
                View Full Timeline →
              </Link>
            </div>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {activities.slice(0, 3).map((act, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, background: 'var(--surface-2)', fontSize: 11 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.title || act.type}
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: 10, flexShrink: 0 }}>
                      {act.createdAt ? new Date(act.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--muted)', fontSize: 11 }}>
                No recent activities recorded yet. Complete an assessment or log vitals to build your timeline.
              </div>
            )}
          </div>

        </div>

        {/* ── Doctor Feedback Notes (if any) ─────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Stethoscope size={16} style={{ color: 'var(--brand)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Doctor Feedback & Clinical Notes</h3>
            </div>
            <Link to="/alerts" style={{ fontSize: 11, color: 'var(--brand)', textDecoration: 'none', fontWeight: 600 }}>
              View Clinical History →
            </Link>
          </div>
          {data?.doctorFeedback && data.doctorFeedback.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.doctorFeedback.map((fb, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{fb.doctorName || 'Attending Physician'}</span>
                      {fb.specialty && <span className="badge badge-low" style={{ fontSize: 9 }}>{fb.specialty}</span>}
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      {new Date(fb.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginTop: 4 }}>
                    "{fb.feedback}"
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <Stethoscope size={22} style={{ color: 'var(--muted-2)', marginBottom: 6 }} />
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>No doctor feedback notes recorded yet.</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                Share your Patient ID (<b>{user?.patientId}</b>) with your physician to receive clinical guidance.
              </div>
            </div>
          )}
        </div>

        {/* ── Guided Next Steps Flow ─────────────────────────────────── */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>Recommended Next Steps</h3>
          <div className="dashboard-steps-flow">
            {[
              { icon: Upload,      label: 'Log Health Data',  desc: 'PDF Report or Vitals',   color: 'var(--m1-accent)', link: '/health' },
              { icon: Brain,       label: 'Analyse Symptoms', desc: 'Run disease classifier', color: 'var(--m2-accent)', link: '/disease' },
              { icon: Stethoscope, label: 'Clinical Review',  desc: 'Check biomarker flags',  color: '#0d9488',          link: '/health' },
              { icon: Pill,        label: 'Treatment Plan',   desc: 'View recommendations',   color: 'var(--m3-accent)', link: '/treatment' },
              { icon: Calendar,    label: 'Track Progress',   desc: 'Timeline and History',   color: '#7c3aed',          link: '/timeline' },
            ].map((step, i) => {
              const Icon = step.icon
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <Link to={step.link} className="step-card" style={{ textDecoration: 'none', flex: 1, padding: '14px 10px', minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `rgba(16, 185, 129, 0.1)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px'
                    }}>
                      <Icon size={18} style={{ color: step.color }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{step.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', lineHeight: 1.3 }}>{step.desc}</div>
                  </Link>
                  {i < 4 && (
                    <div className="step-arrow" style={{ color: 'var(--muted-2)', padding: '0 6px', flexShrink: 0 }}>
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
