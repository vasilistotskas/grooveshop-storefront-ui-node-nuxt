export const i18n = {
	strategy: 'prefix_except_default',
	lazy: true,
	defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE || import.meta.env.NUXT_PUBLIC_LANGUAGE,
	debug: false,
	langDir: 'locales/',
	baseUrl: process.env.NUXT_PUBLIC_BASE_URL || import.meta.env.NUXT_PUBLIC_BASE_URL,
	detectBrowserLanguage: {
		useCookie: true,
		redirectOn: 'root',
		cookieKey: 'i18n_redirected',
		alwaysRedirect: true
	},
	locales: [
		{
			code: 'en',
			name: 'English',
			file: 'en-US.yml',
			iso: 'en-US',
			flag: '🇺🇸'
		},
		{
			code: 'de',
			name: 'Deutsch',
			file: 'de-DE.yml',
			iso: 'de-DE',
			flag: '🇩🇪'
		},
		{
			code: 'el',
			name: 'Ελληνικά',
			file: 'el-GR.yml',
			iso: 'el-GR',
			flag: '🇬🇷'
		}
	],
	vueI18n: 'i18n.config.ts',
	compilation: {
		strictMessage: false
	}
}
