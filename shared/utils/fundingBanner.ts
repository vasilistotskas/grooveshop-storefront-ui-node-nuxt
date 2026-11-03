/**
 * Reading helper for the EU co-funding strip Django serves typed on
 * `GET /settings/public` (`FundingBanner`, generated).
 *
 * `i18n` is a PARTIAL per-locale override: a locale may replace the
 * artwork (the programme publishes the strip per language), always with
 * its own size and alt, and the words. `link` and `enabled` are one value
 * for every language; the strip puts the locale prefix on the path.
 * Readers go through `localizedFundingBanner`, never the raw overlay.
 */

/** The banner one locale renders: the overlay is already applied. */
export type LocalizedFundingBanner = Omit<FundingBanner, 'i18n'>

/**
 * The banner as `locale` renders it: that locale's override laid over
 * the default, artwork and size together, and the overlay itself gone.
 */
export function localizedFundingBanner(
  banner: FundingBanner,
  locale: string,
): LocalizedFundingBanner {
  const { i18n, ...base } = banner
  const override = i18n?.[locale]
  if (!override) return base
  const text = {
    ...(override.alt !== undefined && { alt: override.alt }),
    ...(override.label !== undefined && { label: override.label }),
  }
  return override.image === undefined
    ? { ...base, ...text }
    : { ...base, ...text, image: override.image, width: override.width, height: override.height }
}
