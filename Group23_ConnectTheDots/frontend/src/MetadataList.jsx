import { useEffect, useState } from 'react'

export default function MetadataList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/metadata')
      .then(r => r.json())
      .then(data => {
        setItems(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const downloadFile = async (id, filePath) => {
    try {
      const res = await fetch(`/api/get-file?id=${id}`)
      if (!res.ok) throw new Error('File not found')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Extract just the filename from the full path
      a.download = filePath ? filePath.split('-').slice(1).join('-') : 'file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Download failed: ' + e.message)
    }
  }

  if (loading) return <p>Loading metadata...</p>

  return (
    <div>
      <h2>Stored Metadata</h2>
      {items.length === 0 && <p>No metadata stored yet.</p>}
      {items.map(item => (
        <div key={item.id} style={{
          border: '1px solid #ccc',
          padding: 12,
          marginBottom: 10,
          borderRadius: 6
        }}>
          <p><strong>{item.title}</strong></p>
          <p style={{ color: '#666' }}>{item.description}</p>
          <p style={{ fontSize: 12, color: '#999' }}>ID: {item.id}</p>
          <p style={{ fontSize: 12, color: '#999' }}>
            File: {item.filePath || 'No file attached'}
          </p>
          {item.filePath && (
            <button
              onClick={() => downloadFile(item.id, item.filePath)}
              style={{ padding: '6px 12px', cursor: 'pointer', marginTop: 6 }}
            >
              Download file
            </button>
          )}
        </div>
      ))}
    </div>
  )
}