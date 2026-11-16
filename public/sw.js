const CACHE_NAME = 'macrotrack-v1'
const OFFLINE_URL = '/offline.html'
const APP_SHELL = [
  '/',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/apple-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(APP_SHELL)
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith('macrotrack-') && key !== CACHE_NAME
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            await cache.put('/', response.clone())
          }
          return response
        } catch {
          return (
            (await caches.match(request)) ||
            (await caches.match('/')) ||
            (await caches.match(OFFLINE_URL))
          )
        }
      })()
    )
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(async (cached) => {
        if (cached) return cached

        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      })
    )
  }
})
