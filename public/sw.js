const CACHE_VERSION = 'v1'
const STATIC_CACHE = `tuturno-static-${CACHE_VERSION}`
const PAGE_CACHE = `tuturno-pages-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'
const PRECACHE = [OFFLINE_URL, '/logo-mark.svg', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE))
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGE_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Navegación: network-first; sin red sirve la página cacheada y,
  // en último caso, la pantalla offline de marca.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return (
            cached ??
            (await caches.match('/')) ??
            (await caches.match(OFFLINE_URL))
          )
        })
    )
    return
  }

  // Assets estáticos: cache-first con relleno de red (JS/CSS hasheados,
  // iconos, fuentes). El resto (Supabase, APIs) pasa directo.
  if (
    url.pathname.startsWith('/assets/') ||
    /\.(?:svg|png|ico|woff2?)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
  }
})

self.addEventListener('push', (event) => {
  let payload = {}

  try {
    payload = event.data?.json() ?? {}
  } catch {
    payload = {}
  }

  const title = typeof payload.title === 'string' ? payload.title : 'TuTurno'
  const body =
    typeof payload.body === 'string'
      ? payload.body
      : 'Tienes una novedad en TuTurno.'
  const url = typeof payload.url === 'string' ? payload.url : '/'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/android-chrome-192x192.png',
      badge: '/notification-badge.svg',
      data: { url },
      tag: typeof payload.tag === 'string' ? payload.tag : 'tuturno'
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notificationUrl = event.notification.data?.url
  if (typeof notificationUrl !== 'string') return

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const targetUrl = new URL(notificationUrl, self.location.origin).href
        const matchingClient = clientList.find(
          (client) => client.url === targetUrl
        )

        if (matchingClient && 'focus' in matchingClient) {
          return matchingClient.focus()
        }

        return self.clients.openWindow(targetUrl)
      })
  )
})
