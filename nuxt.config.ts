import { pwa } from './config/pwa'
import { runtimeConfig } from './config/runtime'
import { cookieControl } from './config/cookie'
import { pinia } from './config/pinia'
import { vite } from './config/vite'
import { nitro } from './config/nitro'
import { app } from './config/app'
import { image } from './config/image'
import { eslint } from './config/eslint'
import { postcss } from './config/postcss'
import { htmlValidator } from './config/html-validator'

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
	ssr: true,
	sourcemap: true,
	devtools: {
		enabled: process.env.NODE_ENV !== 'production'
	},
	experimental: {
		componentIslands: true,
		viewTransition: true,
		renderJsonPayloads: true,
		typedPages: true,
		watcher: 'chokidar'
	},
	extends: ['nuxt-seo-kit'],
	imports: {
		dirs: [
			// all directories under store/ will be auto-imported
			'stores/**'
		]
	},
	typescript: {
		strict: true,
		typeCheck: true,
		tsConfig: {
			compilerOptions: {
				moduleResolution: 'bundler',
				types: ['unplugin-icons/types/vue']
			}
		}
	},
	css: [
		'~/assets/sass/app.scss',
		'vue-toastification/dist/index.css',
		'@vuepic/vue-datepicker/dist/main.css'
	],
	plugins: [],
	build: {
		transpile: ['@headlessui/vue', 'vue-toastification']
	},
	linkChecker: {
		failOn404: true
	},
	modules: [
		'@nuxt/image',
		'@nuxt/content',
		'@nuxtjs/html-validator',
		'@nuxtjs/i18n',
		'@nuxtjs/eslint-module',
		'@pinia/nuxt',
		'@vueuse/nuxt',
		'@vite-pwa/nuxt',
		'unplugin-icons/nuxt',
		'nuxt-lodash',
		'nuxt-vitest'
	],
	i18n: {
		strategy: 'prefix_except_default',
		lazy: true,
		defaultLocale: process.env.NUXT_APP_DEFAULT_LOCALE,
		debug: false, // process.env.NODE_ENV !== 'production',
		langDir: 'locales/',
		baseUrl: process.env.NUXT_APP_PUBLIC_BASE_URL || 'http://localhost:3000',
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
	},
	eslint,
	runtimeConfig,
	cookieControl,
	pinia,
	vite,
	nitro,
	app,
	image,
	postcss,
	pwa,
	htmlValidator
})
