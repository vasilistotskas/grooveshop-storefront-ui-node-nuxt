/** Elements that show something with no text around them. */
const EMBEDDED_MEDIA = /<(?:img|picture|video|audio|iframe|embed|object|svg)\b/i
/** TinyMCE writes an emptied paragraph as `<p>&nbsp;</p>`. */
const NBSP_ENTITY = /&(?:nbsp|#160|#x0*a0);/gi

/**
 * Whether a translated field is WRITTEN: it shows something — text, or
 * an embedded image or video (a size chart can be a page) — rather than
 * markup alone. An editor saves an emptied rich-text field as `""`,
 * `<p></p>` or `<p>&nbsp;</p>`, and parler keeps the key, so a key is no
 * evidence of a document.
 */
export function hasVisibleContent(value: string | null | undefined): value is string {
  if (!value) return false
  if (EMBEDDED_MEDIA.test(value)) return true
  return value.replace(/<[^>]*>/g, '').replace(NBSP_ENTITY, ' ').trim() !== ''
}

/**
 * The locales a row's `field` is written in, read from its parler
 * `translations` map — the one answer for every place that states a
 * page's languages (its hreflang set, the sitemap), so a blank
 * translation is left out everywhere rather than in some of them.
 */
export function translatedLocales(
  translations: Readonly<Record<string, Readonly<Record<string, unknown>> | null | undefined>> | null | undefined,
  field: string,
): string[] {
  return Object.entries(translations ?? {})
    .filter(([, translation]) => {
      const value = translation?.[field]
      return typeof value === 'string' && hasVisibleContent(value)
    })
    .map(([code]) => code)
}
