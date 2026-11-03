import { describe, expect, it } from 'vitest'
import { readLinkSlugs } from '~~/server/utils/builderData/loaders'
import { readPublishedTargets } from '~~/server/utils/builderLinks'
import { cacheKeyBelongsToHost } from '~~/server/utils/cacheKey'
import { cacheOptionsOf } from '~~/test/helpers/nitro'

/**
 * The caches a page's links are resolved from are a contract with Django's
 * purge (`core/cache/surfaces.py` names them), and a store's purge finds them
 * by the store being its own segment of the key.
 */
describe.each([
  ['the slugs of the records a page links to', readLinkSlugs, 'builderDataSlug', { product: '2,7' }],
  ['the pages a page may link to', readPublishedTargets, 'builderDataTargets', undefined],
])('the cache of %s', (_what, read, name, asked) => {
  const keyOf = (host: string, locale: string) => {
    const { getKey } = cacheOptionsOf(read)
    return (asked ? getKey!(host, locale, asked) : getKey!(host, locale)) as string
  }

  it(`is the function named ${name}, brief and expiring from storage`, () => {
    expect(cacheOptionsOf(read)).toMatchObject({ name, maxAge: 60, swr: false })
  })

  it('keys on the store and the language, with the store as its own segment', () => {
    const stored = `nitro:functions:${name}:${keyOf('shop.test', 'el')}.json`

    expect(keyOf('shop.test', 'el')).not.toBe(keyOf('shop.test', 'en'))
    expect(keyOf('shop.test', 'el')).not.toBe(keyOf('other.test', 'el'))
    expect(cacheKeyBelongsToHost(stored, 'shop.test')).toBe(true)
    expect(cacheKeyBelongsToHost(stored, 'other.test')).toBe(false)
  })
})
