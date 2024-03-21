/* eslint-disable no-console */
import { promises as fsPromises } from 'fs'
import translationCache from './cache'
import path from 'path'
import yaml from 'js-yaml'
import cliProgress from './cli-progress.mjs'
import { getFiles } from './file-ops'
import consola from './consola'
import { translateBundle } from './translator'
import type { debugMode, LocaleFile, translateEngine } from './types'
import { loadTranslatorConfig } from './config'

const EXTENSIONS = {
  YAML: '.yml',
}

const cwd = process.cwd()

async function main() {
  consola.start('Starting translation process...')
  await translationCache.init()
  try {
    const config = await loadTranslatorConfig()
    const localePath = path.join(cwd, config.localePath)

    const {
      debug: { mode } = {},
      sourceFileName,
      translate: { engine, bundleMaxRetries, bundleDelay } = {},
    } = config

    const localeFiles = await getFiles(localePath)
    const listLocaleToTranslate = localeFiles.filter(
      (l: LocaleFile) => l.lang !== sourceFileName,
    )

    const progressBar = setupProgressBar(mode, listLocaleToTranslate.length)

    const translations = await Promise.all(
      listLocaleToTranslate.map((locale) =>
        translateLocaleFile(
          locale,
          sourceFileName,
          engine,
          bundleMaxRetries,
          bundleDelay,
          progressBar,
        ),
      ),
    )
    await saveTranslations(translations, listLocaleToTranslate)
  } catch (error) {
    throw new Error(`Failed to translate files: ${error}`)
  }
}

async function translateLocaleFile(
  locale: LocaleFile,
  sourceFileName: string,
  engine: translateEngine | undefined,
  maxRetries: number | undefined,
  delay: number | undefined,
  progressBar: cliProgress.SingleBar | null,
) {
  const startTime = Date.now()
  try {
    const inputBundlePath = path.join(
      locale.dir,
      `${sourceFileName}${EXTENSIONS.YAML}`,
    )
    const inputBundle = yaml.load(
      await fsPromises.readFile(inputBundlePath, 'utf8'),
    ) as Record<string, unknown>

    const translated = await translateBundle(
      inputBundle,
      locale,
      engine,
      maxRetries,
      delay,
    )

    const timeTaken = (Date.now() - startTime) / 1000
    consola.info(`File ${locale.path} translated in ${timeTaken} seconds`)

    if (progressBar) progressBar.increment()

    return translated
  } catch (error) {
    consola.error(
      new Error(`Failed to translate file: ${locale.path} - ${error}`),
    )
    return null
  }
}

async function saveTranslations(
  translations: (Record<string, unknown> | null)[],
  locales: LocaleFile[],
) {
  await Promise.all(
    translations.map((translation, index) => {
      if (translation) {
        const outputPath = locales[index].path
        return fsPromises.writeFile(outputPath, yaml.dump(translation))
      }
    }),
  )
}

function setupProgressBar(mode: debugMode | undefined, totalSegments: number) {
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

main()
  .then(() => consola.success('Translation process completed successfully.'))
  .catch((error) => consola.error(error))

export default main
