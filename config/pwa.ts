import type { ModuleOptions as PWAModuleOptions } from '@vite-pwa/nuxt'

export const pwa = {
	registerType: 'autoUpdate',
	manifest: {
		name: process.env.NUXT_PUBLIC_APP_TITLE,
		short_name: process.env.NUXT_PUBLIC_APP_TITLE,
		description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
		theme_color: '#ffffff',
		background_color: '#ffffff',
		display: 'standalone',
		orientation: 'any',
		categories: ['ecommerce', 'technology'],
		screenshots: [
			{
				src: '/assets/screenshots/540x720.png',
				type: 'image/png',
				sizes: '540x720',
				form_factor: 'narrow'
			},
			{
				src: '/assets/screenshots/540x720.png',
				type: 'image/png',
				sizes: '540x720',
				form_factor: 'narrow'
			},
			{
				src: '/assets/screenshots/540x720.png',
				type: 'image/png',
				sizes: '540x720',
				form_factor: 'narrow'
			},
			{
				src: '/assets/screenshots/1024x593.png',
				type: 'image/png',
				sizes: '1024x593',
				form_factor: 'wide'
			},
			{
				src: '/assets/screenshots/1024x593.png',
				type: 'image/png',
				sizes: '1024x593',
				form_factor: 'wide'
			},
			{
				src: '/assets/screenshots/1024x593.png',
				type: 'image/png',
				sizes: '1024x593',
				form_factor: 'wide'
			}
		],
		icons: [
			{
				src: '/assets/favicon/android-icon-144x144.png',
				sizes: '144x144',
				type: 'image/png',
				purpose: 'maskable'
			},
			{
				src: '/assets/favicon/android-icon-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'maskable'
			},
			{
				src: '/assets/favicon/android-icon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'maskable'
			},
			{
				src: '/assets/favicon/android-icon-144x144.png',
				sizes: '144x144',
				type: 'image/png',
				purpose: 'any'
			},
			{
				src: '/assets/favicon/android-icon-192x192.png',
				sizes: '192x192',
				type: 'image/png',
				purpose: 'any'
			},
			{
				src: '/assets/favicon/android-icon-512x512.png',
				sizes: '512x512',
				type: 'image/png',
				purpose: 'any'
			}
		]
	},
	workbox: {
		navigateFallback: '/',
		globPatterns: ['**/*.{js,css,scss,html,json,md,txt,svg,webp,ico,png,jpg}'],
		globIgnores: ['google*.html'],
		cleanupOutdatedCaches: true,
		sourcemap: process.env.NODE_ENV !== 'development',
		runtimeCaching: [
			{
				urlPattern: ({ url }) => {
					const pwaExcludedCachePaths = [
						'/api/cart',
						'/api/auth',
						'/api/cart',
						'/api/cart-items',
						'/api/user-account',
						'/api/user-account-session'
					]
					return (
						url.pathname.startsWith('/api') &&
						!pwaExcludedCachePaths.some((path) => url.pathname.startsWith(path))
					)
				},
				handler: 'CacheFirst' as const,
				options: {
					cacheName: 'api-cache',
					cacheableResponse: {
						statuses: [0, 200]
					}
				}
			},
			{
				handler: 'NetworkOnly',
				urlPattern: /\/api\/.*\/*.json/,
				method: 'POST',
				options: {
					backgroundSync: {
						name: 'backgroundsync',
						options: {
							maxRetentionTime: 24 * 60
						}
					}
				}
			},
			{
				urlPattern: ({ url }) => {
					const mediaStreamOrigins = [
						'http://localhost:3003',
						'http://assets.grooveshop.localhost',
						'http://service-media_stream'
					]
					return (
						url.origin ===
						mediaStreamOrigins.find((origin) => url.origin.startsWith(origin))
					)
				},
				handler: 'StaleWhileRevalidate' as const,
				options: {
					cacheName: 'media-stream-cache',
					expiration: {
						maxEntries: 100
					},
					cacheableResponse: {
						statuses: [0, 200]
					}
				}
			}
		]
	},
	devOptions: {
		enabled: false, // process.env.NODE_ENV === 'development',
		suppressWarnings: true,
		navigateFallbackAllowlist: [/^\/$/],
		type: 'module'
	},
	client: {
		installPrompt: true,
		// if enabling periodic sync for update use 1 hour or so (periodicSyncForUpdates: 3600)
		periodicSyncForUpdates: 5
	}
} satisfies PWAModuleOptions
