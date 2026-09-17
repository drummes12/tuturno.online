import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'tuturno:theme'

function readInitialDark(): boolean {
  if (typeof window === 'undefined') return false
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Tema claro/oscuro con preferencia persistida. El script inline en
 * index.html aplica la clase antes del primer paint; este hook solo
 * sincroniza estado React con el DOM.
 */
export function useTheme() {
  const [dark, setDark] = useState(readInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    window.localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  }, [dark])

  const toggle = useCallback(() => setDark((v) => !v), [])
  return { dark, toggle }
}
