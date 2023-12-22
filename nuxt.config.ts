import type { NitroConfig } from 'nitropack'
import { useNuxt } from '@nuxt/kit'
import { isCI } from 'std-env'
import { runtimeConfig } from './config/runtime-config'
import { cookieControl } from './config/cookie'
import { pinia } from './config/pinia'
import { vite } from './config/vite'
import { nitro } from './config/nitro'
import { app } from './config/app'
import { image } from './config/image'
import { eslint } from './config/eslint'
import { schemaOrg } from './config/schema-org'
import { css } from './config/css'
import { i18n } from './config/i18n'
import { typescript } from './config/typescript'
import { devtools } from './config/devtools'
import { experimental } from './config/experimental'
import { imports } from './config/imports'
import { build } from './config/build'
import { plugins } from './config/plugins'
import { modules } from './config/modules'
import { tailwindcss } from './config/tailwindcss'
import { sitemap } from './config/sitemap'
import { veeValidate } from './config/vee-validate'
import { routeRules } from './config/route-rules'
import { pwa } from './config/pwa'
import { vue } from './config/vue'
import { site } from './config/site'
import { linkChecker } from './config/link-checker'
import { robots } from './config/robots'
import { htmlValidator } from './config/html-validator'
import { piniaPersistedstate } from './config/pinia-persistedstate'
import { delayHydration } from './config/delay-hydration'
import { device } from './config/device'

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
	ssr: true,
	sourcemap: true,
	appConfig: {
		storage: {
			driver: process.env.NUXT_STORAGE_DRIVER ?? (isCI ? 'cloudflare' : 'fs')
		}
	},
	hooks: {
		'nitro:config': function (config: NitroConfig) {
			const nuxt = useNuxt()
			config.virtual = config.virtual || {}
			config.virtual['#storage-config'] = `export const driver = ${JSON.stringify(
				nuxt.options.appConfig.storage.driver
			)}`
		}
	},
	generate: {
		exclude: [/^\/api\/.*/]
	},
	site,
	modules,
	routeRules,
	plugins,
	build,
	imports,
	experimental,
	devtools,
	typescript,
	tailwindcss,
	i18n,
	css,
	eslint,
	runtimeConfig,
	cookieControl,
	vue,
	pinia,
	piniaPersistedstate,
	vite,
	nitro,
	app,
	image,
	pwa,
	schemaOrg,
	sitemap,
	linkChecker,
	robots,
	htmlValidator,
	veeValidate,
	delayHydration,
	device
})
