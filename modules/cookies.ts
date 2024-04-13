import { resolve } from 'node:path'

import {
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
  extendViteConfig,
  extendWebpackConfig,
} from '@nuxt/kit'

import { version } from '../package.json'
import type { ModuleOptions } from '../runtime/cookies/types'
import { DEFAULTS } from '../runtime/cookies/types'
import { replaceCodePlugin } from '../runtime/utils/replace'

const resolver = createResolver(import.meta.url)
const cookiesDir = resolver.resolve('../runtime/cookies')

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@groove/nuxt-cookies',
    version,
    configKey: 'cookieControl',
    compatibility: { nuxt: '^3.0.0' },
  },
  defaults: DEFAULTS,

  async setup(moduleOptions, nuxt) {
    nuxt.options.alias['#cookie-control'] = cookiesDir
    nuxt.options.build.transpile.push(cookiesDir)

    blockIframes(moduleOptions)

    addPlugin(resolve(cookiesDir, 'plugin'))
    addTemplate({
      filename: 'cookie-control-options.ts',
      write: true,
      getContents: () =>
        `import type { ModuleOptions } from '../runtime/cookies/types'\n\nexport default ${JSON.stringify(
          moduleOptions,
          undefined,
          2,
        )} as ModuleOptions`,
    })
  },
})

const blockIframes = (moduleOptions: ModuleOptions) => {
  if (moduleOptions.isIframeBlocked) {
    const isIframeBlocked = {
      id: 'ncc_f',
      name: 'functional',
    }

    if (moduleOptions.cookies) {
      if (moduleOptions.cookies.optional) {
        moduleOptions.cookies.optional.push(isIframeBlocked)
      }
      else {
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
            { search: '</iframe>', replace: '</CookieIframe>', flags: 'g' },
          ],
        },
      })
    })

    extendViteConfig((config) => {
      config?.plugins?.push(
        replaceCodePlugin({
          replacements: [
            {
              from: /<iframe[^>]*.*|<\/iframe>/g,
              to: (match: string) =>
                match.includes('cookie-enabled')
                  ? match
                  : match
                    .replace(/<iframe/g, '<CookieIframe')
                    .replace(/iframe>/g, 'CookieIframe>'),
            },
          ],
        }),
      )
    })
  }
}
