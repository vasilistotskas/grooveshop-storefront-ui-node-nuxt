/**
 * The PWA manifest: tenant fields (storeName, faviconUrl, defaultLocale)
 * and the accent of the store's published theme (theme_color) override the
 * platform defaults, and — since the route
 * is bypassed in 0.tenant.ts — it resolves the tenant itself when the
 * context has none. Another store's brand must never appear in a
 * tenant's install surface.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createSiteConfigStack } from 'site-config-stack'
import handler from '~~/server/routes/manifest.webmanifest.get'
import { PLATFORM_THEME_COLOR } from '~~/shared/theme/constants'
import { themeDefaultsFor } from '~~/shared/theme/defaults'
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

/** What Django answers: the store behind the host (none by default) and the theme of its release (none by default). */
const upstream: { tenant?: Record<string, unknown>, theme: unknown } = { theme: null }

beforeEach(() => {
  upstream.tenant = undefined
  upstream.theme = null
  backend.reply(({ path }) => {
    if (path.endsWith('/tenant/resolve')) return upstream.tenant ?? jsonResponse({ detail: 'Not found.' }, 404)
    if (path.endsWith('/builder/published')) {
      return {
        release: 1,
        locale: 'el',
        theme: upstream.theme && { key: 'theme', version: 1, sections: {}, order: [], settings: upstream.theme },
        groups: {},
        pages: [],
      }
    }
    throw new Error(`Unexpected backend request: ${path}`)
  })
})

const tenant = (overrides: Record<string, unknown> = {}) => validTenantConfig(HOST, {
  storeName: 'Aurora Store',
  storeDescription: '',
  faviconUrl: '',
  ...overrides,
})

describe('GET /manifest.webmanifest', () => {
  it('uses the platform defaults and icons when no tenant resolves', async () => {
    const body = await manifest()

    expect(body).toMatchObject({ name: 'Platform Store', description: 'Default description', theme_color: PLATFORM_THEME_COLOR, lang: 'en' })
    expect(body.icons.map((icon: { src: string }) => icon.src)).toEqual(PLATFORM_ICONS)
    // Resolved for the Host, never for a caller-supplied X-Forwarded-Host.
    expect(backend.requests.map(request => request.query)).toEqual([{ domain: HOST }])
  })

  it('resolves the tenant for the request host when the context has none', async () => {
    upstream.tenant = tenant({ storeName: 'Resolved Store', schemaName: 'demo' })

    const body = await manifest()

    expect(body.name).toBe('Resolved Store')
    // The theme is read for the store it resolved: Groove Volt's default accent.
    expect(body.theme_color).toBe('#0038e8')
    expect(body.icons).toEqual([])
  })

  it('uses the tenant in context without a lookup', async () => {
    const body = await manifest(tenant({ storeName: 'Webside Store' }))

    expect(body.name).toBe('Webside Store')
    expect(backend.requests.map(request => request.path)).not.toContainEqual(expect.stringMatching(/\/tenant\/resolve$/))
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

  it('uses the accent of the store\'s published theme, not its Tenant fields, as theme_color', async () => {
    const published = themeDefaultsFor('volt')
    upstream.theme = { ...published, colors: { ...published.colors, light: { ...published.colors.light, accent: '#b3694b' } } }

    const body = await manifest(tenant({ accentHex: '#003DFF' }))

    expect(body.theme_color).toBe('#b3694b')
  })

  it.each([['Groove Volt', 'demo', '#0038e8'], ['Webside', 'webside', '#003dff']])('uses the default accent of %s for a store with no published theme', async (_design, schemaName, accent) => {
    const body = await manifest(tenant({ schemaName }))

    expect(body.theme_color).toBe(accent)
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
