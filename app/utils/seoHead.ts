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

/**
 * The length band a meta description has to land in to be useful.
 *
 * Below ~110 characters every site-audit tool — Ahrefs, Sitebulb,
 * MetricSpot — reports "meta description too short", and the snippet
 * wastes the space Google gives it. Above ~160 the tail is truncated
 * away, so 155 leaves room for the ellipsis inside the budget.
 */
export const META_DESCRIPTION_MIN_LENGTH = 110
export const META_DESCRIPTION_MAX_LENGTH = 155

const SENTENCE_END_RE = /[.!?;:·…]$/

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text

  // -1 leaves room for the ellipsis, so the result never exceeds `max`.
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  // A single word longer than the budget has no boundary to fall back
  // on; a hard cut beats returning nothing.
  const body = lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return `${body.replace(/[\s,;:·—–-]+$/, '')}…`
}

/**
 * Build a meta description from the page's own copy, in priority order.
 *
 * The lead fragment is used alone when it already fills the band; a
 * short one is EXTENDED with what follows rather than replaced, so
 * hand-written copy is never thrown away. Fragments are joined as
 * sentences — a lead that does not end in punctuation gets a full stop,
 * which is what keeps the result reading as prose instead of two
 * clauses run together.
 *
 * Returns `undefined`, never '', when there is nothing to say: an empty
 * `content` attribute is worse than no tag, because it stops Google
 * falling back to a generated snippet.
 */
export function composeMetaDescription(
  parts: readonly (string | null | undefined)[],
  options: { min?: number, max?: number } = {},
): string | undefined {
  const min = options.min ?? META_DESCRIPTION_MIN_LENGTH
  const max = options.max ?? META_DESCRIPTION_MAX_LENGTH

  const fragments = parts
    .map(part => part?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)

  const lead = fragments[0]
  if (!lead) return undefined
  if (lead.length >= min) return truncateAtWord(lead, max)

  const text = fragments.reduce((acc, fragment) =>
    SENTENCE_END_RE.test(acc) ? `${acc} ${fragment}` : `${acc}. ${fragment}`,
  )
  return truncateAtWord(text, max)
}
