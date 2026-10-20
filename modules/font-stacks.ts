import { addTemplate, defineNuxtModule } from '@nuxt/kit'

import { FONT_ALLOWLIST, FONT_FAMILY_NAMES, fontStackProperty } from '../shared/theme/constants.ts'

/**
 * Compiles every pre-bundled font stack into the global stylesheet as a
 * `--font-stack-<key>` custom property, for the tenant tokens to point at
 * (`fontStackValue`).
 *
 * The stacks are tenant-chosen at runtime, so no build-time CSS named
 * them, and `@nuxt/fonts` generates a family's metric-matched fallback
 * faces only where it sees the family used in CSS. Declared here, under
 * a `--font` property it processes, each stack gains
 * `"<Family> Fallback: <system font>"` faces (`size-adjust`,
 * `ascent-override`, ...) that hold the text's size until the web font
 * has loaded: the fallback and the web font occupy the same box, so the
 * swap moves nothing.
 */
export default defineNuxtModule({
  meta: {
    name: '@groove/font-stacks',
  },
  setup(_options, nuxt) {
    const template = addTemplate({
      filename: 'font-stacks.css',
      // Vite processes a template only from disk (the same reason
      // @nuxt/fonts writes its own global stylesheet).
      write: true,
      dependsOn: [],
      getContents: () => {
        const declarations = Object.keys(FONT_FAMILY_NAMES)
          .map(key => `${fontStackProperty(key)}: ${FONT_ALLOWLIST[key]};`)
          .join('\n  ')
        return `:root {\n  ${declarations}\n}\n`
      },
    })
    nuxt.options.css.push(template.dst)
  },
})
