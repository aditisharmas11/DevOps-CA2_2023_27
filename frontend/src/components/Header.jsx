import { Link, NavLink, useNavigate } from 'react-router-dom'
import './header.css'
import { useAuth } from '../auth/AuthContext.jsx'

export default function Header({ variant = 'public' }) {
  const { setToken, setUsername } = useAuth()
  const navigate = useNavigate()

  function onLogout() {
    try {
      setToken && setToken(null)
      setUsername && setUsername(null)
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      navigate('/login')
    } catch {}
  }

  return (
    <header className={`sm-header ${variant === 'private' ? 'private' : ''}`}>
      <div className="container sm-header-row">
        <Link to="/" className="brand">SoulMate</Link>
        {variant === 'public' ? (
          <nav className="nav">
            <Link className="sm-link" to="/login">Login</Link>
            <Link className="sm-btn sm-btn-primary join" to="/register">Join</Link>
          </nav>
        ) : (
          <div className="nav tabs" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <NavLink className={({isActive}) => `tab ${isActive ? 'active' : ''}`} to="/dashboard">Dashboard</NavLink>
            <NavLink className={({isActive}) => `tab ${isActive ? 'active' : ''}`} to="/matches">Matches</NavLink>
            <NavLink className={({isActive}) => `tab ${isActive ? 'active' : ''}`} to="/search">Search</NavLink>
            <NavLink className={({isActive}) => `tab ${isActive ? 'active' : ''}`} to="/messages">Messages</NavLink>
            <button className="sm-btn" onClick={onLogout} style={{ marginLeft: 8 }}>Logout</button>
          </div>
        )}
      </div>
    </header>
  )
}


