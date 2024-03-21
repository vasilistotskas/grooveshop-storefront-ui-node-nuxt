import * as fsPromises from 'fs/promises'
import path from 'path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import translationCache from '~/tools/translator/src/cache'
import consola from '~/tools/translator/src/consola'
import { cacheDir, cacheFile } from '~/tools/translator/src/constants'

vi.mock('fs/promises')
vi.mock('~/tools/translator/src/consola')

const cacheFilePath = path.join(cacheDir, cacheFile)

describe('TranslationCache', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await translationCache.init()
    vi.mocked(fsPromises.access).mockClear().mockResolvedValue()
    vi.mocked(fsPromises.readFile).mockClear().mockResolvedValue('{}')
    vi.mocked(fsPromises.writeFile).mockClear().mockResolvedValue()
    vi.mocked(fsPromises.mkdir).mockClear().mockResolvedValue(cacheDir)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads cache from file on initialization', async () => {
    const mockCacheData = { 'hello-en': 'Hello', 'greeting-es': 'Hola' }
    vi.mocked(fsPromises.readFile).mockResolvedValueOnce(
      JSON.stringify(mockCacheData),
    )

    await translationCache.init()

    expect(fsPromises.readFile).toHaveBeenCalledWith(cacheFilePath, 'utf-8')
    expect(translationCache.getCacheKeyVal('hello', 'en')).toBe('Hello')
  })

  it('handles file not existing by initializing empty cache', async () => {
    vi.mocked(fsPromises.access).mockRejectedValueOnce(
      new Error('File does not exist'),
    )

    await translationCache.init()

    expect(translationCache.cache.size).toBe(0)
  })

  it('saves translations to cache and debounces file writing', async () => {
    await translationCache.saveCacheKeyVal('hello', 'fr', 'Bonjour')

    vi.runAllTimers()

    expect(translationCache.getCacheKeyVal('hello', 'fr')).toBe('Bonjour')
  }, 5000)

  it('ensures cache directory exists before saving', async () => {
    vi.mocked(fsPromises.access).mockRejectedValueOnce(
      new Error('Directory does not exist'),
    )
    await translationCache.saveCacheToFile()
    expect(fsPromises.mkdir).toHaveBeenCalledWith(cacheDir, { recursive: true })
  })

  it('reports an error if saving to file fails', async () => {
    vi.mocked(fsPromises.writeFile).mockRejectedValueOnce(
      new Error('Failed to write'),
    )

    await translationCache.saveCacheToFile()

    expect(consola.error).toHaveBeenCalled()
  })

  it('correctly retrieves a previously set translation', async () => {
    translationCache.cache.set('greeting-es', 'Hola')
    expect(translationCache.getCacheKeyVal('greeting', 'es')).toBe('Hola')
  })

  it('returns undefined for a non-existent translation', () => {
    expect(translationCache.getCacheKeyVal('nonexistent', 'en')).toBeUndefined()
  })
})
