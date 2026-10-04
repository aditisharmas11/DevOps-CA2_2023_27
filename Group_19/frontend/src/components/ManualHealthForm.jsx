import { useState } from 'react'
import {
  Activity, Heart, Droplets, Zap, ShieldAlert,
  Calendar, Check, AlertCircle, Sparkles, RefreshCw, Loader2, Plus, ArrowRight
} from 'lucide-react'

// All 29 Module 1 biomarkers organized into logical clinical panels
const CLINICAL_FIELDS = [
  {
    category: 'Vital Signs & Body Metrics',
    icon: Activity,
    color: '#059669',
    fields: [
      { id: 'Systolic Blood Pressure', label: 'Systolic BP', unit: 'mmHg', min: 40, max: 250, normal: '90 - 120', placeholder: '120', step: '1' },
      { id: 'Diastolic Blood Pressure', label: 'Diastolic BP', unit: 'mmHg', min: 30, max: 150, normal: '60 - 80', placeholder: '80', step: '1' },
      { id: 'Heart rate', label: 'Heart Rate', unit: 'bpm', min: 30, max: 220, normal: '60 - 100', placeholder: '72', step: '1' },
      { id: 'Respiratory rate', label: 'Respiratory Rate', unit: 'breaths/min', min: 6, max: 60, normal: '12 - 20', placeholder: '16', step: '1' },
      { id: 'Body Weight', label: 'Body Weight', unit: 'kg', min: 20, max: 300, normal: '50 - 100', placeholder: '70', step: '0.1' },
      { id: 'Body Mass Index', label: 'BMI', unit: 'kg/m²', min: 10, max: 60, normal: '18.5 - 24.9', placeholder: '24.0', step: '0.1' },
    ]
  },
  {
    category: 'Metabolic & Glycemic Panel',
    icon: Droplets,
    color: '#d97706',
    fields: [
      { id: 'Glucose', label: 'Fasting Glucose', unit: 'mg/dL', min: 40, max: 600, normal: '70 - 99', placeholder: '95', step: '1' },
      { id: 'Hemoglobin A1c/Hemoglobin.total in Blood', label: 'HbA1c', unit: '%', min: 3.5, max: 18, normal: '< 5.7', placeholder: '5.4', step: '0.1' },
    ]
  },
  {
    category: 'Renal Function & Electrolytes',
    icon: Heart,
    color: '#3b82f6',
    fields: [
      { id: 'Creatinine', label: 'Serum Creatinine', unit: 'mg/dL', min: 0.2, max: 15, normal: '0.7 - 1.3', placeholder: '0.9', step: '0.05' },
      { id: 'Urea Nitrogen', label: 'BUN (Urea Nitrogen)', unit: 'mg/dL', min: 2, max: 150, normal: '7 - 20', placeholder: '14', step: '1' },
      { id: 'Glomerular filtration rate/1.73 sq M.predicted', label: 'eGFR', unit: 'mL/min/1.73m²', min: 5, max: 200, normal: '> 90', placeholder: '105', step: '1' },
      { id: 'Potassium', label: 'Potassium (K+)', unit: 'mmol/L', min: 1.5, max: 9, normal: '3.5 - 5.0', placeholder: '4.2', step: '0.1' },
      { id: 'Sodium', label: 'Sodium (Na+)', unit: 'mmol/L', min: 110, max: 170, normal: '135 - 145', placeholder: '140', step: '1' },
      { id: 'Chloride', label: 'Chloride (Cl-)', unit: 'mmol/L', min: 70, max: 130, normal: '96 - 106', placeholder: '102', step: '1' },
      { id: 'Calcium', label: 'Calcium', unit: 'mg/dL', min: 4, max: 18, normal: '8.5 - 10.5', placeholder: '9.4', step: '0.1' },
      { id: 'Carbon Dioxide', label: 'Bicarbonate (CO2)', unit: 'mmol/L', min: 10, max: 50, normal: '22 - 29', placeholder: '24', step: '1' },
    ]
  },
  {
    category: 'Lipid Profile',
    icon: Zap,
    color: '#8b5cf6',
    fields: [
      { id: 'Total Cholesterol', label: 'Total Cholesterol', unit: 'mg/dL', min: 50, max: 600, normal: '< 200', placeholder: '185', step: '1' },
      { id: 'High Density Lipoprotein Cholesterol', label: 'HDL Cholesterol', unit: 'mg/dL', min: 10, max: 150, normal: '> 40', placeholder: '52', step: '1' },
      { id: 'Low Density Lipoprotein Cholesterol', label: 'LDL Cholesterol', unit: 'mg/dL', min: 20, max: 400, normal: '< 100', placeholder: '105', step: '1' },
      { id: 'Triglycerides', label: 'Triglycerides', unit: 'mg/dL', min: 20, max: 1500, normal: '< 150', placeholder: '130', step: '1' },
    ]
  },
  {
    category: 'Complete Blood Count (CBC) & Liver Panel',
    icon: ShieldAlert,
    color: '#ec4899',
    fields: [
      { id: 'Hemoglobin [Mass/volume] in Blood', label: 'Hemoglobin', unit: 'g/dL', min: 4, max: 25, normal: '13.5 - 17.5', placeholder: '14.5', step: '0.1' },
      { id: 'Hematocrit [Volume Fraction] of Blood by Automated count', label: 'Hematocrit', unit: '%', min: 15, max: 70, normal: '41 - 50', placeholder: '44', step: '0.5' },
      { id: 'Leukocytes [#/volume] in Blood by Automated count', label: 'WBC (Leukocytes)', unit: '10³/µL', min: 0.5, max: 50, normal: '4.5 - 11.0', placeholder: '6.5', step: '0.1' },
      { id: 'Platelets [#/volume] in Blood by Automated count', label: 'Platelets', unit: '10³/µL', min: 20, max: 1000, normal: '150 - 450', placeholder: '240', step: '1' },
      { id: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma', label: 'ALT', unit: 'U/L', min: 2, max: 1000, normal: '7 - 56', placeholder: '25', step: '1' },
      { id: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma', label: 'AST', unit: 'U/L', min: 2, max: 1000, normal: '10 - 40', placeholder: '22', step: '1' },
      { id: 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma', label: 'Alkaline Phosphatase', unit: 'U/L', min: 10, max: 1000, normal: '44 - 147', placeholder: '75', step: '1' },
      { id: 'Bilirubin.total [Mass/volume] in Serum or Plasma', label: 'Total Bilirubin', unit: 'mg/dL', min: 0.1, max: 30, normal: '0.1 - 1.2', placeholder: '0.7', step: '0.1' },
      { id: 'Albumin [Mass/volume] in Serum or Plasma', label: 'Albumin', unit: 'g/dL', min: 1, max: 8, normal: '3.5 - 5.0', placeholder: '4.3', step: '0.1' },
    ]
  }
]

export default function ManualHealthForm({ onSubmit, loading }) {
  const [formData, setFormData] = useState({})
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [activeTab, setActiveTab] = useState(0)
  const [formError, setFormError] = useState('')

  const handleFieldChange = (fieldId, val) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: val
    }))
    setFormError('')
  }

  // Count filled values
  const filledCount = Object.values(formData).filter(v => v !== '' && v !== undefined && !isNaN(Number(v))).length

  const handleApplyPreset = (type) => {
    if (type === 'healthy') {
      setFormData({
        'Systolic Blood Pressure': '118',
        'Diastolic Blood Pressure': '76',
        'Heart rate': '72',
        'Respiratory rate': '16',
        'Body Weight': '72',
        'Body Mass Index': '24.2',
        'Glucose': '92',
        'Hemoglobin A1c/Hemoglobin.total in Blood': '5.3',
        'Creatinine': '0.9',
        'Urea Nitrogen': '14',
        'Potassium': '4.2',
        'Sodium': '140',
        'Total Cholesterol': '185',
        'High Density Lipoprotein Cholesterol': '55',
        'Low Density Lipoprotein Cholesterol': '105',
        'Triglycerides': '125',
        'Hemoglobin [Mass/volume] in Blood': '15.0',
        'Leukocytes [#/volume] in Blood by Automated count': '6.4',
        'Platelets [#/volume] in Blood by Automated count': '245'
      })
    } else if (type === 'elevated') {
      setFormData({
        'Systolic Blood Pressure': '148',
        'Diastolic Blood Pressure': '94',
        'Heart rate': '88',
        'Respiratory rate': '19',
        'Body Weight': '86',
        'Body Mass Index': '28.6',
        'Glucose': '145',
        'Hemoglobin A1c/Hemoglobin.total in Blood': '7.4',
        'Creatinine': '1.4',
        'Urea Nitrogen': '26',
        'Potassium': '4.8',
        'Sodium': '143',
        'Total Cholesterol': '240',
        'High Density Lipoprotein Cholesterol': '38',
        'Low Density Lipoprotein Cholesterol': '162',
        'Triglycerides': '210',
        'Hemoglobin [Mass/volume] in Blood': '13.8',
        'Leukocytes [#/volume] in Blood by Automated count': '8.9',
        'Platelets [#/volume] in Blood by Automated count': '280'
      })
    }
  }

  const handleClear = () => {
    setFormData({})
    setFormError('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const observations = []

    for (const panel of CLINICAL_FIELDS) {
      for (const f of panel.fields) {
        const val = formData[f.id]
        if (val !== '' && val !== undefined && !isNaN(Number(val))) {
          observations.push({
            name: f.id,
            canonicalName: f.id,
            label: f.label,
            value: Number(val),
            unit: f.unit,
            date: new Date(reportDate).toISOString(),
            confidence: 1.0,
            plausible: Number(val) >= f.min && Number(val) <= f.max,
            plausibilityNote: Number(val) >= f.min && Number(val) <= f.max ? 'Within physiological range' : `Expected ${f.min} - ${f.max}`
          })
        }
      }
    }

    if (observations.length === 0) {
      setFormError('Please enter at least one clinical reading or vital sign.')
      return
    }

    onSubmit({
      observations,
      reportDate: new Date(reportDate).toISOString(),
      title: `Manual Entry (${observations.length} values)`
    })
  }

  const currentPanel = CLINICAL_FIELDS[activeTab]

  return (
    <form onSubmit={handleSubmit} className="manual-health-form">
      {/* ── Top Bar: Date & Quick Presets ────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Calendar size={16} style={{ color: 'var(--brand)' }} />
          <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Measurement Date:</label>
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 13, color: 'var(--text)' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600 }}>Demo Presets:</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => handleApplyPreset('healthy')}
            style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)' }}
          >
            <Sparkles size={12} style={{ color: '#059669' }} /> Normal / Healthy
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => handleApplyPreset('elevated')}
            style={{ fontSize: 11, padding: '4px 10px', border: '1px solid var(--border)' }}
          >
            <ShieldAlert size={12} style={{ color: '#d97706' }} /> Elevated / Risk
          </button>
          {filledCount > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={handleClear}
              style={{ fontSize: 11, padding: '4px 8px', color: '#dc2626' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Panel Navigation Tabs ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 10, marginBottom: 16, overflowX: 'auto' }}>
        {CLINICAL_FIELDS.map((panel, idx) => {
          const Icon = panel.icon
          const panelFilled = panel.fields.filter(f => formData[f.id] !== '' && formData[f.id] !== undefined).length
          const isActive = activeTab === idx
          return (
            <button
              key={panel.category}
              type="button"
              onClick={() => setActiveTab(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 8,
                fontSize: 12, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                background: isActive ? 'var(--surface-3)' : 'transparent',
                border: isActive ? `1px solid ${panel.color}` : '1px solid transparent',
                color: isActive ? 'var(--text)' : 'var(--muted)',
                transition: 'all 0.15s', whiteSpace: 'nowrap'
              }}
            >
              <Icon size={14} style={{ color: panel.color }} />
              {panel.category.split(' ')[0]}
              {panelFilled > 0 && (
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 10,
                  background: panel.color, color: '#fff', fontWeight: 800
                }}>
                  {panelFilled}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Active Panel Input Grid ────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          {(() => {
            const Icon = currentPanel.icon
            return <Icon size={18} style={{ color: currentPanel.color }} />
          })()}
          <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
            {currentPanel.category}
          </h4>
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 'auto' }}>
            Fill any available measurements (unfilled values are safely handled by XGBoost)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {currentPanel.fields.map(f => {
            const val = formData[f.id] || ''
            const numVal = parseFloat(val)
            const isOutOfRange = !isNaN(numVal) && (numVal < f.min || numVal > f.max)

            return (
              <div
                key={f.id}
                style={{
                  background: 'var(--surface-2)', border: `1px solid ${isOutOfRange ? '#fecaca' : val ? 'var(--border-strong)' : 'var(--border)'}`,
                  borderRadius: 9, padding: '10px 12px', transition: 'border-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                    {f.label}
                  </label>
                  <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4 }}>
                    Ref: {f.normal} {f.unit}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    step={f.step}
                    placeholder={f.placeholder}
                    value={val}
                    onChange={e => handleFieldChange(f.id, e.target.value)}
                    style={{
                      flex: 1, padding: '7px 10px', borderRadius: 6,
                      border: `1px solid ${isOutOfRange ? '#dc2626' : 'var(--border)'}`,
                      background: 'var(--surface)', fontSize: 13, fontWeight: 600, color: 'var(--text)'
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', minWidth: 42 }}>
                    {f.unit}
                  </span>
                </div>

                {isOutOfRange && (
                  <div style={{ fontSize: 10, color: '#dc2626', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={10} /> Value outside plausible range ({f.min} - {f.max})
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {formError && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} /> {formError}
        </div>
      )}

      {/* ── Bottom Submission Bar ──────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Biomarkers provided: <b style={{ color: filledCount > 0 ? 'var(--brand)' : 'var(--muted)' }}>{filledCount}</b> / 29
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {activeTab < CLINICAL_FIELDS.length - 1 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setActiveTab(t => t + 1)}
              style={{ fontSize: 12, padding: '8px 16px' }}
            >
              Next Category <ArrowRight size={13} />
            </button>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={filledCount === 0 || loading}
            style={{ padding: '9px 24px', fontSize: 13 }}
          >
            {loading ? (
              <><Loader2 size={15} className="spin" /> Computing Trajectory & Risk...</>
            ) : (
              <><Check size={15} /> Save & Compute 90-Day Acute Risk ({filledCount})</>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
