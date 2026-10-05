import { useAuth as useCtx } from '../auth/AuthContext.jsx'

export function useAuth() {
  const { token, setToken, username, setUsername } = useCtx()
  const isAuthenticated = !!token
  function login({ token: t, username: u }) {
    setToken(t)
    setUsername(u)
    localStorage.setItem('token', t)
    localStorage.setItem('username', u)
  }
  function logout() {
    setToken(null)
    setUsername(null)
    localStorage.removeItem('token')
    localStorage.removeItem('username')
  }
  function updateUser() {}
  return { user: username ? { name: username } : null, isAuthenticated, login, logout, updateUser }
}


