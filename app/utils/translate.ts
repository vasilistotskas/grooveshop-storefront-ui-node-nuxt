/**
 * A translated field as the page shows it: the row in `locale` when it is
 * written in that language, else in the store's default language, else in
 * any language it is written in.
 *
 * Django serialises a parler row as its `translations` map, one entry per
 * language the row is written in and nothing for the others: parler's
 * fallback languages apply when the model's attributes are read, never to
 * that map, and the map has to stay the truth because it states which
 * languages a page exists in (`translatedLocales`: hreflang, sitemap). So
 * the fallback is the reader's, here, once: a product written only in
 * Greek showed a blank name on every card of an English page, while its
 * page heading fell back to Greek.
 *
 * The language is chosen for the ROW, not the field: a row written in
 * English with an empty English SEO title answers `''`, so `seoTitle ||
 * name` goes on to the English name rather than to the Greek SEO title.
 * A row is written in a language when that translation shows some text;
 * an entry saved with every field empty is as good as none.
 *
 * The store's default language is the one its content is authored in
 * (`TenantConfig.defaultLocale`), read from the request's store.
 * `tryUseNuxtApp` is valid here outside `setup()` for the reason `$api`
 * gives (`app/utils/api.ts`), and the store is the app's own Pinia, so a
 * server render reads its request's store and never another's.
 */
export function extractTranslated<T>(
  object: TranslationObject<T> | undefined | null,
  field: DeepKeys<T>,
  locale: string,
): string | undefined {
  return translationIn(object, field, rowLocale(object, locale))
}

/** The language `extractTranslated` reads a row in: `locale`, the store's default, then any it is written in. */
function rowLocale<T>(object: TranslationObject<T> | undefined | null, locale: string): string {
  const translations: Readonly<Record<string, unknown>> = object?.translations ?? {}
  const nuxtApp = tryUseNuxtApp()
  const storeLocale = nuxtApp ? useTenantStore(nuxtApp.$pinia).defaultLocale : ''
  return [locale, storeLocale, ...Object.keys(translations)]
    .find(code => code && showsText(translations[code])) ?? locale
}

/** Whether a translation entry, or any field nested in it, shows some text. */
function showsText(value: unknown): boolean {
  if (typeof value === 'string') return hasVisibleContent(value)
  return typeof value === 'object' && value !== null && Object.values(value).some(showsText)
}

/** How a pure helper is handed the page's reading of a row: `extractTranslated` with the locale applied (`translatorFor`). */
export type Translator = <T>(object: TranslationObject<T> | undefined | null, field: DeepKeys<T>) => string | undefined

/** `extractTranslated` in `locale`, for a helper that must not reach for the app itself. */
export function translatorFor(locale: string): Translator {
  return (object, field) => extractTranslated(object, field, locale)
}

/**
 * A translated field, in the requested locale or the best one it EXISTS
 * in — and which that was.
 *
 * For a caller that needs the locale it got: a legal document shown in
 * Greek on an English page marks the article `lang`, points the canonical
 * at that locale's URL and says so, where a blank would have been a 404
 * saying "your terms do not exist".
 *
 * Order: the requested locale, then `fallbackLocales` in order (the
 * tenant's default first — the language its content is authored in),
 * then whatever else the row carries. Never a hardcoded language.
 *
 * "Exists" means visible text, not a row: a translation saved with an
 * empty body is as unusable as none, and parler on the API side will
 * not fall back past a row that exists, so this has to.
 */
export function resolveTranslated<T>(
  object: TranslationObject<T> | undefined | null,
  field: DeepKeys<T>,
  locale: string,
  fallbackLocales: readonly string[] = [],
): { value: string, locale: string } | undefined {
  const candidates = [
    locale,
    ...fallbackLocales,
    ...Object.keys(object?.translations ?? {}),
  ]
  const tried = new Set<string>()
  for (const code of candidates) {
    if (!code || tried.has(code)) continue
    tried.add(code)
    const value = translationIn(object, field, code)
    if (hasVisibleContent(value)) {
      return { value, locale: code }
    }
  }
  return undefined
}

/** A translated field in exactly `locale`, as the row stores it: `undefined` when it has no such translation. */
export function translationIn<T>(
  object: TranslationObject<T> | undefined | null,
  field: DeepKeys<T>,
  locale: string,
): string | undefined {
  if (!object || !object.translations) {
    return undefined
  }
  const translation = object.translations[locale]
  if (!translation) {
    return undefined
  }
  const keys = field.split('.')
  let result: unknown = translation
  for (const key of keys) {
    if (result === null || typeof result !== 'object') {
      return undefined
    }
    result = (result as Record<string, unknown>)[key]
    if (result === undefined) {
      return undefined
    }
  }
  return typeof result === 'string' ? result : undefined
}
