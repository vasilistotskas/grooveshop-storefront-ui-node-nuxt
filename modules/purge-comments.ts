import { addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import MagicString from 'magic-string'

export default defineNuxtModule({
  meta: {
    name: '@groove/purge-comments',
  },
  setup() {
    addVitePlugin({
      name: 'purge-comments',
      enforce: 'pre',
      transform: (code: string, id: string) => {
        if (!id.endsWith('.vue') || !code.includes('<!--')) return

        const s = new MagicString(code)
        let previousCode

        do {
          previousCode = s.toString()
          s.replace(/<!--[\s\S]*?-->/g, '')
        } while (previousCode !== s.toString())

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
