import { z } from 'zod'
export {}

const envVariables = z.object({
	NODE_ENV: z.string(),
	NODE_AUTH_TOKEN: z.string(),
	VITEST_DOM_ENV: z.string(),

	// Info
	NUXT_PUBLIC_ENVIRONMENT: z.enum(['development', 'production', 'demo']),
	NUXT_PUBLIC_APP_TITLE: z.string(),
	NUXT_PUBLIC_APP_DESCRIPTION: z.string(),
	NUXT_PUBLIC_SITE_DESCRIPTION: z.string(),
	NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string(),
	NUXT_PUBLIC_TWITTER_USERNAME: z.string(),
	NUXT_PUBLIC_APP_IMAGE: z.string(),

	// Public
	NUXT_PUBLIC_TITLE_SEPARATOR: z.string(),
	NUXT_PUBLIC_DOMAIN_NAME: z.string(),
	NUXT_PUBLIC_CANONICAL_URL: z.string(),
	NUXT_PUBLIC_BASE_URL: z.string(),
	NUXT_PUBLIC_DJANGO_URL: z.string(),
	NUXT_PUBLIC_DJANGO_CANONICAL_URL: z.string(),
	NUXT_PUBLIC_DJANGO_HOST: z.string(),
	NUXT_PUBLIC_API_BASE_URL: z.string(),
	NUXT_PUBLIC_MEDIA_STREAM_DOMAIN: z.string(),
	NUXT_PUBLIC_MEDIA_STREAM_ORIGIN: z.string(),
	NUXT_PUBLIC_MEDIA_STREAM_PATH: z.string(),
	NUXT_PUBLIC_SITE_URL: z.string(),
	NUXT_PUBLIC_TRAILING_SLASH: z.string(),
	NUXT_PUBLIC_SITE_NAME: z.string(),

	// Locales
	NUXT_PUBLIC_LOCALES: z.string(),
	NUXT_PUBLIC_LANGUAGE: z.string(),
	NUXT_PUBLIC_DEFAULT_LOCALE: z.string(),
	NUXT_PUBLIC_I18N_DEBUG: z.string(),

	// Private
	NUXT_API_SECRET: z.string(),

	// Author
	NUXT_PUBLIC_AUTHOR_NAME: z.string(),
	NUXT_PUBLIC_AUTHOR_GITHUB_URL: z.string(),

	// Facebook
	NUXT_PUBLIC_FACEBOOK_APP_ID: z.string(),

	// Google Tag Manager
	NUXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string(),
	NUXT_PUBLIC_GOOGLE_TAG_ID: z.string(),

	// Storage 'cloudflare' | 'fs'
	NUXT_STORAGE_DRIVER: z.string(),
	NUXT_STORAGE_FS_BASE: z.string(),

	// Experimental
	NUXT_PUBLIC_EXPERIMENTAL_WATCHER: z.string(),

	// Websocket
	NUXT_WEB_SOCKET_SERVER_PORT: z.string(),

	// Auth
	NUXT_AUTH_EMAIL_FROM: z.string(),
	NUXT_PUBLIC_AUTH_COOKIE_DOMAIN: z.string(),
	NUXT_AUTH_EMAIL_PROVIDER_API_KEY: z.string(),
	NUXT_AUTH_BASE_URL: z.string(),
	NUXT_AUTH_ACCESS_TOKEN_COOKIE_NAME: z.string(),
	NUXT_AUTH_REFRESH_TOKEN_COOKIE_NAME: z.string(),
	NUXT_AUTH_SESSION_COOKIE_NAME: z.string(),
	NUXT_AUTH_CSRFTOKEN_COOKIE_NAME: z.string(),
	NUXT_AUTH_TOTP_AUTHENTICATED_COOKIE_NAME: z.string(),
	NUXT_AUTH_TOTP_ACTIVE_COOKIE_NAME: z.string(),
	NUXT_AUTH_OAUTH_GOOGLE_CLIENT_ID: z.string(),
	NUXT_AUTH_OAUTH_GOOGLE_CLIENT_SECRET: z.string(),
	NUXT_AUTH_OAUTH_GOOGLE_SCOPES: z.string(),
	NUXT_AUTH_SESSION_DOMAIN: z.string(),
	NUXT_AUTH_CSRFTOKEN_DOMAIN: z.string(),
	NUXT_AUTH_ACCESS_TOKEN_DOMAIN: z.string(),
	NUXT_AUTH_REFRESH_TOKEN_DOMAIN: z.string(),
	NUXT_AUTH_TOTP_AUTHENTICATED_DOMAIN: z.string(),
	NUXT_AUTH_TOTP_ACTIVE_DOMAIN: z.string(),

	// Socials
	NUXT_PUBLIC_SOCIALS_FACEBOOK: z.string(),
	NUXT_PUBLIC_SOCIALS_TWITTER: z.string(),
	NUXT_PUBLIC_SOCIALS_INSTAGRAM: z.string(),
	NUXT_PUBLIC_SOCIALS_DISCORD: z.string()
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envVariables> {}
	}
}
