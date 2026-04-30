---
name: nuxt-ai-ready-skilld
description: "Best practice AI & LLM discoverability for Nuxt sites. ALWAYS use when writing code importing \"nuxt-ai-ready\". Consult for debugging, best practices, or modifying nuxt-ai-ready, nuxt ai ready."
metadata:
  version: 1.3.0
  generated_by: cached
  generated_at: 2026-04-30
---

# harlan-zw/nuxt-ai-ready `nuxt-ai-ready@1.3.0`
**Tags:** latest: 1.3.0

**References:** [package.json](./.skilld/pkg/package.json) • [Docs](./.skilld/docs/_INDEX.md) • [Issues](./.skilld/issues/_INDEX.md) • [Releases](./.skilld/releases/_INDEX.md)

## Search

Use `skilld search "query" -p nuxt-ai-ready` instead of grepping `.skilld/` directories. Run `skilld search --guide -p nuxt-ai-ready` for full syntax, filters, and operators.

<!-- skilld:api-changes -->
## API Changes

This section documents version-specific API changes — prioritize recent major/minor releases.

## Breaking Changes (v1.0.0 → v1.3.0)

- BREAKING: `mdreamOptions` shape — v1.0 changed from `{ preset?: 'minimal' }` to `MdreamOptions` with top-level flags like `{ minimal: true, clean: true }`. Old `preset` key silently ignored [source](./.skilld/releases/v1.0.0.md:L50-L59)

- BREAKING: Config key `cacheMaxAgeSeconds` renamed to `llmsTxtCacheSeconds` to clarify it controls only llms.txt caching [source](./.skilld/releases/v1.0.0.md:L62-L70)

- BREAKING: Type `BulkDocument` renamed to `PageDocument` — all imports must update [source](./.skilld/releases/v1.0.0.md:L72-L79)

- BREAKING: Nitro runtime hook `ai-ready:markdown` renamed to `ai-ready:page:markdown` to match build-time hook naming [source](./.skilld/releases/v1.0.0.md:L81-L90)

- BREAKING: `PageEntry.headings` and `PageIndexedContext.headings` changed from `string` (JSON-encoded) to `Array<Record<string, string>>` (already parsed). Remove all `JSON.parse()` calls on `.headings` [source](./.skilld/releases/v1.0.0.md:L92-L100)

- BREAKING: Endpoint auth mechanism — all `/__ai-ready/*` endpoints changed from `?secret=<token>` query parameter to `Authorization: Bearer <token>` header. This prevents secrets from leaking into logs and referrer headers. Update all fetch calls, curl commands, CI scripts, and cron jobs [source](./.skilld/releases/v1.0.0.md:L102-L119)

## New Features (v1.0.0 → v1.3.0)

- NEW: `autoI18n` config option (default `true`) — v1.3 auto-detects `@nuxtjs/i18n` and integrates locale data into llms.txt (adds "Available Languages" section), Link headers (`rel="alternate" hreflang="…"`), frontmatter (`locale` field), database indexing, and FTS5 tokenizer switching to `trigram` for CJK locales [source](./.skilld/docs/content/2.guides/8.i18n.md) and [source](./.skilld/releases/v1.3.0.md:L11)

- NEW: i18n integration composables and database locale support — v1.3 adds locale-aware page queries, sitemap locale variants, and friendly 404 alternate listings [source](./.skilld/docs/content/2.guides/8.i18n.md)

- NEW: @nuxt/content integration — v1.3 adds support for @nuxt/content with RFC-compliant Accept negotiation and redirect-to-.md behavior [source](./.skilld/releases/v1.3.0.md:L12)

- NEW: `llmsTxt.sections[].optional` field — v1.1+ allows marking custom llms.txt sections as optional per spec; optional sections appear under `## Optional` section [source](./.skilld/docs/content/3.api/5.config.md:L104-L112)

- NEW: Pagination support for MCP pages resource — v1.0 added pagination to MCP resource [source](./.skilld/releases/v1.0.0.md:L174)

- NEW: Optional sections in llms.txt — v1.0+ supports optional content sections that LLMs may skip with shorter context windows [source](./.skilld/releases/v1.0.0.md:L173)

## Dependency Updates (v1.0.0)

- **nuxt-site-config** v4: breaking changes in dependency
- **@nuxtjs/robots** v6: breaking changes in dependency
- **@nuxtjs/sitemap** v8: breaking changes in dependency

See their migration guides if you're upgrading from v0.x [source](./.skilld/releases/v1.0.0.md:L42-L48)

## Migration Assistance (v1.0.0)

v1.0 includes backward compatibility shims for deprecated patterns:

- `cacheMaxAgeSeconds` in nuxt.config.ts auto-maps to `llmsTxtCacheSeconds` with build warning
- `mdreamOptions.preset` triggers build warning explaining new shape
- `?secret=<token>` query auth still works on all `/__ai-ready/*` endpoints but logs deprecation warning per request

These compatibility shims will be removed in v2. Update config and endpoints at your earliest convenience [source](./.skilld/releases/v1.0.0.md:L121-L129)

**Also changed:** RFC-compliant content negotiation (v1.2+) · Vercel agent-readability frontmatter (v1.2) · Markdown cache vary by Accept headers (v1.0+)
<!-- /skilld:api-changes -->

<!-- skilld:best-practices -->
## Best Practices

- Use two-phase page discovery combining prerender crawl with sitemap fallback — prerendering captures pages with full metadata, while sitemap crawl catches SSR-only pages not prerendered [source](./content/2.guides/0.llms-txt.md#phase-1-prerender-crawl)

- Serve `@nuxt/content` source markdown directly instead of HTML→mdream conversion when possible — AST round-trip preserves semantic structure better than HTML parsing [source](./content/2.guides/1.markdown.md#why-source-markdown)

- Include `<link rel="alternate" type="text/markdown">` in prerendered HTML heads for CDN-friendly markdown discovery — content negotiation via `Accept` headers fails behind most CDNs due to URL-only caching [source](./content/2.guides/1.markdown.md#prerendered-routes-behind-a-cdn)

- Use the `ai-ready:page:markdown` hook to filter draft/private pages by setting `ctx.markdown = ''` — empty markdown excludes pages from llms-full.txt without errors [source](./content/2.guides/0.llms-txt.md#filter-or-modify-pages)

- Enable content signals only if AI training is intentional — disabled by default to prevent unintended model training [source](./content/2.guides/0.content-signals.md#enable)

- Sync external systems (vector databases, embeddings, search indexes) via the `ai-ready:page:indexed` hook, not manual webhooks — hook fires automatically when pages are indexed and carries full markdown [source](./content/3.nitro-api/2.nitro-hooks.md#ai-readypage-indexed)

- Stick with prerendering as the default source of truth — only enable `runtimeSync` for sites with frequently changing content that can't be prerendered [source](./content/2.guides/4.runtime-indexing.md#when-you-need-runtime-sync)

- Set `markdownCacheHeaders: { maxAge: 3600, swr: true }` for markdown endpoints — stale-while-revalidate pattern ensures fresh content while tolerating brief staleness [source](./content/3.api/5.config.md#markdowncacheheaders)

- Omit `autoI18n: false` unless deliberately disabling i18n integration — auto-detection adds hreflang headers, locale frontmatter, and FTS5 tokenizer switching for free [source](./content/3.api/5.config.md#autoi18n)

- Compress the SQLite database at build time for serverless deployments — module auto-creates dump at `__ai-ready/pages.dump` and restores on cold start [source](./content/2.guides/4.runtime-indexing.md#serverless-cold-starts)

- Use `force: true` in `indexPage()` to re-index regardless of TTL — default TTL checks prevent unnecessary updates, force overcomes the check for manual triggers [source](./content/3.nitro-api/2.nitro-hooks.md#manual-indexing-utils)

- Create custom mdream plugins via `ai-ready:mdreamConfig` hook for domain-specific HTML parsing — e.g., filter `.author-bio` on blog routes without touching global config [source](./content/2.guides/1.markdown.md#modify-markdown-conversion)

- Test MCP tools with a production build (`nuxi generate`) — dev mode has empty data; MCP returns data from prerendered SQLite database [source](./content/2.guides/3.mcp.md#data-availability)
<!-- /skilld:best-practices -->
