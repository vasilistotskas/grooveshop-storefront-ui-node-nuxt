import { describe, expect, it } from 'vitest'
import {
  pageTypePublishedForHost,
  publicSettingsForHost,
  publishedContentLocalesForHost,
  settingEnabledForHost,
} from '~~/server/utils/tenantSetting'
import { backend, jsonResponse } from '~~/test/helpers/nitro'

/**
 * These readers serve the sitemap and feeds, which have no tenant
 * context of their own: the host is passed in and sent as
 * X-Forwarded-Host, or Django answers from the public schema. They fail
 * CLOSED — a feed that fails open publishes a URL its own gate 404s.
 */
const API = 'http://backend.test/api/v1'

describe('publicSettingsForHost', () => {
  it('reads the bulk public settings as the given store', async () => {
    backend.reply({ settings: { BLOG_ENABLED: 'True' } })

    await expect(publicSettingsForHost('webside.gr', API)).resolves.toEqual({ BLOG_ENABLED: 'True' })
    expect(backend.lastRequest.path).toBe(`${API}/settings/public`)
    expect(backend.lastRequest.method).toBe('GET')
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('webside.gr')
  })

  it('sends no X-Forwarded-Host without a host', async () => {
    backend.reply({ settings: {} })

    await publicSettingsForHost('', API)

    expect(backend.lastRequest.headers.has('x-forwarded-host')).toBe(false)
  })

  it.each([
    ['a 5xx', () => backend.reply(jsonResponse({ detail: 'x' }, 503))],
    ['a network failure', () => backend.reply(() => {
      throw new TypeError('fetch failed')
    })],
  ])('fails closed (null) on %s', async (_label, arrange) => {
    arrange()

    await expect(publicSettingsForHost('webside.gr', API)).resolves.toBeNull()
  })
})

describe('settingEnabledForHost', () => {
  it.each([
    ['True', true],
    [' yes ', true],
    ['1', true],
    ['False', false],
    ['0', false],
    ['', false],
  ])('reads %j as %s', async (raw, enabled) => {
    backend.reply({ settings: { GIFT_CARDS: raw } })

    await expect(settingEnabledForHost('webside.gr', API, 'GIFT_CARDS')).resolves.toBe(enabled)
  })

  it('is off for a missing row and for an unreadable endpoint', async () => {
    backend.replyOnce({ settings: {} })
    await expect(settingEnabledForHost('webside.gr', API, 'GIFT_CARDS')).resolves.toBe(false)

    backend.reply(jsonResponse({ detail: 'x' }, 500))
    await expect(settingEnabledForHost('webside.gr', API, 'GIFT_CARDS')).resolves.toBe(false)
  })
})

describe('pageTypePublishedForHost', () => {
  it('is true only for a layout Django reports as published, read as the store', async () => {
    backend.replyOnce({ isPublished: true })
    backend.replyOnce({ isPublished: false })

    await expect(pageTypePublishedForHost('webside.gr', API, 'about')).resolves.toBe(true)
    await expect(pageTypePublishedForHost('webside.gr', API, 'vision')).resolves.toBe(false)
    backend.replyOnce({})
    await expect(pageTypePublishedForHost('webside.gr', API, 'why-microlearning')).resolves.toBe(false)
    expect(backend.requests.map(request => request.path)).toEqual([`${API}/page-config/about`, `${API}/page-config/vision`, `${API}/page-config/why-microlearning`])
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('webside.gr')
  })

  it('is false for the normal "no published layout" 404', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    await expect(pageTypePublishedForHost('webside.gr', API, 'about')).resolves.toBe(false)
  })
})

describe('publishedContentLocalesForHost', () => {
  it('maps each published slug to the locales it is written in, asking for 100 per page', async () => {
    backend.reply({
      results: [
        { slug: 'terms-of-use', translations: { el: {}, en: {} } },
        { slug: 'privacy-policy', translations: { el: {} } },
        { slug: 'shipping', translations: null },
      ],
    })

    const pages = await publishedContentLocalesForHost('webside.gr', API)

    expect(pages).toEqual(new Map([
      ['terms-of-use', new Set(['el', 'en'])],
      ['privacy-policy', new Set(['el'])],
      ['shipping', new Set()],
    ]))
    expect(backend.lastRequest.path).toBe(`${API}/content-page`)
    // The endpoint's default page is 12.
    expect(backend.lastRequest.query).toEqual({ pageSize: '100' })
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('webside.gr')
  })

  it('fails closed (null) when the list cannot be read', async () => {
    backend.reply(jsonResponse({ detail: 'x' }, 502))

    await expect(publishedContentLocalesForHost('webside.gr', API)).resolves.toBeNull()
  })
})
