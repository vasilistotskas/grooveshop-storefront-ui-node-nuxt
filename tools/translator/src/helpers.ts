import path from 'path'
import type { LocaleFile } from '~~/tools/translator/src/types'

export const getISO6391Code = (locale: string): string => {
  if (!locale) {
    return ''
  }
  const primaryLanguageCode = locale.split(/[-_]/)[0]
  if (primaryLanguageCode && primaryLanguageCode.length === 2) {
    return primaryLanguageCode.toLowerCase()
  }
  return ''
}

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const retry = async <T>(
  func: () => Promise<T>,
  retries: number,
  delayTime: number,
): Promise<T | undefined> => {
  let attempts = 0
  while (attempts < retries) {
    try {
      return await func()
    }
    catch (error) {
      attempts++
      if (attempts === retries) {
        throw error
      }
      await delay(delayTime)
    }
  }
}

export function extractDynamicKeys(str: string): RegExpMatchArray | [] {
  const dynamicKeyPattern = /%\{[a-zA-Z0-9_]+}/g
  return str.match(dynamicKeyPattern) || []
}

export function validateDynamicKeys(
  original: string,
  translated: string,
): boolean {
  const originalKeys = extractDynamicKeys(original)
  const translatedKeys = extractDynamicKeys(translated)

  if (originalKeys.length !== translatedKeys.length) {
    return false
  }

  for (let i = 0; i < originalKeys.length; i++) {
    if (originalKeys[i] !== translatedKeys[i]) {
      return false
    }
  }

  return true
}

export function filterLocales(
  locales: LocaleFile[],
  selectedLocales: string[],
  sourceFilePath: string,
) {
  const sourceLangCode = getISO6391Code(
    path.basename(sourceFilePath).replace(/\.[^/.]+$/, ''),
  )
  let filteredLocales = locales.filter(
    locale => locale.langCode !== sourceLangCode,
  )

  if (!selectedLocales.includes('all')) {
    filteredLocales = filteredLocales.filter(locale =>
      selectedLocales.includes(locale.langCode),
    )
  }

  return filteredLocales
}
