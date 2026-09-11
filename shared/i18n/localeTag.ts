import { DEFAULT_LOCALE } from '../../i18n/locales'

/**
 * The language a locale tag names, in the two-letter form
 * `SUPPORTED_LOCALES` / `Tenant.available_locales` use.
 *
 * Accepts every shape the head and the sitemap emit — an `hreflang`
 * (`en`, `en-US`, `x-default`) and an Open Graph locale (`en_US`).
 * `x-default` resolves to the default locale: it points at the
 * default-locale URL, which every tenant serves.
 *
 * Shared by the head gate (app/utils/seoHead.ts) and the sitemap gate
 * (server/plugins/sitemap-tenant-gate.ts) so the two cannot disagree
 * on what a tag claims to be.
 */
export function languageOfLocaleTag(tag: string | undefined): string {
  const normalized = (tag ?? '').trim().toLowerCase()
  if (!normalized || normalized === 'x-default') return DEFAULT_LOCALE
  return normalized.split(/[-_]/)[0] || DEFAULT_LOCALE
}
