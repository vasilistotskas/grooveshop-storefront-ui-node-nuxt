import { join } from 'node:path'
import { defineNuxtModule } from '@nuxt/kit'

import { blockFiles, blocksModuleSource } from './source.ts'

/** The virtual module `server/utils/builderCatalogue.ts` imports. */
const BLOCKS_MODULE = '#builder-blocks'

/** Where block definitions live, below `app/`. */
const BLOCKS_DIR = 'blocks'

/**
 * Collects the page builder's block definitions (`app/blocks/**\/*.block.ts`,
 * each a default-exported `defineBlock(...)`) into the Nitro virtual module
 * `#builder-blocks`, which the server turns into the catalogue
 * (`GET /api/builder/catalogue`) and uses to parse documents.
 *
 * Only the definition files are bundled into the server, and a definition
 * holds data, never a component, so the server catalogue carries no
 * rendering code. The editor imports the same files on the client. The
 * catalogue itself is computed when the server loads (it needs the Zod
 * schemas, which the server holds anyway) and is a constant of the build.
 *
 * The function form runs each time Nitro bundles the server, so a dev
 * restart of the server sees the current files.
 */
export default defineNuxtModule({
  meta: {
    name: '@groove/builder-blocks',
  },
  setup(_options, nuxt) {
    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.virtual = {
        ...nitroConfig.virtual,
        [BLOCKS_MODULE]: () => blocksModuleSource(blockFiles(join(nuxt.options.srcDir, BLOCKS_DIR))),
      }
    })
  },
})
