/**
 * Rebase absolute URLs in `useLocaleHead()` output onto the tenant's
 * own origin.
 *
 * @nuxtjs/i18n builds canonical/hreflang/og:url from its `baseUrl`,
 * which is inherently PLATFORM-static: a function option does not
 * survive the module's runtimeConfig JSON serialization (verified in
 * 10.6 — and deprecated for v11), and an empty value degrades the tags
 * to relative links plus a per-request warning. Left as-is, every
 * non-platform tenant's pages carried the PLATFORM host in canonical,
 * hreflang, and og:url (observed live on staging tenant #2 — a
 * duplicate-content/cross-brand SEO leak).
 *
 * Only URLs that start with the configured platform origin are
 * rewritten; everything else (relative hrefs, third-party URLs) passes
 * through untouched.
 */

import { languageOfLocaleTag } from '~~/shared/i18n/localeTag'

interface LocaleHeadLink {
  [key: string]: unknown
  href?: string
  rel?: string
  hreflang?: string
}
interface LocaleHeadMeta {
  [key: string]: unknown
  content?: string
  property?: string
}

function swapOrigin(
  value: string | undefined,
  fromOrigin: string,
  toOrigin: string,
): string | undefined {
  if (!value || !value.startsWith(fromOrigin)) return value
  const rest = value.slice(fromOrigin.length)
  // Guard against prefix-only matches (https://a.com vs https://a.company)
  if (rest && rest[0] !== '/' && rest[0] !== '?' && rest[0] !== '#') {
    return value
  }
  return `${toOrigin}${rest}`
}

export function rebaseLocaleHeadOrigins<T extends object>(
  head: T,
  fromOrigin: string,
  toOrigin: string,
): T {
  const from = fromOrigin.replace(/\/+$/, '')
  const to = toOrigin.replace(/\/+$/, '')
  if (!from || !to || from === to) return head
  const { link, meta } = head as {
    link?: LocaleHeadLink[]
    meta?: LocaleHeadMeta[]
  }
  return {
    ...head,
    link: link?.map(l => ({ ...l, href: swapOrigin(l.href, from, to) })),
    meta: meta?.map(m => ({
      ...m,
      content:
        typeof m.content === 'string'
          ? swapOrigin(m.content, from, to)
          : m.content,
    })),
  }
}

/**
 * Drop the locale alternates a tenant does not serve.
 *
 * `useLocaleHead` builds the `hreflang` links and `og:locale:alternate`
 * from the BUILD-time locale list, which is platform-wide, whereas
 * locale availability is PER TENANT (`Tenant.available_locales`):
 * `app/middleware/locale-available.global.ts` answers 404 for a prefix
 * the tenant does not list. Left as-is, every Greek-only store
 * advertised `/en/**` to crawlers (Ahrefs 2026-09-11: 119 "404 page"
 * and 109 "hreflang to broken page", every one of them `/en/`).
 *
 * Same decisions as the sitemap gate in
 * server/plugins/sitemap-tenant-gate.ts: an alternate for an unserved
 * locale is dropped, and a single-language tenant emits NO alternates
 * at all — `hreflang` on a lone self-referential URL is noise.
 * Canonical, og:url and og:locale pass through untouched. Filtered on
 * what the tag CLAIMS (`hreflang` / `content`), never on the href's
 * path prefix.
 *
 * An empty list means the tenant has not resolved; fail open, as the
 * middleware does, rather than strip a bilingual store's alternates.
 */
export function gateLocaleHeadByTenant<T extends object>(
  head: T,
  allowedLocales: readonly string[],
): T {
  if (allowedLocales.length === 0) return head
  const multilingual = allowedLocales.length > 1
  const serves = (tag: string | undefined) =>
    multilingual && allowedLocales.includes(languageOfLocaleTag(tag))
  const { link, meta } = head as {
    link?: LocaleHeadLink[]
    meta?: LocaleHeadMeta[]
  }
  return {
    ...head,
    link: link?.filter(
      l => !(l.rel === 'alternate' && l.hreflang) || serves(l.hreflang),
    ),
    meta: meta?.filter(
      m => m.property !== 'og:locale:alternate' || serves(m.content),
    ),
  }
}
