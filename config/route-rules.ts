export const routeRules = {
	'/**': process.client
		? {}
		: { cache: { swr: true, maxAge: 120, staleMaxAge: 60, headersOnly: true } },
	'/': { prerender: false },
	'/api/**': { cors: true },
	'/manifest.webmanifest': {
		headers: {
			'Content-Type': 'application/manifest+json',
			'Cache-Control': 'public, max-age=0, must-revalidate'
		}
	}
}
