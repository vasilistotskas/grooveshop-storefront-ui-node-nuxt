export const nitro = {
	compressPublicAssets: { gzip: true, brotli: true },
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
