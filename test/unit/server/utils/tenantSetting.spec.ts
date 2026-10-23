import { describe, expect, it } from 'vitest'
import {
  publishedLayoutsForHost,
  publishedContentLocalesForHost,
} from '~~/server/utils/tenantSetting'
import { backend, jsonResponse } from '~~/test/helpers/nitro'

/**
 * These readers serve the sitemap and feeds, which have no tenant
 * context of their own: the host is passed in and sent as
 * X-Forwarded-Host, or Django answers from the public schema. They fail
 * CLOSED — a feed that fails open publishes a URL its own gate 404s.
 */
const API = 'http://backend.test/api/v1'

describe('publishedLayoutsForHost', () => {
  it('reads every published layout once, as the store', async () => {
    const layouts = [
      { pageType: 'about', lastModified: '2026-10-01T08:00:00Z' },
      { pageType: 'kelari', lastModified: '2026-10-14T18:30:00Z' },
    ]
    backend.reply(layouts)

    await expect(publishedLayoutsForHost('webside.gr', API)).resolves.toEqual(layouts)
    expect(backend.requests.map(request => request.path)).toEqual([`${API}/page-config`])
    expect(backend.lastRequest.headers.get('x-forwarded-host')).toBe('webside.gr')
  })

  it('fails closed when the read fails', async () => {
    backend.reply(jsonResponse({ detail: 'x' }, 500))

    await expect(publishedLayoutsForHost('webside.gr', API)).resolves.toBeNull()
  })
})

describe('publishedContentLocalesForHost', () => {
  it('maps each published slug to the locales its body is written in, asking for 100 per page', async () => {
    backend.reply({
      results: [
        { slug: 'terms-of-use', translations: { el: { body: '<p>όροι</p>' }, en: { body: '<p>terms</p>' } } },
        // A key with an empty body is no English document.
        { slug: 'privacy-policy', translations: { el: { body: '<p>απόρρητο</p>' }, en: { title: 'Privacy', body: '<p></p>' } } },
        // Nothing written in any language: the page 404s, so no entry.
        { slug: 'returns', translations: { el: { title: 'Επιστροφές', body: '' } } },
        { slug: 'shipping', translations: null },
      ],
    })

    const pages = await publishedContentLocalesForHost('webside.gr', API)

    expect(pages).toEqual(new Map([
      ['terms-of-use', new Set(['el', 'en'])],
      ['privacy-policy', new Set(['el'])],
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
