type DeepKeys<T> =
  T extends Record<string, any>
    ? {
        [K in keyof T]-?: K extends string
          ?
              | `${K}`
              | (T[K] extends Record<string, any>
                  ? `${K}.${DeepKeys<T[K]>}`
                  : never)
          : never
      }[keyof T]
    : ''

export type TranslationObject<T = Record<string, any>> = {
  translations: Record<string, T>
} & Omit<T, 'translations'>

export type WithTranslations<T = Record<string, any>> = {
  translations: Record<string, Record<string, any>>
} & T

export type ExtractIfTranslationObject<T> =
  T extends WithTranslations<infer U> ? U : T

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
