import { ModuleOptions as PWAModuleOptions } from '@vite-pwa/nuxt'

export const pwa: PWAModuleOptions = {
	registerWebManifestInRouteRules: true,
	strategies: 'generateSW',
	injectRegister: 'auto',
	registerType: 'autoUpdate',
	manifest: {
		name: process.env.NUXT_PUBLIC_TITLE,
		short_name: process.env.NUXT_PUBLIC_TITLE,
		description: process.env.NUXT_PUBLIC_DESCRIPTION,
		theme_color: '#ffffff',
		background_color: '#ffffff',
		display: 'standalone',
		orientation: 'portrait',
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
		globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
		navigateFallbackDenylist: [/\/api\/.*/],
		sourcemap: true
	},
	client: {
		installPrompt: true,
		// you don't need to include this: only for testing purposes
		// if enabling periodic sync for update use 1 hour or so (periodicSyncForUpdates: 3600)
		periodicSyncForUpdates: 20
	},
	devOptions: {
		enabled: process.env.NODE_ENV !== 'production',
		type: 'module'
	}
}
