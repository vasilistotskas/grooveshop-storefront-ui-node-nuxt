import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
// Extension is load-bearing, not style. Vite's `configLoader: 'native'`
// hands the config to the runtime's own ESM loader, which does not do
// bundler-style extension resolution — an extensionless relative import
// makes the config unloadable there. `native` is slated to become the
// default in a future Vite major, and 8.x already warns about it on
// every run ("Add the file extension"). TypeScript accepts the
// specifier because Nuxt's generated tsconfig sets
// `allowImportingTsExtensions` with `moduleResolution: Bundler`.
import { DEFAULT_LOCALE } from './i18n/locales.ts'
import * as h3 from 'h3'
import { NITRO_SHIM_IMPORTS } from './test/helpers/nitro/imports.ts'
import { autoImports } from './test/helpers/autoImports.ts'

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))

// One time zone on every machine, the one CI runs in: a snapshot or an
// assertion that prints a local time otherwise passes on one desk and
// fails on another. Set here, in the main process, because Node applies
// `TZ` only there — a setup file or `test.env` does not reach thread
// workers (vitest docs, "Time Zone Does Not Change in Worker Threads").
process.env.TZ = 'UTC'

/**
 * Nuxt's own source aliases, for the projects that do not boot Nuxt.
 * The `nuxt` project gets them from the generated Nuxt config.
 */
const alias = {
  '~': path('./app'),
  '@': path('./app'),
  '~~': path('.'),
  '@@': path('.'),
  '#shared': path('./shared'),
}

/**
 * Every test starts from a clean slate: call history AND implementations
 * are reset (`vi.fn(impl)` goes back to `impl`, not to an empty function),
 * spies are restored, and `vi.stubGlobal` / `vi.stubEnv` are undone.
 *
 * Inline projects inherit nothing from the root `test` block unless they
 * set `extends: true`, so this is spread into each project explicitly.
 * A test that needs state from an earlier test is order-dependent and
 * wrong; a stub a whole file needs belongs in `beforeEach`.
 */
const isolation = {
  mockReset: true,
  restoreMocks: true,
  unstubGlobals: true,
  unstubEnvs: true,
}

/**
 * The `unit` project resolves auto-imports the way the Nitro build does,
 * so `server/**` runs its REAL dependencies — h3, `server/utils/**`,
 * `shared/**` — and a spec mocks only the boundaries it crosses. The
 * presets mirror nitropack's and Nuxt's nitro presets
 * (`nitropack/dist/core/index.mjs` `resolveImportsOptions`,
 * `@nuxt/nitro-server/dist/index.mjs`): h3's exports filtered exactly as
 * nitropack does, plus Nuxt's `H3Event`/`H3Error`, the `utils/` scan of
 * the server dir, and `nitro.imports.dirs` from nuxt.config.ts. Nitro's own runtime and the module helpers cannot load
 * outside a build and resolve to `test/helpers/nitro/runtime.ts`.
 *
 * `app/utils/**` gets the app side's equivalent for the part a unit test
 * can honour: the `shared/**` scan (`imports.dirs`) and Nuxt's default
 * `utils/` scan. (A `shared/**` file gets the Nitro presets even when app
 * code imports it, so a shared file misusing an h3 helper is not caught
 * here.) Vue and Nuxt composables are not
 * provided — code needing them belongs in the `nuxt` project.
 *
 * Test files are never transformed: they import what they use, as the
 * Nuxt testing docs advise.
 */
const glob = (pattern: string) => path(`./${pattern}`).replaceAll('\\', '/')
const sourceGlob = (dir: string) => glob(`${dir}/**/*.ts`)
const notDeclarations = ['**/*.d.ts', '**/node_modules/**']
const sharedDirs = [sourceGlob('shared')]

const nitroAutoImports = autoImports('nitro', {
  include: [sourceGlob('server'), sourceGlob('shared')],
  exclude: notDeclarations,
  presets: [
    // nitropack: `h3Exports.filter((n) => !/^[A-Z]/.test(n) && n !== "use")`
    { from: 'h3', imports: Object.keys(h3).filter(name => !/^[A-Z]/.test(name) && name !== 'use') },
    // Nuxt's own nitro preset (@nuxt/nitro-server dist/index.mjs) adds the
    // two capitalised values nitropack's filter drops.
    { from: 'h3', imports: ['H3Event', 'H3Error'] },
    { from: glob('test/helpers/nitro/runtime.ts'), imports: [...NITRO_SHIM_IMPORTS] },
  ],
  dirs: [sourceGlob('server/utils'), ...sharedDirs],
})

const appUtilsAutoImports = autoImports('app-utils', {
  include: [sourceGlob('app/utils')],
  exclude: notDeclarations,
  // Nuxt's default `utils/` scan: top-level files and `<dir>/index.ts`.
  dirs: [glob('app/utils/*.ts'), glob('app/utils/*/index.ts'), ...sharedDirs],
})

type NuxtProject = Awaited<ReturnType<typeof defineVitestProject>>

/**
 * Append a setup file that must run AFTER @nuxt/test-utils starts the app.
 *
 * `defineVitestProject` merges our options over Nuxt's with `defu`, which
 * puts a `setupFiles` entry given in the options BEFORE the test-utils
 * entry that calls `setupNuxt()` in its `beforeAll` — so a hook in our
 * file would run against no app. Appending to the resolved list keeps the
 * order explicit.
 */
function withSetupFileAfterNuxt(file: string) {
  return (project: NuxtProject): NuxtProject => {
    const current = project.test?.setupFiles ?? []
    project.test = {
      ...project.test,
      setupFiles: [...(Array.isArray(current) ? current : [current]), file],
    }
    return project
  }
}

export default defineConfig({
  test: {
    coverage: {
      enabled: false,
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov', 'json', 'json-summary'],
      // A red run is exactly when the report is needed.
      reportOnFailure: true,
      // A floor, not a target: the unit+nuxt run measured on 2026-10-02,
      // rounded down. A change that drops coverage below it fails CI;
      // raise it when coverage rises, never lower it to make a run pass.
      thresholds: {
        statements: 70,
        branches: 68,
        functions: 62,
        lines: 70,
      },
      include: ['app/**', 'server/**', 'shared/**'],
      exclude: [
        // Generated from Django's OpenAPI schema; not ours to test.
        'shared/openapi/**',
        // Type-only modules carry no runtime code.
        'shared/types/**',
        // The frozen webside tree: byte-for-byte copies of defaults that
        // are tested where they live. It never changes, so it is pinned by
        // `test/nuxt/variants/webside/frozen-render.spec.ts` and the SSR
        // and pixel diffs instead — measured, every freeze diluted the
        // floor (PR 2's account copies took lines from 70.9% to 64.6%).
        'app/components/variants/webside/**',
        '**/*.d.ts',
      ],
    },
    projects: [
      {
        resolve: { alias },
        plugins: [nitroAutoImports, appUtilsAutoImports],
        test: {
          name: 'unit',
          include: ['test/unit/**/*.spec.ts'],
          environment: 'node',
          setupFiles: ['./test/fixtures/setup/nitro.ts'],
          ...isolation,
        },
      },

      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.spec.ts'],
          environment: 'nuxt',
          ...isolation,
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
                // SEO modules are meaningless in the SPA test harness and only
                // emit "SPA mode detected" / robots warnings into test output.
                aiReady: {
                  enabled: false,
                },
                robots: {
                  enabled: false,
                },
                // Pin the locale. jsdom reports `navigator.language` as
                // en-US, so once a second platform locale existed
                // @nuxtjs/i18n resolved `en` in the harness — which
                // flipped every translated assertion in test/nuxt to
                // English (loyalty tier names, breadcrumb labels, badge
                // snapshots) and prefixed every href with /en under
                // `prefix_except_default`. These specs assert
                // PLATFORM-DEFAULT behaviour, so browser detection has
                // no business in the harness.
                i18n: {
                  defaultLocale: DEFAULT_LOCALE,
                  detectBrowserLanguage: false,
                },
              },
            },
          },
          // Each file boots its own Nuxt app in `beforeAll`; under a full
          // parallel run that boot competes for CPU with every other
          // worker's and can outlast vitest's 10s hook default.
          hookTimeout: 60000,
        },
      }).then(withSetupFileAfterNuxt('./test/fixtures/setup/nuxt.ts')),

      {
        resolve: { alias },
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.spec.ts'],
          // `environment: 'node'` (not 'nuxt') is deliberate here: these
          // tests use `@nuxt/test-utils/e2e`'s `setup()`, which boots a
          // REAL Nuxt/Nitro server in a separate child process and talks to
          // it over HTTP — the in-process happy-dom + mocked-Nuxt-context
          // `nuxt` environment (see the `nuxt` project above) is neither
          // needed nor used by that flow.
          environment: 'node',
          ...isolation,
          // Nuxt allows one dev server per project directory ("Another
          // Nuxt dev server is already running"), so e2e files cannot boot
          // theirs side by side. The suites share one boot through
          // test/e2e/storefront.spec.ts; this keeps a second file safe.
          fileParallelism: false,
          // Booting a real dev server (build + first request) is slower
          // than in-process tests; the SWR test also budgets up to ~45s
          // warming a cold dev server before its timed assertions.
          testTimeout: 120000,
          hookTimeout: 120000,
        },
      },
    ],
  },
})
