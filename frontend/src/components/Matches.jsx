import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { useAuth } from '../auth/AuthContext.jsx'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Heart, MessageCircle } from 'lucide-react'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import { InterestButton } from './InterestButton'

export default function Matches() {
  const { username } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [outbox, setOutbox] = useState([])
  const [inbox, setInbox] = useState([])
  const [mutual, setMutual] = useState([])

  const dummyProfiles = []

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/api/match', { params: { username } })
        if (!cancelled) setMatches(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(err?.response?.data || 'Failed to load matches')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (username) load()
    return () => { cancelled = true }
  }, [username])

  async function loadOutbox() {
    try {
      const res = await api.get('/api/interests/outbox')
      setOutbox(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }

  async function loadInbox() {
    try {
      const res = await api.get('/api/interests/inbox')
      setInbox(Array.isArray(res.data) ? res.data : [])
    } catch {}
  }

  async function loadMutual() {
    try {
      const res = await api.get('/api/interests/matches')
      const mutualUsernames = Array.isArray(res.data) ? res.data : []
      setMutual(mutualUsernames)
    } catch {}
  }

  useEffect(() => { 
    if (username) { 
      loadOutbox()
      loadInbox()
      loadMutual()
    } 
  }, [username])

  // Get full profile data for mutual matches from existing matches
  const mutualProfiles = useMemo(() => {
    if (!Array.isArray(mutual) || mutual.length === 0) return []
    return mutual.map(username => {
      return matches.find(m => m.username === username) || { username, firstName: username }
    }).filter(Boolean)
  }, [mutual, matches])

  const allProfiles = useMemo(() => {
    const fromApi = Array.isArray(matches) ? matches : []
    return fromApi.sort((a,b) => (b.compatibility || 0) - (a.compatibility || 0))
  }, [matches])

  // Filter out mutual interests from outbox and inbox
  const filteredOutbox = useMemo(() => {
    const mutualUsernames = new Set(Array.isArray(mutual) ? mutual : [])
    return outbox.filter(interest => !mutualUsernames.has(interest.toUsername))
  }, [outbox, mutual])

  const filteredInbox = useMemo(() => {
    const mutualUsernames = new Set(Array.isArray(mutual) ? mutual : [])
    return inbox.filter(interest => !mutualUsernames.has(interest.fromUsername))
  }, [inbox, mutual])


  return (
    <div>
      <Header variant="private" />
      <div className="container" style={{ marginTop: 18 }}>
        <h1 className="title" style={{ color: '#000000' }}>Daily Matches</h1>
        {loading && <div className="muted">Loading…</div>}
        {error && <div className="error">{String(error)}</div>}
        {!loading && allProfiles.length === 0 && (
          <div>No matches found</div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0,1fr))', gap: 16 }}>
          {allProfiles.map((m, i) => (
            <Card key={m.username || i} style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <ImageWithFallback src={m.photoUrl || null} alt={m.firstName} style={{ width: '100%', height: 200, objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                  {m.isOnline && <Badge style={{ background: '#10b981', color: '#fff', fontSize: 11 }}>Online</Badge>}
                  <Badge style={{ background: '#9333ea', color: '#fff', fontSize: 11 }}>{Math.round(m.compatibility || 0)}% Match</Badge>
                </div>
              </div>
              <CardContent>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{m.firstName}</div>
                <div className="muted" style={{ fontSize: 13, display: 'grid', gap: 2 }}>
                  <div>{m.age} years • {m.occupation}</div>
                  <div>{m.education}</div>
                  <div>{m.city}</div>
                  <div>Rashi: {m.rashi || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <InterestButton 
                    matchUsername={m.username} 
                    onInterestSent={() => {
                      loadOutbox()
                      loadInbox()
                      loadMutual()
                    }} 
                  />
                  <Button size="sm" variant="outline" style={{ flex: 1 }}><MessageCircle className="h-4 w-4" style={{ marginRight: 4 }} />Message</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      {/* Interests Received Section */}
      <div className="container" style={{ marginTop: 24 }}>
        <h2 className="title" style={{ color: '#000000' }}>Interests Received</h2>
        {filteredInbox.length === 0 && <div className="muted">No one has shown interest in you yet.</div>}
        {filteredInbox.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
            {filteredInbox.map((interest, idx) => (
              <Card key={interest.fromUsername || idx}>
                <CardContent>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: '#ec4899' }}>
                    {interest.fromUsername} showed interest!
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>Status: {interest.status || 'pending'}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    {interest.createdAt ? new Date(interest.createdAt).toLocaleString() : 'Recently'}
                  </div>
                  <Button size="sm" className="sm-btn-primary" style={{ marginTop: 8, width: '100%', background: '#10b981' }}>
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Interests You Sent Section */}
      <div className="container" style={{ marginTop: 24 }}>
        <h2 className="title" style={{ color: '#000000' }}>Interests You Sent</h2>
        {filteredOutbox.length === 0 && <div className="muted">You haven't sent any interests yet.</div>}
        {filteredOutbox.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
            {filteredOutbox.map((interest, idx) => (
              <Card key={interest.toUsername || idx}>
                <CardContent>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>To: {interest.toUsername}</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Status: <span style={{ color: interest.status === 'accepted' ? '#10b981' : '#f59e0b' }}>
                      {interest.status || 'pending'}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    Sent: {interest.createdAt ? new Date(interest.createdAt).toLocaleString() : 'Recently'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="container" style={{ marginTop: 24 }}>
        <h2 className="title" style={{ color: '#000000' }}>Mutual Matches</h2>
        {mutualProfiles.length === 0 && <div className="muted">No mutual interests yet.</div>}
        {mutualProfiles.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
            {mutualProfiles.map((m, i) => (
            <Card key={m.username || i} style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <ImageWithFallback src={m.photoUrl} alt={m.firstName} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
              </div>
              <CardContent>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>{m.firstName}</div>
                <div className="muted" style={{ fontSize: 13, display: 'grid', gap: 2 }}>
                  <div>{m.age} years • {m.occupation || '—'}</div>
                  <div>{m.education || '—'}</div>
                  <div>{m.city || '—'}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <Button size="sm" className="sm-btn-primary" style={{ background: '#10b981', flex: 1 }} onClick={() => window.location.assign(`/messages?with=${encodeURIComponent(m.username)}`)}>start  chatting now</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}


