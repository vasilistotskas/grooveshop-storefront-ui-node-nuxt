/**
 * The PWA manifest: tenant fields (storeName, accentHex, faviconUrl,
 * defaultLocale) override the platform defaults, and — since the route
 * is bypassed in 0.tenant.ts — it resolves the tenant itself when the
 * context has none. Another store's brand must never appear in a
 * tenant's install surface.
 */
import { describe, expect, it } from 'vitest'
import { createSiteConfigStack } from 'site-config-stack'
import handler from '~~/server/routes/manifest.webmanifest.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callRoute, jsonResponse } from '~~/test/helpers/nitro'

const route = '/manifest.webmanifest'
const HOST = 'aurora.test'

const PLATFORM_ICONS = [
  '/platform-favicon/android-icon-192x192.png',
  '/platform-favicon/android-icon-512x512.png',
  '/platform-favicon/android-icon-maskable-512x512.png',
]

/** nuxt-site-config's stack as its middleware leaves it on the event. */
function platformSiteConfig() {
  const stack = createSiteConfigStack()
  stack.push({ name: 'Platform Store', description: 'Default description', defaultLocale: 'en' })
  return stack
}

async function manifest(tenant?: Record<string, unknown>) {
  const response = await callRoute(handler, {
    route,
    host: HOST,
    headers: { 'x-forwarded-host': 'evil.example' },
    context: { siteConfig: platformSiteConfig(), ...(tenant ? { tenant } : {}) },
  })
  expect(response.headers.get('content-type')).toBe('application/manifest+json')
  return response.body
}

const tenant = (overrides: Record<string, unknown> = {}) => validTenantConfig(HOST, {
  storeName: 'Aurora Store',
  storeDescription: '',
  faviconUrl: '',
  accentHex: '',
  ...overrides,
})

describe('GET /manifest.webmanifest', () => {
  it('uses the platform defaults and icons when no tenant resolves', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    const body = await manifest()

    expect(body).toMatchObject({ name: 'Platform Store', description: 'Default description', theme_color: '#1a202c', lang: 'en' })
    expect(body.icons.map((icon: { src: string }) => icon.src)).toEqual(PLATFORM_ICONS)
    // Resolved for the Host, never for a caller-supplied X-Forwarded-Host.
    expect(backend.lastRequest.query).toEqual({ domain: HOST })
  })

  it('resolves the tenant for the request host when the context has none', async () => {
    backend.reply(tenant({ storeName: 'Resolved Store' }))

    const body = await manifest()

    expect(body.name).toBe('Resolved Store')
    expect(body.icons).toEqual([])
  })

  it('uses the tenant in context without a lookup', async () => {
    const body = await manifest(tenant({ storeName: 'Webside Store' }))

    expect(body.name).toBe('Webside Store')
    expect(backend.requests).toEqual([])
  })

  it.each([
    ['Webside Store', 'Webside Stor'],
    ['Acme — Handmade Goods', 'Acme'],
    ['Delta | Sigma', 'Delta'],
    ['Short', 'Short'],
  ])('derives short_name from %j as %j (first segment, 12 characters)', async (storeName, shortName) => {
    const body = await manifest(tenant({ storeName }))

    expect(body.name).toBe(storeName)
    expect(body.short_name).toBe(shortName)
  })

  it.each([['#FF5733'], ['FF5733']])('uses the tenant accent %j as a full CSS theme_color', async (accentHex) => {
    const body = await manifest(tenant({ accentHex }))

    expect(body.theme_color).toBe('#FF5733')
  })

  it('prefers the tenant description and locale, falling back to the site config', async () => {
    expect(await manifest(tenant({ storeDescription: 'A tenant-branded store', defaultLocale: 'el' })))
      .toMatchObject({ description: 'A tenant-branded store', lang: 'el' })
    expect((await manifest(tenant())).description).toBe('Default description')
  })

  it('ships NO icons for an unbranded tenant that is not the platform', async () => {
    const body = await manifest(tenant({ isPlatformStorefront: false }))

    expect(body.icons).toEqual([])
  })

  it('ships the platform icons for the platform storefront, even on its own domain', async () => {
    // The row flag decides, not the absence of a primaryDomain.
    const body = await manifest(tenant({ primaryDomain: 'grooveshop.test', isPlatformStorefront: true }))

    expect(body.icons.map((icon: { src: string }) => icon.src)).toEqual(PLATFORM_ICONS)
  })

  it('uses the tenant favicon as a single sizeless icon', async () => {
    // Its real dimensions are unknown here, so declaring sizes (or a
    // maskable safe zone) would be a lie Chrome rejects.
    const faviconUrl = 'https://aurora.test/tenant-icon.png'

    const body = await manifest(tenant({ faviconUrl }))

    expect(body.icons).toEqual([{ src: faviconUrl, purpose: 'any', type: 'image/png' }])
  })

  it('infers the icon type from the favicon extension, omitting it when unknown', async () => {
    expect((await manifest(tenant({ faviconUrl: 'https://aurora.test/icon.svg' }))).icons[0].type).toBe('image/svg+xml')
    expect((await manifest(tenant({ faviconUrl: 'https://aurora.test/icon' }))).icons[0]).not.toHaveProperty('type')
  })
})
