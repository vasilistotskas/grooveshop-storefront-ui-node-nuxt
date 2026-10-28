import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'

import { LOCALE_FILES, LOCALE_FILES_DIR } from '../../i18n/locales.ts'
import { buildTextCatalogue } from './extract.ts'

/** The virtual module the catalogue routes import: `server/utils/textCatalogue.ts`. */
const CATALOGUE_MODULE = '#text-catalogue'

/**
 * Extracts the text catalogue (`buildTextCatalogue`) on every build and
 * every dev start, and hands it to the server bundle as a Nitro virtual
 * module, so it is built from the same tree it ships with and exists
 * nowhere else. The client build never imports it: the defaults already
 * reach browsers in their own chunks, and the catalogue (placeholders,
 * every locale, every key) would only be dead weight there.
 *
 * The function form is evaluated each time Nitro bundles the server, not
 * when the module is set up, so a dev restart of the server sees the
 * current blocks.
 */
export default defineNuxtModule({
  meta: {
    name: '@groove/text-catalogue',
  },
  setup(_options, nuxt) {
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual = {
        ...nitroConfig.virtual,
        [CATALOGUE_MODULE]: () => {
          const catalogue = buildTextCatalogue({
            appDir: nuxt.options.srcDir,
            localesDir: join(nuxt.options.rootDir, LOCALE_FILES_DIR),
            localeFiles: LOCALE_FILES,
          })
          // Parsed once at load, not evaluated as a literal of thousands of nodes.
          return `export default JSON.parse(${JSON.stringify(JSON.stringify(catalogue))})`
        },
      }
    })
  },
})
