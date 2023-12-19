import * as fs from 'fs'
import * as path from 'path'
import { describe, expect, it } from 'vitest'
import {
	saveCacheKeyVal,
	getCacheKeyVal,
	saveCacheToFile,
	loadCacheFromFile
} from '~/tools/translator/src/cache'

vi.mock('fs')

describe('translator cache tests', () => {
	const mockCache = new Map([
		['hello-en', 'Hello'],
		['greeting-es', 'Hola']
	])
	const cacheDir = '.translator_cache'
	const cacheFile = '.cache.json'
	const cacheFilePath = path.join(cacheDir, cacheFile)

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('saveCacheKeyVal should correctly set a translation in the cache', () => {
		const key = 'hello'
		const language = 'fr'
		const translation = 'bonjour'

		saveCacheKeyVal(key, language, translation)
		expect(getCacheKeyVal(key, language)).toBe(translation)
	})
	it('getCacheKeyVal should correctly retrieve a translation from the cache', () => {
		const key = 'greeting'
		const language = 'es'
		const translation = 'hola'

		saveCacheKeyVal(key, language, translation)
		const retrievedTranslation = getCacheKeyVal(key, language)
		expect(retrievedTranslation).toBe(translation)
	})
	it('should return undefined for a non-existent translation', () => {
		const nonExistentTranslation = getCacheKeyVal('nonexistent', 'en')
		expect(nonExistentTranslation).toBeUndefined()
	})
	it('should overwrite an existing translation in the cache', () => {
		const key = 'hello'
		const language = 'fr'
		const initialTranslation = 'bonjour'
		const newTranslation = 'salut'

		saveCacheKeyVal(key, language, initialTranslation)
		saveCacheKeyVal(key, language, newTranslation)
		const retrievedTranslation = getCacheKeyVal(key, language)

		expect(retrievedTranslation).toBe(newTranslation)
	})
	it('saves the cache to a file correctly', () => {
		const jsonContent = JSON.stringify(Object.fromEntries(mockCache), null, 2)
		saveCacheToFile(mockCache)

		expect(fs.writeFileSync).toHaveBeenCalledWith(cacheFilePath, jsonContent, 'utf-8')
	})
	it('loads the cache from a file correctly', () => {
		vi.mocked(fs.existsSync).mockReturnValue(true)
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify(Object.fromEntries(mockCache))
		)

		const loadedCache = loadCacheFromFile()

		expect(loadedCache).toEqual(mockCache)
		expect(fs.readFileSync).toHaveBeenCalledWith(cacheFilePath, 'utf-8')
	})
	it('returns an empty cache when file does not exist', () => {
		vi.mocked(fs.existsSync).mockReturnValue(false)

		const loadedCache = loadCacheFromFile()

		expect(loadedCache).toEqual(new Map())
	})
})
