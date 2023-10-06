export const nitro = {
	routeRules: {
		'/**': { isr: false }
	},
	compressPublicAssets: { gzip: true },
	prerender: {
		crawlLinks: false, // process.env.NODE_ENV === 'production',
		routes: ['/', '/cart', '/products']
	},
	publicAssets: [
		{
			baseURL: 'assets',
			dir: 'public/assets',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		}
	]
}
