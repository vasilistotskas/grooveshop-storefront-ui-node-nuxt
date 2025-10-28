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
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: fileURLToPath(new URL('./coverage', import.meta.url)),
      reporter: ['text', 'html', 'clover', 'lcov', 'json'],
      include: ['**/*.ts', '**/*.vue'],
      exclude: [
        '**/types/**/*',
        '**/constants/**/*',
        '**/shared/**/*',
        '**/.nuxt/**/*',
        '**/nuxt.config.ts/**/*',
        '**/openapi-ts.config.ts/**/*',
        '**/node_modules/**/*',
        '**/.cache/**/*',
        '**/virtual:*',
        '**/\x00*', // Exclude null-byte prefixed virtual modules
      ],
      clean: true,
      cleanOnRerun: true,
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
          environmentOptions: {
            nuxt: {
              mock: {
                intersectionObserver: true,
                indexedDb: true,
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
    ],
  },
})
