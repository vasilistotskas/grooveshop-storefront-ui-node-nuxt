/**
 * Reading helpers for the announcement bar Django serves typed on
 * `GET /settings/public` (`AnnouncementBar`, generated). Django validates
 * the setting when it is written, so the storefront parses nothing.
 *
 * `text` carries the DEFAULT locale's wording and `i18n` overrides it per
 * locale. `shortText` is the phone's copy and `code` a promo code set
 * apart from the sentence; the code is the same string in every language,
 * so it is not a per-locale key.
 */

/** The wording for `locale`, falling back to the default one's. */
export function announcementText(
  bar: AnnouncementBar,
  locale: string,
): string {
  return bar.i18n?.[locale]?.text || bar.text
}

/**
 * The phone's wording for `locale`, or `''` when the bar has none.
 * A locale that has an override never borrows the default locale's
 * `shortText`: that is another language, so the phone shows the
 * locale's full `text` instead.
 */
export function announcementShortText(
  bar: AnnouncementBar,
  locale: string,
): string {
  const override = bar.i18n?.[locale]
  return (override ? override.shortText : bar.shortText) || ''
}

/**
 * The sentence split at its lead: the phone's wording, when the full one
 * opens with it ("Free shipping over 39,90 € · Orders by 15:00 leave the
 * same day" over "Free shipping over 39,90 €"). `null` when it does not,
 * or when the two are the same.
 */
export function announcementLead(text: string, shortText: string): { text: string, rest: string } | null {
  if (!shortText || text === shortText || !text.startsWith(shortText)) return null
  return { text: shortText, rest: text.slice(shortText.length) }
}

/**
 * The live figures a bar's wording may name as `{token}`. A merchant who
 * types "Free shipping over 39,90 €" keeps a second copy of a number that
 * lives in the shipping settings, and it goes stale the day that changes;
 * the token is read from the setting each time the bar is drawn.
 *
 * - `freeShippingThreshold`: the lowest free-shipping threshold, as money.
 * - `dispatchCutoff`: the dispatch cutoff, as `HH:MM`.
 *
 * Any other `{word}` is the merchant's own text and stays as typed.
 */
export const ANNOUNCEMENT_TOKENS = ['freeShippingThreshold', 'dispatchCutoff'] as const

export type AnnouncementToken = (typeof ANNOUNCEMENT_TOKENS)[number]

/** The tokens that have a value right now; one without a value is absent. */
export type AnnouncementTokenValues = Partial<Record<AnnouncementToken, string>>

const TOKEN_PATTERN = /\{(\w+)\}/g

const isAnnouncementToken = (name: string): name is AnnouncementToken =>
  (ANNOUNCEMENT_TOKENS as readonly string[]).includes(name)

/** Every wording of the bar, in every language: what decides which figures a store's bar needs at all. */
export function announcementTexts(bar: AnnouncementBar): string[] {
  return [
    bar.text,
    bar.shortText,
    ...Object.values(bar.i18n ?? {}).flatMap(override => [override.text, override.shortText]),
  ].filter((text): text is string => Boolean(text))
}

/** The tokens `texts` name, each once. */
export function announcementTokens(texts: readonly string[]): AnnouncementToken[] {
  const named = texts.flatMap(text => [...text.matchAll(TOKEN_PATTERN)].map(match => match[1]!))
  return [...new Set(named.filter(isAnnouncementToken))]
}

/** The tokens `texts` name that `values` has no value for: a bar that names one is not shown. */
export function missingAnnouncementTokens(texts: readonly string[], values: AnnouncementTokenValues): AnnouncementToken[] {
  return announcementTokens(texts).filter(token => values[token] === undefined)
}

/** `text` with each token that has a value replaced by it; every other `{word}` stays as typed. */
export function fillAnnouncementTokens(text: string, values: AnnouncementTokenValues): string {
  return text.replace(TOKEN_PATTERN, (whole, name: string) =>
    isAnnouncementToken(name) ? (values[name] ?? whole) : whole)
}
