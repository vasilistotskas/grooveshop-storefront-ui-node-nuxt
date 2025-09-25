import { fileURLToPath, URL } from 'node:url'

import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    dir: 'tests',
    coverage: {
      enabled: true,
      reportsDirectory: fileURLToPath(new URL('./coverage', import.meta.url)),
      reporter: ['text', 'html', 'clover', 'lcov', 'json'],
      include: ['**/*.ts', '**/*.vue'],
      exclude: [
        '**/types/**/*',
        '**/constants/**/*',
      ],
    },
    include: ['**/*.spec.ts'],
    environment: 'nuxt',
    environmentOptions: {
      nuxt: {
        mock: {
          intersectionObserver: true,
          indexedDb: true,
        },
      },
    },
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
