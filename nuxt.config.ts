import { fileURLToPath } from 'url'
import { dirname } from 'path'
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
import { linkChecker } from './config/link-checker'
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
import { content } from './config/content'
import { stylelint } from './config/stylelint'
import { sitemap } from './config/sitemap'
import { veeValidate } from './config/vee-validate'

const currentDir = dirname(fileURLToPath(import.meta.url))

// https://v3.nuxtjs.org/docs/directory-structure/nuxt.config
export default defineNuxtConfig({
	ssr: true,
	sourcemap: process.env.NODE_ENV !== 'production',
	modules,
	plugins,
	build,
	imports,
	experimental,
	devtools,
	content,
	typescript,
	tailwindcss,
	// @ts-ignore
	i18n,
	css,
	eslint,
	stylelint,
	runtimeConfig,
	cookieControl,
	pinia,
	vite,
	nitro,
	app,
	image,
	postcss,
	pwa,
	htmlValidator,
	linkChecker,
	schemaOrg,
	sitemap,
	veeValidate
})
