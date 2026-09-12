self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return

  event.respondWith(fetch(event.request))
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
      badge: '/android-chrome-192x192.png',
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
