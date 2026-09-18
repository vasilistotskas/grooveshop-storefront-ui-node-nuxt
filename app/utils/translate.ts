/**
 * A translated field, in the requested locale or the best one it EXISTS
 * in — and which that was.
 *
 * `extractTranslated` answers only "is there a translation in THIS
 * locale". Every caller that treated `undefined` as "no document"
 * conflated two different states: the row may exist and simply not be
 * written in this language. For a legal document that is the difference
 * between a 404 that says "your terms do not exist" (false, and harmful
 * — an English-speaking customer then has no route to them at all) and
 * showing the Greek document with a notice. The caller needs the locale
 * it got, to mark the article `lang`, point the canonical at that
 * locale's URL and say so.
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
    const value = extractTranslated(object, field, code)
    if (value && value.replace(/<[^>]*>/g, '').trim()) {
      return { value, locale: code }
    }
  }
  return undefined
}

export function extractTranslated<T>(
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
