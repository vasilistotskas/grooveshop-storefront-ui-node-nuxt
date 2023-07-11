export const nitro = {
	compressPublicAssets: true,
	prerender: {
		crawlLinks: true,
		ignore: [],
		routes: ['/', '/200.html', '/404.html']
	}
}
