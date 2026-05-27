import { useState, useEffect } from 'react'

export default function useDarkMode() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem('contasys_dark') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('contasys_dark', String(dark))
    } catch {}

    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }, [dark])

  return { dark, toggleDark: () => setDark((d) => !d) }
}

