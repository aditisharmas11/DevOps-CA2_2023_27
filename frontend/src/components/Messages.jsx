import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import api from '../api/client'

export default function Messages() {
  const [peer, setPeer] = useState('')
  const loc = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(loc.search)
    const withUser = params.get('with')
    if (withUser) setPeer(withUser)
  }, [loc.search])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    if (!peer) return
    setLoading(true); setError('')
    try {
      const res = await api.get('/api/messages', { params: { with: peer } })
      setMessages(Array.isArray(res.data) ? res.data : [])
    } catch (e) { setError(e?.response?.data || 'Failed to load messages') } finally { setLoading(false) }
  }

  async function send() {
    if (!peer || !input.trim()) return
    try {
      await api.post('/api/messages', { to: peer, content: input.trim() })
      setInput('')
      await load()
    } catch (e) { setError(e?.response?.data || 'Send failed') }
  }

  useEffect(() => { load() }, [peer])

  return (
    <div>
      <Header variant="private" />
      <div className="container" style={{ marginTop: 18, display: 'grid', gap: 10 }}>
        <h2>Messages</h2>
        <div className="sm-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="sm-input" placeholder="Chat with username" value={peer} onChange={e=>setPeer(e.target.value)} />
            <button className="sm-btn" onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Load'}</button>
          </div>
        </div>
        {error && <div className="error">{String(error)}</div>}
        <div className="sm-card" style={{ padding: 12, minHeight: 300 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            {messages.map(m => (
              <div key={m.id} style={{ background: '#f6f6ff', padding: 8, borderRadius: 8 }}>
                <div style={{ fontSize: 12 }}><b>{m.fromUsername}</b> → {m.toUsername}</div>
                <div>{m.content}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="sm-card" style={{ padding: 12, display: 'flex', gap: 8 }}>
          <input className="sm-input" placeholder="Type a message" value={input} onChange={e=>setInput(e.target.value)} />
          <button className="sm-btn sm-btn-primary" onClick={send}>Send</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
