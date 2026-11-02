import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
import vitest from '@vitest/eslint-plugin'
// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import { globalIgnores } from 'eslint/config'

/**
 * `no-restricted-syntax` selectors, kept as values because the rule is
 * set by more than one config object below. ESLint does not concatenate
 * a rule's options across matching objects — the LATER object's options
 * replace the earlier ones outright ("Configure Rules": the rule
 * configuration is merged with the later object taking precedence) — so
 * an object scoped to `app/components/**` has to repeat every app-wide
 * selector, or it silently switches the app-wide ones off there.
 */
const APP_FETCHER_SELECTORS = [
  {
    selector: 'CallExpression[callee.name=/^(\\$fetch|useFetch|useLazyFetch|useRequestFetch)$/]',
    message: 'Use $api / useApi / useLazyApi / useRequestApi — they send the page locale. See app/utils/api.ts.',
  },
  {
    selector: 'MemberExpression[object.name="$fetch"]',
    message: 'Use $api — it sends the page locale. See app/utils/api.ts.',
  },
]

/**
 * `useBuilderPage()` must be awaited. Nuxt registers useFetch's promise
 * with `onServerPrefetch` and lets setup continue, so an un-awaited call
 * leaves `data`/`error` null for the rest of setup on the server — which
 * made every builder-driven page (/about, /vision, custom [slug] pages)
 * throw its own 404 on every cold server render.
 */
const BUILDER_PAGE_AWAITED = {
  selector: ':not(AwaitExpression) > CallExpression[callee.name="useBuilderPage"]',
  message: 'Await useBuilderPage() — un-awaited, its data is still null for the rest of setup on the server, and the page 404s.',
}

/**
 * Page macros belong in `app/pages/`: Nuxt extracts `definePageMeta` and
 * `defineRouteRules` only from page files, so in a component (a page
 * BODY under `Storefront/` or `variants/`) they are inert and the route
 * silently loses its middleware or robots rule.
 */
const NO_PAGE_MACROS = {
  selector: 'CallExpression[callee.name=/^(definePageMeta|defineRouteRules)$/]',
  message: 'Page macros only work in app/pages/ — move this to the page shell that mounts the component.',
}

/**
 * A navigation target is a route name or a `localePath(...)` result,
 * never a literal path. Every route has a locale prefix except the
 * default one's, so a bare `'/search'` sends an English visitor to the
 * Greek page: the quick search's "See all results" opened Greek results
 * for an English query, which found nothing (owner review, 2026-10-16).
 */
const NAVIGATION_CALL = ':matches(CallExpression[callee.name="navigateTo"], CallExpression[callee.object.name="router"][callee.property.name=/^(push|replace)$/])'
const LOCALIZED_NAVIGATION_MESSAGE = 'Navigate with localePath({ name: ... }) — a literal path drops the locale prefix.'
// esquery regexes cannot contain "/", so a leading slash is `\x2F`.
const LOCALIZED_NAVIGATION = [
  `${NAVIGATION_CALL} > Literal.arguments[value=/^\\x2F/]`,
  `${NAVIGATION_CALL} > TemplateLiteral.arguments`,
  `${NAVIGATION_CALL} > ObjectExpression.arguments > Property[key.name="path"] > Literal.value[value=/^\\x2F/]`,
  `${NAVIGATION_CALL} > ObjectExpression.arguments > Property[key.name="path"] > TemplateLiteral.value`,
].map(selector => ({ selector, message: LOCALIZED_NAVIGATION_MESSAGE }))

/**
 * A request is gated with `enabled`, never with `immediate: <condition>`.
 * `immediate` skips only the first fetch: the fetcher still refetches when
 * a reactive option in its query or body changes (the locale, a cursor),
 * which is how anonymous visitors posted to the signed-in-only
 * liked-posts route on every page change (2026-07-04). Nuxt's `enabled`
 * (v4.5) is checked on every run: the first fetch, `refresh`/`execute`
 * and watch triggers. `immediate: false` stays, for a fetch the code
 * starts itself.
 */
const GATE_WITH_ENABLED = {
  selector: 'CallExpression[callee.name=/^use(Lazy)?(Api|AsyncData)$/] > ObjectExpression > Property[key.name="immediate"]:not([value.type="Literal"])',
  message: 'Gate the request with `enabled` — `immediate` skips only the first fetch, and a reactive option refetches anyway.',
}

/**
 * A promise returned from a `try` without `await` settles after the try
 * has exited, so its rejection never reaches the `catch` — in a server
 * route, `handleError`, which is what reports a drifted response loudly.
 * Three shipping routes returned `parseDataAs(...)` that way: a contract
 * break reached the client as a 422 and was never logged. The callees
 * named here are the async ones routes return from their `try` —
 * `parseDataAs`, `$fetch` / `$fetch.raw`, `useBackendFetch()(...)` and
 * its `backendFetch` alias — bare or behind `as` / `!`.
 * typescript-eslint's `return-await` would cover any promise, but needs
 * typed linting, which this config does not run.
 */
const ASYNC_CALLEE = ':matches([callee.name=/^(parseDataAs|\\$fetch|backendFetch)$/], [callee.object.name="$fetch"], [callee.callee.name=/^(useBackendFetch|backendFetchFor)$/])'
const RETURN_AWAITED_IN_TRY = ['', 'TSAsExpression > ', 'TSNonNullExpression > '].map(wrapper => ({
  selector: `TryStatement > BlockStatement ReturnStatement > ${wrapper}CallExpression${ASYNC_CALLEE}`,
  message: 'Return `await` inside try: an un-awaited promise rejects after the try exits, so the catch (handleError) never sees the failure.',
}))

/**
 * Reading a session must not create one. `getUserSession` (and h3's
 * `useSession` under it) mints a session and sets `nuxt-session` for a
 * request that has none, which gave every visitor a session cookie before
 * they signed in or added to a cart (2026-10-15). Reads go through
 * `readUserSession`; the writers that create a session on purpose are the
 * files `SESSION_WRITERS` lists.
 */
const SESSION_READ = {
  selector: 'CallExpression[callee.name=/^(getUserSession|useSession)$/]',
  message: 'This mints a session for a visitor without one. Read with readUserSession (server/utils/auth.ts); only a file that writes a session on purpose (SESSION_WRITERS in eslint.config.mjs) calls it.',
}
/** Sign-in, the cart's first write, the OAuth hand-off and the auth error path: they write a session. */
const SESSION_WRITERS = [
  'server/utils/auth.ts',
  'server/utils/cartSession.ts',
  'server/utils/error.ts',
  'server/utils/oauth.ts',
]

export default withNuxt(
  globalIgnores([
    // Only ignore the raw schema files at the project root, NOT the
    // generated TS/Zod sources in ``shared/openapi/`` — otherwise the
    // openapi-ts ESLint post-processor fails with "all matching files
    // are ignored" and the codegen crashes mid-run.
    'openapi/**',
    '**/.nuxt/**',
    '**/.output/**',
    '**/dist/**',
    '**/build/**',
    '**/node_modules/**',
    '**/.pnpm-store/**',
    '**/.cache/**',
    '**/.eslintcache',
    '**/coverage/**',
    '**/*.log',
    '**/*.md',
    '**/logs/**',
    '**/skills/**',
  ]),
  {
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss,
    },
  },
  {
    // Generated by @hey-api/openapi-ts — drf-spectacular emits ordering
    // patterns like ``(?:id|\-id)`` where the ``\-`` outside a character
    // class is technically unnecessary but harmless. ``no-useless-escape``
    // isn't auto-fixable, so relax it only for the generated folder.
    files: ['shared/openapi/**/*.ts'],
    rules: {
      'no-useless-escape': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
    },
  },
  {
    // Mechanical guard for the project rule "never import from
    // ``#shared/...`` in app/ or server/" — see ~/.claude/projects/
    // .../memory/feedback_no_shared_imports.md.
    //
    // Everything under ``shared/`` is auto-imported by Nuxt's
    // ``imports.dirs: ['../shared/**']``. Explicit imports cause Vite
    // "Duplicated imports" warnings, break the test runtime resolver,
    // and routinely creep back in. Catch them at the lint step.
    //
    // Scope: app/** + server/**. ``shared/`` itself is allowed to
    // re-export internally; ``test/`` keeps explicit imports because
    // vitest's resolver doesn't honour Nuxt auto-imports.
    files: ['app/**/*.{ts,vue}', 'server/**/*.{ts,vue}'],
    rules: {
      // ``no-restricted-imports`` (the core rule) skips ``import
      // type`` by default, which is exactly the form that's been
      // sneaking back in. The typescript-eslint variant checks
      // both forms — keep both rules on so a pure JS file (rare)
      // is still caught.
      'no-restricted-imports': ['error', {
        patterns: [
          {
            // Regex form — glob patterns ('#shared/*', '#shared/**')
            // didn't match consistently across the eslint+nuxt
            // resolver chain. ``^#shared(/|$)`` reliably catches
            // both ``import '#shared'`` and any subpath.
            regex: '^#shared(/|$)',
            message:
              'Auto-imported. Drop the explicit import — Nuxt picks '
              + 'up everything under shared/ via imports.dirs. '
              + 'See feedback_no_shared_imports.md.',
          },
        ],
      }],
      '@typescript-eslint/no-restricted-imports': ['error', {
        patterns: [
          {
            // Regex form — glob patterns ('#shared/*', '#shared/**')
            // didn't match consistently across the eslint+nuxt
            // resolver chain. ``^#shared(/|$)`` reliably catches
            // both ``import '#shared'`` and any subpath.
            regex: '^#shared(/|$)',
            message:
              'Auto-imported. Drop the explicit import — Nuxt picks '
              + 'up everything under shared/ via imports.dirs. '
              + 'See feedback_no_shared_imports.md.',
          },
        ],
      }],
    },
  },
  {
    // One set of fetchers for the storefront's own `/api`: `$api`,
    // `useApi`, `useLazyApi`, `useRequestApi` (app/utils/api.ts,
    // app/composables/useApi.ts). They state the PAGE's locale on every
    // request (`pageLocaleHeader`), which is how Django answers in the
    // language the visitor is reading and how the Nitro caches key on
    // it. A raw `$fetch` / `useFetch` / `useLazyFetch` /
    // `useRequestFetch` sends no locale, so the server would answer in
    // the default language — and cache that answer for everyone.
    //
    // `$fetch` is deliberately not globally configurable (Nuxt 4 "Custom
    // useFetch" recipe), so this cannot be fixed underneath the call
    // sites; it has to be kept out of them. The plugin that builds the
    // instance and the composables that wrap Nuxt's fetchers are the
    // only places allowed to touch them.
    files: ['server/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...RETURN_AWAITED_IN_TRY, SESSION_READ],
    },
  },
  {
    files: SESSION_WRITERS,
    rules: {
      'no-restricted-syntax': ['error', ...RETURN_AWAITED_IN_TRY],
    },
  },
  {
    files: ['app/**/*.{ts,vue}'],
    ignores: ['app/plugins/api.ts', 'app/composables/useApi.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...APP_FETCHER_SELECTORS, BUILDER_PAGE_AWAITED, ...LOCALIZED_NAVIGATION, GATE_WITH_ENABLED],
    },
  },
  {
    // Repeats the app-wide selectors — see APP_FETCHER_SELECTORS for why.
    files: ['app/components/**/*.vue'],
    rules: {
      'no-restricted-syntax': ['error', ...APP_FETCHER_SELECTORS, BUILDER_PAGE_AWAITED, NO_PAGE_MACROS, ...LOCALIZED_NAVIGATION, GATE_WITH_ENABLED],
    },
  },
  {
    // The webside tree keeps its own navigation and its own
    // request gates: webside serves Greek only, and the tree changes only
    // for webside bugs. It does NOT have every gated feature on (reviews,
    // promotions, loyalty and gift cards were off on 2026-10-17); its
    // gated fetches are safe only because none has a reactive trigger, so
    // a reactive query added to one must gate with `enabled` by hand.
    files: ['app/components/variants/webside/**/*.vue'],
    rules: {
      'no-restricted-syntax': ['error', ...APP_FETCHER_SELECTORS, BUILDER_PAGE_AWAITED, NO_PAGE_MACROS],
    },
  },
  {
    // Reka's `useForwardExpose` checks that `$el` exists as a KEY, never
    // that it is non-null; a `Lazy*` component renders nothing until its
    // chunk arrives, so `$el` is null in that window and it throws
    // "Cannot read properties of null (reading 'nodeName')". Measured on
    // staging 2026-09-21: `/account/sessions` threw it once per table
    // row and hydrated with mismatches. The lazy wrapper bought nothing —
    // `Page/Navbar.vue` renders `UDropdownMenu` eagerly on every page.
    files: ['app/**/*.vue'],
    rules: {
      'vue/no-restricted-html-elements': ['error', {
        element: ['LazyUDropdownMenu', 'lazy-u-dropdown-menu'],
        message: 'Use <UDropdownMenu>: Reka\'s useForwardExpose throws on the null $el of a lazy component.',
      }],
    },
  },
  {
    rules: {
      ...eslintPluginBetterTailwindcss.configs['recommended-warn'].rules,
      'better-tailwindcss/no-unknown-classes': ['warn', {
        detectComponentClasses: true,
        ignore: [
          'article',
          // NuxtUI
          'text-elevated*',
          'bg-elevated*',
          'border-elevated*',
          'ring-elevated*',
          'text-default*',
          'bg-default*',
          'border-default*',
          'ring-default*',
          'text-primary*',
          'bg-primary*',
          'border-primary*',
          'ring-primary*',
          'text-secondary*',
          'bg-secondary*',
          'border-secondary*',
          'ring-secondary*',
        ],
      }],
      'nuxt/prefer-import-meta': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/no-v-html': 'off',
      'vue/no-watch-after-await': 'warn',
      'vue/no-lifecycle-after-await': 'warn',
      'vue/attribute-hyphenation': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      // An empty interface extending ONE type is how a module augmentation
      // adds a supertype (`interface H3EventContext extends RequestEventContext {}`,
      // `interface User extends UserDetails {}`); anything else stays an error.
      '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
      'no-console': 'error',
    },
  },
  {
    // Tests are code. Until 2026-09-30 `test/` sat in the global ignores,
    // and nothing flagged 26 spec files that asserted on their own
    // literals, a stale import of a deleted function, or unused imports.
    // The vitest plugin's recommended set catches the test-shaped
    // mistakes (focused/disabled tests, tests with no assertion,
    // conditional or standalone `expect`, identical titles); the rest keep
    // hooks where a reader looks for them.
    files: ['test/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      // Vitest runs only `*.spec.ts` (vitest.config.mts), so a
      // `*.test.ts` file is silently never run — that is how six such
      // files once went uncounted. Suite modules that a spec imports
      // (`test/e2e/pageRenders.ts`) match neither pattern and are fine.
      'vitest/consistent-test-filename': ['error', {
        pattern: String.raw`.*\.spec\.ts$`,
        allTestPattern: String.raw`.*\.(test|spec)\.[cm]?[jt]sx?$`,
      }],
      'vitest/prefer-hooks-on-top': 'error',
      'vitest/no-duplicate-hooks': 'error',
      // Vitest's signature is `expect(actual, message?)`; the rule's
      // default of one argument only lets a LITERAL message through, and
      // flags a computed one (`expect(x, \`${slot} …\`)` passes, a
      // concatenated or variable message does not) — the same valid API.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
      // An assertion helper is named `expect…` (`expectLastQuery`,
      // `expectSnapshot`, `expectFailure`): the test that calls one does
      // assert, and a helper that asserts is findable by its name.
      'vitest/expect-expect': ['error', { assertFunctionNames: ['expect', 'expect*'] }],
    },
  },
  {
    // A CLI script REPORTS to stdout — that is what it is for, so
    // `no-console` there only buys a disable comment per line (the
    // two older scripts each carry several). Scoped to `scripts/`, so
    // nothing shipped to a browser is covered.
    files: ['scripts/**/*.{js,mjs,ts}'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: 'app/assets/css/main.css',
        variables: [],
        attributes: [
          ['^v-bind:ui$', [
            { match: 'objectValues' },
          ]],
          ['^(?:v-bind:)?(activeClass|inactiveClass)$', [
            { match: 'strings' },
            { match: 'objectKeys' },
            { match: 'objectValues' },
          ]],
        ],
      },
    },
  },
)
