import translationCache from '~/tools/translator/src/cache'
import path from 'path'
import cliProgress from '~/tools/translator/src/cli-progress.mjs'
import {
  generateLocalePaths,
  getFileExtension,
  validatePathAccess,
} from '~/tools/translator/src/file-ops'
import consola from '~/tools/translator/src/consola'
import { executeTranslations } from '~/tools/translator/src/translator'
import type { DebugMode } from '~/tools/translator/src/types'
import { loadTranslatorConfig } from '~/tools/translator/src/config'
import { FileExtensions } from '~/tools/translator/src/types'
import {
  promptForInputFile,
  promptForLocales,
  promptForOutputExtension,
} from '~/tools/translator/src/prompts'
import { filterLocales } from '~/tools/translator/src/helpers'

export function setupProgressBar(
  mode: DebugMode | undefined,
  totalSegments: number,
) {
  if (mode !== 'progress-bar') return null

  const progressBar = new cliProgress.SingleBar(
    {
      format:
        'Progress [{bar}] {percentage}% | {value}/{total} | ETA: {eta}s | Current File: {currentFile}',
      etaBuffer: totalSegments * 100,
      progressCalculationRelative: true,
      etaAsynchronousUpdate: true,
    },
    cliProgress.Presets.rect,
  )

  progressBar.start(totalSegments, 0, { currentFile: 'N/A' })

  return progressBar
}

export async function main() {
  consola.start('Starting translation process...')
  await translationCache.init()

  try {
    const config = await loadTranslatorConfig()
    if (!config) throw new Error('Failed to load translator config')

    const inputFile = await promptForInputFile(config)
    const localeDirPath = path.dirname(inputFile)
    await validatePathAccess(localeDirPath, 'locale directory')

    const inputFileExtension = getFileExtension(
      inputFile,
      Object.values(FileExtensions),
    )
    if (!inputFileExtension)
      throw new Error(`Source file ${inputFile} not found or not supported`)

    const selectedLocales = await promptForLocales()
    let localesToTranslate = generateLocalePaths(
      localeDirPath,
      inputFileExtension,
    )
    localesToTranslate = filterLocales(
      localesToTranslate,
      selectedLocales,
      inputFile,
    )

    const progressBar = setupProgressBar(
      config.debug?.mode,
      localesToTranslate.length,
    )
    const outputExtension = await promptForOutputExtension()

    await executeTranslations(
      inputFile,
      localesToTranslate,
      progressBar,
      config,
      inputFileExtension,
      outputExtension,
    )
  } catch (error) {
    consola.error(error)
    process.exit(1)
  }
}
