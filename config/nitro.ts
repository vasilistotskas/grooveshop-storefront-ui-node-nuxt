export const nitro = {
	compressPublicAssets: true,
	prerender: {
		crawlLinks: true,
		ignore: [],
		routes: ['/', '/404.html']
	}
}
