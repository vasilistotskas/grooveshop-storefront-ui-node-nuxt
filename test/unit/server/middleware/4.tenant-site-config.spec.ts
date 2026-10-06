/**
 * A read-back test: `getSiteConfig`'s stack RETURNS the tenant's values
 * after the middleware runs, not merely "update was called". A previous
 * implementation assigned a plain object to `event.context.siteConfig`,
 * which silently broke every consumer even though the middleware "ran
 * fine".
 *
 * The stack is the real `site-config-stack` nuxt-site-config uses; the
 * platform layer below is what its `init` middleware pushes.
 */
import { describe, it, expect } from 'vitest'
import { createSiteConfigStack, SiteConfigPriority } from 'site-config-stack'
import type { SiteConfigStack } from 'site-config-stack'
import middleware from '~~/server/middleware/4.tenant-site-config'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'

const PLATFORM_LAYER = {
  _context: 'runtimeEnv',
  _priority: SiteConfigPriority.runtime,
  url: 'https://platform.test',
  name: 'Platform',
  description: 'Platform-wide description',
}

/** Init ran first (the dev order): the stack already holds the platform layer. */
async function resolveAfterInit(tenant?: Record<string, unknown>) {
  const siteConfig = createSiteConfigStack()
  siteConfig.push(PLATFORM_LAYER)
  const event = createTestEvent({ context: { tenant, siteConfig } })
  await callHandler(middleware, event)
  return (event.context.siteConfig as SiteConfigStack).get()
}

describe('server/middleware/4.tenant-site-config', () => {
  it('leaves the platform config when there is no tenant', async () => {
    expect(await resolveAfterInit(undefined)).toMatchObject({ url: 'https://platform.test', name: 'Platform' })
  })

  it('leaves the platform config when the tenant has no primaryDomain', async () => {
    expect(await resolveAfterInit({ storeName: 'Acme' })).toMatchObject({ url: 'https://platform.test', name: 'Platform' })
  })

  it('resolves the tenant url and store name', async () => {
    const resolved = await resolveAfterInit({ primaryDomain: 'acme.example', storeName: 'Acme Store', name: 'acme' })

    expect(resolved.url).toBe('https://acme.example')
    expect(resolved.name).toBe('Acme Store')
  })

  it('falls back to tenant.name when storeName is empty', async () => {
    expect((await resolveAfterInit({ primaryDomain: 'acme.example', storeName: '', name: 'acme' })).name).toBe('acme')
  })

  it('overrides the description when the tenant provides one', async () => {
    const resolved = await resolveAfterInit({ primaryDomain: 'acme.example', storeName: 'Acme', storeDescription: 'Acme tenant description' })

    expect(resolved.description).toBe('Acme tenant description')
  })

  it.each([
    ['en', 'English description'],
    ['el', 'Ελληνική περιγραφή'],
    ['de', 'Ελληνική περιγραφή'],
  ])('resolves the description for the request locale %s', async (locale, expected) => {
    const siteConfig = createSiteConfigStack()
    siteConfig.push(PLATFORM_LAYER)
    const event = createTestEvent({
      context: {
        locale,
        siteConfig,
        tenant: {
          primaryDomain: 'acme.example',
          storeName: 'Acme',
          storeDescription: 'Ελληνική περιγραφή',
          storeDescriptionI18n: { en: 'English description' },
        },
      },
    })
    await callHandler(middleware, event)

    expect((event.context.siteConfig as SiteConfigStack).get().description).toBe(expected)
  })

  it('keeps the platform description when the tenant has none', async () => {
    expect((await resolveAfterInit({ primaryDomain: 'acme.example', storeName: 'Acme' })).description).toBe('Platform-wide description')
  })

  it('wins even when the platform layer is pushed AFTER it (the production Nitro order)', async () => {
    // In the production build this middleware runs before
    // nuxt-site-config's init, which pushes its layer later. Unprioritised,
    // that buried every tenant's url/name under the platform's (staging
    // tenant #2, 2026-08-19); the explicit priority must win.
    const event = createTestEvent({ context: { tenant: { primaryDomain: 'acme.example', storeName: 'Acme Store' } } })
    await callHandler(middleware, event)
    const siteConfig = event.context.siteConfig as SiteConfigStack
    siteConfig.push(PLATFORM_LAYER)

    const resolved = siteConfig.get()

    expect(resolved.url).toBe('https://acme.example')
    expect(resolved.name).toBe('Acme Store')
    expect(resolved.description).toBe('Platform-wide description')
  })
})
