import { describe, expect, it } from 'vitest'
import { getRequestHeader } from 'h3'
import middleware from '~~/server/middleware/1.tenant-epoch'
import { getTenantConfig, invalidateTenantConfigs } from '~~/server/utils/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callHandler, createTestEvent } from '~~/test/helpers/nitro'
import { readSource } from '~~/test/helpers/sourceText'

/**
 * The epoch is a REQUEST header because Nitro's route-rule cache `varies`
 * reads request headers: a page rendered by a pod that has not seen a purge
 * is filed under the old epoch, which no updated pod reads.
 */
async function epochFor(host: string, headers: Record<string, string> = {}) {
  const event = createTestEvent({ host, headers })
  event.context.tenantHost = host
  await callHandler(middleware, event)
  return getRequestHeader(event, 'x-tenant-epoch')
}

describe('server/middleware/1.tenant-epoch', () => {
  it('stamps the epoch the pod holds for the store, and a purge moves it', async () => {
    backend.reply(({ query }) => validTenantConfig(query.domain!))
    await getTenantConfig('shop.test')
    const before = await epochFor('shop.test')

    await invalidateTenantConfigs('shop.test')
    await getTenantConfig('shop.test')

    expect(before).toBe('0.0')
    expect(await epochFor('shop.test')).not.toBe(before)
  })

  it('overwrites a client-supplied value, which would otherwise poison the cache', async () => {
    expect(await epochFor('shop.test', { 'x-tenant-epoch': 'forged' })).toBe('0.0')
  })
})

describe('nuxt.config cached routes', () => {
  // Code lines only: the comments above the rules quote the old vary list.
  const config = readSource('nuxt.config.ts')
    .split(String.fromCharCode(10))
    .filter(line => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .join(String.fromCharCode(10))

  it('vary every page cache on the epoch, beside the store and the device class', () => {
    expect(config).toMatch(/const CACHED_PAGE_VARIES = \['host', 'x-device-class', 'x-tenant-epoch'\]/)
    const uses = [...config.matchAll(/varies: (\[[^\]]*\]|[A-Z_]+)/g)].map(match => match[1]!)

    // The pages (three rule groups) and the sitemap.
    expect(uses).toHaveLength(4)
    for (const use of uses) {
      expect(use === 'CACHED_PAGE_VARIES' || use.includes('x-tenant-epoch'), use).toBe(true)
    }
  })
})
