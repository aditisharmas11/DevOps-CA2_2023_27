import { useState } from 'react'
import {
  FileText, Check, AlertTriangle, Trash2, Plus, Calendar,
  CheckCircle2, X, Eye, EyeOff, Loader2, Sparkles, Shield
} from 'lucide-react'

// Canonical 29 biomarkers for dropdown selection
const ALL_BIOMARKERS = [
  { id: 'Systolic Blood Pressure', label: 'Systolic Blood Pressure (mmHg)', unit: 'mmHg' },
  { id: 'Diastolic Blood Pressure', label: 'Diastolic Blood Pressure (mmHg)', unit: 'mmHg' },
  { id: 'Heart rate', label: 'Heart Rate (bpm)', unit: 'bpm' },
  { id: 'Respiratory rate', label: 'Respiratory Rate (breaths/min)', unit: 'breaths/min' },
  { id: 'Body Weight', label: 'Body Weight (kg)', unit: 'kg' },
  { id: 'Body Mass Index', label: 'Body Mass Index (BMI)', unit: 'kg/m²' },
  { id: 'Glucose', label: 'Fasting Blood Glucose (mg/dL)', unit: 'mg/dL' },
  { id: 'Hemoglobin A1c/Hemoglobin.total in Blood', label: 'HbA1c (%)', unit: '%' },
  { id: 'Creatinine', label: 'Serum Creatinine (mg/dL)', unit: 'mg/dL' },
  { id: 'Urea Nitrogen', label: 'Urea Nitrogen / BUN (mg/dL)', unit: 'mg/dL' },
  { id: 'Glomerular filtration rate/1.73 sq M.predicted', label: 'eGFR (mL/min/1.73m²)', unit: 'mL/min/1.73m²' },
  { id: 'Potassium', label: 'Serum Potassium (mmol/L)', unit: 'mmol/L' },
  { id: 'Sodium', label: 'Serum Sodium (mmol/L)', unit: 'mmol/L' },
  { id: 'Chloride', label: 'Serum Chloride (mmol/L)', unit: 'mmol/L' },
  { id: 'Calcium', label: 'Serum Calcium (mg/dL)', unit: 'mg/dL' },
  { id: 'Carbon Dioxide', label: 'Bicarbonate / CO2 (mmol/L)', unit: 'mmol/L' },
  { id: 'Total Cholesterol', label: 'Total Cholesterol (mg/dL)', unit: 'mg/dL' },
  { id: 'High Density Lipoprotein Cholesterol', label: 'HDL Cholesterol (mg/dL)', unit: 'mg/dL' },
  { id: 'Low Density Lipoprotein Cholesterol', label: 'LDL Cholesterol (mg/dL)', unit: 'mg/dL' },
  { id: 'Triglycerides', label: 'Triglycerides (mg/dL)', unit: 'mg/dL' },
  { id: 'Hemoglobin [Mass/volume] in Blood', label: 'Hemoglobin (g/dL)', unit: 'g/dL' },
  { id: 'Hematocrit [Volume Fraction] of Blood by Automated count', label: 'Hematocrit (%)', unit: '%' },
  { id: 'Leukocytes [#/volume] in Blood by Automated count', label: 'WBC (10³/µL)', unit: '10³/µL' },
  { id: 'Platelets [#/volume] in Blood by Automated count', label: 'Platelets (10³/µL)', unit: '10³/µL' },
  { id: 'Alanine aminotransferase [Enzymatic activity/volume] in Serum or Plasma', label: 'ALT (U/L)', unit: 'U/L' },
  { id: 'Aspartate aminotransferase [Enzymatic activity/volume] in Serum or Plasma', label: 'AST (U/L)', unit: 'U/L' },
  { id: 'Alkaline phosphatase [Enzymatic activity/volume] in Serum or Plasma', label: 'Alkaline Phosphatase (U/L)', unit: 'U/L' },
  { id: 'Bilirubin.total [Mass/volume] in Serum or Plasma', label: 'Total Bilirubin (mg/dL)', unit: 'mg/dL' },
  { id: 'Albumin [Mass/volume] in Serum or Plasma', label: 'Albumin (g/dL)', unit: 'g/dL' },
]

export default function PdfReviewModal({ extractionData, onConfirm, onCancel, loading }) {
  const [observations, setObservations] = useState(() => (extractionData?.observations || []).map((o, idx) => ({ ...o, _key: idx })))
  const [reportDate, setReportDate] = useState(() => {
    if (extractionData?.report_date) {
      try { return new Date(extractionData.report_date).toISOString().slice(0, 10) } catch {}
    }
    return new Date().toISOString().slice(0, 10)
  })
  const [showRawText, setShowRawText] = useState(false)
  const [newBiomarkerId, setNewBiomarkerId] = useState(ALL_BIOMARKERS[0].id)
  const [newValue, setNewValue] = useState('')

  const handleUpdateValue = (key, val) => {
    setObservations(prev => prev.map(obs => obs._key === key ? { ...obs, value: val } : obs))
  }

  const handleUpdateUnit = (key, unit) => {
    setObservations(prev => prev.map(obs => obs._key === key ? { ...obs, unit } : obs))
  }

  const handleRemove = (key) => {
    setObservations(prev => prev.filter(obs => obs._key !== key))
  }

  const handleAddCustom = () => {
    if (!newValue || isNaN(Number(newValue))) return
    const bio = ALL_BIOMARKERS.find(b => b.id === newBiomarkerId) || ALL_BIOMARKERS[0]
    setObservations(prev => [
      ...prev,
      {
        _key: Date.now(),
        name: bio.id,
        canonical_name: bio.id,
        label: bio.label.split(' (')[0],
        value: Number(newValue),
        unit: bio.unit,
        confidence: 1.0,
        plausible: true,
        plausibility_note: 'Manually added by user'
      }
    ])
    setNewValue('')
  }

  const handleConfirmSubmit = () => {
    const verified = observations
      .filter(o => o.value !== '' && o.value !== null && !isNaN(Number(o.value)))
      .map(o => ({
        name: o.canonical_name || o.name,
        canonicalName: o.canonical_name || o.name,
        label: o.label || o.name,
        value: Number(o.value),
        unit: o.unit || '',
        confidence: o.confidence || 1.0,
        plausible: o.plausible !== undefined ? o.plausible : true,
        plausibilityNote: o.plausibility_note || ''
      }))

    onConfirm({
      observations: verified,
      reportDate: new Date(reportDate).toISOString(),
      fileName: extractionData?.file_name || 'Lab_Report.pdf',
      rawTextLength: extractionData?.raw_text_length || 0,
      isScanned: extractionData?.is_scanned || false,
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '840px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid var(--border)'
      }}>
        
        {/* ── Modal Header ─────────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--surface-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: 'rgba(5,150,105,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--m1-accent)'
            }}>
              <FileText size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
                Review Extracted Medical Observations
              </h3>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                Verify and edit OCR-extracted values from <b>{extractionData?.file_name || 'Uploaded PDF'}</b> before XGBoost analysis
              </div>
            </div>
          </div>
          <button className="btn-ghost" onClick={onCancel} style={{ padding: 6 }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Extraction Summary & Date Bar ────────────────────────── */}
        <div style={{
          padding: '12px 20px', background: 'var(--surface-3)', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={15} style={{ color: 'var(--brand)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>Report / Specimen Date:</span>
            <input
              type="date"
              value={reportDate}
              onChange={e => setReportDate(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surface)', fontSize: 12, color: 'var(--text)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge-low" style={{ fontSize: 11, padding: '3px 8px' }}>
              <CheckCircle2 size={12} style={{ marginRight: 4 }} />
              {observations.length} Biomarkers Detected
            </span>
            {extractionData?.is_scanned && (
              <span className="badge badge-moderate" style={{ fontSize: 11, padding: '3px 8px' }}>
                <Sparkles size={12} style={{ marginRight: 4 }} />
                Scanned PDF (OCR Engine Applied)
              </span>
            )}
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setShowRawText(!showRawText)}
              style={{ fontSize: 11, padding: '4px 8px', border: '1px solid var(--border)' }}
            >
              {showRawText ? <><EyeOff size={12} /> Hide Text</> : <><Eye size={12} /> View Raw Text</>}
            </button>
          </div>
        </div>

        {/* ── Raw Text Accordion ────────────────────────────────────── */}
        {showRawText && (
          <div style={{
            padding: '12px 20px', background: '#0f172a', color: '#94a3b8',
            fontFamily: 'monospace', fontSize: 11, maxHeight: 150, overflowY: 'auto',
            borderBottom: '1px solid var(--border)', lineHeight: 1.4
          }}>
            <div style={{ color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>Parsed PDF Content:</div>
            {extractionData?.preview_text || 'No text content available.'}
          </div>
        )}

        {/* ── Observations Table ───────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {observations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--muted)' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 8px', color: '#d97706' }} />
              <div style={{ fontSize: 14, fontWeight: 700 }}>No known biomarkers automatically recognized</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>You can manually add measurements below using the dropdown selector.</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', textAlign: 'left', color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 10px' }}>Medical Observation</th>
                  <th style={{ padding: '8px 10px', width: '140px' }}>Extracted Value</th>
                  <th style={{ padding: '8px 10px', width: '90px' }}>Unit</th>
                  <th style={{ padding: '8px 10px', width: '110px' }}>Plausibility</th>
                  <th style={{ padding: '8px 10px', width: '90px' }}>Confidence</th>
                  <th style={{ padding: '8px 10px', width: '50px', textAlign: 'center' }}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((obs) => {
                  const numVal = parseFloat(obs.value)
                  const isInvalid = isNaN(numVal)

                  return (
                    <tr key={obs._key} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                          {obs.label || obs.canonical_name || obs.name}
                        </div>
                        {obs.raw_match && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                            Matched from: <i>"{obs.raw_match.slice(0, 55)}"</i>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="number"
                          step="any"
                          value={obs.value}
                          onChange={e => handleUpdateValue(obs._key, e.target.value)}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: 6,
                            border: `1px solid ${isInvalid ? '#dc2626' : 'var(--border)'}`,
                            background: 'var(--surface)', fontSize: 13, fontWeight: 700, color: 'var(--text)'
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <input
                          type="text"
                          value={obs.unit || ''}
                          onChange={e => handleUpdateUnit(obs._key, e.target.value)}
                          style={{
                            width: '100%', padding: '6px 8px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'var(--surface)',
                            fontSize: 12, color: 'var(--muted)'
                          }}
                        />
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        {obs.plausible !== false ? (
                          <span style={{ fontSize: 11, color: '#059669', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> Plausible
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }} title={obs.plausibility_note}>
                            <AlertTriangle size={12} /> Check
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: (obs.confidence || 1) > 0.8 ? '#059669' : '#d97706' }}>
                          {Math.round((obs.confidence || 1) * 100)}% Match
                        </span>
                      </td>

                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => handleRemove(obs._key)}
                          style={{ padding: 4, color: '#dc2626' }}
                          title="Remove row"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          )}

          {/* ── Add Missing Observation Bar ────────────────────────── */}
          <div style={{
            marginTop: 16, padding: '12px 14px', background: 'var(--surface-2)',
            borderRadius: 8, border: '1px dashed var(--border)', display: 'flex',
            alignItems: 'center', gap: 10, flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
              + Add Missing Observation:
            </span>
            <select
              value={newBiomarkerId}
              onChange={e => setNewBiomarkerId(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, color: 'var(--text)'
              }}
            >
              {ALL_BIOMARKERS.map(b => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              placeholder="Value"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              style={{
                width: 100, padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--border)', background: 'var(--surface)', fontSize: 12, color: 'var(--text)'
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={handleAddCustom}
              disabled={!newValue}
              style={{ fontSize: 12, padding: '6px 14px' }}
            >
              <Plus size={13} /> Add
            </button>
          </div>
        </div>

        {/* ── Modal Footer ─────────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
          background: 'var(--surface-2)'
        }}>
          <button type="button" className="btn-ghost" onClick={onCancel} disabled={loading}>
            Discard & Cancel
          </button>

          <button
            type="button"
            className="btn-primary"
            onClick={handleConfirmSubmit}
            disabled={observations.length === 0 || loading}
            style={{ padding: '9px 24px', fontSize: 13 }}
          >
            {loading ? (
              <><Loader2 size={15} className="spin" /> Computing XGBoost Trajectory & Risk...</>
            ) : (
              <><Check size={15} /> Confirm & Run Risk Analysis ({observations.length} Biomarkers)</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
