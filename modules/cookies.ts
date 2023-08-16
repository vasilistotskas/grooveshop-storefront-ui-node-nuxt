import { resolve } from 'node:path'
import {
	addPlugin,
	addTemplate,
	createResolver,
	defineNuxtModule,
	extendWebpackConfig
} from '@nuxt/kit'

import { version } from '../package.json'
import { DEFAULTS, ModuleOptions } from '../runtime/cookies/types'

const resolver = createResolver(import.meta.url)
const runtimeDir = resolver.resolve('../runtime')
const cookiesDir = resolver.resolve('../runtime/cookies')

export default defineNuxtModule<ModuleOptions>({
	meta: {
		name: '@groove/nuxt-cookies',
		version,
		configKey: 'cookieControl',
		compatibility: { nuxt: '^3.0.0' }
	},
	defaults: DEFAULTS,
	// eslint-disable-next-line require-await
	async setup(moduleOptions, nuxt) {
		nuxt.options.alias['#cookie-control'] = cookiesDir
		nuxt.options.build.transpile.push(cookiesDir)

		blockIframes(moduleOptions)

		addPlugin(resolve(cookiesDir, 'plugin'))
		addTemplate({
			filename: 'cookie-control-options.ts',
			write: true,
			getContents: () =>
				`import { ModuleOptions } from '../runtime/cookies/types'\n\nexport default ${JSON.stringify(
					moduleOptions,
					undefined,
					2
				)} as ModuleOptions`
		})
	}
})

const blockIframes = (moduleOptions: ModuleOptions) => {
	if (moduleOptions.isIframeBlocked) {
		const isIframeBlocked = {
			name: 'functional',
			initialState:
				typeof moduleOptions.isIframeBlocked !== 'boolean' &&
				moduleOptions.isIframeBlocked.initialState !== undefined
					? moduleOptions.isIframeBlocked.initialState
					: true
		}

		if (moduleOptions.cookies) {
			if (moduleOptions.cookies.optional) {
				moduleOptions.cookies.optional.push(isIframeBlocked)
			} else {
				moduleOptions.cookies.optional = [isIframeBlocked]
			}
		}

		extendWebpackConfig((config) => {
			config.module?.rules?.push({
				test: /\.vue$/,
				loader: 'string-replace-loader',
				exclude: /node_modules/,
				options: {
					multiple: [
						{ search: '<iframe', replace: '<CookieIframe', flags: 'g' },
						{ search: '</iframe>', replace: '</CookieIframe>', flags: 'g' }
					]
				}
			})
		})
	}
}
