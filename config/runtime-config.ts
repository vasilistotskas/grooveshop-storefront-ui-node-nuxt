import { UserRole } from '~/types/auth'

export const runtimeConfig = {
	// The private keys which are only available server-side
	apiSecret: process.env.NUXT_PRIVATE_API_SECRET || 'secret',
	buildDate: new Date().toISOString(),

	// Auth
	auth: {
		accessToken: {
			cookieName: 'jwt_auth',
			jwtSecret: process.env.AUTH_ACCESS_TOKEN_SECRET!,
			maxAge: 60 * 60 * 24 * 7 // 7 days
		},

		totp: {
			authenticated: {
				cookieName: 'totp_authenticated',
				maxAge: 60 * 60 * 24 * 7 // 7 days
			},
			active: {
				cookieName: 'totp_active',
				maxAge: 60 * 60 * 24 * 7 // 7 days
			}
		},

		refreshToken: {
			cookieName: 'jwt_refresh_auth',
			jwtSecret: process.env.AUTH_REFRESH_TOKEN_SECRET!,
			maxAge: 60 * 60 * 24 * 30 // 30 days
		},

		oauth: {
			google: {
				clientId: process.env.AUTH_OAUTH_GOOGLE_CLIENT_ID!,
				clientSecret: process.env.AUTH_OAUTH_GOOGLE_CLIENT_SECRET!,
				scopes: process.env.AUTH_OAUTH_GOOGLE_SCOPES!,
				authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenUrl: 'https://oauth2.googleapis.com/token',
				userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
			}
		},

		email: {
			from: process.env.AUTH_EMAIL_FROM!,
			provider: {
				name: 'sendgrid',
				apiKey: process.env.AUTH_EMAIL_SENDGRID_API_KEY!
			}
		},

		registration: {
			enable: true,
			defaultRole: 'user' as UserRole,
			requireEmailVerification: false
		}
	},

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
		djangoHost: process.env.NUXT_PUBLIC_DJANGO_HOST || 'localhost:8000',
		facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || '123456789',
		mediaStreamUrl:
			process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH ||
			'http://localhost:3003/media_stream-image',
		author: {
			name: process.env.NUXT_PUBLIC_AUTHOR_NAME || 'Nuxt',
			github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL || ''
		},

		// Auth
		auth: {
			enableGlobalAuthMiddleware: false,
			redirect: {
				login: '/auth/login',
				logout: '/',
				home: '/',
				callback: '/account',
				account: '/account',
				mfa: {
					index: '/auth/mfa',
					totp: {
						activate: '/auth/mfa/totp/activate'
					}
				}
			}
		}
	},

	// Cloudflare
	cloudflare: {
		accountId: '',
		namespaceId: '',
		apiToken: ''
	},

	// Storage
	storage: {
		fsBase: 'node_modules/.cache/app'
	}
}
