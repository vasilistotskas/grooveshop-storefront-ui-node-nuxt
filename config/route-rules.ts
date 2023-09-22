export const routeRules = {
	'/**':
		process.env.NODE_ENV === 'development'
			? {}
			: { cache: { swr: true, maxAge: 120, staleMaxAge: 60, headersOnly: true } },
	// Homepage pre-rendered at build time
	'/': { prerender: true },
	// Product page generated on-demand, revalidates in background
	'/product/**': { swr: 3600 },
	// Blog post generated on-demand once until next deploy
	'/blog/**': { isr: true },
	// Admin dashboard renders only on client-side
	'/account/**': { ssr: false },
	// Add cors headers on API routes
	'/api/**': { cors: true }
}
