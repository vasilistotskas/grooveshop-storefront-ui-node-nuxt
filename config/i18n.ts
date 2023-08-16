export const i18n = {
	strategy: 'prefix_except_default',
	lazy: true,
	defaultLocale: process.env.NUXT_PUBLIC_LANGUAGE || 'en',
	debug: false,
	langDir: 'locales/',
	baseUrl: process.env.NUXT_PUBLIC_BASE_URL || 'http://localhost:3000',
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
	vueI18n: 'i18n.config.ts'
}
