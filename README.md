[![CI](https://github.com/vasilistotskas/grooveshop-storefront-ui-node-nuxt/actions/workflows/ci.yml/badge.svg)](https://github.com/vasilistotskas/grooveshop-storefront-ui-node-nuxt/actions/workflows/ci.yml)

# GrooveShop Storefront (Nuxt)

The customer-facing storefront of GrooveShop: a multi-tenant, server-rendered Nuxt 4 application.

GrooveShop is a multi-tenant e-commerce platform. This storefront serves every
store on that store's own domain: it resolves the tenant from the request host,
renders the store's branding, languages, features and design from the
[Django API](https://github.com/vasilistotskas/grooveshop-django-api)'s tenant
payload, and proxies every data call to that API through its own Nitro server.
Product images come straight from the
[media stream](https://github.com/vasilistotskas/grooveshop-media-stream), and the
storefront chat talks to the
[agent gateway](https://github.com/vasilistotskas/grooveshop-agent-gateway).
How the services fit together:
[platform architecture](https://docs.grooveshop.space/dev/platform/architecture)
(developer docs, behind basic auth).

Live demo store: <https://demo.grooveshop.space>

## Features

- **Multi-tenant SSR**: one build serves every store. Anonymous pages are
  cached in Redis per store, per language and per device class; Django's
  admin purges them through `/api/admin/cache/purge`.
- **Per-store designs**: a store can have its own templates (markup, layout,
  styling) on top of the default design. Webside (tenant #1) has a full
  design of its own under `app/components/variants/webside/`. Every feature
  and fix reaches every design.
- **Page builder rendering**: home, brand, content and listing pages and the
  header, mobile and footer menus render from the store's published page
  builder documents (Django `builder` app). The block catalogue is owned
  here: one definition per block in `app/blocks/*.block.ts`.
- **Catalogue**: categories, filters, search (served by Django's Meilisearch
  index), product pages with variants, reviews, stock alerts, offers and
  recommendations.
- **Cart and checkout**: stock reservation, Viva Wallet, Stripe and cash on
  delivery, shipping with a locker map, coupons and gift cards, B2B pricing.
- **Accounts**: email and password, sign-in codes, social sign-in (Google and
  Facebook handled here, GitHub and Discord through Django's allauth),
  passkeys and WebAuthn, TOTP and recovery codes, sessions, addresses,
  orders, favourites, reviews, loyalty points and tiers.
- **Blog**: posts, categories, tags, comments and likes.
- **Real-time notifications** over Django's WebSocket, and a shopping chat
  backed by the agent gateway.
- **i18n**: Greek (default) and English routes are built for every store;
  which ones a store serves is per tenant (`Tenant.available_locales`), and
  store owners can edit the storefront's texts.
- **SEO**: per-store sitemap, Schema.org, canonical URLs, RSS feed and web
  app manifest.
- **GDPR cookie consent** gating analytics and marketing pixels (Google
  Analytics, Meta, TikTok), all configured per store.
- **Dark mode** following the system preference.

## Tech stack

- [Nuxt 4](https://nuxt.com/) (SSR, Nitro server), Vue 3 `<script setup>` with
  TypeScript; the Options API is disabled
- [Nuxt UI v4](https://ui.nuxt.com/) with Tailwind CSS
- [Pinia](https://pinia.vuejs.org/) for client state
- [Zod 4](https://zod.dev/) schemas and TypeScript types generated from the
  Django OpenAPI schema with [`@hey-api/openapi-ts`](https://heyapi.dev/)
- [`@nuxtjs/i18n`](https://i18n.nuxtjs.org/), [`@nuxtjs/seo`](https://nuxtseo.com/),
  `@nuxt/image` (with a custom media stream provider), `@nuxt/scripts`
- `nuxt-auth-utils` sealed sessions over django-allauth headless
- Redis for the Nitro cache, evlog for structured logs
- [Vitest](https://vitest.dev/) with `@nuxt/test-utils`
- [pnpm](https://pnpm.io/), version pinned by `packageManager` in `package.json`

## Getting started

### Prerequisites

- Node.js at the major pinned in `docker/Dockerfile` and `.github/workflows/ci.yml`
- pnpm through `corepack enable`
- Redis, or `NUXT_CACHE_BASE=memory`
- A running [Django API](https://github.com/vasilistotskas/grooveshop-django-api)
  with a tenant whose domain matches the host you browse the storefront on;
  the storefront renders nothing without a resolved store

### Install and run

```bash
pnpm install
cp .env.example .env   # then edit it
pnpm dev               # http://localhost:3000
```

`pnpm install` runs `pnpm prepare` (a dependency lockstep check, then
`nuxt prepare`). The environment variables are explained in `.env.example`
and in [CLAUDE.md](CLAUDE.md#environment). Analytics ids, pixel ids, the
Stripe key and social links are per-store data on the tenant, never
environment variables.

## Common commands

| Command | What it does |
|---|---|
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build (`.output/`) |
| `pnpm typecheck` | `nuxt typecheck`, the type gate (stricter than `vue-tsc`) |
| `pnpm lint:ci` | ESLint without fixing, as CI runs it |
| `pnpm lint` | ESLint with `--fix` |
| `pnpm test` | All Vitest projects |
| `pnpm test:ci` | Unit and Nuxt projects with coverage, as CI runs them |
| `pnpm vitest run test/unit/app/utils/str.spec.ts` | One test file |
| `pnpm generate:schema` | Fetch the OpenAPI schema from Django (`NUXT_DJANGO_URL`) into `openapi/schema.json` |
| `pnpm openapi-ts` | Generate the types and Zod schemas in `shared/openapi/` |
| `pnpm sync:schema` | Regenerate the derived `.yml` files; required after `openapi-ts`, CI fails on a diff |

Regenerate the API contract against a local backend:
`pnpm generate:schema && pnpm openapi-ts && pnpm sync:schema`.

## Project layout

```
app/        Vue app: pages (thin shells), components (Storefront/ bodies,
            variants/<store>/ designs), blocks/ (page builder catalogue),
            composables, stores, plugins, middleware, layouts
server/     Nitro: /api proxy routes to Django, middleware (tenant, locale,
            CSP), OAuth and checkout return routes, RSS, manifest
shared/     Auto-imported in app and server: types, Zod schemas, utils,
            generated OpenAPI code
modules/    Local Nuxt modules (cookie consent, builder blocks, text
            catalogue, font stacks, comment purge)
i18n/       Locale config and translation files (el, en)
test/       Vitest projects: unit, nuxt, e2e
docker/     Production Dockerfile and a compose file for the published image
scripts/    Schema fetch and sync, SSR capture and diff, post-deploy cache warm-up
```

[CLAUDE.md](CLAUDE.md) and `.claude/rules/` hold the detailed conventions:
the Django proxy contract, tenant resolution, auth, UI and designs, testing,
modules, and CI.

## Deployment and release

- CI (`.github/workflows/ci.yml`) runs Trivy, typecheck and lint, unit and
  Nuxt tests, the e2e regression tests, a production build and an OpenAPI
  schema freshness check on every pull request and on each push to `main`.
  A push whose tree its pull request already tested runs only Trivy before
  the release, plus the build when `main` has no fonts cache for that tree.
- A push to `main` releases with semantic-release from Conventional Commits:
  version, `CHANGELOG.md` and a GitHub Release. Nothing is published to npm.
- A published release builds the Docker image (`docker.yml`) and pushes it to
  Docker Hub (`gro0ve/grooveshop-storefront-ui-node-nuxt`) and GHCR.
- Production and staging run on Kubernetes through Argo CD. The image tag is
  pinned in grooveshop-infrastructure (private), which deploys it and runs the post-deploy cache warm-up.

To run the published image locally: `docker compose -f docker/compose.yaml up`
(reads `.env` from the repository root). To build it:
`docker build -f docker/Dockerfile .`.

## Documentation

- [Storefront developer docs](https://docs.grooveshop.space/dev/nuxt/) (behind basic auth)
- [Platform architecture](https://docs.grooveshop.space/dev/platform/architecture) (behind basic auth)
- [Store admin guide](https://docs.grooveshop.space/) (public, Greek and English)
- [CLAUDE.md](CLAUDE.md) and `.claude/rules/` in this repository

## Related repositories

- [grooveshop-django-api](https://github.com/vasilistotskas/grooveshop-django-api): Django REST API, admin, and background jobs; the platform's source of truth
- [grooveshop-media-stream](https://github.com/vasilistotskas/grooveshop-media-stream): NestJS image processing and caching service
- [grooveshop-agent-gateway](https://github.com/vasilistotskas/grooveshop-agent-gateway): Go gateway for AI agents (MCP, UCP, ACP), catalogue feeds and the storefront chat
- grooveshop-infrastructure (private): Kubernetes manifests deployed by Argo CD
- [grooveshop-docs](https://github.com/vasilistotskas/grooveshop-docs): the documentation site at docs.grooveshop.space

## Licence

Source-available under the [PolyForm Strict License 1.0.0](LICENSE.md): you may use it for noncommercial purposes; you may not distribute it or make changes or new works based on it. Commercial use needs a separate licence from the author.
