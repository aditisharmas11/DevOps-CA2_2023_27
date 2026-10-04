import { useState } from 'react'

export default function MetadataForm({ onSaved }) {
  const [form, setForm] = useState({ title: '', description: '', filePath: '' })
  const [msg, setMsg] = useState('')

  const submit = async () => {
    const res = await fetch('/api/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setMsg('Saved!')
      setForm({ title: '', description: '', filePath: '' })
      onSaved()
    } else {
      setMsg('Error saving')
    }
  }

  return (
    <div>
      <h2>Store Metadata</h2>
      <input placeholder="Title" value={form.title}
        onChange={e => setForm({ ...form, title: e.target.value })} /><br /><br />
      <input placeholder="Description" value={form.description}
        onChange={e => setForm({ ...form, description: e.target.value })} /><br /><br />
      <input placeholder="File path (optional)" value={form.filePath}
        onChange={e => setForm({ ...form, filePath: e.target.value })} /><br /><br />
      <button onClick={submit}>Save Metadata</button>
      {msg && <p>{msg}</p>}
    </div>
  )
}