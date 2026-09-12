import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/500.css'
import '@fontsource/geist-sans/600.css'
import '@fontsource/geist-sans/700.css'
import '@fontsource/geist-mono/400.css'
import './index.css'
import App from './App.tsx'

const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })
    console.info('[TuTurno] Service Worker registrado:', registration.scope)
  } catch (error) {
    console.error('[TuTurno] No se pudo registrar el Service Worker:', error)
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener(
    'load',
    () => {
      void registerServiceWorker()
    },
    { once: true }
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
