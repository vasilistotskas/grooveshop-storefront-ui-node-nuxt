---
paths:
  - "nuxt.config.ts"
  - "modules/**"
---

# Nuxt modules

The modules in `nuxt.config.ts` and the custom local modules in `modules/`.

Active modules in `nuxt.config.ts` (the `modules` array, in order):
1. `evlog/nuxt` — Structured logging (`log` auto-import on client + Nitro; see Structured Logging)
2. `@comark/nuxt` — Markdown rendering (used by blog/CMS content)
3. `@nuxt/image` — Image optimization with IPX + custom mediaStream provider
4. `@nuxt/ui` — Component library (v4, with experimental component detection)
5. `@nuxt/eslint` — ESLint integration with checker enabled
6. `@nuxt/scripts` — Third-party script management (Stripe registry)
7. `@nuxt/fonts` — Font optimization
8. `@nuxt/icon` — Icon system (server bundle: icon JSON inlined for the installed collections; client bundle: scanned, with a hard size limit — see `icon` in `nuxt.config.ts`)
9. `@nuxtjs/i18n` — Internationalization (typed pages; `detectBrowserLanguage: false`, so no browser or cookie detection: `/` serves the tenant's default locale and a visitor changes language with the switcher, see `test/unit/source-rules/no-browser-detection.spec.ts`)
10. `@nuxtjs/leaflet` — Leaflet maps (locker/pickup-point selection)
11. `@nuxtjs/seo` — SEO suite: robots, sitemap, OG image (disabled), Schema.org, link checker, SEO utils, site config, and **AI Ready**, which it installs (`nuxt-ai-ready` is no longer a module or dependency of ours). AI Ready serves `/llms.txt`, `/llms-full.txt` and on-demand `/<route>.md` under the `aiReady` key: `database: false` (no page store, so no `drizzle-orm`), `contentNegotiation: false` (`server/middleware/0.markdown-negotiation.ts` does the `Accept: text/markdown` negotiation, which the module's cannot do on our cached routes), `autoI18n: false`, `agentSkills: false`, and `runtimeSync`/`cron` off. `skewProtection: false` turns off the other module it installs. `robots` is configured explicitly in `nuxt.config.ts`.
12. `@pinia/nuxt` — Pinia state management
13. `@vueuse/nuxt` — VueUse composables (device detection via `useMediaQuery` with UA-based SSR width)
14. `nuxt-auth-utils` — Session management

Conditionally pushed (NOT active in production):
- `@nuxt/test-utils/module` — only when `NODE_ENV === 'test'`
- `@nuxt/a11y` — only when `NODE_ENV === 'development'` (accessibility auditing, alpha)

Custom local modules:
- `modules/cookies.ts` — Cookie consent (GDPR categories: necessary, functionality, ad, analytics, personalization, security)
- `modules/purge-comments.ts` — Removes HTML comments in production
- `modules/font-stacks.ts` — Compiles each selectable font stack into the global CSS as `--font-stack-<key>`, where `@nuxt/fonts` adds its metric-matched fallback faces; tenant tokens point at it (`fontStackValue`), and `server/plugins/tenant-fonts.ts` drops the `@font-face` rules of every family the store does not set
- `modules/text-catalogue/` — Extracts every editable text (each `<i18n lang="yaml">` block of `app/**` as namespace `components/...`, the global locale files as `global`) with its per-locale defaults, placeholders (`shared/utils/messageShape.ts`) and lock (`shared/constants/lockedTexts.ts`) on every build and dev start, into the Nitro virtual module `#text-catalogue` (server bundle only, never the client). `GET /api/texts/catalogue` serves it and `POST /api/texts/validate` checks a store-written text against it for Django's text editor; both are public and tenant-free (bypassed in `0.tenant.ts`). **A store sees only the texts its own storefront renders:** `reachability.ts` reads the roots from `app/utils/variantRegistry.ts` / `componentRegistry.ts` (`page:<key>@<schema>`, `chrome:<slot>@<schema>`, design layouts, `<type>@<schema>` sections; the redesign-only pages and design layouts leave a store with its own design) and walks every component reference from them (template tags, `resolveComponent`, `.vue` imports, Nuxt's naming from the `components` option, so the `Webside` prefix) into one view per schema plus `default`; both routes take an optional `schema`, and a tag, `resolveComponent` name or registry entry the walk cannot place fails the build. The global locale file lists live in `i18n/locales.ts` (`LOCALE_FILES`), which `nuxt.config.ts` and the module share
