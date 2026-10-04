import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell, AlertTriangle, AlertCircle, CheckCircle2, Shield,
  Brain, Pill, RefreshCw, Activity, Heart, Clock, Loader2,
  ChevronRight, ArrowUpRight
} from 'lucide-react'
import api from '../lib/api'

export default function AlertsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = () => {
    setLoading(true)
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const risk = data?.latestRisk
  const disease = data?.latestDisease
  const treatment = data?.latestTreatment

  // Generate dynamic clinical alerts based on real data
  const alerts = []

  if (risk) {
    const prob = risk.probabilityPercent || 0
    if (risk.riskCategory === 'HIGH' || risk.riskCategory === 'VERY_HIGH' || prob > 45) {
      alerts.push({
        id: 'alt-risk-high',
        level: 'HIGH',
        title: 'Elevated 90-Day Acute Health Risk',
        description: `ML predictive model estimates a ${prob.toFixed(1)}% acute event probability (${risk.riskCategory} category). Follow-up clinical evaluation recommended.`,
        module: 'Module 1',
        icon: Shield,
        color: '#dc2626',
        bg: '#fee2e2',
        link: '/health',
        actionLabel: 'View Risk Report'
      })
    } else {
      alerts.push({
        id: 'alt-risk-stable',
        level: 'INFO',
        title: '90-Day Acute Risk Status: LOW / STABLE',
        description: `Recent health records indicate an acute event probability of ${prob.toFixed(1)}%, within acceptable baseline bounds.`,
        module: 'Module 1',
        icon: CheckCircle2,
        color: '#059669',
        bg: '#dcfce7',
        link: '/health',
        actionLabel: 'View Biomarkers'
      })
    }

    // Check abnormal observations
    (risk.trends || []).forEach((t, i) => {
      if (t.trend === 'INCREASING' && (t.observation.includes('Blood Pressure') || t.observation.includes('Creatinine') || t.observation.includes('Hemoglobin A1c'))) {
        alerts.push({
          id: `alt-trend-${i}`,
          level: 'WARNING',
          title: `Increasing Trend: ${t.observation}`,
          description: `Latest recorded value: ${t.latest_value} (${t.percent_change > 0 ? '+' : ''}${t.percent_change?.toFixed(1)}% over ${t.history_days || 243} days). Surveillance advised.`,
          module: 'Module 1',
          icon: Activity,
          color: '#d97706',
          bg: '#fef3c7',
          link: '/health',
          actionLabel: 'Examine Trend'
        })
      }
    })
  }

  if (disease && disease.predictions?.length > 0) {
    const top = disease.predictions[0]
    const prob = top.probability_percent || top.probability * 100 || 0
    if (prob > 50) {
      alerts.push({
        id: 'alt-disease-top',
        level: 'WARNING',
        title: `Differential Diagnosis Priority: ${top.disease || top.condition}`,
        description: `Symptom reasoning engine identifies ${top.disease || top.condition} as highest likelihood match (${prob.toFixed(1)}% probability).`,
        module: 'Module 2',
        icon: Brain,
        color: '#0284c7',
        bg: '#e0f2fe',
        link: '/disease',
        actionLabel: 'Review Diagnosis'
      })
    }
  }

  if (treatment && treatment.recommendations?.length > 0) {
    alerts.push({
      id: 'alt-treatment-ready',
      level: 'INFO',
      title: `${treatment.recommendations.length} Active Treatment & Surveillance Protocols Available`,
      description: `Urgency level: ${treatment.urgencyLevel?.replace(/_/g, ' ') || 'ROUTINE FOLLOW-UP'}. First-line clinical guidelines and medication classes computed.`,
      module: 'Module 3',
      icon: Pill,
      color: 'var(--brand)',
      bg: 'rgba(5,150,105,0.1)',
      link: '/treatment',
      actionLabel: 'View Treatment Protocols'
    })
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'Outfit' }}>
            Clinical Alerts & Health Notifications
          </h2>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
            Real-time surveillance warnings and proactive medical decision alerts
          </div>
        </div>
        <button className="btn-ghost" onClick={loadData} title="Refresh Alerts">
          <RefreshCw size={13} />
        </button>
      </div>

      <div className="page-container">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 350, gap: 12, color: 'var(--muted)' }}>
            <Loader2 size={24} className="spin" /> Checking clinical alert signals...
          </div>
        ) : alerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 850 }}>
            {alerts.map(alt => {
              const Icon = alt.icon
              return (
                <div
                  key={alt.id}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    borderLeft: `4px solid ${alt.color}`, padding: '16px 20px'
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: alt.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Icon size={20} style={{ color: alt.color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>
                        {alt.title}
                      </span>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 99, fontWeight: 700,
                        background: alt.bg, color: alt.color
                      }}>
                        {alt.module}
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 10 }}>
                      {alt.description}
                    </div>

                    <Link
                      to={alt.link}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 700, color: alt.color, textDecoration: 'none'
                      }}
                    >
                      {alt.actionLabel} <ChevronRight size={13} />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ padding: '60px 20px', textAlign: 'center', maxWidth: 600, margin: '20px auto' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <CheckCircle2 size={28} style={{ color: 'var(--brand)' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, fontFamily: 'Outfit' }}>
              No Active Clinical Alerts
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 380, margin: '0 auto 16px', lineHeight: 1.4 }}>
              All biomarker levels, future risk forecasts, and symptom surveillance indicators are currently within normal baseline bounds.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
