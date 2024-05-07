import type { ViteConfig } from '@nuxt/schema'
import AutoImport from 'unplugin-auto-import/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Icons from 'unplugin-icons/vite'
import Components from 'unplugin-vue-components/vite'

export const vite = {
  plugins: [
    Components({
      deep: true,
      dts: 'components.d.ts',
      directoryAsNamespace: true,
      resolvers: [
        IconsResolver({
          prefix: 'Icon',
          enabledCollections: ['fa6-solid', 'fa-solid', 'mdi', 'ant-design'],
        }),
      ],
    }),
    Icons({
      compiler: 'vue3',
    }),
    AutoImport({
      imports: ['vitest'],
      dts: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const chunks = ['@headlessui/vue', '@iconify', '@unocss', 'v-calendar', 'zod', 'lottie']
          if (id.includes('/node_modules/')) {
            for (const chunkName of chunks) {
              if (id.includes(chunkName)) {
                return chunkName
              }
            }
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      '@headlessui/vue',
      '@iconify',
      '@unocss',
      'lottie-web',
      'zod',
      'v-calendar',
      'workbox-precaching',
      'workbox-routing',
      'workbox-cacheable-response',
      'workbox-strategies',
      'workbox-expiration',
    ],
  },
} satisfies ViteConfig
