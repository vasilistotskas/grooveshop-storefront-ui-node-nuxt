import { z } from 'zod'

const envVariables = z.object({
	NODE_ENV: z.string(),

	NUXT_PUBLIC_TITLE: z.string(),
	NUXT_PUBLIC_DESCRIPTION: z.string(),
	NUXT_PUBLIC_GOOGLE_SITE_VERIFICATION: z.string(),
	NUXT_PUBLIC_TWITTER_USERNAME: z.string(),
	NUXT_PUBLIC_IMAGE: z.string(),

	NUXT_PUBLIC_DOMAIN_NAME: z.string(),
	NUXT_PUBLIC_CANONICAL_URL: z.string(),
	NUXT_PUBLIC_BASE_URL: z.string(),
	NUXT_PUBLIC_DJANGO_URL: z.string(),
	NUXT_PUBLIC_DJANGO_CANONICAL_URL: z.string(),
	NUXT_PUBLIC_DJANGO_HOST: z.string(),
	NUXT_PUBLIC_API_BASE_URL: z.string(),
	NUXT_PUBLIC_MEDIA_STREAM_ORIGIN: z.string(),
	NUXT_PUBLIC_MEDIA_STREAM_PATH: z.string(),
	NUXT_PUBLIC_SITE_URL: z.string(),
	NUXT_PUBLIC_TRAILING_SLASH: z.string(),
	NUXT_PUBLIC_TITLE_SEPARATOR: z.string(),
	NUXT_PUBLIC_SITE_NAME: z.string(),

	NUXT_PUBLIC_LOCALES: z.string(),
	NUXT_PUBLIC_LANGUAGE: z.string(),

	NUXT_PRIVATE_API_SECRET: z.string(),

	NUXT_PUBLIC_AUTHOR_NAME: z.string(),
	NUXT_PUBLIC_AUTHOR_GITHUB_URL: z.string(),

	NUXT_PUBLIC_FACEBOOK_APP_ID: z.string(),

	NUXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string(),
	NUXT_PUBLIC_GOOGLE_TAG_ID: z.string(),

	NUXT_STORAGE_DRIVER: z.string(),
	NUXT_STORAGE_FS_BASE: z.string(),

	WEB_SOCKET_SERVER_PORT: z.string(),

	AUTH_EMAIL_FROM: z.string(),
	AUTH_EMAIL_SENDGRID_API_KEY: z.string(),
	AUTH_BASE_URL: z.string(),
	AUTH_ACCESS_TOKEN_SECRET: z.string(),
	AUTH_REFRESH_TOKEN_SECRET: z.string(),
	AUTH_OAUTH_GOOGLE_CLIENT_ID: z.string(),
	AUTH_OAUTH_GOOGLE_CLIENT_SECRET: z.string(),
	AUTH_OAUTH_GOOGLE_SCOPES: z.string()
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envVariables> {}
	}
}

declare module '@vue/runtime-core' {
	export interface GlobalComponents {
		VueDatePicker: (typeof import('@vuepic/vue-datepicker'))['default']
	}
}
