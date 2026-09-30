import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { RouteLocationNormalized } from 'vue-router'
import b2bEnabled from '~/middleware/b2b-enabled'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The wholesale programme is the one gate that fails CLOSED on every
 * doubt: plan flag off, setting off, no row, or a settings outage all
 * hide the page, because exposing wholesale prices to a store that has
 * not switched them on is the failure that matters here.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const SETTINGS = '/api/settings/public'
const to = { path: '/account/business', fullPath: '/account/business' } as RouteLocationNormalized

describe('b2b-enabled middleware', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant({ b2bEnabled: true })
  })

  it('404s without reading settings when the plan has no B2B', async () => {
    setTenant({ b2bEnabled: false })
    api.routes({ [SETTINGS]: { settings: { B2B_WHOLESALE_ENABLED: 'True' } } })

    await expect(b2bEnabled(to, to)).rejects.toMatchObject({ statusCode: 404 })
    expect(api.callsTo(SETTINGS)).toEqual([])
  })

  it('serves the page when the plan and the setting are both on', async () => {
    api.routes({ [SETTINGS]: { settings: { B2B_WHOLESALE_ENABLED: 'True' } } })

    await expect(b2bEnabled(to, to)).resolves.toBeUndefined()
  })

  it.each([
    ['the setting is off', { settings: { B2B_WHOLESALE_ENABLED: 'False' } }],
    ['the store has no row for it', { settings: {} }],
    ['the settings cannot be read', () => { throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 }) }],
  ])('404s when %s', async (_case, answer) => {
    api.routes({ [SETTINGS]: answer })

    await expect(b2bEnabled(to, to)).rejects.toMatchObject({ statusCode: 404 })
  })
})
