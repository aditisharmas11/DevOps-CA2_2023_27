import { useEffect, useState } from 'react'

export default function HealthCheck() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [backendDown, setBackendDown] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setBackendDown(true)
        setLoading(false)
      })
  }, [])

  const statusColor = (val) => {
    if (val === 'up') return 'green'
    if (val === 'down') return 'red'
    return 'gray'
  }

  if (loading) {
    return <p>Checking system health...</p>
  }

  if (backendDown) {
    return (
      <div style={{ padding: 12, border: '1px solid red', borderRadius: 6 }}>
        <h2>System Health</h2>
        <p style={{ color: 'red' }}>
          Backend is unreachable. Make sure Spring Boot is running on port 8080.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
      <h2>System Health</h2>
      <p>
        Overall status:{' '}
        <strong style={{ color: data.status === 'ok' ? 'green' : 'red' }}>
          {data.status.toUpperCase()}
        </strong>
      </p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>
          MongoDB:{' '}
          <strong style={{ color: statusColor(data.mongodb) }}>
            {data.mongodb}
          </strong>
        </li>
        <li>
          Redis:{' '}
          <strong style={{ color: statusColor(data.redis) }}>
            {data.redis}
          </strong>
        </li>
        <li>
          MinIO:{' '}
          <strong style={{ color: statusColor(data.minio) }}>
            {data.minio}
          </strong>
        </li>
      </ul>
    </div>
  )
}