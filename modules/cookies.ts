import { resolve } from 'node:path'

import {
  addPlugin,
  addTemplate,
  createResolver,
  defineNuxtModule,
} from '@nuxt/kit'

import type { Nuxt } from '@nuxt/schema'
import packageJson from '../package.json' with { type: 'json' }
import type { ModuleOptions } from '../runtime/cookies/types.ts'
import { DEFAULTS } from '../runtime/cookies/types.ts'

const resolver = createResolver(import.meta.url)
const cookiesDir = resolver.resolve('../runtime/cookies')

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@groove/nuxt-cookies',
    version: packageJson.version,
    configKey: 'cookieControl',
    compatibility: { nuxt: '^4.0.0' },
  },
  // `secure` depends on the build, so it is decided here, where the module
  // runs, rather than in DEFAULTS: that file is also loaded by Node outside
  // Vite, where `import.meta.env` does not exist.
  defaults: nuxt => ({
    ...DEFAULTS,
    cookieOptions: { ...DEFAULTS.cookieOptions, secure: !nuxt.options.dev },
  }),

  setup(moduleOptions: ModuleOptions, nuxt: Nuxt) {
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
