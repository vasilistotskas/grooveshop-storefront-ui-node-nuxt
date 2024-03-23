import path from 'path'
import { cacheDir, cacheFile } from '~/tools/translator/src/constants'
import consola from '~/tools/translator/src/consola'
import { access, readFile, writeFile, mkdir, constants } from 'node:fs/promises'

const cacheFilePath = path.join(cacheDir, cacheFile)

class TranslationCache {
  cache: Map<string, string> = new Map()
  debouncedSaveCacheToFile: () => void

  constructor() {
    this.cache = new Map()
    this.debouncedSaveCacheToFile = TranslationCache.debounce(
      this.saveCacheToFile.bind(this),
      5000,
    )
  }

  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
  ): (...funcArgs: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>

    return function (...args: Parameters<T>) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }

      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  async ensureCacheDirectoryExists() {
    try {
      await access(cacheDir)
    } catch {
      consola.info('Cache directory does not exist. Creating...')
      await mkdir(cacheDir, { recursive: true })
    }
  }

  async saveCacheToFile() {
    await this.ensureCacheDirectoryExists()
    const cacheObject = Object.fromEntries(this.cache)
    try {
      await writeFile(
        cacheFilePath,
        JSON.stringify(cacheObject, null, 2),
        'utf-8',
      )
    } catch (error) {
      consola.error(new Error(`Failed to save cache to file: ${error}`))
    }
  }

  async loadCacheFromFile() {
    await this.ensureCacheDirectoryExists()
    try {
      if (
        await access(cacheFilePath, constants.F_OK)
          .then(() => true)
          .catch(() => false)
      ) {
        const fileContent = await readFile(cacheFilePath, 'utf-8')
        const parsedContent = JSON.parse(fileContent)
        if (
          typeof parsedContent === 'object' &&
          parsedContent !== null &&
          !Array.isArray(parsedContent)
        ) {
          this.cache = new Map(Object.entries(parsedContent))
        } else {
          consola.warn(
            'Invalid cache data structure. Initializing empty cache.',
          )
          this.cache.clear()
        }
      }
    } catch (error) {
      consola.error(new Error(`Error loading cache from file: ${error}`))
    }
  }

  getCacheKeyVal(key: string, to: string) {
    const value = `${key}-${to}`
    return this.cache.get(value)
  }

  async saveCacheKeyVal(key: string, to: string, translation: string) {
    const value = `${key}-${to}`
    if (!this.cache.has(value)) {
      this.cache.set(value, translation)
      this.debouncedSaveCacheToFile()
    }
  }

  async init() {
    await this.loadCacheFromFile()
    consola.info('Cache loaded from file')
  }

  clear() {
    this.cache.clear()
  }
}

const translationCache = new TranslationCache()

export default translationCache
