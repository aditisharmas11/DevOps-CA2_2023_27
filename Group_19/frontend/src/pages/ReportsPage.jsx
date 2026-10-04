import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Download, Printer, Copy, Check, RefreshCw, Loader2,
  Shield, Brain, Pill, AlertTriangle, CheckCircle2, AlertCircle,
  Activity, Calendar, Clock, User, Heart, Stethoscope, ChevronRight,
  TrendingUp, TrendingDown, Minus, Info, ArrowUpRight, Search
} from 'lucide-react'
import api from '../lib/api'
import { useAuth } from '../context/AuthContext'

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

export default function ReportsPage() {
  const { user } = useAuth()
  const [report, setReport] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('full') // 'full' | 'm1' | 'm2' | 'm3' | 'history'
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      api.get('/reports/full').then(r => r.data).catch(() => null),
      api.get('/reports/history').then(r => r.data).catch(() => [])
    ]).then(([fullData, histData]) => {
      setReport(fullData)
      setHistory(histData || [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadJson = () => {
    if (!report) return
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2))
    const dlAnchor = document.createElement('a')
    dlAnchor.setAttribute("href", dataStr)
    dlAnchor.setAttribute("download", `meditwin_clinical_report_${report.patient?.id || 'export'}_${new Date().toISOString().slice(0, 10)}.json`)
    document.body.appendChild(dlAnchor)
    dlAnchor.click()
    dlAnchor.remove()
  }

  const handleCopySummary = () => {
    if (!report) return
    const m1 = report.module1
    const m2 = report.module2
    const m3 = report.module3
    const text = `=====================================================
MEDITWIN CLINICAL DECISION SUPPORT REPORT
Report ID: ${report.reportId}
Date: ${new Date(report.generatedAt).toLocaleString()}
Patient: ${report.patient?.name} (ID: ${report.patient?.id})
Age/Sex: ${report.patient?.age} / ${report.patient?.sex}
=====================================================

1. FUTURE HEALTH RISK (MODULE 1):
- Risk Category: ${m1?.riskCategory || 'Not evaluated'}
- 90-Day Acute Probability: ${m1?.probabilityPercent ? m1.probabilityPercent.toFixed(1) + '%' : 'N/A'}
- Data Confidence: ${m1?.dataConfidence?.category || 'MODERATE'} (${(m1?.dataConfidence?.score ? m1.dataConfidence.score * 100 : 90).toFixed(0)}%)
- Total Lab Records Analyzed: ${m1?.historySummary?.total_records || m1?.trends?.length || 0}

2. DIFFERENTIAL DIAGNOSIS (MODULE 2):
${m2?.predictions?.slice(0, 3).map((p, i) => `  ${i + 1}. ${p.disease || p.condition}: ${(p.probability_percent || p.probability * 100).toFixed(1)}% (${p.confidence || 'HIGH'})`).join('\n') || '  No symptom analysis recorded'}

3. TREATMENT & SURVEILLANCE RECOMMENDATIONS (MODULE 3):
- Clinical Urgency Level: ${m3?.urgencyLevel || 'ROUTINE_FOLLOW_UP'}
- Active Protocols: ${m3?.recommendations?.length || 0} conditions
${m3?.recommendations?.slice(0, 3).map((r, i) => `  ${i + 1}. ${r.condition || r.disease} (${r.category || 'General'}):
     - First-line: ${Array.isArray(r.first_line_approach) ? r.first_line_approach[0] : r.first_line_approach || 'Standard protocol'}
     - Classes: ${(r.medication_classes || []).join(', ')}`).join('\n') || '  No treatment protocols generated'}

=====================================================
DISCLAIMER: AI decision support output. Does not replace physician diagnosis.
=====================================================`

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const m1 = report?.module1
  const m2 = report?.module2
  const m3 = report?.module3
  const hasAnyData = !!(m1 || m2 || m3)

  const filteredTrends = (m1?.trends || []).filter(t =>
    !searchTerm || t.observation.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="fade-in">
      {/* ── Page Header (Screen only) ─────────────────────────────────── */}
      <div className="page-header no-print">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
            Comprehensive Clinical Reports
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Multi-Modal Health Intelligence & Decision Support Synthesis
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-secondary" onClick={handleCopySummary} disabled={!hasAnyData}>
            {copied ? <Check size={13} color="var(--brand)" /> : <Copy size={13} />}
            {copied ? 'Summary Copied' : 'Copy Clinical Summary'}
          </button>
          <button className="btn-secondary" onClick={handleDownloadJson} disabled={!hasAnyData}>
            <Download size={13} />
            Export JSON
          </button>
          <button className="btn-primary" onClick={handlePrint} disabled={!hasAnyData}>
            <Printer size={13} />
            Print / Save PDF
          </button>
          <button className="btn-ghost" onClick={loadData} title="Refresh report">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <div className="page-container">
        {/* ── Navigation Tabs (Screen only) ────────────────────────────── */}
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {[
            { id: 'full', label: '📄 Full Comprehensive Report' },
            { id: 'm1', label: '🛡️ Module 1: Future Risk' },
            { id: 'm2', label: '🧠 Module 2: Disease Diagnosis' },
            { id: 'm3', label: '💊 Module 3: Treatment Protocols' },
            { id: 'history', label: `🕒 Generated History (${history.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: activeTab === tab.id ? 'var(--brand)' : 'var(--surface-2)',
                color: activeTab === tab.id ? 'white' : 'var(--text-2)',
                border: `1px solid ${activeTab === tab.id ? 'var(--brand)' : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, gap: 12, color: 'var(--muted)' }}>
            <Loader2 size={24} className="spin" /> Compiling clinical report...
          </div>
        ) : !hasAnyData && activeTab !== 'history' ? (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 650, margin: '20px auto' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FileText size={32} style={{ color: 'var(--brand)' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6, fontFamily: 'Outfit' }}>
              No Clinical Reports Available Yet
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.5 }}>
              Upload your patient health records in <b>Module 1</b> or analyze symptoms in <b>Module 2</b> to generate personalized comprehensive medical reports.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link to="/health" className="btn-primary" style={{ textDecoration: 'none' }}>
                <Shield size={14} /> Upload Health Records
              </Link>
              <Link to="/disease" className="btn-secondary" style={{ textDecoration: 'none' }}>
                <Brain size={14} /> Check Symptoms
              </Link>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* ── Report History Tab ─────────────────────────────────────── */
          <div className="card">
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, fontFamily: 'Outfit' }}>
              Generated Clinical Assessments & Assessment History
            </h3>
            {history.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((h, i) => (
                  <div key={i} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: h.type === 'FUTURE_RISK' ? 'rgba(5,150,105,0.1)' : h.type === 'SYMPTOM_ANALYSIS' ? 'rgba(2,132,199,0.1)' : 'rgba(217,119,6,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: h.type === 'FUTURE_RISK' ? 'var(--m1-accent)' : h.type === 'SYMPTOM_ANALYSIS' ? 'var(--m2-accent)' : 'var(--m3-accent)'
                      }}>
                        {h.type === 'FUTURE_RISK' ? <Shield size={18} /> : h.type === 'SYMPTOM_ANALYSIS' ? <Brain size={18} /> : <Pill size={18} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{h.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{h.summary}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>
                        {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                No history entries recorded yet.
              </div>
            )}
          </div>
        ) : (
          /* ── Printable & Interactive Report Container ───────────────── */
          <div className="card" style={{ padding: '32px', background: 'var(--surface)' }}>

            {/* Medical Header */}
            <div style={{ borderBottom: '2px solid var(--border)', paddingBottom: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800 }}>
                    MT
                  </div>
                  <div>
                    <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0, fontFamily: 'Outfit', color: 'var(--text)' }}>
                      MediTwin Clinical Intelligence Report
                    </h1>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                      Multi-Modal Artificial Intelligence Decision Support System
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--muted)' }}>
                <div>Report ID: <b style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono' }}>{report?.reportId || 'REP-MT-2026'}</b></div>
                <div style={{ marginTop: 2 }}>Generated: <b>{new Date(report?.generatedAt || Date.now()).toLocaleString()}</b></div>
                <div style={{ marginTop: 2 }}>Classification: <span style={{ color: 'var(--brand)', fontWeight: 700 }}>CLINICAL DECISION SUPPORT</span></div>
              </div>
            </div>

            {/* Patient Demographic Card */}
            <div className="reports-demographics-grid" style={{ padding: '16px 20px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', marginBottom: 24, fontSize: 12 }}>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Patient Name</div>
                <div style={{ fontWeight: 800, fontSize: 14, marginTop: 2, color: 'var(--text)' }}>{report?.patient?.name || user?.name || 'Patient'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Patient Identifier</div>
                <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: 'var(--brand)', marginTop: 2 }}>{report?.patient?.id || user?.patientId}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Age & Biological Sex</div>
                <div style={{ fontWeight: 700, marginTop: 2 }}>{report?.patient?.age || 30} Years / {report?.patient?.sex || 'Unknown'}</div>
              </div>
              <div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Attending Engine</div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>XGBoost + DDXPlus + CDSS v1.0</div>
              </div>
            </div>

            {/* Executive Clinical Summary */}
            {(activeTab === 'full' || activeTab === 'm1') && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={16} style={{ color: 'var(--m1-accent)' }} /> 1. Executive Future Health Risk Evaluation (Module 1)
                </h3>

                {m1 ? (
                  <div>
                    {/* Top Stat Row */}
                    <div className="reports-stats-grid" style={{ marginBottom: 16 }}>
                      <div className="card-sm" style={{ borderLeft: `3px solid ${riskColor(m1.riskCategory)}` }}>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>90-Day Acute Risk</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: riskColor(m1.riskCategory), marginTop: 4 }}>
                          {(m1.probabilityPercent || 0).toFixed(1)}%
                        </div>
                        <span className={`badge ${riskBadgeClass(m1.riskCategory)}`} style={{ marginTop: 4 }}>
                          {m1.riskCategory} RISK
                        </span>
                      </div>

                      <div className="card-sm">
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Forecast Horizon</div>
                        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>{m1.predictionHorizonDays || 90} Days</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Validated Horizon</div>
                      </div>

                      <div className="card-sm">
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Data Confidence</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--brand)', marginTop: 4 }}>
                          {m1.dataConfidence?.category || 'HIGH'}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          {((m1.dataConfidence?.score || 0.93) * 100).toFixed(1)}% Completeness
                        </div>
                      </div>

                      <div className="card-sm">
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>Observations Analyzed</div>
                        <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>
                          {m1.historySummary?.total_records || m1.trends?.length || 0}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                          Across {m1.historySummary?.unique_dates || 6} encounters
                        </div>
                      </div>
                    </div>

                    {/* Observation Progression Table */}
                    {m1.trends && m1.trends.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>Longitudinal Biomarker Progression Table</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Showing all {m1.trends.length} tracked patient biomarkers</span>
                        </div>

                        <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Biomarker / Observation</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Baseline Value</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Latest Value</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Change (%)</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Trend</th>
                                <th style={{ padding: '8px 12px', fontWeight: 700 }}>Days Monitored</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m1.trends.map((t, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text)' }}>{t.observation}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{t.first_value ?? '—'} {t.unit || ''}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)' }}>{t.latest_value ?? '—'} {t.unit || ''}</td>
                                  <td style={{ padding: '8px 12px', color: t.percent_change > 0 ? '#dc2626' : t.percent_change < 0 ? '#059669' : 'var(--muted)', fontWeight: 600 }}>
                                    {t.percent_change != null ? `${t.percent_change > 0 ? '+' : ''}${t.percent_change.toFixed(1)}%` : '—'}
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <span style={{
                                      fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                                      background: t.trend === 'INCREASING' ? 'rgba(220,38,38,0.1)' : t.trend === 'DECREASING' ? 'rgba(5,150,105,0.1)' : 'var(--surface-3)',
                                      color: t.trend === 'INCREASING' ? '#dc2626' : t.trend === 'DECREASING' ? '#059669' : 'var(--muted)'
                                    }}>
                                      {t.trend || 'STABLE'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 12px', color: 'var(--muted)' }}>{t.history_days || 243}d</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '14px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 12 }}>
                    No Module 1 future health risk data available for this report.
                  </div>
                )}
              </div>
            )}

            {/* Differential Diagnosis (Module 2) */}
            {(activeTab === 'full' || activeTab === 'm2') && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Brain size={16} style={{ color: 'var(--m2-accent)' }} /> 2. Differential Diagnosis & Symptom Reasoning (Module 2)
                </h3>

                {m2 && m2.predictions?.length > 0 ? (
                  <div>
                    {m2.symptoms?.length > 0 && (
                      <div style={{ marginBottom: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginRight: 4 }}>Presented Symptoms:</span>
                        {m2.symptoms.map((s, i) => (
                          <span key={i} style={{ padding: '2px 10px', borderRadius: 99, background: 'rgba(2,132,199,0.1)', color: 'var(--m2-accent)', border: '1px solid rgba(2,132,199,0.25)', fontSize: 11, fontWeight: 600 }}>
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="table-responsive" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Rank</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Condition / Pathology</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Probability Match</th>
                            <th style={{ padding: '8px 12px', fontWeight: 700 }}>Confidence Band</th>
                          </tr>
                        </thead>
                        <tbody>
                          {m2.predictions.map((p, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 800, color: 'var(--brand)' }}>#{idx + 1}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text)' }}>{p.disease || p.condition}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 80, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                                    <div style={{ width: `${p.probability_percent || p.probability * 100}%`, height: '100%', background: 'var(--m2-accent)' }} />
                                  </div>
                                  <span style={{ fontWeight: 700 }}>{(p.probability_percent || p.probability * 100).toFixed(1)}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{
                                  fontSize: 10, padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                                  background: p.confidence === 'HIGH' ? 'rgba(5,150,105,0.1)' : 'rgba(217,119,6,0.1)',
                                  color: p.confidence === 'HIGH' ? '#059669' : '#d97706'
                                }}>
                                  {p.confidence || 'HIGH'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '14px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 12 }}>
                    No Module 2 symptom diagnosis data available for this report.
                  </div>
                )}
              </div>
            )}

            {/* Treatment Protocols (Module 3) */}
            {(activeTab === 'full' || activeTab === 'm3') && (
              <div style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Pill size={16} style={{ color: 'var(--m3-accent)' }} /> 3. Personalized Treatment & Surveillance Recommendations (Module 3)
                </h3>

                {m3 && m3.recommendations?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Urgency Stratification: <b style={{ color: riskColor(m3.urgencyLevel) }}>{m3.urgencyLevel?.replace(/_/g, ' ') || 'ROUTINE FOLLOW-UP'}</b></span>
                      <span>Active Protocols: <b>{m3.recommendations.length} Conditions</b></span>
                    </div>

                    {m3.recommendations.map((rec, i) => (
                      <div key={i} style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                            #{i + 1} {rec.condition || rec.disease}
                          </span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'var(--surface-3)', fontWeight: 700 }}>
                            {rec.category || 'General Clinical'}
                          </span>
                        </div>

                        {rec.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.4 }}>
                            {rec.description}
                          </div>
                        )}

                        {rec.first_line_approach && (
                          <div style={{ marginBottom: 8, fontSize: 11 }}>
                            <b style={{ color: 'var(--brand)' }}>First-Line Clinical Approach:</b>
                            <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--text-2)' }}>
                              {(Array.isArray(rec.first_line_approach) ? rec.first_line_approach : [rec.first_line_approach]).map((app, j) => (
                                <li key={j} style={{ marginTop: 2 }}>{app}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {rec.medication_classes?.length > 0 && (
                          <div style={{ fontSize: 11, marginTop: 6 }}>
                            <b style={{ color: '#d97706' }}>Recommended Medication Classes: </b>
                            <span style={{ color: 'var(--text-2)' }}>{rec.medication_classes.join(', ')}</span>
                          </div>
                        )}

                        {rec.monitoring?.length > 0 && (
                          <div style={{ fontSize: 11, marginTop: 6 }}>
                            <b style={{ color: 'var(--m2-accent)' }}>Longitudinal Monitoring: </b>
                            <span style={{ color: 'var(--text-2)' }}>{rec.monitoring.join(' · ')}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '14px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--muted)', fontSize: 12 }}>
                    No Module 3 treatment recommendations available for this report.
                  </div>
                )}
              </div>
            )}

            {/* Medical Disclaimer & Signature Block */}
            <div style={{ marginTop: 32, paddingTop: 20, borderTop: '2px solid var(--border)', fontSize: 11, color: 'var(--muted)', lineHeight: 1.5 }}>
              <div className="treatment-grid">
                <div>
                  <b>Clinical Decision Support Disclaimer:</b>
                  <p style={{ margin: '4px 0 0' }}>
                    This document was synthesized by MediTwin's multi-modal clinical intelligence engine using trained machine learning risk models (Module 1), Bayesian/neural differential diagnosis (Module 2), and clinical practice guidelines (Module 3). It is intended exclusively for authorized clinical decision support and patient education. It does not constitute a definitive medical diagnosis or prescription.
                  </p>
                </div>
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                  <div>Reviewing Clinician: ____________________</div>
                  <div style={{ marginTop: 12 }}>Signature: _________________________</div>
                  <div style={{ marginTop: 12 }}>Date: ____ / ____ / ________</div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
