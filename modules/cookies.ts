import { resolve } from 'node:path'

import {
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'

import type { Nuxt } from '@nuxt/schema'
import { version } from '../package.json'
import type { ModuleOptions } from '../runtime/cookies/types'
import { DEFAULTS } from '../runtime/cookies/types'

const resolver = createResolver(import.meta.url)
const cookiesDir = resolver.resolve('../runtime/cookies')

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@groove/nuxt-cookies',
    version,
    configKey: 'cookieControl',
    compatibility: { nuxt: '^4.0.0' },
  },
  defaults: DEFAULTS,

  async setup(moduleOptions: ModuleOptions, nuxt: Nuxt) {
    nuxt.options.alias['#cookie-control'] = cookiesDir
    nuxt.options.build.transpile.push(cookiesDir)

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
