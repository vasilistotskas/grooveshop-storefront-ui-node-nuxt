import { UserRole } from '~/types/auth'

export const runtimeConfig = {
	// The private keys which are only available server-side
	apiSecret: process.env.NUXT_API_SECRET || 'secret',
	buildDate: new Date().toISOString(),

	// Auth
	auth: {
		session: {
			domain: process.env.NUXT_AUTH_SESSION_DOMAIN || '.grooveshop.site',
			cookieName: process.env.NUXT_AUTH_SESSION_COOKIE_NAME || 'sessionid',
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
			sameSite: 'lax'
		},

		csrftoken: {
			domain: process.env.NUXT_AUTH_CSRFTOKEN_DOMAIN || '.grooveshop.site',
			cookieName: process.env.NUXT_AUTH_CSRFTOKEN_COOKIE_NAME || 'csrftoken',
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 7 * 52, // 1 year
			sameSite: 'lax'
		},

		accessToken: {
			domain: process.env.NUXT_AUTH_ACCESS_TOKEN_DOMAIN || '.grooveshop.site',
			cookieName: process.env.NUXT_AUTH_ACCESS_TOKEN_COOKIE_NAME || 'jwt_auth',
			httpOnly: false,
			secure: true,
			maxAge: 60 * 60 * 24 * 7, // 7 days
			sameSite: 'lax'
		},

		refreshToken: {
			domain: process.env.NUXT_AUTH_REFRESH_TOKEN_DOMAIN || '.grooveshop.site',
			cookieName: process.env.NUXT_AUTH_REFRESH_TOKEN_COOKIE_NAME || 'jwt_refresh_auth',
			httpOnly: true,
			secure: true,
			maxAge: 60 * 60 * 24 * 30, // 30 days
			sameSite: 'lax'
		},

		totp: {
			authenticated: {
				domain: process.env.NUXT_AUTH_TOTP_AUTHENTICATED_DOMAIN || '.grooveshop.site',
				cookieName:
					process.env.NUXT_AUTH_TOTP_AUTHENTICATED_COOKIE_NAME || 'totp_authenticated',
				httpOnly: false,
				secure: true,
				maxAge: 60 * 60 * 24 * 7, // 7 days
				sameSite: 'lax'
			},
			active: {
				domain: process.env.NUXT_AUTH_TOTP_ACTIVE_DOMAIN || '.grooveshop.site',
				cookieName: process.env.NUXT_AUTH_TOTP_ACTIVE_COOKIE_NAME || 'totp_active',
				httpOnly: false,
				secure: true,
				maxAge: 60 * 60 * 24 * 7, // 7 days
				sameSite: 'lax'
			}
		},

		oauth: {
			google: {
				clientId: process.env.NUXT_AUTH_OAUTH_GOOGLE_CLIENT_ID,
				clientSecret: process.env.NUXT_AUTH_OAUTH_GOOGLE_CLIENT_SECRET,
				scopes: process.env.NUXT_AUTH_OAUTH_GOOGLE_SCOPES || 'email profile',
				authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
				tokenUrl: 'https://oauth2.googleapis.com/token',
				userUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
			}
		},

		email: {
			from: process.env.NUXT_AUTH_EMAIL_FROM || 'vassilistotskas@msn.com',
			provider: {
				name: 'sendgrid',
				apiKey: process.env.NUXT_AUTH_EMAIL_PROVIDER_API_KEY,
				url: 'https://api.sendgrid.com/v3/mail/send',
				authorization: `Bearer ${process.env.NUXT_AUTH_EMAIL_PROVIDER_API_KEY}`
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
		siteName: process.env.NUXT_PUBLIC_SITE_NAME || 'GrooveShop',
		siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://grooveshop.site',
		siteDescription: process.env.NUXT_PUBLIC_SITE_DESCRIPTION || 'GrooveShop Description',
		language: process.env.NUXT_PUBLIC_LANGUAGE || 'en',
		defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE || 'en',
		appTitle: process.env.NUXT_PUBLIC_APP_TITLE || 'GrooveShop - env',
		appDescription: process.env.NUXT_PUBLIC_APP_DESCRIPTION || 'GrooveShop Description',
		appImage:
			process.env.NUXT_PUBLIC_APP_IMAGE ||
			'https://grooveshop.site/assets/images/websiteLogo.png',
		domainName: process.env.NUXT_PUBLIC_DOMAIN_NAME || 'grooveshop.site',
		canonicalUrl: process.env.NUXT_PUBLIC_CANONICAL_URL || 'https://grooveshop.site',
		baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'https://grooveshop.site',
		djangoUrl: process.env.NUXT_PUBLIC_DJANGO_URL || 'http://backend-service:80',
		apiBaseUrl:
			process.env.NUXT_PUBLIC_API_BASE_URL || 'http://backend-service:80/api/v1',
		djangoHost: process.env.NUXT_PUBLIC_DJANGO_HOST || 'backend-service:80',
		facebookAppId: process.env.NUXT_PUBLIC_FACEBOOK_APP_ID || 'facebook-app-id',
		mediaStreamDomain:
			process.env.NUXT_PUBLIC_MEDIA_STREAM_DOMAIN || 'assets.grooveshop.site',
		mediaStreamOrigin:
			process.env.NUXT_PUBLIC_MEDIA_STREAM_ORIGIN || 'https://assets.grooveshop.site',
		mediaStreamPath:
			process.env.NUXT_PUBLIC_MEDIA_STREAM_PATH ||
			'https://assets.grooveshop.site/media_stream-image',
		author: {
			name: process.env.NUXT_PUBLIC_AUTHOR_NAME || 'vasilistotskas',
			github_url:
				process.env.NUXT_PUBLIC_AUTHOR_GITHUB_URL || 'https://github.com/vasilistotskas'
		},

		// Auth
		auth: {
			cookieDomain: process.env.NUXT_PUBLIC_AUTH_COOKIE_DOMAIN || '.grooveshop.site',
			enableGlobalAuthMiddleware: false,
			redirect: {
				login: '/auth/login',
				logout: '/',
				home: '/',
				callback: '/account',
				account: '/account',
				mfa: {
					index: '/auth/security/mfa',
					totp: {
						activate: '/auth/security/mfa/totp/activate'
					}
				}
			}
		},

		// Socials
		socials: {
			facebook: process.env.NUXT_PUBLIC_SOCIALS_FACEBOOK || 'https://www.facebook.com',
			twitter: process.env.NUXT_PUBLIC_SOCIALS_TWITTER || 'https://twitter.com',
			instagram: process.env.NUXT_PUBLIC_SOCIALS_INSTAGRAM || 'https://www.instagram.com',
			discord: process.env.NUXT_PUBLIC_SOCIALS_DISCORD || 'https://discord.gg'
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
