import { useEffect, useState } from 'react'
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Clock, TrendingUp, Activity } from 'lucide-react'
import api from '../lib/api'

const riskColor = (cat) => ({ LOW: '#10b981', MODERATE: '#f59e0b', HIGH: '#ef4444', VERY_HIGH: '#dc2626' }[cat] || '#f59e0b')

export default function TimelinePage() {
  const [riskHistory, setRiskHistory] = useState([])
  const [activities, setActivities]   = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/health/risk-history').then(r => r.data),
      api.get('/dashboard').then(r => r.data.recentActivities || []),
    ]).then(([rh, act]) => { setRiskHistory(rh); setActivities(act) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const chartData = riskHistory.map(r => ({
    date: new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    risk: +(r.probabilityPercent || 0).toFixed(1),
    category: r.riskCategory,
  }))

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Health Timeline</h2>
          <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>Your complete health history and risk progression</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} style={{ color: 'var(--color-muted)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{riskHistory.length} analyses recorded</span>
        </div>
      </div>

      <div className="page-container">
        {/* Risk progression chart */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Risk Progression Over Time</h3>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              {[['#10b981','Low (<15%)'],['#f59e0b','Moderate (15–50%)'],['#ef4444','High (>50%)']].map(([c,l]) => (
                <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--color-muted)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}
                </span>
              ))}
            </div>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="riskGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: 'var(--color-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <ReferenceLine y={15} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Low', fill: '#10b981', fontSize: 10 }} />
                <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'High', fill: '#ef4444', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'var(--color-surface-3)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }} formatter={(v, n) => [`${v}%`, 'Risk']} />
                <Area type="monotone" dataKey="risk" stroke="var(--color-brand)" strokeWidth={2.5} fill="url(#riskGrad2)" dot={(props) => {
                  const { cx, cy, payload } = props
                  return <circle key={payload.date} cx={cx} cy={cy} r={5} fill={riskColor(payload.category)} stroke="var(--color-surface)" strokeWidth={2} />
                }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
              <TrendingUp size={36} style={{ color: 'var(--color-muted-2)' }} />
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>Upload health records to see your risk progression</div>
            </div>
          )}
        </div>

        {/* Activity timeline */}
        <div className="card">
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Recent Activity</h3>
          {activities.length > 0 ? (
            <div style={{ position: 'relative', paddingLeft: 24 }}>
              {/* Vertical line */}
              <div style={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 1, background: 'var(--color-border)' }} />
              {activities.map((a, i) => (
                <div key={i} style={{ position: 'relative', marginBottom: 20 }}>
                  <div style={{ position: 'absolute', left: -24, width: 14, height: 14, borderRadius: '50%', background: i === 0 ? 'var(--color-brand)' : 'var(--color-surface-3)', border: `2px solid ${i === 0 ? 'var(--color-brand)' : 'var(--color-border)'}`, top: 2 }} />
                  <div style={{ fontSize: 10, color: 'var(--color-muted)', marginBottom: 3 }}>
                    {new Date(a.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{a.description}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 0' }}>
              <Activity size={36} style={{ color: 'var(--color-muted-2)' }} />
              <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>No activity yet — upload records or analyse symptoms to get started</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
