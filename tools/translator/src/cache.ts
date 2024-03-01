import * as fs from 'fs'
import * as path from 'path'

import { cacheDir, cacheFile } from './constants'

const cacheFilePath = path.join(cacheDir, cacheFile)

const ensureCacheDirectoryExists = (): void => {
	if (!fs.existsSync(cacheDir)) {
		fs.mkdirSync(cacheDir)
	}
}

const saveCacheToFile = (cache: Map<string, string>): void => {
	ensureCacheDirectoryExists()
	const cacheObject = Object.fromEntries(cache)
	fs.writeFileSync(cacheFilePath, JSON.stringify(cacheObject, null, 2), 'utf-8')
}

const loadCacheFromFile = (): Map<string, string> => {
	ensureCacheDirectoryExists()
	if (fs.existsSync(cacheFilePath)) {
		const fileContent = fs.readFileSync(cacheFilePath, 'utf-8')
		return new Map(Object.entries(JSON.parse(fileContent)))
	}
	return new Map<string, string>()
}

const saveCacheKeyVal = (key: string, to: string, translation: string): void => {
	const value = `${key}-${to}`
	if (!translationCache.has(key)) {
		translationCache.set(value, translation)
		saveCacheToFile(translationCache)
	}
}

const getCacheKeyVal = (key: string, to: string): string | undefined => {
	const value = `${key}-${to}`
	return translationCache.get(value)
}

const translationCache = loadCacheFromFile()

export { getCacheKeyVal, loadCacheFromFile, saveCacheKeyVal, saveCacheToFile }
