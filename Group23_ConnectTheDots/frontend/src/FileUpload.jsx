import { useState } from 'react'

export default function FileUpload({ onUploaded }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async () => {
    if (!file || !title) {
      setError('Title and file are required')
      return
    }
    setUploading(true)
    setError('')

    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)
    formData.append('description', description)

    try {
      const res = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data)
        onUploaded()
      } else {
        setError('Upload failed. Check backend logs.')
      }
    } catch (e) {
      setError('Could not reach backend.')
    } finally {
      setUploading(false)
    }
  }

  const downloadFile = async (id, filename) => {
    try {
      const res = await fetch(`/api/get-file?id=${id}`)
      if (!res.ok) throw new Error('File not found')

      // Convert response to blob and trigger browser download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || 'downloaded-file'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      alert('Could not download file: ' + e.message)
    }
  }

  return (
    <div style={{ padding: 12, border: '1px solid #ccc', borderRadius: 6 }}>
      <h2>Upload File</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
        <input
          placeholder="Title (required)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        />
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
        />
        <button
          onClick={upload}
          disabled={!file || uploading}
          style={{ padding: '8px 16px', cursor: 'pointer' }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 12, padding: 10, background: '#f0fff0', borderRadius: 6 }}>
          <p style={{ color: 'green' }}>Upload successful!</p>
          <p><strong>Title:</strong> {result.title}</p>
          <p><strong>ID:</strong> {result.id}</p>
          <p><strong>File path:</strong> {result.filePath}</p>
          <button
            onClick={() => downloadFile(result.id, result.filePath)}
            style={{ padding: '6px 12px', cursor: 'pointer', marginTop: 6 }}
          >
            Download uploaded file
          </button>
        </div>
      )}
    </div>
  )
}