import { z } from 'zod'

const envVariables = z.object({
	NUXT_APP_TITLE: z.string(),
	NUXT_APP_DESCRIPTION: z.string(),
	NUXT_APP_GOOGLE_SITE_VERIFICATION: z.string(),
	NUXT_APP_TWITTER_USERNAME: z.string(),
	NUXT_APP_IMAGE: z.string(),

	NUXT_APP_PUBLIC_DOMAIN_NAME: z.string(),
	NUXT_APP_PUBLIC_CANONICAL_URL: z.string(),
	NUXT_APP_PUBLIC_BASE_URL: z.string(),
	NUXT_APP_PUBLIC_DJANGO_URL: z.string(),
	NUXT_APP_PUBLIC_DJANGO_CANONICAL_URL: z.string(),
	NUXT_APP_PUBLIC_API_BASE_URL: z.string(),
	NUXT_APP_PUBLIC_MEDIA_STREAM_URL: z.string(),
	NUXT_PUBLIC_SITE_URL: z.string(),

	NUXT_APP_LOCALES: z.string(),
	NUXT_APP_DEFAULT_LOCALE: z.string(),

	NUXT_APP_PRIVATE_API_SECRET: z.string(),

	NUXT_APP_PUBLIC_AUTHOR_NAME: z.string(),
	NUXT_APP_PUBLIC_AUTHOR_GITHUB_URL: z.string(),

	NUXT_APP_PUBLIC_FACEBOOK_APP_ID: z.string(),

	NUXT_PUBLIC_GOOGLE_TAG_MANAGER_ID: z.string(),
	NUXT_PUBLIC_GOOGLE_TAG_ID: z.string()
})

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof envVariables> {}
	}
}

declare module '@vue/runtime-core' {
	export interface GlobalComponents {
		VueDatePicker: typeof import('@vuepic/vue-datepicker')['default']
	}
}
