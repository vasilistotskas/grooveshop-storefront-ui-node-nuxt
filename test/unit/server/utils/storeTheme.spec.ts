import { describe, expect, it } from 'vitest'
import { cacheKeyBelongsToHost } from '~~/server/utils/cacheKey'
import { getTenantConfig, invalidateTenantConfigs } from '~~/server/utils/tenant'
import { readPublishedTheme, requestStoreTheme } from '~~/server/utils/storeTheme'
import { DEGRADED_RENDER_STATUS } from '~~/shared/constants/degradedRender'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, cacheOptionsOf, createTestEvent, jsonResponse, loggerOf } from '~~/test/helpers/nitro'

const PUBLISHED = { ...themeDefaultsFor(null), radius: '0.5rem', container: 'narrow' }

const summary = (theme: unknown) => ({
  release: 3,
  locale: 'el',
  theme: theme === null ? null : { key: 'theme', version: 1, sections: {}, order: [], settings: theme },
  groups: {},
  pages: [],
})

describe('readPublishedTheme', () => {
  it('reads the theme of the store\'s current release, in the page\'s language', async () => {
    backend.reply(summary(PUBLISHED))

    expect(await readPublishedTheme('shop.test', 'en')).toEqual(PUBLISHED)
    expect(backend.lastRequest.path).toMatch(/\/builder\/published$/)
    expect(backend.lastRequest.query).toEqual({ locale: 'en' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('shop.test')
  })

  it('answers null for a release without a theme, and for a store with no release', async () => {
    backend.reply(summary(null))

    expect(await readPublishedTheme('shop.test', 'el')).toBeNull()
  })

  it('refuses a theme that does not fit the schema, so it is never cached', async () => {
    backend.reply(summary({ ...PUBLISHED, radius: '9rem' }))

    await expect(readPublishedTheme('shop.test', 'el')).rejects.toThrow(/radius/)
  })

  it('is the function named builderTheme, keyed on the store (as its own segment) and the language', () => {
    const { getKey, name } = cacheOptionsOf(readPublishedTheme)
    const key = (host: string, locale: string) => getKey!(host, locale) as string
    const stored = `nitro:functions:${name}:${key('shop.test', 'el')}.json`

    expect(name).toBe('builderTheme')
    expect(key('shop.test', 'el')).not.toBe(key('shop.test', 'en'))
    expect(key('shop.test', 'el')).not.toBe(key('other.test', 'el'))
    expect(cacheKeyBelongsToHost(stored, 'shop.test')).toBe(true)
    expect(cacheKeyBelongsToHost(stored, 'other.test')).toBe(false)
  })
})

// A release is the only thing that changes the published theme, and Django's
// `builder` surface moves the store's epoch when one is published
// (`invalidates_tenant_config`): the entry of the old theme is then never read.
describe('the cache of the published theme and a release', () => {
  it('moves to a new entry when a purge moves the epoch of the store, and leaves another store alone', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))
    await getTenantConfig('shop.test')
    await getTenantConfig('other.test')
    const { getKey } = cacheOptionsOf(readPublishedTheme)
    const key = (host: string) => getKey!(host, 'el') as string
    const before = { shop: key('shop.test'), other: key('other.test') }

    await invalidateTenantConfigs('shop.test')
    await getTenantConfig('shop.test')

    expect(key('shop.test')).not.toBe(before.shop)
    expect(key('other.test')).toBe(before.other)
  })
})

describe('requestStoreTheme', () => {
  const eventOf = (schemaName: string) => createTestEvent({ context: { tenant: { schemaName }, locale: 'el' } })

  it('is the published theme', async () => {
    backend.reply(summary(PUBLISHED))

    expect(await requestStoreTheme(eventOf('demo'))).toEqual(PUBLISHED)
  })

  it('reads it once for the request, whoever asks', async () => {
    backend.reply(summary(PUBLISHED))
    const event = eventOf('demo')

    await Promise.all([requestStoreTheme(event), requestStoreTheme(event)])
    await requestStoreTheme(event)

    expect(backend.requests).toHaveLength(1)
  })

  it.each([
    ['Groove Volt', 'demo', 'volt'],
    ['webside\'s own design', 'webside', null],
  ] as const)('is %s\'s own theme for a store with none, and the render is not degraded', async (_label, schemaName, design) => {
    backend.reply(summary(null))
    const event = eventOf(schemaName)

    expect(await requestStoreTheme(event)).toEqual(themeDefaultsFor(design))
    expect(event.context.degradedRender).toBeUndefined()
  })

  it.each([
    ['Groove Volt', 'demo', 'volt'],
    ['webside\'s own design', 'webside', null],
  ] as const)('is %s\'s own theme when the read fails, and keeps the render out of every cache', async (_label, schemaName, design) => {
    backend.reply(jsonResponse({ detail: 'Bad gateway.' }, 502))
    const event = eventOf(schemaName)
    event.node.res.statusCode = 200

    expect(await requestStoreTheme(event)).toEqual(themeDefaultsFor(design))
    expect(event.context.degradedRender).toEqual({ status: 200 })
    expect(event.node.res.statusCode).toBe(DEGRADED_RENDER_STATUS)
    expect(loggerOf(event).error).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ action: 'store-theme:unavailable', store: schemaName }))
  })
})
