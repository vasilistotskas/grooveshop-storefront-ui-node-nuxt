import { createFilter } from 'vite'
import type { Plugin } from 'vite'
import { createUnimport } from 'unimport'
import type { UnimportOptions } from 'unimport'

interface AutoImportsOptions extends Partial<UnimportOptions> {
  /** Source files whose free identifiers are resolved. */
  include: string[]
  exclude?: string[]
}

/**
 * Inject the auto-imports Nuxt and Nitro would, into the source a unit test
 * loads (see the `unit` project in vitest.config.mts for the presets).
 *
 * This replaces `unimport/unplugin`, whose transform returns
 * `s.generateMap()` with no options — a low-resolution map with a null
 * source. V8 coverage cannot remap a file through it, so every file the
 * plugin touched vanished from the report: on 2026-09-30 `server/api`
 * measured 24 lines instead of ~1,800, and `shared/utils/businessHours.ts`
 * read 0% with a spec exercising every branch. A hires map naming its
 * source keeps the transform transparent to coverage.
 */
export function autoImports(name: string, { include, exclude = [], ...options }: AutoImportsOptions): Plugin {
  const unimport = createUnimport(options)
  const filter = createFilter(include, exclude)

  return {
    name: `test:auto-imports:${name}`,
    // After TypeScript is stripped, as unimport's own plugin does.
    enforce: 'post',
    async buildStart() {
      await unimport.init()
    },
    async transform(code, id) {
      if (!filter(id)) return
      const { s } = await unimport.injectImports(code, id)
      if (!s.hasChanged()) return
      return {
        code: s.toString(),
        map: s.generateMap({ hires: true, source: id, includeContent: true }),
      }
    },
  }
}
