import { fileURLToPath } from 'node:url'

import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    dir: 'tests',
    coverage: {
      enabled: true,
      reportsDirectory: 'coverage',
      reporter: ['html', 'json', 'lcov', 'text'],
      include: ['**/*.ts', '**/*.vue'],
    },
    include: ['**/*.spec.ts'],
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./', import.meta.url)),
        domEnvironment: (process.env.VITEST_DOM_ENV as 'happy-dom' | 'jsdom') ?? 'happy-dom',
        mock: {
          indexedDb: true,
        },
      },
    },
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
})
