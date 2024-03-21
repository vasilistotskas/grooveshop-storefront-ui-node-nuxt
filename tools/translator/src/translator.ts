import translationCache from './cache'
import { getISO6391Code, retry, validateDynamicKeys } from './helpers'
import consola from './consola'
import type { LocaleFile, translateEngine } from './types'
import { Translate } from 'translate'

const translateBundle = async (
  inputBundle: Record<string, unknown>,
  locale: LocaleFile,
  engine: translateEngine = 'google',
  maxRetries = 3,
  delayTime = 1000,
  useRetry = true,
): Promise<Record<string, unknown>> => {
  const outputBundle: Record<string, unknown> = {}

  const translateAndValidate = async (
    text: string,
    langCode: string,
  ): Promise<string> => {
    try {
      const translator = Translate({ engine })
      const translatedText = await translator(text, { to: langCode })

      if (text.includes('%{') && !validateDynamicKeys(text, translatedText)) {
        consola.warn(
          `Warning: Missing dynamic keys in translation of "${text}" in ${locale.path}`,
        )
        return translatedText.replace(/[%{}]/g, '')
      }

      return translatedText
    } catch (error) {
      consola.error(new Error(`Error during translation: ${error}`))
      throw error
    }
  }

  const eachCurrLevel = async (
    inputBundle: Record<string, unknown>,
    parentKey: string,
  ): Promise<void> => {
    for (const key in inputBundle) {
      const value = inputBundle[key]
      const nextParent = parentKey ? `${parentKey}.${key}` : key

      if (typeof value === 'string') {
        const langCode = getISO6391Code(locale.lang)
        const cachedTranslation = translationCache.getCacheKeyVal(
          nextParent,
          langCode,
        )

        if (cachedTranslation) {
          outputBundle[nextParent] = cachedTranslation
        } else {
          try {
            const translation = useRetry
              ? await retry<string>(
                  () => translateAndValidate(value, langCode),
                  maxRetries,
                  delayTime,
                )
              : await translateAndValidate(value, langCode)

            if (!translation) {
              throw new Error('Translation failed')
            }

            await translationCache.saveCacheKeyVal(
              nextParent,
              langCode,
              translation,
            )
            outputBundle[nextParent] = translation
          } catch (error) {
            consola.warn(
              `Warning: Failed to translate "${value}" in ${locale.path}, error: ${error}`,
            )
            outputBundle[nextParent] = value
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        await eachCurrLevel(value as Record<string, unknown>, nextParent)
      }
    }
  }

  await eachCurrLevel(inputBundle, '')

  return reconstructNestedObject(outputBundle)
}

const reconstructNestedObject = (
  flattened: Record<string, unknown>,
): Record<string, unknown> => {
  const nested: Record<string, unknown> = {}
  for (const key in flattened) {
    const value = flattened[key]
    const keySplit = key.split('.')
    let currParent = nested

    keySplit.forEach((currKey, index) => {
      if (index === keySplit.length - 1) {
        currParent[currKey] = value
      } else {
        currParent[currKey] = currParent[currKey] || {}
      }
      currParent = currParent[currKey] as Record<string, unknown>
    })
  }
  return nested
}

export { translateBundle }
