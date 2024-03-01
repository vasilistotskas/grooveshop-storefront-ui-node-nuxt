import { getCacheKeyVal, saveCacheKeyVal } from './cache'
import { getISO6391Code, retry, validateDynamicKeys } from './helpers'
import useLogger from './logger'
import type { LocaleFile, translateEngine } from './types'

const logger = useLogger()

const translateBundle = async (
	inputBundle: Record<string, unknown>,
	locale: LocaleFile,
	engine: translateEngine = 'google',
	maxRetries: number = 3,
	delayTime: number = 1000,
	useRetry: boolean = true
): Promise<Record<string, unknown>> => {
	const outputBundle: Record<string, unknown> = {}
	const translateFunction = (await import('translate')).default

	const translateAndValidate = async (
		text: string,
		langCode: string
	): Promise<string> => {
		const translatedText = await translateFunction(text, { to: langCode, engine })

		if (text.includes('%{')) {
			if (!validateDynamicKeys(text, translatedText)) {
				logger.warn(
					`Warning: Missing dynamic keys in translation of "${text}" in ${locale.path}`
				)
				return translatedText.replace(/[%{}]/g, '')
			}
		}

		return translatedText
	}

	const eachCurrLevel = async (
		inputBundle: Record<string, unknown>,
		parentKey: string
	): Promise<void> => {
		for (const key in inputBundle) {
			const value = inputBundle[key]
			const nextParent = parentKey ? `${parentKey}.${key}` : key
			if (typeof value === 'string') {
				const langCode = getISO6391Code(locale.lang)
				const cachedTranslation = getCacheKeyVal(nextParent, langCode)
				if (cachedTranslation) {
					outputBundle[`${nextParent}`] = cachedTranslation
				} else {
					const translation = useRetry
						? await retry<string>(
								() => translateAndValidate(value, langCode),
								maxRetries,
								delayTime
							)
						: await translateAndValidate(value, langCode)

					if (!translation) {
						logger.warn(`Warning: Failed to translate "${value}" in ${locale.path}`)
						outputBundle[`${nextParent}`] = value
						continue
					}

					saveCacheKeyVal(nextParent, langCode, translation)
					outputBundle[`${nextParent}`] = translation
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
	flattened: Record<string, unknown>
): Record<string, unknown> => {
	const nested: Record<string, unknown> = {}
	for (const key in flattened) {
		let value = flattened[key]
		const keySplit = key.split('.')
		const keyLevel = keySplit.length

		if (typeof value === 'string') value = `${value}`.toLowerCase()

		let currParent = nested
		for (let i = 0; i < keyLevel; i++) {
			const currKey = keySplit[i]
			if (!currParent[currKey]) currParent[currKey] = {}
			if (i === keyLevel - 1) currParent[currKey] = value
			currParent = currParent[currKey] as Record<string, unknown>
		}
	}
	return nested
}

export { translateBundle }
