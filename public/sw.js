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
