import translationCache from '~/tools/translator/src/cache'
import {
  getISO6391Code,
  retry,
  validateDynamicKeys,
} from '~/tools/translator/src/helpers'
import consola from '~/tools/translator/src/consola'
import {
  FileExtensions,
  type LocaleFile,
  type TranslateEngine,
} from '~/tools/translator/src/types'
import { Translate } from 'translate'
import cliProgress from '~/tools/translator/src/cli-progress.mjs'
import {
  readFileContents,
  writeFileContents,
} from '~/tools/translator/src/file-ops'
import type { TranslatorConfig } from '~/tools/translator/src/config'

export const translateBundle = async (
  inputBundle: Record<string, unknown>,
  locale: LocaleFile,
  engine: TranslateEngine = 'google',
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
        const langCode = getISO6391Code(locale.langCode)
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
              consola.error(
                new Error(
                  `Translation failed for "${value}" in ${locale.path}`,
                ),
              )
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

export const reconstructNestedObject = (
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

export async function translateLocaleFile(
  locale: LocaleFile,
  input: string,
  inputFileExtension: FileExtensions,
  outputExtension: FileExtensions = inputFileExtension,
  engine: TranslateEngine = 'google',
  maxRetries: number = 3,
  delay: number = 1000,
  progressBar: cliProgress.SingleBar | null = null,
): Promise<Record<string, unknown> | null> {
  const startTime = Date.now()
  const inputBundle = await readFileContents(input, inputFileExtension)

  const translated = await translateBundle(
    inputBundle,
    locale,
    engine,
    maxRetries,
    delay,
  )

  const timeTaken = (Date.now() - startTime) / 1000
  consola.info(`File ${locale.path} translated in ${timeTaken} seconds`)

  const fileToWrite = locale.path.replace(inputFileExtension, outputExtension)

  await writeFileContents(fileToWrite, translated, outputExtension)

  if (progressBar) progressBar.increment()

  return translated
}

export async function executeTranslations(
  input: string,
  localesToTranslate: LocaleFile[],
  progressBar: cliProgress.SingleBar | null,
  config: TranslatorConfig,
  inputFileExtension: FileExtensions,
  outputExtension: FileExtensions,
) {
  const translationPromises = localesToTranslate.map((locale) =>
    translateLocaleFile(
      locale,
      input,
      inputFileExtension,
      outputExtension,
      config.translate?.engine,
      config.translate?.maxRetries,
      config.translate?.delay,
      progressBar,
    ),
  )

  const results = await Promise.allSettled(translationPromises)
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const locale = localesToTranslate[index]
      consola.error(
        new Error(
          `Failed to translate file: ${locale.path} - ${result.reason}`,
        ),
      )
    }
  })
}
