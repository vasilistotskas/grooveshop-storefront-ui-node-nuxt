import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '@': fileURLToPath(new URL('./app', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    // Disable file parallelism globally to prevent [nuxt] instance unavailable errors
    fileParallelism: false,
    coverage: {
      enabled: false,
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      include: ['**/app/**', '**/server/**'],
      exclude: [
        '**/node_modules/**',
        '**/.nuxt/**',
        '**/dist/**',
        '**/coverage/**',
        '**/test/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
        '**/constants/**',
        '**/shared/**',
      ],
    },
    globals: true,
    projects: [
      {
        resolve: {
          alias: {
            '~': fileURLToPath(new URL('./app', import.meta.url)),
            '@': fileURLToPath(new URL('./app', import.meta.url)),
            '~/server': fileURLToPath(new URL('./server', import.meta.url)),
            '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
          },
        },
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },

      await defineVitestProject({
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.{test,spec}.ts'],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              mock: {
                intersectionObserver: true,
                indexedDb: true,
              },
              overrides: {
                // Disable manifest fetching during tests to prevent timeout errors
                experimental: {
                  appManifest: false,
                },
              },
            },
          },
        },
        resolve: {
          alias: {
            'bun:test': 'vitest',
          },
        },
      }),

      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
          // Provide a real localStorage implementation before Nuxt initialises.
          // Without this, nuxt-auth-utils' session.client.js crashes on
          // localStorage.getItem() which blocks @nuxtjs/i18n from running its
          // plugin, leaving nuxtApp.$i18n and __VUE_I18N_SYMBOL__ unset.
          setupFiles: ['./test/fixtures/setup/localStorage.ts'],
          environmentOptions: {
            nuxt: {
              mock: {
                intersectionObserver: true,
                indexedDb: true,
              },
              overrides: {
                // Disable manifest fetching during tests to prevent timeout errors
                experimental: {
                  appManifest: false,
                },
                // Load test-only i18n fallback plugin so useNuxtApp().$i18n and
                // useI18n() work even when the real @nuxtjs/i18n module fails to
                // fully initialise in the vitest environment.
                plugins: ['./test/fixtures/plugins/mock-i18n.ts'],
              },
            },
          },
          // Retry flaky tests due to Nuxt environment race conditions
          retry: 2,
          // Increase test timeout
          testTimeout: 15000,
        },
        resolve: {
          alias: {
            'bun:test': 'vitest',
          },
        },
      }),
    ],
  },
})
