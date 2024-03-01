import type { ModuleOptions as PWAModuleOptions } from '@vite-pwa/nuxt'

export const pwa = {
	scope: '/',
	base: '/',
	strategies: 'generateSW',
	injectRegister: 'auto',
	registerType: 'autoUpdate',
	manifest: {
		name: process.env.NUXT_PUBLIC_APP_TITLE || 'Grooveshop',
		short_name: process.env.NUXT_PUBLIC_APP_TITLE || 'Grooveshop',
		description: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'Grooveshop Demo Storefront',
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
		navigateFallback: undefined,
		globPatterns: ['**/*.{js,css,html,json,webp,png,jpg,svg,ico}'],
		globIgnores: ['google*.html'],
		navigateFallbackDenylist: [/^\/api(?:\/.*)?$/],
		maximumFileSizeToCacheInBytes: 3000000,
		cleanupOutdatedCaches: true,
		sourcemap: true,
		runtimeCaching: [
			{
				urlPattern: ({ url, sameOrigin }) => {
					const pwaExcludedCachePaths = [
						'/api/auth',
						'/api/_auth',
						'/api/cart',
						'/api/user'
					]
					const isExcludedPath = pwaExcludedCachePaths.some((path) =>
						url.pathname.startsWith(path)
					)

					if (isExcludedPath) {
						return false
					}

					return sameOrigin && url.pathname.match(/^\/api\//)
				},
				handler: 'NetworkOnly',
				options: {
					cacheName: 'api',
					expiration: {
						maxEntries: 300
					},
					cacheableResponse: {
						statuses: [0, 200]
					},
					backgroundSync: {
						name: 'api-queue',
						options: {
							maxRetentionTime: 24 * 60
						}
					},
					matchOptions: {
						ignoreVary: true,
						ignoreSearch: true
					}
				}
			},
			{
				urlPattern: ({ url, request }) => {
					const allowedOrigins = [
						'http://localhost:3003',
						'https://assets.grooveshop.site'
					]
					return allowedOrigins.includes(url.origin) && request.destination === 'image'
				},
				handler: 'StaleWhileRevalidate',
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
	injectManifest: {
		globPatterns: ['**/*.{js,css,html,png,svg,ico}']
	},
	devOptions: {
		enabled: false,
		suppressWarnings: true,
		navigateFallback: undefined,
		navigateFallbackAllowlist: [/^\/$/],
		type: 'module'
	},
	client: {
		installPrompt: true,
		periodicSyncForUpdates: 60 * 60
	}
} satisfies PWAModuleOptions
