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
  inputFile: string,
  selectedLocales: string[],
  outputExtension: FileExtensions,
) {
  consola.start('Starting translation process...')
  await translationCache.init()

  try {
    const localeDirPath = path.dirname(inputFile)
    await validatePathAccess(localeDirPath, 'locale directory')

    const inputFileExtension = getFileExtension(
      inputFile,
      Object.values(FileExtensions),
    )
    if (!inputFileExtension)
      throw new Error(`Source file ${inputFile} not found or not supported`)

    let localesToTranslate = generateLocalePaths(
      localeDirPath,
      inputFileExtension,
      config.locales.available,
    )
    localesToTranslate = filterLocales(
      localesToTranslate,
      selectedLocales,
      inputFile,
    )

    await executeTranslations(
      inputFile,
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
