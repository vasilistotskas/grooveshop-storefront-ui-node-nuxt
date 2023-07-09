export const runtimeConfig = {
	// The private keys which are only available server-side
	apiSecret: process.env.NUXT_PUBLIC_PRIVATE_API_SECRET,
	buildDate: new Date().toISOString(),

	// Keys within public are also exposed client-side
	public: {
		trailingSlash: String(process.env.NUXT_PUBLIC_TRAILING_SLASH) === 'true',
		titleSeparator: process.env.NUXT_PUBLIC_TITLE_SEPARATOR || '|',
		siteName: process.env.NUXT_PUBLIC_SITE_NAME,
		siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000/',
		siteDescription: process.env.NUXT_PUBLIC_DESCRIPTION,
		language: process.env.NUXT_PUBLIC_LANGUAGE || 'en-US',

		appTitle: process.env.NUXT_PUBLIC_TITLE,
		appDescription: process.env.NUXT_PUBLIC_DESCRIPTION,
		appImage: process.env.NUXT_PUBLIC_IMAGE,
		domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME,
		canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL,
		baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
		djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL,
		apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
		facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID,
		mediaStreamUrl: process.env.NUXT_PUBLIC_MEDIA_STREAM_URL,
		i18n: {
			locales: process.env.NUXT_PUBLIC_LOCALES,
			defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE
		},
		author: {
			name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
			github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL
		}
	}
}
