export const runtimeConfig = {
	// The private keys which are only available server-side
	apiSecret: process.env.NUXT_PRIVATE_API_SECRET,
	buildDate: new Date().toISOString(),

	// Keys within public are also exposed client-side
	public: {
		trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
		titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR || '|',
		siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'Nuxt',
		siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		siteDescription: process.env.NUXT_PUBLIC_DESCRIPTION,
		language: process.env.NUXT_PUBLIC_LANGUAGE || 'en-US',

		appTitle: process.env.NUXT_PUBLIC_TITLE || 'Nuxt',
		appDescription: process.env.NUXT_PUBLIC_DESCRIPTION || 'Nuxt',
		appImage: process.env.NUXT_PUBLIC_IMAGE,
		domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME || 'localhost',
		canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL || 'http://www.localhost:3000',
		baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
		djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL || 'http://localhost:8000',
		apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
		facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || '123456789',
		mediaStreamUrl:
			process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH ||
			'http://localhost:3003/media_stream-image',
		author: {
			name: process.env.NUXT_PUBLIC_AUTHOR_NAME || 'Nuxt',
			github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL || ''
		}
	}
}
