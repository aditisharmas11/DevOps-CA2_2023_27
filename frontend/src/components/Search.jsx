import Header from './Header.jsx'
import Footer from './Footer.jsx'

export default function Search() {
  const [form, setForm] = useState({ name: '', city: '', faith: '', caste: '' })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function onSearch(e) {
    e?.preventDefault?.()
    setLoading(true); setError('')
    try {
      const res = await api.get('/api/search', { params: form })
      setResults(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setError(err?.response?.data || 'Search failed')
    } finally { setLoading(false) }
  }

  return (
    <div>
      <Header variant="private" />
      <div className="container" style={{ marginTop: 18 }}>
        <h2>Search</h2>
        <form onSubmit={onSearch} className="sm-card" style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 10 }}>
          <input className="sm-input" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <input className="sm-input" placeholder="City" value={form.city} onChange={e=>setForm({...form, city: e.target.value})} />
          <input className="sm-input" placeholder="Faith" value={form.faith} onChange={e=>setForm({...form, faith: e.target.value})} />
          <input className="sm-input" placeholder="Caste" value={form.caste} onChange={e=>setForm({...form, caste: e.target.value})} />
          <div style={{ gridColumn: '1/-1' }}>
            <button className="sm-btn sm-btn-primary" type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
          </div>
        </form>

        {error && <div className="error" style={{ marginTop: 10 }}>{String(error)}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16, marginTop: 12 }}>
          {results.map((m, i) => (
            <div key={m.username || i} className="sm-card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{m.firstName || m.username}</div>
              <div className="muted" style={{ fontSize: 13 }}>
                <div>{m.age} years • {m.occupation}</div>
                <div>{m.education}</div>
                <div>{m.city}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
