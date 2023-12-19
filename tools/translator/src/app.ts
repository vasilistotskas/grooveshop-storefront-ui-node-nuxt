/* eslint-disable no-console */
import path from 'path'
import * as fs from 'fs'
import yaml from 'js-yaml'
import cliProgress from './cli-progress.mjs'
import type { LocaleFile } from './types'
import { translateBundle } from './translator'
import { loadConfig } from './config'
import { getFiles } from './file-ops'
import useLogger from './logger'

const cwd = process.cwd()

const logger = useLogger()

async function main(): Promise<void> {
	try {
		const config = await loadConfig()
		const localePath = path.join(cwd, config.localePath)

		const mode = config.debug?.mode
		const sourceFileName = config.sourceFileName
		const engine = config.translate?.engine
		const translateBundleMaxRetries = config.translate?.bundleMaxRetries
		const translateBundleDelay = config.translate?.bundleDelay

		const localeFiles = await getFiles(localePath)

		const mainLocalePath = path.join(localePath, `${sourceFileName}.yml`)
		const totalLocaleFiles = localeFiles.length
		const listLocaleToTranslate = localeFiles.filter(
			(l: LocaleFile) => l.lang !== sourceFileName
		)
		const defaultLocalFiles = localeFiles.filter(
			(l: LocaleFile) => l.lang === sourceFileName
		)
		const totalProgressBarSegments = totalLocaleFiles - defaultLocalFiles.length

		const startTime = Date.now()

		const progressBar = new cliProgress.SingleBar(
			{
				format:
					'Progress [{bar}] {percentage}% | {value}/{total} | ETA: {eta}s | Current File: {currentFile}',
				etaBuffer: totalProgressBarSegments * 100,
				progressCalculationRelative: true,
				etaAsynchronousUpdate: true
			},
			cliProgress.Presets.rect
		)

		if (mode === 'progress-bar') {
			progressBar.on('redraw-pre', () => {
				console.clear()
			})
			progressBar.start(totalProgressBarSegments, 0)
		}

		const localesToTranslate = localeFiles.map((l: LocaleFile) => {
			const pathParts = l.path.split('\\')
			return pathParts
				.slice(pathParts.lastIndexOf('locales') + 1)
				.join('/')
				.replace('.yml', '')
		})

		logger.silly(`Target Locales Path: ${localePath}`)
		logger.silly(`Main Locale: ${mainLocalePath}`)
		logger.silly(`Locales to translate: ${localesToTranslate.join(', ')}`)

		const translations = await Promise.all(
			listLocaleToTranslate.map(async (locale: LocaleFile) => {
				const fileStartTime = Date.now()
				try {
					logger.silly(`Translating file: ${locale.path}`)

					const inputBundle = yaml.load(
						fs.readFileSync(path.join(locale.dir, `${sourceFileName}.yml`), 'utf8')
					) as Record<string, unknown>

					const translated = await translateBundle(
						inputBundle,
						locale,
						engine,
						translateBundleMaxRetries,
						translateBundleDelay
					)

					const fileEndTime = Date.now()
					const timePerFile = (fileEndTime - fileStartTime) / 1000
					logger.info(`Time taken for file ${locale.path}: ${timePerFile} seconds`)
					if (mode === 'progress-bar') {
						progressBar.increment(1, { currentFile: locale.path })
					}
					logger.info(`Successfully translated file: ${locale.path}`)
					return translated
				} catch (e) {
					logger.error(`Failed to translate file: ${locale.path}`)
					logger.error(e)
					return null
				}
			})
		)

		translations.forEach((t: Awaited<unknown>, index: number) => {
			if (t !== null && t !== undefined) {
				fs.writeFileSync(listLocaleToTranslate[index].path, yaml.dump(t))
			}
		})

		const endTime = Date.now()
		const totalTime = (endTime - startTime) / 1000
		logger.info(`Total time taken: ${totalTime} seconds`)

		if (mode === 'progress-bar') {
			progressBar.update(totalProgressBarSegments)
			progressBar.stop()
		}
	} catch (e) {
		logger.fatal(e)
		throw e
	}
}

main()
	.then(() => {
		logger.info('Done')
	})
	.catch((e) => {
		logger.error(e)
	})

export { main }
