export const nitro = {
	routeRules: {
		'/**': { isr: false }
	},
	compressPublicAssets: { gzip: true },
	prerender: {
		crawlLinks: false,
		routes: []
	},
	publicAssets: [
		{
			baseURL: 'assets',
			dir: 'public/assets',
			maxAge: 60 * 60 * 24 * 7 // 7 days
		}
	]
}
