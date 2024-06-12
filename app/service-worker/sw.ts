/// <reference lib="WebWorker" />
/// <reference types="vite/client" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const entries = self.__WB_MANIFEST
precacheAndRoute(entries)

// clean old assets
cleanupOutdatedCaches()

self.skipWaiting()
clientsClaim()
