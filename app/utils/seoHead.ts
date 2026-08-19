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

interface LocaleHeadLink {
  [key: string]: unknown
  href?: string
}
interface LocaleHeadMeta {
  [key: string]: unknown
  content?: string
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
