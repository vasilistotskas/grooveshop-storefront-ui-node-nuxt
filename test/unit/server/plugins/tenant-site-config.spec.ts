/**
 * The store's site config, pushed through nuxt-site-config's
 * `site-config:init` hook, read back from the real `site-config-stack`:
 * the test is what `getSiteConfig` RETURNS, not that a push happened. A
 * previous implementation assigned a plain object to
 * `event.context.siteConfig`, which silently broke every consumer.
 *
 * The hook can run before `0.tenant.ts` (nuxt-ai-ready builds its `Link`
 * header in a handler ahead of every middleware), so the store and the
 * page locale are derived here when the middleware has not run yet.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createSiteConfigStack, SiteConfigPriority } from 'site-config-stack'
import plugin from '~~/server/plugins/tenant-site-config'
import { getTenantConfig } from '~~/server/utils/tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { createTestEvent, runNitroPlugin } from '~~/test/helpers/nitro'
import type { TestNitroApp, TestRequest } from '~~/test/helpers/nitro'

vi.mock('~~/server/utils/tenant', async importOriginal => ({
  ...await importOriginal<typeof import('~~/server/utils/tenant')>(),
  getTenantConfig: vi.fn(),
}))

const PLATFORM_LAYER = {
  _context: 'runtimeEnv',
  _priority: SiteConfigPriority.runtime,
  url: 'https://platform.test',
  name: 'Platform',
  description: 'Platform-wide description',
}

const ACME = validTenantConfig('acme.example', {
  primaryDomain: 'acme.example',
  storeName: 'Acme Store',
  name: 'acme',
  storeDescription: 'Ελληνική περιγραφή',
  storeDescriptionI18n: { en: 'English description' },
  availableLocales: ['el', 'en'],
})

let nitroApp: TestNitroApp

/** Init the request's site config as nuxt-site-config does: platform layer, then the hook. */
async function init(req: TestRequest = {}) {
  const event = createTestEvent(req)
  const siteConfig = createSiteConfigStack()
  siteConfig.push(PLATFORM_LAYER)
  await nitroApp.hooks.callHook('site-config:init', { event, siteConfig })
  return { event, resolved: siteConfig.get(), siteConfig }
}

/** End the response with `link` set, as h3 does after the module set it. */
function endWithLink(event: Awaited<ReturnType<typeof init>>['event'], link: string) {
  const res = event.node.res
  res.setHeader('link', link)
  res.end('<html>')
  return res.getHeader('link')
}

const MODULE_LINK = '<https://acme.example/index.md>; rel="alternate"; type="text/markdown", <https://acme.example/llms.txt>; rel="describedby"'

describe('server/plugins/tenant-site-config', () => {
  beforeEach(async () => {
    vi.mocked(getTenantConfig).mockResolvedValue({ type: 'not_found', config: null })
    nitroApp = await runNitroPlugin(plugin)
  })

  it('names the store the tenant middleware resolved: url and store name', async () => {
    const { resolved } = await init({ context: { tenant: ACME } })

    expect(resolved).toMatchObject({ url: 'https://acme.example', name: 'Acme Store' })
    expect(getTenantConfig).not.toHaveBeenCalled()
  })

  it('resolves the store from the Host when the middleware has not run yet', async () => {
    vi.mocked(getTenantConfig).mockResolvedValue({ type: 'ok', config: ACME })

    const { resolved } = await init({ host: 'Acme.Example:443' })

    expect(getTenantConfig).toHaveBeenCalledWith('acme.example')
    expect(resolved.url).toBe('https://acme.example')
  })

  it('keeps the platform config for an unknown host, and a store without a primary domain', async () => {
    expect((await init({ host: 'unknown.test' })).resolved).toMatchObject({ url: 'https://platform.test', name: 'Platform' })
    expect((await init({ context: { tenant: { ...ACME, primaryDomain: '' } } })).resolved.url).toBe('https://platform.test')
  })

  it('falls back to the tenant name when the store name is empty', async () => {
    expect((await init({ context: { tenant: { ...ACME, storeName: '' } } })).resolved.name).toBe('acme')
  })

  it.each([
    ['the locale the middleware stored', { context: { tenant: ACME, locale: 'en' } }, 'English description'],
    ['the page path, before the middleware ran', { url: '/en/products?page=2', context: { tenant: ACME } }, 'English description'],
    ['X-Language on an /api call', { url: '/api/products', headers: { 'x-language': 'en' }, context: { tenant: ACME } }, 'English description'],
    ['the default for an unprefixed page', { url: '/products', context: { tenant: ACME } }, 'Ελληνική περιγραφή'],
  ] as const)('describes the store in the language of %s', async (_name, req, expected) => {
    expect((await init(req)).resolved.description).toBe(expected)
  })

  it('keeps the platform description when the store has none', async () => {
    const { resolved } = await init({ context: { tenant: { ...ACME, storeDescription: '', storeDescriptionI18n: {} } } })

    expect(resolved.description).toBe('Platform-wide description')
  })

  it('wins over a platform layer pushed after it', async () => {
    const { siteConfig } = await init({ context: { tenant: ACME } })
    siteConfig.push(PLATFORM_LAYER)

    expect(siteConfig.get()).toMatchObject({ url: 'https://acme.example', name: 'Acme Store' })
  })

  describe('the Link header nuxt-ai-ready builds from it', () => {
    it('drops the links to /llms.txt and the .md twin on a store that answers both with 404', async () => {
      const { event } = await init({ context: { tenant: ACME } })

      expect(endWithLink(event, MODULE_LINK)).toBeUndefined()
    })

    it('keeps the other links on such a store', async () => {
      const { event } = await init({ context: { tenant: ACME } })

      expect(endWithLink(event, `${MODULE_LINK}, <https://acme.example/en>; rel="alternate"; hreflang="en"`))
        .toBe('<https://acme.example/en>; rel="alternate"; hreflang="en"')
    })

    it('keeps them on the platform storefront, which serves both', async () => {
      const { event } = await init({ context: { tenant: { ...ACME, isPlatformStorefront: true } } })

      expect(endWithLink(event, MODULE_LINK)).toBe(MODULE_LINK)
    })
  })
})
