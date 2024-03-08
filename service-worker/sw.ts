/// <reference lib="WebWorker" />
/// <reference types="vite/client" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const entries = self.__WB_MANIFEST
precacheAndRoute(entries)

// clean old assets
cleanupOutdatedCaches()

registerRoute(
  ({ request, sameOrigin }) => sameOrigin && request.destination === 'manifest',
  new NetworkFirst({
    cacheName: 'grooveshop-webmanifest',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 100 }),
    ],
  }),
)
registerRoute(
  ({ request, url }) => {
    const allowedOrigins = [
      'http://localhost:3003',
      'https://assets.grooveshop.site',
    ]
    return (
      allowedOrigins.includes(url.origin) && request.destination === 'image'
    )
  },
  new StaleWhileRevalidate({
    cacheName: 'media-stream',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 60 * 60 * 24 * 15,
        maxEntries: 200,
      }),
    ],
  }),
)

self.skipWaiting()
clientsClaim()
