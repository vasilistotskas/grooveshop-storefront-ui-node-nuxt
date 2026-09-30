import { describe, expect, it } from 'vitest'
import { createCachedFetcher, getMimeType } from '~~/server/utils/api'
import { cacheKeyBelongsToHost } from '~~/server/utils/cacheKey'
import { backend, cacheOptionsOf } from '~~/test/helpers/nitro'

describe('getMimeType', () => {
  it.each([
    ['photo.jpg', 'image/jpeg'],
    ['photo.JPEG', 'image/jpeg'],
    ['icon.png', 'image/png'],
    ['anim.gif', 'image/gif'],
    ['hero.webp', 'image/webp'],
    ['hero.avif', 'image/avif'],
    ['/nested/path.to/image.PNG', 'image/png'],
    ['notes.txt', 'application/octet-stream'],
    ['no-extension', 'application/octet-stream'],
  ])('%s → %s', (file, mime) => {
    expect(getMimeType(file)).toBe(mime)
  })
})

describe('createCachedFetcher', () => {
  const page = (ids: number[], next: string | null = null) => ({
    results: ids.map(id => ({ id })),
    links: { next },
  })

  it('fetches one page as the tenant, in the caller\'s language', async () => {
    backend.reply(page([1, 2]))

    const result = await createCachedFetcher('test', 60)('tenant-a.test', 'en', 'http://backend.test/api/v1/data')

    expect(result).toEqual([{ id: 1 }, { id: 2 }])
    // The tenantKey is forwarded as X-Forwarded-Host so Django resolves
    // the caller's schema (otherwise sitemap/RSS hit the public schema).
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/data')
    expect(backend.lastRequest.method).toBe('GET')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('tenant-a.test')
    expect(backend.lastRequest.headers.get('x-language')).toBe('en')
  })

  it('sends no X-Forwarded-Host when there is no tenant key', async () => {
    backend.reply(page([1]))

    await createCachedFetcher('test', 60)('', 'el', 'http://backend.test/api/v1/data')

    expect(backend.lastRequest.headers.has('x-forwarded-host')).toBe(false)
    expect(backend.lastRequest.headers.get('x-language')).toBe('el')
  })

  it('follows next links and concatenates every page', async () => {
    backend.replyOnce(page([1, 2], 'http://backend.test/api/v1/data?page=2'))
    backend.replyOnce(page([3]))

    const result = await createCachedFetcher('test', 60)('tenant-a.test', 'el', 'http://backend.test/api/v1/data')

    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
    expect(backend.requests.map(request => request.url.href)).toEqual([
      'http://backend.test/api/v1/data',
      'http://backend.test/api/v1/data?page=2',
    ])
  })

  it('re-anchors a next link built on the storefront host onto the first page\'s origin', async () => {
    // Django builds `next` from X-Forwarded-Host — the STOREFRONT domain,
    // which does not serve /api/v1/**. Only path + query may be followed.
    backend.replyOnce(page([1], 'https://tenant-a.test/api/v1/blog/post?languageCode=el&page=2'))
    backend.replyOnce(page([2]))

    await createCachedFetcher('test', 60)('tenant-a.test', 'el', 'http://backend-service:8000/api/v1/blog/post?languageCode=el')

    expect(backend.requests[1]!.url.href).toBe('http://backend-service:8000/api/v1/blog/post?languageCode=el&page=2')
  })

  it('stops after 100 pages even if the backend keeps linking', async () => {
    backend.reply(page([1], 'http://backend.test/api/v1/data?page=next'))

    const result = await createCachedFetcher('test', 60)('tenant-a.test', 'el', 'http://backend.test/api/v1/data')

    expect(backend.requests).toHaveLength(100)
    expect(result).toHaveLength(100)
  })

  it('treats a page without results as empty', async () => {
    backend.reply({ links: { next: null } })

    await expect(createCachedFetcher('test', 60)('tenant-a.test', 'el', 'http://backend.test/api/v1/data')).resolves.toEqual([])
  })

  it('is cached under its name and maxAge', () => {
    expect(cacheOptionsOf(createCachedFetcher('sitemap-products', 3600))).toMatchObject({ name: 'sitemap-products', maxAge: 3600 })
  })

  it('keys by tenant, locale and url, and a store-scoped purge still finds the entry', () => {
    const { getKey } = cacheOptionsOf(createCachedFetcher('test', 60))
    const key = getKey!('tenant-a.test', 'el', '/product')

    expect(new Set([
      key,
      getKey!('tenant-b.test', 'el', '/product'),
      getKey!('tenant-a.test', 'en', '/product'),
      getKey!('tenant-a.test', 'el', '/blog'),
    ]).size).toBe(4)
    // Stored as `nitro:functions:<name>:<key>.json` — the `functions`
    // family matches the host as its own `:` segment.
    expect(cacheKeyBelongsToHost(`nitro:functions:test:${key}.json`, 'tenant-a.test')).toBe(true)
    expect(cacheKeyBelongsToHost(`nitro:functions:test:${key}.json`, 'tenant-b.test')).toBe(false)
  })
})
