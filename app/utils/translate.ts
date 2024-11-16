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
  const keys = field.split('.') as Array<keyof typeof translation>
  let result: any = translation
  for (const key of keys) {
    result = result[key]
    if (result === undefined) {
      return undefined
    }
  }
  return typeof result === 'string' ? result : undefined
}
