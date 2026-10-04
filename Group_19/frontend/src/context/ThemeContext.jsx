import { createContext, useContext, useState, useEffect } from 'react'

export const themes = {
  emerald: { name: 'Emerald', emoji: '💚', dataTheme: 'emerald', dot: '#059669' },
  light:   { name: 'Blue',    emoji: '☀️',  dataTheme: 'light',   dot: '#2563eb' },
  dark:    { name: 'Dark',    emoji: '🌙',  dataTheme: 'dark',    dot: '#3b82f6' },
  violet:  { name: 'Violet',  emoji: '🟣', dataTheme: 'violet',  dot: '#8b5cf6' },
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(
    () => localStorage.getItem('mt_theme') || 'emerald'
  )

  const setThemeKey = (key) => {
    const theme = themes[key] || themes.emerald
    const html = document.documentElement
    html.setAttribute('data-theme', theme.dataTheme)
    localStorage.setItem('mt_theme', key)
    setThemeKeyState(key)
  }

  // Apply on mount
  useEffect(() => {
    setThemeKey(themeKey)
  }, []) // eslint-disable-line

  return (
    <ThemeContext.Provider value={{ themeKey, setThemeKey, themes }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
