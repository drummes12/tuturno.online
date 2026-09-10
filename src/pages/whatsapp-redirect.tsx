import { useEffect } from 'react'

/**
 * Página de redirección a WhatsApp.
 *
 * Los correos electrónicos incluyen botones de WhatsApp con links directos a
 * wa.me, pero esos links no matchean el dominio de envío (tuturno.online),
 * lo que dispara filtros de spam. En su lugar, los correos usan links del
 * propio dominio (/wa?to=<url codificada>) y esta página redirige a wa.me
 * después de validar que el destino es legítimo.
 *
 * Validación: solo se permiten URLs a wa.me o api.whatsapp.com.
 */
export function WhatsAppRedirectPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const to = params.get('to')

    if (!to) {
      window.location.href = '/'
      return
    }

    try {
      const url = new URL(to)
      if (
        url.hostname === 'wa.me' ||
        url.hostname === 'api.whatsapp.com' ||
        url.hostname === 'web.whatsapp.com'
      ) {
        window.location.href = to
      } else {
        window.location.href = '/'
      }
    } catch {
      window.location.href = '/'
    }
  }, [])

  return (
    <div className='min-h-dvh flex flex-col items-center justify-center gap-3 px-6 text-center'>
      <p className='text-text-muted text-sm'>
        Redirigiendo a WhatsApp…
      </p>
      <a
        href='/'
        className='text-primary text-sm font-semibold underline'
      >
        Cancelar
      </a>
    </div>
  )
}
