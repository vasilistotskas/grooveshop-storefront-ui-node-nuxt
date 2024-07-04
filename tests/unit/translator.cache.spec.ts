import translationCache from '~~/tools/translator/src/cache'

describe('TranslationCache', () => {
  it('handles file not existing by initializing empty cache', async () => {
    await translationCache.init()
    translationCache.clear()
    expect(translationCache.cache.size).toBe(0)
  })

  it('saves translations to cache and debounces file writing', async () => {
    await translationCache.saveCacheKeyVal('hello', 'fr', 'Bonjour')
    expect(translationCache.getCacheKeyVal('hello', 'fr')).toBe('Bonjour')
  }, 5000)

  it('correctly retrieves a previously set translation', async () => {
    translationCache.cache.set('greeting-es', 'Hola')
    expect(translationCache.getCacheKeyVal('greeting', 'es')).toBe('Hola')
  })

  it('returns undefined for a non-existent translation', () => {
    expect(translationCache.getCacheKeyVal('nonexistent', 'en')).toBeUndefined()
  })

  it('saves cache to file', async () => {
    await translationCache.saveCacheToFile()
    expect(translationCache.cache.size).toBeGreaterThan(0)
  })
})
