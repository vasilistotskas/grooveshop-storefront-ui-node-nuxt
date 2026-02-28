import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import MagicString from 'magic-string'

export default defineNuxtModule({
  meta: {
    name: '@groove/purge-comments',
  },
  setup(_options, nuxt) {
    if (nuxt.options.dev) return

    addVitePlugin({
      name: 'purge-comments',
      enforce: 'pre',
      transform: (code: string, id: string) => {
        if (!id.endsWith('.vue') || !code.includes('<!--')) return

        const s = new MagicString(code)

        const commentPattern = /<!--[\s\S]*?-->/g
        let current = s.toString()
        let prev = ''
        while (current !== prev) {
          prev = current
          current = current.replace(commentPattern, '')
        }
        if (current !== code) {
          s.overwrite(0, code.length, current)
        }

        if (s.hasChanged()) {
          return {
            code: s.toString(),
            map: s.generateMap({ source: id, includeContent: true }),
          }
        }
      },
    })
  },
})
