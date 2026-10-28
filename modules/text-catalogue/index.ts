import { join } from 'node:path'
import { defineNuxtModule, resolveAlias } from '@nuxt/kit'

import { LOCALE_FILES, LOCALE_FILES_DIR } from '../../i18n/locales.ts'
import { buildTextCatalogue } from './extract.ts'
import type { ComponentDir } from './reachability.ts'

/** The virtual module the catalogue routes import: `server/utils/textCatalogue.ts`. */
const CATALOGUE_MODULE = '#text-catalogue'

/**
 * The `components` option as directories. Nuxt's schema has already made
 * the list of `nuxt.config.ts` the `dirs` of an object; an entry is a path
 * or { path, prefix }. Any other setting of a directory (`pathPrefix`,
 * `extensions`, …) changes how its components are named, which the walk
 * does not model, so it is refused instead of misplacing texts silently.
 */
function componentDirsOf(option: unknown, alias: Record<string, string>): ComponentDir[] {
  const dirs: unknown = typeof option === 'object' && option !== null && 'dirs' in option ? option.dirs : undefined
  if (!Array.isArray(dirs)) throw new Error('@groove/text-catalogue: `components` must be a list of directories')
  return dirs.map((dir: unknown) => {
    const { path, prefix = '', ...unsupported } = typeof dir === 'string' ? { path: dir } : { ...(dir as object) } as { path?: unknown, prefix?: unknown }
    if (typeof path !== 'string' || typeof prefix !== 'string' || Object.keys(unsupported).length > 0) {
      throw new Error('@groove/text-catalogue: a `components` entry must be a path or { path, prefix }; any other setting changes how components are named, which the reachability walk does not model')
    }
    return { path: resolveAlias(path, alias), prefix }
  })
}

/**
 * Extracts the text catalogue (`buildTextCatalogue`) on every build and
 * every dev start, and hands it to the server bundle as a Nitro virtual
 * module, so it is built from the same tree it ships with and exists
 * nowhere else. The client build never imports it: the defaults already
 * reach browsers in their own chunks, and the catalogue (placeholders,
 * every locale, every key) would only be dead weight there.
 *
 * Which texts a store sees is decided by the components it renders
 * (`reachability.ts`), named the way Nuxt names them: the `components`
 * option of `nuxt.config.ts` is read here, not copied.
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
            componentDirs: componentDirsOf(nuxt.options.components, nuxt.options.alias),
          })
          // Parsed once at load, not evaluated as a literal of thousands of nodes.
          return `export default JSON.parse(${JSON.stringify(JSON.stringify(catalogue))})`
        },
      }
    })
  },
})
