[![CI](https://github.com/vasilistotskas/grooveshop-storefront-ui-node-nuxt/actions/workflows/ci.yml/badge.svg)](https://github.com/vasilistotskas/grooveshop-storefront-ui-node-nuxt/actions/workflows/ci.yml)

# GrooveShop Nuxt Storefront

A full-featured **Nuxt 4 SSR e-commerce storefront** built with Vue 3 Composition API, TypeScript, and Tailwind CSS 4. Communicates with a Django REST API backend via a Nitro proxy server.

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | [Nuxt 4](https://nuxt.com/) (SSR) |
| **UI** | [Vue 3](https://vuejs.org/) Composition API, [`@nuxt/ui`](https://ui.nuxt.com/) v4, [Tailwind CSS 4](https://tailwindcss.com/) |
| **State** | [Pinia](https://pinia.vuejs.org/) |
| **i18n** | [`@nuxtjs/i18n`](https://i18n.nuxtjs.org/) (Greek) |
| **Auth** | [django-allauth](https://docs.allauth.org/) headless + `nuxt-auth-utils` |
| **Payments** | [Stripe](https://stripe.com/) |
| **Search** | [Meilisearch](https://www.meilisearch.com/) |
| **Testing** | [Vitest](https://vitest.dev/) + `@nuxt/test-utils` |
| **Package Manager** | [pnpm](https://pnpm.io/) v10 |
| **Runtime** | Node.js 24 |

## Features

- **Server-Side Rendering** with hydration and build caching
- **Product Catalog** with categories, advanced filters (price range, attributes, popularity, view count), and instant search
- **Shopping Cart** with stock validation and real-time availability checks
- **Checkout** with Stripe payments and stock reservation
- **Blog** with posts, categories, tags, comments (with likes), and view tracking
- **Authentication** — Email/password, code-based login, OAuth (Google, Facebook, GitHub, Discord), WebAuthn/passkeys, 2FA (TOTP, recovery codes)
- **User Dashboard** — Orders, addresses, favourites (products + posts), reviews, email/password management, session management, provider linking, subscriptions, settings
- **Loyalty Program** — Points, tiers, transactions, redemption
- **Real-time Notifications** via Django WebSocket
- **SEO** — Sitemap, Schema.org, OG images, canonical URLs, RSS feed
- **Accessibility** — `@nuxt/a11y`, reduced-motion support, keyboard navigation
- **GDPR Cookie Consent** with granular category control
- **Cloudflare Turnstile** bot protection
- **Internationalization** — Greek with typed routes (English and German translations available but inactive)
- **Image Optimization** — IPX for local images (AVIF, WebP), custom media stream provider for product images
- **Dark Mode** with system preference detection

## Project Structure

```
├── app/                  # Client-side (Nuxt 4 convention)
│   ├── pages/            # File-based routing (67 routes)
│   ├── components/       # Vue components (140+)
│   ├── composables/      # Vue composables (33)
│   ├── stores/           # Pinia stores (auth, cart, user, notifications, app)
│   ├── plugins/          # Nuxt plugins (auth, setup, websocket)
│   ├── middleware/        # Route middleware (auth, guest, transitions, loyalty)
│   ├── layouts/          # Layouts (default, user, auth)
│   ├── utils/            # Client utilities
│   ├── providers/        # Custom image providers
│   └── assets/           # CSS, images, Lottie animations
├── server/               # Nitro server
│   ├── api/              # API proxy routes to Django backend
│   ├── middleware/        # Locale detection, logging, redirects
│   ├── plugins/          # HTTP agent pooling, cache storage
│   ├── routes/           # OAuth callbacks, RSS feed, sitemap
│   └── utils/            # Auth, parsing, error handling, cart session
├── shared/               # Auto-imported in app + server
│   ├── types/            # Hand-written TypeScript types
│   ├── schemas/          # Zod validation schemas
│   ├── openapi/          # Auto-generated types from Django schema
│   ├── constants/        # Shared constants
│   └── utils/            # Shared utilities
├── modules/              # Custom Nuxt modules (cookies, purge-comments)
├── runtime/              # Cookie control module runtime
├── i18n/                 # Locale config and translation files
├── test/                 # Vitest tests (unit, nuxt, e2e)
├── docker/               # Dockerfile (multi-stage, Node 24 Alpine)
└── openapi/              # OpenAPI schema files
```

## Setup

### Prerequisites

- Node.js 24.x
- pnpm 10.x (`corepack enable`)
- Docker (optional, for containerization)
- Django backend running (see [grooveshop-django-api](https://github.com/vasilistotskas/grooveshop-django-api))

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
# Edit .env with your configuration

# Prepare Nuxt types
pnpm prepare

# Start dev server
pnpm dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Lint with auto-fix |
| `pnpm test` | Run all tests |
| `pnpm test:ci` | Run unit + nuxt tests with coverage |
| `pnpm openapi-ts` | Generate types from OpenAPI schema |
| `pnpm prepare` | Prepare Nuxt types |

### Docker

```bash
# Build
docker build -f docker/Dockerfile .

# Or use Docker Compose
docker compose up
```

## Architecture

The Nuxt server acts as a **proxy** between the Vue frontend and the Django REST API. Client-side code calls `/api/...` routes on the Nuxt server, which forwards requests to Django with appropriate auth headers, caching, and Zod validation.

```
Browser  →  Nuxt SSR / Client  →  Nitro Server (/api/*)  →  Django REST API
                                        ↕
                                   Redis Cache
```

### Key Patterns

- **API routes**: Validate with Zod → `$fetch` to Django → `parseDataAs` response → `handleError`
- **Caching**: Redis with memory fallback, SWR for API data, immutable caching for static assets
- **Auth**: django-allauth headless API proxied through Nuxt, session cookies via `nuxt-auth-utils`, OAuth tokens stored in encrypted server session
- **Image handling**: Dual provider — IPX for local, custom mediaStream for product images
- **State**: Pinia stores for client state, server sessions for auth/cart

## CI/CD

GitHub Actions pipeline: **quality** (TypeScript check) → **test** (unit + nuxt with coverage) → **build** (with Redis service) → **release** (semantic-release on main).

Docker images published to Docker Hub and GHCR on release.

## License

This project is open-sourced under the MIT License. See the [LICENSE](LICENSE.md) file for more details.
