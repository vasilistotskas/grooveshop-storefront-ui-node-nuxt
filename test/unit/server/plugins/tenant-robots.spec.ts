/**
 * Regression guard: the plugin once consumed getTenantConfig's result
 * with the WRONG union shape, so every host — including each tenant's
 * own primary domain — served a blanket `Disallow: /`. Primary hosts
 * keep the module policy with a tenant-origin Sitemap line;
 * alias/unknown/error hosts get the full disallow. The tenant lookup is
 * real and the backend answers it.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/tenant-robots'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, createTestEvent, jsonResponse, runNitroPlugin } from '~~/test/helpers/nitro'
import type { TestNitroApp, TestRequest } from '~~/test/helpers/nitro'

const PLATFORM_POLICY
  = 'User-agent: *\nDisallow: /account\n\nSitemap: https://platform.example/sitemap.xml\n'
const DISALLOW_ALL = 'User-agent: *\nDisallow: /\n'

let nitroApp: TestNitroApp

async function robotsTxt(req: TestRequest) {
  const ctx = { e: createTestEvent({ url: '/robots.txt', ...req }), robotsTxt: PLATFORM_POLICY }
  await nitroApp.hooks.callHook('robots:robots-txt', ctx)
  return ctx.robotsTxt
}

describe('server/plugins/tenant-robots', () => {
  beforeEach(async () => {
    nitroApp = await runNitroPlugin(plugin)
  })

  it('keeps the platform policy and points the Sitemap at the tenant on its primary domain', async () => {
    backend.reply(validTenantConfig('acme.example'))

    expect(await robotsTxt({ host: 'acme.example' }))
      .toBe('User-agent: *\nDisallow: /account\n\nSitemap: https://acme.example/sitemap.xml\n')
  })

  it('strips the port before comparing against primaryDomain', async () => {
    backend.reply(validTenantConfig('acme.example'))

    expect(await robotsTxt({ host: 'acme.example:3000' })).toContain('Sitemap: https://acme.example/sitemap.xml')
  })

  it('disallows everything on alias domains', async () => {
    backend.reply(validTenantConfig('acme.example'))

    expect(await robotsTxt({ host: 'alias.example' })).toBe(DISALLOW_ALL)
  })

  it('judges the Host, so a forwarded primary host cannot make an alias indexable', async () => {
    backend.reply(validTenantConfig('acme.example'))

    expect(await robotsTxt({ host: 'alias.example', headers: { 'x-forwarded-host': 'acme.example' } })).toBe(DISALLOW_ALL)
    expect(backend.lastRequest.query).toEqual({ domain: 'alias.example' })
  })

  it.each([
    ['unknown hosts', jsonResponse({ detail: 'Not found.' }, 404)],
    ['transient resolution errors', jsonResponse({ detail: 'down' }, 503)],
  ])('disallows everything on %s', async (_label, reply) => {
    backend.reply(reply)

    expect(await robotsTxt({ host: 'acme.example' })).toBe(DISALLOW_ALL)
  })

  it('treats an empty primaryDomain as primary and uses the request host', async () => {
    backend.reply(validTenantConfig('acme.example', { primaryDomain: '' }))

    const robots = await robotsTxt({ host: 'acme.example' })

    expect(robots).toContain('Disallow: /account')
    expect(robots).toContain('Sitemap: https://acme.example/sitemap.xml')
  })
})
