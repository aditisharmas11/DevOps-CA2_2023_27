import { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mt_user')) } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const { data } = await api.get('/auth/me')
      localStorage.setItem('mt_user', JSON.stringify(data))
      setUser(data)
      return data
    } catch {
      localStorage.removeItem('mt_token')
      localStorage.removeItem('mt_user')
      setUser(null)
      return null
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('mt_token')
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    if (data.token) {
      localStorage.setItem('mt_token', data.token)
    }
    if (data.user) {
      localStorage.setItem('mt_user', JSON.stringify(data.user))
      setUser(data.user)
    }
    return data.user
  }

  const signup = async (payload) => {
    // If payload is FormData (contains doctor ID file), axios will handle multipart headers
    const config = payload instanceof FormData ? {
      headers: { 'Content-Type': 'multipart/form-data' }
    } : {}

    const { data } = await api.post('/auth/signup', payload, config)
    if (data.token) {
      localStorage.setItem('mt_token', data.token)
    }
    if (data.user) {
      localStorage.setItem('mt_user', JSON.stringify(data.user))
      setUser(data.user)
    }
    return data
  }

  const googleAuth = async (credential, role = 'patient') => {
    const { data } = await api.post('/auth/google', { credential, role })
    if (data.token) {
      localStorage.setItem('mt_token', data.token)
    }
    if (data.user) {
      localStorage.setItem('mt_user', JSON.stringify(data.user))
      setUser(data.user)
    }
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('mt_token')
    localStorage.removeItem('mt_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      googleAuth,
      refreshUser,
      logout,
      loading,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
