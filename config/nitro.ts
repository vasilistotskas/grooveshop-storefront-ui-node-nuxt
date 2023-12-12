import type { NitroConfig } from 'nitropack'

export const nitro = {
	routeRules: {
		'/**': { isr: false }
	},
	compressPublicAssets: { gzip: true },
	prerender: {
		crawlLinks: false,
		routes: ['/'],
		ignore: ['/api', '/account', '/auth', '/checkout', '/cart']
	},
	publicAssets: [
		{
			baseURL: 'assets',
			dir: 'public/assets',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		}
	]
} satisfies NitroConfig
