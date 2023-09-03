import { ModuleOptions as PWAModuleOptions } from '@vite-pwa/nuxt'

export const pwa: PWAModuleOptions = {
	manifest: false, // public/manifest.webmanifest
	strategies: 'generateSW',
	injectRegister: 'auto',
	registerType: 'autoUpdate',
	workbox: {
		// globDirectory: 'dist',
		navigateFallback: null,
		globPatterns: ['**/*.{js,css,html,json,md,txt,svg,webp,ico,png,jpg}'],
		globIgnores: ['google*.html'],
		cleanupOutdatedCaches: true,
		additionalManifestEntries: [{ url: '/', revision: new Date().getTime().toString() }],
		runtimeCaching: [
			{
				urlPattern: ({ url }) => {
					return url.pathname.startsWith('/api')
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
			}
		],
		sourcemap: process.env.NODE_ENV !== 'development'
	},
	devOptions: {
		enabled: false
	},
	client: {
		installPrompt: true,
		periodicSyncForUpdates: 300 // per 5 min for testing only
	}
}
