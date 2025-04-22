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
    },
    include: ['**/*.spec.ts'],
    environment: 'happy-dom',
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./', import.meta.url)),
        domEnvironment: 'happy-dom',
        mock: {
          indexedDb: true,
        },
      },
    },
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
