/// <reference lib="WebWorker" />
/// <reference types="vite/client" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst } from 'workbox-strategies'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { ExpirationPlugin } from 'workbox-expiration'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const entries = self.__WB_MANIFEST
precacheAndRoute(entries)

cleanupOutdatedCaches()

registerRoute(
  ({ url }) => {
    const pathname = url.pathname
    return (
      pathname.startsWith('/_ipx')
      || pathname.startsWith('/favicon')
      || pathname.startsWith('/img')
      || pathname.startsWith('/screenshots')
      || pathname.startsWith('/logo')
      || pathname.startsWith('/media_stream-image')
    )
  },
  new CacheFirst({
    cacheName: 'static-assets-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1000,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  }),
  'GET',
)

self.skipWaiting()
clientsClaim()
