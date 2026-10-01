/**
 * Whether a translated field is WRITTEN: visible text, not markup alone.
 * An editor saves an emptied rich-text field as `""` or `<p></p>`, and
 * parler keeps the key — so a key is no evidence of a document.
 */
export function hasVisibleText(value: string | null | undefined): boolean {
  return !!value && value.replace(/<[^>]*>/g, '').trim() !== ''
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
      return typeof value === 'string' && hasVisibleText(value)
    })
    .map(([code]) => code)
}
