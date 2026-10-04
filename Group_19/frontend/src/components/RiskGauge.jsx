/**
 * RiskGauge — animated SVG circular gauge
 * Props: percent (0-100), size, label, category
 */
export default function RiskGauge({ percent = 0, size = 140, category = 'MODERATE' }) {
  const r = (size / 2) - 14
  const circ = 2 * Math.PI * r
  const filled = (percent / 100) * circ * 0.75   // 3/4 arc
  const offset = circ * 0.125                     // start at -135deg

  const colorMap = {
    LOW:       '#10b981',
    MODERATE:  '#f59e0b',
    HIGH:      '#ef4444',
    VERY_HIGH: '#dc2626',
  }
  const color = colorMap[category] || '#f59e0b'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-225deg)' }}>
          {/* Track */}
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10}
            strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
          />
          {/* Fill */}
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}66)`, transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>
        {/* Center label */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          paddingTop: 8,
        }}>
          <div style={{ fontSize: size > 120 ? 22 : 16, fontWeight: 800, color, fontFamily: 'Outfit', lineHeight: 1 }}>
            {percent.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', marginTop: 2 }}>Future Risk</div>
          <div style={{ fontSize: 9, color: 'var(--color-muted)' }}>90 Days</div>
        </div>
      </div>
    </div>
  )
}
