/// <reference lib="WebWorker" />
/// <reference types="vite/client" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

const entries = self.__WB_MANIFEST
precacheAndRoute(entries)

// clean old assets
cleanupOutdatedCaches()

if (import.meta.env.PROD) {
	registerRoute(
		({ request, sameOrigin }) => sameOrigin && request.destination === 'manifest',
		new NetworkFirst({
			cacheName: 'grooveshop-webmanifest',
			plugins: [
				new CacheableResponsePlugin({ statuses: [200] }),
				new ExpirationPlugin({ maxEntries: 100 })
			]
		})
	)
	registerRoute(
		({ sameOrigin, request }) => !sameOrigin && request.destination === 'image',
		new NetworkFirst({
			cacheName: 'media-stream',
			plugins: [
				new CacheableResponsePlugin({ statuses: [0, 200] }),
				new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 15 })
			]
		})
	)
}

self.skipWaiting()
clientsClaim()
