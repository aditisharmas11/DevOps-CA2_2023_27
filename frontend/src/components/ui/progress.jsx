export function Progress({ value = 0, className = '' }) {
  return (
    <div className={className} style={{ width: '100%', background: '#eee', borderRadius: 999, height: 8 }}>
      <div style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: 'var(--sm-color-primary)', height: '100%', borderRadius: 999 }} />
    </div>
  )
}


