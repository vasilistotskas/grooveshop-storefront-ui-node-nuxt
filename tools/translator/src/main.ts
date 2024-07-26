import path from 'path'
import type { ConsolaInstance } from 'consola'
import translationCache from '~~/tools/translator/src/cache'
import { generateLocalePaths, getFileExtension, validatePathAccess } from '~~/tools/translator/src/file-ops'
import { executeTranslations } from '~~/tools/translator/src/translator'
import { FileExtensions } from '~~/tools/translator/src/types'
import { filterLocales } from '~~/tools/translator/src/helpers'
import type { TranslatorConfig } from '~~/tools/translator/src/config'

export async function main(
  config: TranslatorConfig,
  consola: ConsolaInstance,
  inputFilePath: string,
  selectedLocales: string[],
  outputExtension: FileExtensions,
) {
  consola.start('Starting translation process...')
  await translationCache.init()

  try {
    const localeDirPath = path.dirname(inputFilePath)
    await validatePathAccess(localeDirPath, 'locale directory')

    const inputFileExtension = getFileExtension(
      inputFilePath,
      Object.values(FileExtensions),
    )
    consola.info(`File Extension: ${inputFileExtension}`)

    if (!inputFileExtension)
      throw new Error(`Source file ${inputFilePath} not found or not supported`)

    let localesToTranslate = generateLocalePaths(
      localeDirPath,
      inputFileExtension,
      config.locales.available,
    )

    localesToTranslate = filterLocales(
      localesToTranslate,
      selectedLocales,
      inputFilePath,
    )
    consola.info(`Locales To Translate: ${JSON.stringify(localesToTranslate, null, 2)}`)

    await executeTranslations(
      inputFilePath,
      localesToTranslate,
      config,
      inputFileExtension,
      outputExtension,
    )
  }
  catch (error) {
    consola.error(error)
    throw error
  }
}
