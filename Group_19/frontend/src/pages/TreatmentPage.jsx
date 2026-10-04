import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Pill, AlertTriangle, Shield, Heart, Loader2, ChevronDown,
  ChevronRight, CheckCircle2, AlertCircle, Activity, Info,
  Stethoscope, RefreshCw, Sparkles, Brain, ArrowRight,
  ClipboardList, Search, FileText, Calendar, UserCheck, Clock,
  TrendingUp, TrendingDown, Minus, ExternalLink, Printer,
  ShieldAlert, HeartPulse, Droplet, BookOpen, Flame, HelpCircle,
  Check, PhoneCall, CheckSquare
} from 'lucide-react'
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ReferenceLine
} from 'recharts'
import api from '../lib/api'

// ── Urgency Level Configuration ─────────────────────────────────────────────
const urgencyConfig = {
  ROUTINE_FOLLOW_UP: {
    color: '#059669',
    bg: '#dcfce7',
    border: '#bbf7d0',
    label: 'Routine Follow-Up',
    description: 'Your clinical parameters are generally stable. Schedule routine checkups and continue recommended preventive habits.',
    timeframe: 'Next 30–90 Days',
    icon: CheckCircle2
  },
  HIGH_PRIORITY: {
    color: '#d97706',
    bg: '#fef3c7',
    border: '#fde68a',
    label: 'High Priority Clinical Attention',
    description: 'Notable biomarker elevations or disease probabilities detected. A physician consultation is strongly recommended within 1 to 2 weeks.',
    timeframe: 'Within 7–14 Days',
    icon: AlertTriangle
  },
  URGENT_EVALUATION: {
    color: '#dc2626',
    bg: '#fee2e2',
    border: '#fecaca',
    label: 'Urgent Clinical Evaluation',
    description: 'Acute risk markers or critical symptoms require prompt medical review. Contact your healthcare provider promptly or visit an urgent care center.',
    timeframe: 'Immediate / 24–48 Hours',
    icon: AlertCircle
  },
  INSUFFICIENT_INFORMATION: {
    color: '#0284c7',
    bg: '#e0f2fe',
    border: '#bae6fd',
    label: 'Assessment Pending More Data',
    description: 'Additional health records or lab tests will help refine your personalized recommendations.',
    timeframe: 'Upon Uploading Labs',
    icon: Info
  },
}

// ── Biomarker Context & Normal Reference Ranges ─────────────────────────────
const BIOMARKER_MAP = {
  systolic_blood_pressure: {
    label: 'Systolic Blood Pressure (SBP)',
    category: 'Cardiovascular',
    unit: 'mmHg',
    normalRange: '< 120 mmHg',
    normalMin: 90,
    normalMax: 120,
    desc: 'The peak pressure exerted on your artery walls each time your heart beats.',
    meaning: 'Sustained elevation forces the heart to pump against higher resistance, increasing cardiovascular strain over time.'
  },
  diastolic_blood_pressure: {
    label: 'Diastolic Blood Pressure (DBP)',
    category: 'Cardiovascular',
    unit: 'mmHg',
    normalRange: '< 80 mmHg',
    normalMin: 60,
    normalMax: 80,
    desc: 'The baseline pressure in your arteries between heart contractions.',
    meaning: 'High baseline pressure means your blood vessels never fully relax at rest.'
  },
  heart_rate: {
    label: 'Resting Heart Rate (Pulse)',
    category: 'Vitals',
    unit: 'bpm',
    normalRange: '60 – 100 bpm',
    normalMin: 60,
    normalMax: 100,
    desc: 'The number of times your heart contracts per minute at rest.',
    meaning: 'Persistent resting tachycardia can signal metabolic stress, anxiety, or cardiac strain.'
  },
  glucose: {
    label: 'Fasting Blood Glucose',
    category: 'Metabolic',
    unit: 'mg/dL',
    normalRange: '70 – 99 mg/dL',
    normalMin: 70,
    normalMax: 100,
    desc: 'The amount of glucose circulating in your blood after an overnight fast.',
    meaning: 'Elevated fasting sugar points to insulin resistance or early diabetes progression.'
  },
  fasting_glucose: {
    label: 'Fasting Blood Glucose',
    category: 'Metabolic',
    unit: 'mg/dL',
    normalRange: '70 – 99 mg/dL',
    normalMin: 70,
    normalMax: 100,
    desc: 'The amount of glucose circulating in your blood after an overnight fast.',
    meaning: 'Elevated fasting sugar points to insulin resistance or early diabetes progression.'
  },
  creatinine: {
    label: 'Serum Creatinine',
    category: 'Kidney Function',
    unit: 'mg/dL',
    normalRange: '0.7 – 1.3 mg/dL',
    normalMin: 0.7,
    normalMax: 1.3,
    desc: 'A waste byproduct from normal muscle wear, filtered by healthy kidneys.',
    meaning: 'Rising levels indicate that kidney filtration rate may be reduced.'
  },
  serum_creatinine: {
    label: 'Serum Creatinine',
    category: 'Kidney Function',
    unit: 'mg/dL',
    normalRange: '0.7 – 1.3 mg/dL',
    normalMin: 0.7,
    normalMax: 1.3,
    desc: 'A waste byproduct from normal muscle wear, filtered by healthy kidneys.',
    meaning: 'Rising levels indicate that kidney filtration rate may be reduced.'
  },
  total_cholesterol: {
    label: 'Total Cholesterol',
    category: 'Lipid Panel',
    unit: 'mg/dL',
    normalRange: '< 200 mg/dL',
    normalMin: 120,
    normalMax: 200,
    desc: 'Total circulating blood lipids composed of HDL, LDL, and triglycerides.',
    meaning: 'Surplus circulating lipids can gradually build into arterial plaque.'
  },
  cholesterol: {
    label: 'Total Cholesterol',
    category: 'Lipid Panel',
    unit: 'mg/dL',
    normalRange: '< 200 mg/dL',
    normalMin: 120,
    normalMax: 200,
    desc: 'Total circulating blood lipids composed of HDL, LDL, and triglycerides.',
    meaning: 'Surplus circulating lipids can gradually build into arterial plaque.'
  },
  oxygen_saturation: {
    label: 'Blood Oxygen Saturation (SpO2)',
    category: 'Respiratory',
    unit: '%',
    normalRange: '95 – 100%',
    normalMin: 95,
    normalMax: 100,
    desc: 'Percentage of hemoglobin molecules carrying oxygen in arterial blood.',
    meaning: 'Levels dropping below 95% signify compromised gas exchange in the lungs.'
  },
  spo2: {
    label: 'Blood Oxygen Saturation (SpO2)',
    category: 'Respiratory',
    unit: '%',
    normalRange: '95 – 100%',
    normalMin: 95,
    normalMax: 100,
    desc: 'Percentage of hemoglobin molecules carrying oxygen in arterial blood.',
    meaning: 'Levels dropping below 95% signify compromised gas exchange in the lungs.'
  },
  body_temperature: {
    label: 'Body Temperature',
    category: 'Vitals',
    unit: '°F',
    normalRange: '97.0 – 99.0 °F',
    normalMin: 97.0,
    normalMax: 99.0,
    desc: 'Core physiological thermal equilibrium.',
    meaning: 'Pyrexia (fever) indicates the immune system is actively fighting inflammation or infection.'
  },
  temperature: {
    label: 'Body Temperature',
    category: 'Vitals',
    unit: '°F',
    normalRange: '97.0 – 99.0 °F',
    normalMin: 97.0,
    normalMax: 99.0,
    desc: 'Core physiological thermal equilibrium.',
    meaning: 'Pyrexia (fever) indicates the immune system is actively fighting inflammation or infection.'
  },
  hba1c: {
    label: 'Glycated Hemoglobin (HbA1c)',
    category: 'Metabolic',
    unit: '%',
    normalRange: '< 5.7%',
    normalMin: 4.0,
    normalMax: 5.7,
    desc: 'Average blood sugar concentration over the past 8 to 12 weeks.',
    meaning: 'Values above 5.7% signal prediabetes; values ≥ 6.5% confirm active diabetes.'
  }
}

function getBiomarkerMeta(rawKey, val) {
  const normKey = (rawKey || '').toLowerCase().replace(/[\s-]/g, '_')
  const found = BIOMARKER_MAP[normKey]
  if (found) return found

  const prettyName = (rawKey || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  return {
    label: prettyName,
    category: 'Clinical Lab',
    unit: '',
    normalRange: 'Standard Reference',
    desc: `Quantitative clinical observation for ${prettyName}.`,
    meaning: 'Monitored as an indicator of physiological status.'
  }
}

// ── Drug Class Plain-Language Explanations ───────────────────────────────────
const DRUG_CLASS_INFO = {
  'ace inhibitor': {
    plainName: 'Blood Vessel Relaxers (ACE Inhibitors)',
    whatItDoes: 'Gently relaxes and widens your blood vessels so your heart can pump blood more easily and keep blood pressure controlled.',
    tip: 'Take at a consistent time each day and stay normally hydrated. Contact your doctor if you develop a persistent dry cough.'
  },
  'angiotensin': {
    plainName: 'Blood Pressure Vessel Protectors (ARBs)',
    whatItDoes: 'Prevents chemicals from tightening blood vessels, helping to reduce arterial pressure and shield kidney function.',
    tip: 'Avoid excessive potassium supplements or salt substitutes without asking your doctor.'
  },
  'beta blocker': {
    plainName: 'Heart Rhythm & Workload Balancers (Beta-Blockers)',
    whatItDoes: 'Slows down a rapid heart rate and reduces the force of heart beats, letting the cardiac muscle rest more between beats.',
    tip: 'Do not stop taking this medication abruptly without consulting your doctor first.'
  },
  'calcium channel blocker': {
    plainName: 'Arterial Muscle Relaxers (CCBs)',
    whatItDoes: 'Prevents calcium from contracting blood vessel walls, keeping arteries relaxed and widening blood flow.',
    tip: 'Avoid eating grapefruit or drinking grapefruit juice unless cleared by your pharmacist.'
  },
  'diuretic': {
    plainName: 'Water & Salt Balance Pills (Diuretics)',
    whatItDoes: 'Assists your kidneys in flushing extra water and sodium from your bloodstream into urine, reducing fluid load.',
    tip: 'Best taken in the morning to prevent waking up at night for bathroom visits.'
  },
  'statin': {
    plainName: 'Cholesterol & Plaque Stabilizers (Statins)',
    whatItDoes: 'Lowers the liver’s production of LDL ("bad") cholesterol and stabilizes the inner lining of arteries to prevent plaque formation.',
    tip: 'Often taken at bedtime, which is when the liver naturally produces the most cholesterol.'
  },
  'biguanide': {
    plainName: 'Blood Sugar Regulators (Metformin)',
    whatItDoes: 'Reduces the amount of sugar released by your liver and helps your muscles absorb blood glucose more efficiently.',
    tip: 'Taking this with or right after your main meal helps prevent mild stomach upset.'
  },
  'sglt2': {
    plainName: 'Kidney Sugar Clearers (SGLT2 Inhibitors)',
    whatItDoes: 'Helps your kidneys remove excess glucose directly into urine, while also protecting heart and kidney health.',
    tip: 'Drink plenty of water throughout the day to stay well hydrated.'
  },
  'bronchodilator': {
    plainName: 'Airway Openers (Inhalers / Bronchodilators)',
    whatItDoes: 'Relaxes the tight muscles around your bronchial breathing passages so air can move smoothly into your lungs.',
    tip: 'Rinse your mouth with water and spit it out after using inhalers that contain steroids.'
  },
  'antibiotic': {
    plainName: 'Targeted Antibacterial Therapy',
    whatItDoes: 'Selectively stops the reproduction of harmful bacteria causing acute infections in your body.',
    tip: 'Always finish the complete course of medicine exactly as prescribed, even if you feel 100% better early.'
  },
  'nsaid': {
    plainName: 'Anti-Inflammatory Pain Relievers (NSAIDs)',
    whatItDoes: 'Reduces natural inflammatory chemicals to ease swelling, joint stiffness, and fever.',
    tip: 'Always take with food or milk to protect your stomach lining. Avoid prolonged unmonitored use.'
  },
  'corticosteroid': {
    plainName: 'Immune & Inflammation Soothers (Steroids)',
    whatItDoes: 'Calms down severe inflammation and eases overactive immune responses during acute flares.',
    tip: 'Always follow your doctor’s exact tapering instructions when stopping this medication.'
  }
}

function getDrugClassExplanation(className) {
  const lower = (className || '').toLowerCase()
  for (const [key, val] of Object.entries(DRUG_CLASS_INFO)) {
    if (lower.includes(key)) return val
  }
  return {
    plainName: className || 'Targeted Clinical Therapy',
    whatItDoes: 'Clinically prescribed to manage physiological pathways, balance biological markers, and support recovery.',
    tip: 'Discuss appropriate dosing, timing, and possible drug interactions with your doctor or pharmacist.'
  }
}

// ── Emergency Red Flag Warning Signs ─────────────────────────────────────────
const EMERGENCY_RED_FLAGS = [
  {
    title: 'Crushing Chest Pain or Pressure',
    detail: 'Chest tightness, squeezing, or pain spreading to your jaw, neck, left arm, or back.',
    icon: Flame
  },
  {
    title: 'Severe Shortness of Breath at Rest',
    detail: 'Sudden gasping, inability to speak full sentences, or blue tint to lips or fingertips.',
    icon: HeartPulse
  },
  {
    title: 'Sudden Neurological Deficits',
    detail: 'Face drooping on one side, arm weakness or numbness, slurred speech, or sudden confusion.',
    icon: ShieldAlert
  },
  {
    title: 'Fainting or Loss of Consciousness',
    detail: 'Sudden syncope, blackout, severe persistent dizziness, or inability to stay upright.',
    icon: AlertTriangle
  },
  {
    title: 'Uncontrollable High Fever with Stiff Neck',
    detail: 'Temperature over 103°F (39.4°C) unresponsive to fever reducers, accompanied by severe headache.',
    icon: AlertCircle
  }
]

export default function TreatmentPage() {
  const [data, setData]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState('')
  const [activeTab, setActiveTab]   = useState('story') // 'story' | 'clinical'
  const [expandedRecs, setExpandedRecs] = useState({})

  const toggleRec = (idx) => {
    setExpandedRecs(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const loadData = () => {
    setLoading(true)
    setError('')
    api.get('/treatment/latest')
      .then(res => {
        setData(res.data)
      })
      .catch(err => {
        console.error('Treatment load error:', err)
        setData(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleGenerate = async () => {
    setGenerating(true)
    setError('')
    try {
      const res = await api.post('/treatment/generate')
      setData(res.data)
      setActiveTab('story')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate recommendations. Please ensure you have uploaded health records or entered symptoms.')
    } finally {
      setGenerating(false)
    }
  }

  // Extract structured recommendations
  const rawRecs = data?.recommendations
  const recsArray = useMemo(() => {
    if (Array.isArray(rawRecs)) return rawRecs
    if (rawRecs && typeof rawRecs === 'object') return Object.values(rawRecs).flat()
    return []
  }, [rawRecs])

  const urgencyKey = data?.urgencyLevel || data?.fullReport?.urgency?.level || 'ROUTINE_FOLLOW_UP'
  const urg = urgencyConfig[urgencyKey] || urgencyConfig.ROUTINE_FOLLOW_UP
  const UrgIcon = urg.icon

  // Extract patient context
  const patientContext = data?.patientContext || {}
  const latestRisk = patientContext.latestRisk || data?.fullReport?.future_risk || null
  const latestSymptom = patientContext.latestSymptom || null
  const riskHistory = patientContext.riskHistory || []
  const doctorFeedback = patientContext.doctorFeedback || null
  const drugLookups = data?.drugLookups || data?.fullReport?.external_drug_information || {}

  // Primary predicted condition
  const primaryRec = recsArray[0] || null
  const primaryConditionName = primaryRec?.condition || primaryRec?.disease || 'General Health Protocol'
  const primaryConfidence = primaryRec?.confidence_band || primaryRec?.confidence || 'HIGH'

  // Risk values
  const acuteRiskProb = latestRisk?.probabilityPercent ?? (
    latestRisk?.probability ? Math.round(latestRisk.probability * 100) : (
      data?.fullReport?.future_risk?.probability_percent ?? null
    )
  )
  const riskCategory = latestRisk?.riskCategory || data?.fullReport?.future_risk?.risk_category || 'MODERATE'
  const riskHorizonDays = latestRisk?.predictionHorizonDays || data?.fullReport?.future_risk?.prediction_horizon_days || 90

  // Longitudinal Risk progression chart data
  const chartData = useMemo(() => {
    if (riskHistory && riskHistory.length > 0) {
      return riskHistory.map((item, idx) => ({
        index: idx + 1,
        date: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        risk: Number((item.probabilityPercent ?? (item.probability ? item.probability * 100 : 0)).toFixed(1)),
        category: item.riskCategory || 'MODERATE'
      }))
    }
    if (acuteRiskProb !== null) {
      return [
        { index: 1, date: 'Baseline', risk: Math.max(5, acuteRiskProb - 4), category: riskCategory },
        { index: 2, date: 'Current Evaluation', risk: acuteRiskProb, category: riskCategory },
        { index: 3, date: `Day +${riskHorizonDays} (Projected Target)`, risk: Math.max(10, Math.round(acuteRiskProb * 0.65)), category: 'LOW' }
      ]
    }
    return []
  }, [riskHistory, acuteRiskProb, riskHorizonDays, riskCategory])

  // Extract Biomarker trends
  const biomarkerTrends = useMemo(() => {
    const rawTrends = latestRisk?.trends || data?.fullReport?.patient_context?.module1?.observation_progression || []
    if (Array.isArray(rawTrends) && rawTrends.length > 0) {
      return rawTrends
    }
    // Fallback: check important clinical findings in fullReport
    const findings = data?.fullReport?.important_clinical_findings || []
    return findings.map(f => ({
      observation_name: f.observation || f.name,
      baseline_value: f.latest_value,
      latest_value: f.latest_value,
      trend: f.trend || 'STABLE',
      abnormality: f.abnormality || 'HIGH',
      unit: f.unit || ''
    }))
  }, [latestRisk, data])

  // Count abnormal markers
  const abnormalCount = useMemo(() => {
    return biomarkerTrends.filter(b => b.abnormality === 'HIGH' || b.abnormality === 'LOW' || b.worsening).length
  }, [biomarkerTrends])

  // Categorize recommendations into Lifestyle vs Medications vs Monitoring
  const categorizedActions = useMemo(() => {
    const lifestyle = []
    const medications = []
    const monitoringItems = []

    recsArray.forEach(rec => {
      const condition = rec.condition || rec.disease || 'General'

      // First line approaches
      const approaches = Array.isArray(rec.first_line_approach)
        ? rec.first_line_approach
        : typeof rec.first_line_approach === 'string'
          ? [rec.first_line_approach]
          : []

      approaches.forEach(item => {
        const text = String(item).toLowerCase()
        const isMed = text.includes('medication') || text.includes('initi') || text.includes('therapy') || text.includes('statin') || text.includes('inhibitor') || text.includes('blocker') || text.includes('dose')
        const isMon = text.includes('monitor') || text.includes('log') || text.includes('check') || text.includes('repeat') || text.includes('panel') || text.includes('test')

        if (isMed) {
          medications.push({ condition, text: item, type: 'approach' })
        } else if (isMon) {
          monitoringItems.push({ condition, text: item, type: 'monitoring' })
        } else {
          lifestyle.push({ condition, text: item, type: 'lifestyle' })
        }
      })

      // Explicit medication classes
      const classes = rec.medication_classes || []
      const examples = rec.common_examples || []
      classes.forEach((cls, i) => {
        medications.push({
          condition,
          drugClass: cls,
          examples: examples.slice(i * 2, i * 2 + 2),
          why: rec.why_prioritized?.[0] || `Indicated for clinical management of ${condition}.`,
          type: 'class'
        })
      })

      // Monitoring
      const mons = rec.monitoring || []
      mons.forEach(m => {
        monitoringItems.push({ condition, text: m, type: 'surveillance' })
      })
    })

    return { lifestyle, medications, monitoringItems }
  }, [recsArray])

  // Symptoms from Module 2
  const reportedSymptoms = useMemo(() => {
    if (latestSymptom?.symptoms && latestSymptom.symptoms.length > 0) {
      return latestSymptom.symptoms
    }
    if (data?.fullReport?.patient_context?.module2?.positive_evidence_text) {
      return data.fullReport.patient_context.module2.positive_evidence_text
    }
    return []
  }, [latestSymptom, data])

  // Top SHAP drivers / Important factors from Module 1
  const importantDrivers = useMemo(() => {
    const raw = latestRisk?.importantFactors || latestRisk?.top_risk_increasing_factors || []
    if (Array.isArray(raw)) {
      return raw.slice(0, 4)
    }
    return []
  }, [latestRisk])

  return (
    <div className="fade-in">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99,
              background: 'var(--brand-glow)', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.6px'
            }}>
              Module 3 Engine
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              Evidence-Based Multi-Modal Synthesis
            </span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
            Personalized Treatment Plan & Health Story
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Translating complex predictive AI and clinical biomarkers into clear, patient-guided actions.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Urgency Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
            borderRadius: 8, background: urg.bg, color: urg.color,
            border: `1px solid ${urg.border}`, fontSize: 12, fontWeight: 700
          }}>
            <UrgIcon size={15} />
            <span>{urg.label}</span>
          </div>

          <button
            className="btn-primary"
            onClick={handleGenerate}
            disabled={generating}
            style={{ fontSize: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Recalculate recommendations with latest health data"
          >
            {generating ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {generating ? 'Synthesizing...' : 'Regenerate Plan'}
          </button>

          <button
            className="btn-secondary"
            onClick={() => window.print()}
            style={{ fontSize: 12, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Print or save as PDF for doctor visit"
          >
            <Printer size={14} />
            <span>Print Summary</span>
          </button>

          <button
            className="btn-ghost"
            onClick={loadData}
            title="Refresh Latest Results"
            style={{ padding: '8px 10px' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="page-container">
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px', borderRadius: 10,
            background: '#fef2f2', border: '1px solid #fecaca',
            fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 10
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{error}</div>
          </div>
        )}

        {/* View Mode Toggle: Health Story vs Clinical Protocols */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 20, flexWrap: 'wrap', gap: 12
        }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActiveTab('story')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'story' ? 'var(--brand)' : 'var(--surface-2)',
                color: activeTab === 'story' ? '#ffffff' : 'var(--text)',
                border: activeTab === 'story' ? '1px solid var(--brand)' : '1px solid var(--border)'
              }}
            >
              <BookOpen size={15} />
              <span>Personalized Health Story (6-Stage Guide)</span>
            </button>
            <button
              onClick={() => setActiveTab('clinical')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
                borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === 'clinical' ? 'var(--brand)' : 'var(--surface-2)',
                color: activeTab === 'clinical' ? '#ffffff' : 'var(--text)',
                border: activeTab === 'clinical' ? '1px solid var(--brand)' : '1px solid var(--border)'
              }}
            >
              <Stethoscope size={15} />
              <span>Clinical Protocols & AI Internals</span>
            </button>
          </div>

          <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} />
            <span>Updated: {data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'Active Snapshot'}</span>
          </div>
        </div>

        {loading ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: 380, gap: 14, color: 'var(--muted)'
          }}>
            <Loader2 size={32} className="spin" style={{ color: 'var(--brand)' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
              Synthesizing Patient Health Story...
            </div>
            <div style={{ fontSize: 12 }}>
              Correlating Module 1 longitudinal vitals, Module 2 symptom probabilities, and verified drug guidelines.
            </div>
          </div>
        ) : recsArray.length === 0 ? (
          /* Empty State when no recommendations generated yet */
          <div className="card" style={{ padding: '60px 24px', textAlign: 'center', maxWidth: 700, margin: '20px auto' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, background: 'rgba(217,119,6,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'
            }}>
              <Pill size={36} style={{ color: '#d97706' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 8, fontFamily: 'Outfit' }}>
              Your Treatment Plan Is Ready to Be Generated
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 500, margin: '0 auto 20px', lineHeight: 1.6 }}>
              MediTwin will cross-reference your latest health record biomarkers (Module 1) and reported symptoms (Module 2) to build a unified health narrative and personalized action plan.
            </p>

            {/* If patient already has risk or symptoms, show preview */}
            {(latestRisk || latestSymptom) && (
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 18px', maxWidth: 520, margin: '0 auto 24px', textAlign: 'left'
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                  Existing Patient Data Ready for Synthesis:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                  {latestRisk && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} style={{ color: '#059669' }} />
                      <span>Module 1 Risk Assessment: <b>{latestRisk.probabilityPercent || Math.round(latestRisk.probability * 100) || 0}% ({latestRisk.riskCategory || 'MODERATE'})</b></span>
                    </div>
                  )}
                  {latestSymptom && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Check size={14} style={{ color: '#059669' }} />
                      <span>Module 2 Symptom Classifier: <b>{latestSymptom.symptoms?.length || 0} active symptoms logged</b></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn-primary"
                onClick={handleGenerate}
                disabled={generating}
                style={{ fontSize: 14, padding: '10px 22px' }}
              >
                {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                Generate Personalized Plan Now
              </button>
              <Link to="/disease" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 13, padding: '10px 18px' }}>
                <Brain size={15} /> Check / Add Symptoms
              </Link>
              <Link to="/health" className="btn-secondary" style={{ textDecoration: 'none', fontSize: 13, padding: '10px 18px' }}>
                <Shield size={15} /> Upload Health Records
              </Link>
            </div>
          </div>
        ) : activeTab === 'story' ? (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW A: 6-STAGE PERSONALIZED HEALTH STORY (PATIENT-FRIENDLY)
             ═══════════════════════════════════════════════════════════════════ */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── 5-SECOND EXECUTIVE SNAPSHOT CARDS ───────────────────────── */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14, marginBottom: 4
            }}>
              {/* Card 1: Primary Finding */}
              <div className="card" style={{ borderLeft: '4px solid var(--brand)', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Primary Clinical Finding
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', marginTop: 4, fontFamily: 'Outfit' }}>
                  {primaryConditionName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: 'var(--brand-glow)', color: 'var(--brand)'
                  }}>
                    {primaryRec?.probability_percent ? `${primaryRec.probability_percent.toFixed(0)}% Probability Match` : `${primaryConfidence} Confidence`}
                  </span>
                </div>
              </div>

              {/* Card 2: 90-Day Acute Risk */}
              <div className="card" style={{ borderLeft: `4px solid ${urg.color}`, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {riskHorizonDays}-Day Complication Risk
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: urg.color, fontFamily: 'Outfit' }}>
                    {acuteRiskProb !== null ? `${acuteRiskProb}%` : 'Low Baseline'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: urg.color }}>
                    {riskCategory}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Estimated acute event likelihood within 3 months
                </div>
              </div>

              {/* Card 3: Abnormal Biomarkers */}
              <div className="card" style={{ borderLeft: '4px solid #d97706', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Contributing Biomarkers
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: abnormalCount > 0 ? '#d97706' : '#059669', marginTop: 4, fontFamily: 'Outfit' }}>
                  {abnormalCount > 0 ? `${abnormalCount} Flagged` : 'All Optimal'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  {abnormalCount > 0 ? 'Vitals or labs outside target ranges' : 'Parameters within clinical references'}
                </div>
              </div>

              {/* Card 4: Recommended Action Window */}
              <div className="card" style={{ borderLeft: '4px solid #0284c7', padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Action Timeframe
                </div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0284c7', marginTop: 4, fontFamily: 'Outfit' }}>
                  {urg.timeframe}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  {urg.label}
                </div>
              </div>
            </div>

            {/* ── STAGE 1: WHAT WE FOUND ────────────────────────────────────── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid var(--brand)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: 'var(--brand)',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  1
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    What We Found — Current Clinical Assessment
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Comprehensive diagnosis match combining your symptoms and clinical biomarkers.
                  </div>
                </div>
              </div>

              {/* Patient friendly summary text */}
              <div style={{
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 18
              }}>
                <b>Patient Summary:</b> Based on your recorded clinical data, the engine identified{' '}
                <b style={{ color: 'var(--brand)' }}>{primaryConditionName}</b> as your primary consideration with{' '}
                <b>{primaryRec?.probability_percent ? `${primaryRec.probability_percent.toFixed(1)}%` : primaryConfidence}</b> statistical alignment.
                {primaryRec?.description && ` ${primaryRec.description}`}
              </div>

              {/* Reported Symptoms Pills */}
              {reportedSymptoms.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Active Symptoms Supporting This Finding ({reportedSymptoms.length})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {reportedSymptoms.map((sym, idx) => (
                      <span key={idx} style={{
                        padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                        background: 'rgba(2,132,199,0.1)', color: '#0284c7', border: '1px solid rgba(2,132,199,0.25)',
                        display: 'flex', alignItems: 'center', gap: 5
                      }}>
                        <Check size={13} /> {sym}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Identified Conditions List */}
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Identified Conditions & Probability Alignment
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recsArray.slice(0, 3).map((rec, i) => {
                  const prob = rec.probability_percent || (rec.probability ? rec.probability * 100 : 0)
                  const isPrimary = i === 0
                  return (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 8,
                      background: isPrimary ? 'var(--surface-3)' : 'var(--surface-2)',
                      border: isPrimary ? '1px solid var(--brand)' : '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
                    }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                            {rec.condition || rec.disease}
                          </span>
                          {isPrimary && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--brand)', color: 'white', fontWeight: 700 }}>
                              PRIMARY FINDING
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {rec.category || 'General Medicine'}
                          </span>
                        </div>
                        {rec.clinical_considerations?.[0] && (
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                            {rec.clinical_considerations[0]}
                          </div>
                        )}
                      </div>

                      <div style={{ width: 140, textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>
                          {prob.toFixed(1)}% Match
                        </div>
                        <div style={{ width: '100%', height: 6, borderRadius: 99, background: 'var(--surface)', marginTop: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.max(5, prob))}%`, height: '100%', background: isPrimary ? 'var(--brand)' : '#64748b', borderRadius: 99 }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── STAGE 2: WHY IT MATTERS & RISK TRAJECTORY ─────────────────── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#0284c7',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  2
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    Why It Matters — Clinical Urgency & Risk Progression
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Understanding risk severity and longitudinal health trajectory over time.
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: chartData.length > 0 ? '1.2fr 1fr' : '1fr',
                gap: 20, alignItems: 'start'
              }}>
                {/* Left: Why it matters plain text explanation */}
                <div>
                  <div style={{
                    padding: '14px 16px', borderRadius: 10,
                    background: urg.bg, border: `1px solid ${urg.border}`,
                    color: urg.color, marginBottom: 14
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14 }}>
                      <UrgIcon size={18} />
                      <span>Clinical Urgency: {urg.label}</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5, color: 'var(--text)' }}>
                      {urg.description}
                    </div>
                  </div>

                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    <p style={{ margin: '0 0 10px' }}>
                      <b>Clinical Impact:</b> Managing this early prevents gradual progression into acute cardiovascular or metabolic complications. Addressing active blood pressure, metabolic spikes, or respiratory irritation today reduces the risk of emergency events over the next {riskHorizonDays} days.
                    </p>
                    <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
                      {data?.fullReport?.urgency?.reasons?.[0] || 'Prioritized based on multi-factorial clinical assessment.'}
                    </p>
                  </div>
                </div>

                {/* Right: Longitudinal Risk Area Chart */}
                {chartData.length > 0 && (
                  <div style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                        Risk Probability Trajectory (%)
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                        Target: &lt; 25% (Low Risk)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={urg.color} stopOpacity={0.35}/>
                              <stop offset="95%" stopColor={urg.color} stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                          <ReferenceLine y={25} stroke="#059669" strokeDasharray="3 3" label={{ value: 'Low Threshold', fontSize: 9, fill: '#059669' }} />
                          <RechartsTooltip
                            contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', borderRadius: 8, fontSize: 12 }}
                            formatter={(val) => [`${val}%`, 'Acute Risk']}
                          />
                          <Area type="monotone" dataKey="risk" stroke={urg.color} strokeWidth={2.5} fillOpacity={1} fill="url(#riskGrad)" dot={{ r: 4, fill: urg.color }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── STAGE 3: WHAT MAY BE CONTRIBUTING TO IT ───────────────────── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid #d97706' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#d97706',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  3
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    What May Be Contributing — Biomarkers & Lab Drivers
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Objective laboratory findings and vital signs from your records explaining this assessment.
                  </div>
                </div>
              </div>

              {/* Abnormal Biomarker Cards */}
              {biomarkerTrends.length > 0 ? (
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 12, marginBottom: 16
                }}>
                  {biomarkerTrends.map((bio, idx) => {
                    const meta = getBiomarkerMeta(bio.observation_name || bio.name, bio.latest_value)
                    const isHigh = bio.abnormality === 'HIGH' || bio.status === 'HIGH'
                    const isLow = bio.abnormality === 'LOW' || bio.status === 'LOW'
                    const isWorsening = bio.worsening || bio.trend === 'INCREASING'
                    const statusColor = isHigh ? '#dc2626' : isLow ? '#0284c7' : '#059669'
                    const statusBg = isHigh ? '#fee2e2' : isLow ? '#e0f2fe' : '#dcfce7'
                    const statusLabel = isHigh ? 'Elevated' : isLow ? 'Low' : 'Optimal'

                    return (
                      <div key={idx} style={{
                        background: 'var(--surface-2)', border: `1px solid ${isHigh ? '#fca5a5' : 'var(--border)'}`,
                        borderRadius: 10, padding: '14px 16px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {meta.category}
                            </span>
                            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>
                              {meta.label}
                            </div>
                          </div>
                          <span style={{
                            padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                            background: statusBg, color: statusColor
                          }}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* Value & Trend */}
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '8px 0' }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit' }}>
                            {bio.latest_value ?? '—'}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                            {bio.unit || meta.unit}
                          </span>
                          {bio.baseline_value && bio.baseline_value !== bio.latest_value && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              (from baseline {bio.baseline_value})
                            </span>
                          )}
                          <span style={{
                            marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                            color: isWorsening ? '#dc2626' : '#059669', display: 'flex', alignItems: 'center', gap: 3
                          }}>
                            {bio.trend === 'INCREASING' ? <TrendingUp size={14} /> : bio.trend === 'DECREASING' ? <TrendingDown size={14} /> : <Minus size={14} />}
                            {bio.trend || 'Stable'}
                          </span>
                        </div>

                        {/* Context and meaning */}
                        <div style={{ fontSize: 11, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 6, lineHeight: 1.4 }}>
                          <b>Target:</b> {meta.normalRange} · {meta.meaning}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{
                  padding: '16px', borderRadius: 8, background: 'var(--surface-2)',
                  border: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 16
                }}>
                  No raw laboratory vitals detected in current health record snapshot. Upload recent lab test panels to view biomarker reference comparisons.
                </div>
              )}

              {/* SHAP Important Risk Drivers */}
              {importantDrivers.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Top Algorithmic Risk Factors (SHAP Clinical Explainability)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {importantDrivers.map((driver, i) => {
                      const name = typeof driver === 'string' ? driver : (driver.factor || driver.name || driver.feature || 'Biomarker delta')
                      const meta = getBiomarkerMeta(name)
                      return (
                        <div key={i} style={{
                          padding: '6px 12px', borderRadius: 6, background: '#fef3c7',
                          border: '1px solid #fde68a', color: '#92400e', fontSize: 12, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 6
                        }}>
                          <Activity size={13} />
                          <span>{meta.label || name}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── STAGE 4: WHAT THE PATIENT CAN DO (LIFESTYLE & SELF-CARE) ──── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid #10b981' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#10b981',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  4
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    What You Can Do — Lifestyle & Self-Care Actions
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Practical, non-pharmacologic steps you can initiate at home starting today.
                  </div>
                </div>
              </div>

              {categorizedActions.lifestyle.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {categorizedActions.lifestyle.map((act, i) => (
                    <div key={i} style={{
                      padding: '14px 16px', borderRadius: 8, background: 'var(--surface-2)',
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12
                    }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', background: '#d1fae5',
                        color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2
                      }}>
                        <Check size={14} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
                          {act.text}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 600, color: '#059669' }}>Why this helps:</span>
                          <span>Supports lower vascular resistance, natural metabolic regulation, and sustained tissue recovery.</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Fallback standard clinical lifestyle recommendations */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { title: 'Adopt DASH / Low-Sodium Dietary Intake', desc: 'Limit daily dietary sodium under 2,000 mg and prioritize potassium-rich leafy greens and whole grains.', why: 'Directly lowers arterial pressure and eases renal filtration workload.' },
                    { title: 'Daily Low-Impact Aerobic Movement', desc: 'Engage in 20–30 minutes of brisk walking or swimming 5 days per week.', why: 'Improves vascular compliance and boosts cellular insulin uptake.' },
                    { title: 'Consistent Hydration & Rest Schedule', desc: 'Maintain 2 to 2.5 liters of clean water daily and 7–8 hours of restorative nighttime sleep.', why: 'Aids metabolic waste clearance and regulates sympathetic nervous tone.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      padding: '12px 16px', borderRadius: 8, background: 'var(--surface-2)',
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 12
                    }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: '#d1fae5',
                        color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 2
                      }}>
                        <Check size={13} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.desc}</div>
                        <div style={{ fontSize: 11, color: '#059669', marginTop: 4 }}>
                          <b>Why this helps:</b> {item.why}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── STAGE 5: MEDICATION & CLINICAL GUIDANCE (DEMYSTIFIED) ─────── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#f59e0b',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  5
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    Medication & Clinical Guidance (Demystified)
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Physician-guided therapeutic classes to discuss with your doctor during your consultation.
                  </div>
                </div>
              </div>

              {/* Prescription Decision Support Notice */}
              <div style={{
                padding: '12px 16px', borderRadius: 8, background: '#fef3c7',
                border: '1px solid #fde68a', fontSize: 12, color: '#92400e', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>
                  <b>Important Doctor Review Notice:</b> MediTwin provides algorithmic clinical decision support. The medications listed below represent standard first-line protocols for your suspected condition. <b>Never start, stop, or adjust prescription dosages without your licensed physician’s direct authorization.</b>
                </div>
              </div>

              {/* Medication Classes Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {categorizedActions.medications.length > 0 ? (
                  categorizedActions.medications.map((med, idx) => {
                    const info = getDrugClassExplanation(med.drugClass || med.text)
                    return (
                      <div key={idx} style={{
                        padding: '14px 16px', borderRadius: 10, background: 'var(--surface-2)',
                        border: '1px solid var(--border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Pill size={16} style={{ color: '#d97706' }} />
                            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                              {info.plainName}
                            </span>
                            {med.drugClass && (
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-3)', color: 'var(--muted)', fontWeight: 600 }}>
                                Class: {med.drugClass}
                              </span>
                            )}
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700 }}>
                            Targeting: {med.condition}
                          </span>
                        </div>

                        {/* Plain English explanation */}
                        <div style={{ fontSize: 12, color: 'var(--text)', margin: '6px 0', lineHeight: 1.5 }}>
                          <b>How it works:</b> {info.whatItDoes}
                        </div>

                        {/* Examples */}
                        {med.examples && med.examples.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>Common Examples:</span>
                            {med.examples.map((ex, eIdx) => (
                              <span key={eIdx} style={{
                                padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                                background: 'rgba(5,150,105,0.08)', color: '#059669', border: '1px solid rgba(5,150,105,0.2)'
                              }}>
                                💊 {ex}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Patient friendly tip */}
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                          💡 <b>Patient Guidance:</b> {info.tip}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ padding: '14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
                    No specific prescription pharmacotherapies indicated at this tier. Non-pharmacologic lifestyle management is currently prioritized.
                  </div>
                )}
              </div>
            </div>

            {/* ── STAGE 6: WHAT SHOULD BE MONITORED ─────────────────────────── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid #6366f1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#6366f1',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  6
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    What Should Be Monitored — Health Surveillance Schedule
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Key metrics, tests, and target thresholds to keep your health on track.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {categorizedActions.monitoringItems.length > 0 ? (
                  categorizedActions.monitoringItems.map((m, idx) => (
                    <div key={idx} style={{
                      padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)',
                      border: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 10
                    }}>
                      <Search size={15} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                          {m.text}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          Target: Re-assess with primary care provider in 4–8 weeks.
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Standard surveillance checklist */
                  [
                    { metric: 'Blood Pressure Log', freq: 'Twice daily (morning and evening)', target: 'Below 130/80 mmHg' },
                    { metric: 'Fasting Blood Sugar', freq: 'Weekly or as guided by clinician', target: 'Below 100 mg/dL' },
                    { metric: 'Repeat Metabolic Panel', freq: 'Within 60 to 90 days', target: 'Stabilized creatinine & electrolytes' }
                  ].map((item, idx) => (
                    <div key={idx} style={{
                      padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Activity size={14} style={{ color: '#6366f1' }} />
                        <span>{item.metric}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                        <b>Frequency:</b> {item.freq}
                      </div>
                      <div style={{ fontSize: 11, color: '#059669', marginTop: 2 }}>
                        <b>Safe Target:</b> {item.target}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── STAGE 7: WHEN TO SEEK PROFESSIONAL MEDICAL ATTENTION ──────── */}
            <div className="card" style={{ padding: '20px 22px', borderTop: '4px solid #dc2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, background: '#dc2626',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800
                }}>
                  7
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                    When to Seek Professional Medical Attention
                  </h3>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Critical warning signs, confirmed attending doctor review, and consultation booking.
                  </div>
                </div>
              </div>

              {/* Red Flags High Contrast Alert */}
              <div style={{
                background: '#fef2f2', border: '1px solid #fecaca',
                borderRadius: 10, padding: '16px 18px', marginBottom: 20
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontWeight: 800, fontSize: 14, marginBottom: 8 }}>
                  <ShieldAlert size={18} />
                  <span>Immediate Medical Red Flags — Call Emergency Services (911 / 112) If You Experience:</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {EMERGENCY_RED_FLAGS.map((flag, idx) => {
                    const FlagIcon = flag.icon
                    return (
                      <div key={idx} style={{
                        padding: '10px 12px', borderRadius: 8, background: '#ffffff',
                        border: '1px solid #fee2e2'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#991b1b' }}>
                          <FlagIcon size={14} style={{ color: '#dc2626' }} />
                          <span>{flag.title}</span>
                        </div>
                        <div style={{ fontSize: 11, color: '#7f1d1d', marginTop: 3, lineHeight: 1.4 }}>
                          {flag.detail}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Doctor Review Section */}
              <div style={{
                display: 'grid', gridTemplateColumns: doctorFeedback ? '1.2fr 1fr' : '1fr',
                gap: 16, alignItems: 'center'
              }}>
                {doctorFeedback ? (
                  <div style={{
                    padding: '16px', borderRadius: 10, background: '#f0fdf4',
                    border: '1px solid #bbf7d0', color: '#166534'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14 }}>
                      <UserCheck size={18} style={{ color: '#16a34a' }} />
                      <span>Verified Attending Clinician Review</span>
                    </div>
                    <div style={{ fontSize: 12, marginTop: 4, fontWeight: 600 }}>
                      Reviewed by: {doctorFeedback.doctorName} ({doctorFeedback.specialization}) · {new Date(doctorFeedback.createdAt).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 8, fontStyle: 'italic', background: '#ffffff', padding: '10px 12px', borderRadius: 6, border: '1px solid #dcfce7' }}>
                      "{doctorFeedback.feedback}"
                    </div>
                  </div>
                ) : (
                  <div style={{
                    padding: '16px', borderRadius: 10, background: 'var(--surface-2)',
                    border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)'
                  }}>
                    <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Stethoscope size={16} style={{ color: 'var(--brand)' }} />
                      <span>Ready to Share with Your Doctor?</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                      This synthesized plan provides a complete longitudinal report of your vitals, symptoms, and disease probabilities. Share this directly with your primary care provider.
                    </div>
                  </div>
                )}

                {/* Direct CTA to Find Doctor */}
                <div style={{ textAlign: 'center' }}>
                  <Link
                    to="/find-doctor"
                    className="btn-primary"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '12px 24px', fontSize: 14, fontWeight: 700, textDecoration: 'none',
                      borderRadius: 10, width: '100%', justifyContent: 'center'
                    }}
                  >
                    <Stethoscope size={18} />
                    <span>Find a Doctor & Schedule Consultation</span>
                    <ArrowRight size={16} />
                  </Link>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                    Connect with certified specialists in your area
                  </div>
                </div>
              </div>
            </div>

          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             VIEW B: CLINICAL PROTOCOLS & ENGINE ANALYSIS (DEEP MEDICAL VIEW)
             ═══════════════════════════════════════════════════════════════════ */
          <div className="treatment-grid">
            {/* Left: Detailed Protocol Cards */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: 'Outfit' }}>
                  Active Clinical Protocols ({recsArray.length} Conditions)
                </span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  Prioritized by multi-factor clinical scoring algorithm
                </span>
              </div>

              {recsArray.map((rec, i) => {
                const isOpen = expandedRecs[i] ?? (i === 0)
                const confColor = rec.confidence_band === 'HIGH' ? '#059669' : rec.confidence_band === 'MEDIUM' ? '#d97706' : '#64748b'
                const approaches = Array.isArray(rec.first_line_approach)
                  ? rec.first_line_approach
                  : typeof rec.first_line_approach === 'string'
                    ? [rec.first_line_approach]
                    : []
                const medClasses = rec.medication_classes || []
                const medExamples = rec.common_examples || []
                const monitoring = rec.monitoring || []
                const safetyFlags = rec.safety?.flags || rec.safety_flags || []
                const whyPrioritized = rec.why_prioritized || []
                const scoreBreakdown = rec.score_breakdown || {}

                return (
                  <div key={i} className="card" style={{ marginBottom: 16, borderLeft: `4px solid ${confColor}` }}>
                    {/* Header */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => toggleRec(i)}
                    >
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `${confColor}15`, border: `1px solid ${confColor}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: confColor }}>#{i + 1}</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0, fontFamily: 'Outfit' }}>
                            {rec.condition || rec.disease || `Recommendation ${i + 1}`}
                          </h3>
                          {rec.category && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-3)', color: 'var(--muted)', fontWeight: 600 }}>
                              {rec.category}
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                            background: `${confColor}18`, color: confColor, border: `1px solid ${confColor}30`
                          }}>
                            {rec.confidence_band || 'HIGH'} CONFIDENCE
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                          Probability Match: <b style={{ color: 'var(--text)' }}>{(rec.probability_percent || (rec.probability ? rec.probability * 100 : 0)).toFixed(1)}%</b>
                          {rec.description && ` · ${rec.description.slice(0, 85)}...`}
                        </div>
                      </div>

                      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {isOpen ? <ChevronDown size={15} style={{ color: 'var(--muted)' }} /> : <ChevronRight size={15} style={{ color: 'var(--muted)' }} />}
                      </div>
                    </div>

                    {/* Expanded Body */}
                    {isOpen && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }} className="fade-in">
                        {rec.description && (
                          <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text)', marginBottom: 16, lineHeight: 1.5 }}>
                            <b>Clinical Overview:</b> {rec.description}
                          </div>
                        )}

                        {/* First-line approach */}
                        {approaches.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Stethoscope size={14} /> First-Line Clinical Approach & Protocols
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {approaches.map((app, aIdx) => (
                                <div key={aIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: 'var(--text-2)', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--brand)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
                                    {aIdx + 1}
                                  </span>
                                  <span style={{ lineHeight: 1.5 }}>{app}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Medication classes */}
                        {(medClasses.length > 0 || medExamples.length > 0) && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#d97706', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Pill size={14} /> Recommended Medication Classes & Common Examples
                            </div>
                            {medClasses.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                {medClasses.map((cls, cIdx) => (
                                  <span key={cIdx} style={{ padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                                    📋 {cls}
                                  </span>
                                ))}
                              </div>
                            )}
                            {medExamples.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {medExamples.map((ex, eIdx) => (
                                  <span key={eIdx} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    💊 {ex}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Monitoring */}
                        {monitoring.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--m2-accent)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Activity size={14} /> Longitudinal Monitoring & Surveillance
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {monitoring.map((m, mIdx) => (
                                <div key={mIdx} style={{ padding: '7px 12px', borderRadius: 6, fontSize: 12, background: 'var(--surface-3)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Search size={13} style={{ color: 'var(--m2-accent)' }} /> {m}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Safety Flags */}
                        {safetyFlags.length > 0 ? (
                          <div style={{ padding: '12px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <AlertTriangle size={14} /> Safety Flags & Contraindication Precautions
                            </div>
                            {safetyFlags.map((flag, fIdx) => (
                              <div key={fIdx} style={{ fontSize: 12, color: '#991b1b', marginTop: 3, lineHeight: 1.4 }}>
                                • {flag}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ padding: '10px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12, color: '#166534', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CheckCircle2 size={14} /> No specific safety red flags detected against current patient biomarkers.
                          </div>
                        )}

                        {/* Scoring Rationale */}
                        <div style={{ padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)' }}>
                          {whyPrioritized.length > 0 && (
                            <div style={{ marginBottom: 6 }}>
                              <b style={{ color: 'var(--text)' }}>Clinical Prioritization Rationale: </b>
                              {whyPrioritized.join(' ')}
                            </div>
                          )}
                          {Object.keys(scoreBreakdown).length > 0 && (
                            <div style={{ display: 'flex', gap: 12, marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 10, flexWrap: 'wrap' }}>
                              <span>Score Breakdown:</span>
                              {Object.entries(scoreBreakdown).map(([k, v]) => (
                                <span key={k} style={{ color: 'var(--text)' }}>
                                  {k.replace(/_/g, ' ')}: <b>{typeof v === 'number' ? v.toFixed(3) : v}</b>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Right: Architecture & Verifications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Urgency Status Widget */}
              <div className="card" style={{ textAlign: 'center', borderTop: `3px solid ${urg.color}` }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, background: urg.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px'
                }}>
                  <UrgIcon size={24} style={{ color: urg.color }} />
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: urg.color, fontFamily: 'Outfit' }}>
                  {urg.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.4 }}>
                  {data?.fullReport?.urgency?.reasons?.[0] || 'Prioritized based on multi-modal clinical risk factors and predictive models.'}
                </div>
              </div>

              {/* Data Pipeline Integration */}
              <div className="card">
                <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Engine Integration Pipeline</h3>
                {[
                  { label: 'Module 1 (XGBoost 90-Day Acute Risk)', active: data?.source?.module1 || !!latestRisk, color: 'var(--m1-accent)' },
                  { label: 'Module 2 (DDXPlus Differential Diagnosis)', active: data?.source?.module2 || !!latestSymptom, color: 'var(--m2-accent)' },
                  { label: 'Module 3 (Clinical Knowledge & RxNorm)', active: true, color: 'var(--brand)' },
                ].map(({ label, active, color }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: active ? `${color}20` : 'var(--surface-3)',
                      color: active ? color : 'var(--muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, flexShrink: 0
                    }}>
                      {active ? '✓' : '—'}
                    </div>
                    <span style={{ color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 600 : 400, flex: 1 }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* RxNorm & Drug Knowledge Lookup */}
              {Object.keys(drugLookups).length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pill size={14} style={{ color: '#d97706' }} /> Verified Drug Intelligence
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(drugLookups).slice(0, 6).map(([drugName, info]) => (
                      <div key={drugName} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>{drugName}</span>
                        <span style={{ fontSize: 10, color: info.external_data_available ? 'var(--brand)' : 'var(--muted)', fontWeight: 700 }}>
                          {info.external_data_available ? 'RxNorm Verified' : 'Standard Formulary'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="card">
                <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 10 }}>Update Input Data</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Link to="/disease" className="btn-secondary" style={{ justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
                    <Brain size={13} /> Add / Update Symptoms (Module 2)
                  </Link>
                  <Link to="/health" className="btn-secondary" style={{ justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
                    <Shield size={13} /> Upload Health Record JSON (Module 1)
                  </Link>
                  <Link to="/find-doctor" className="btn-primary" style={{ justifyContent: 'center', fontSize: 12, textDecoration: 'none' }}>
                    <Stethoscope size={13} /> Consult a Specialist
                  </Link>
                </div>
              </div>

              {/* Clinical Notice */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
                ⚠️ <b>Decision Support Notice:</b> MediTwin recommendations are generated for clinical decision support. They do not constitute a prescription. Final treatment decisions should always be made by a licensed healthcare professional.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
