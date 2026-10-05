import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [username, setUsername] = useState(localStorage.getItem('username'))

  useEffect(() => {
    if (token) localStorage.setItem('token', token)
    else localStorage.removeItem('token')
  }, [token])

  useEffect(() => {
    if (username) localStorage.setItem('username', username)
    else localStorage.removeItem('username')
  }, [username])

  return (
    <AuthContext.Provider value={{ token, setToken, username, setUsername }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
