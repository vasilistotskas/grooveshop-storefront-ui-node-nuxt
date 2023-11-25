import { UserRole } from '~/types/auth'

export const runtimeConfig = {
	// The private keys which are only available server-side
	apiSecret: process.env.NUXT_PRIVATE_API_SECRET || 'secret',
	buildDate: new Date().toISOString(),

	// Auth
	auth: {
		session: {
			domain: process.env.AUTH_SESSION_COOKIE_DOMAIN,
			cookieName: process.env.AUTH_SESSION_COOKIE_NAME,
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
			sameSite: 'lax'
		},

		csrftoken: {
			domain: process.env.AUTH_CSRFTOKEN_COOKIE_DOMAIN,
			cookieName: process.env.AUTH_CSRFTOKEN_COOKIE_NAME,
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 7 * 52, // 1 year
			sameSite: 'lax'
		},

		accessToken: {
			domain: process.env.AUTH_ACCESS_TOKEN_COOKIE_DOMAIN,
			cookieName: process.env.AUTH_ACCESS_TOKEN_COOKIE_NAME,
			httpOnly: false,
			secure: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
			sameSite: 'lax'
		},

		refreshToken: {
			domain: process.env.AUTH_REFRESH_TOKEN_COOKIE_DOMAIN,
			cookieName: process.env.AUTH_REFRESH_TOKEN_COOKIE_NAME,
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 30, // 30 days
			sameSite: 'lax'
		},

		totp: {
			authenticated: {
				domain: process.env.AUTH_TOTP_AUTHENTICATED_COOKIE_DOMAIN,
				cookieName: process.env.AUTH_TOTP_AUTHENTICATED_COOKIE_NAME,
				httpOnly: false,
				secure: true,
				maxAge: 60 * 60 * 24 * 7, // 7 days
				sameSite: 'lax'
			},
			active: {
				domain: process.env.AUTH_TOTP_ACTIVE_COOKIE_DOMAIN,
				cookieName: process.env.AUTH_TOTP_ACTIVE_COOKIE_NAME,
				httpOnly: false,
				secure: true,
				maxAge: 60 * 60 * 24 * 7, // 7 days
				sameSite: 'lax'
			}
		},

		oauth: {
			google: {
				clientId: process.env.AUTH_OAUTH_GOOGLE_CLIENT_ID,
				clientSecret: process.env.AUTH_OAUTH_GOOGLE_CLIENT_SECRET,
				scopes: process.env.AUTH_OAUTH_GOOGLE_SCOPES,
				authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenUrl: 'https://oauth2.googleapis.com/token',
				userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
			}
		},

		email: {
			from: process.env.AUTH_EMAIL_FROM,
			provider: {
				name: 'sendgrid',
				apiKey: process.env.AUTH_EMAIL_PROVIDER_API_KEY,
				url: 'https://api.sendgrid.com/v3/mail/send',
				authorization: `Bearer ${process.env.AUTH_EMAIL_PROVIDER_API_KEY}`
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
		siteName: process.env.NUXT_PUBLIC_SITE_NAME,
		siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
		siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION,
		language: process.env.NUXT_PUBLIC_LANGUAGE,
		appTitle: process.env.NUXT_PUBLIC_APP_TITLE,
		appDescription: process.env.NUXT_PUBLIC_APP_DESCRIPTION,
		appImage: process.env.NUXT_PUBLIC_APP_IMAGE,
		domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME,
		canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL,
		baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
		djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL,
		apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL,
		djangoHost: process.env.NUXT_PUBLIC_DJANGO_HOST,
		facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID,
		mediaStreamOrigin: process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN,
		mediaStreamPath: process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH,
		author: {
			name: process.env.NUXT_PUBLIC_AUTHOR_NAME,
			github_url: process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL
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
