/**
 * The Nuxt Image provider every `provider: 'mediaStream'` image goes
 * through. Its output is the cache key at media-stream and at the edge, so
 * a change to it re-processes every image on every store.
 */
import { describe, it, expect } from 'vitest'
import provider from '../../../../app/providers/media-stream'

const BASE = 'https://assets.shop.test/media_stream-image'

type GetImage = (src: string, options: { modifiers: Record<string, unknown>, baseURL?: string }) => { url: string }
const getImage: GetImage = (src, options) => (provider() as unknown as { getImage: GetImage }).getImage(src, options)

describe('mediaStream provider', () => {
  it('fills every route segment from its defaults', () => {
    expect(getImage('media/acme/uploads/x.jpg', { modifiers: {}, baseURL: BASE }).url)
      .toBe(`${BASE}/media/acme/uploads/x.jpg/100/100/contain/entropy/transparent/0/80.avif`)
  })

  it('writes the modifiers it is given, normalising position and background', () => {
    const { url } = getImage('media/acme/uploads/x.jpg', {
      modifiers: { width: 440, height: 247, fit: 'cover', position: 'centre', background: 'white', trimThreshold: 5, quality: 90, format: 'webp' },
      baseURL: BASE,
    })

    expect(url).toBe(`${BASE}/media/acme/uploads/x.jpg/440/247/cover/center/FFFFFF/5/90.webp`)
  })

  it('keeps a pre-absolutised source\'s own origin', () => {
    expect(getImage('https://assets.other.test/media_stream-image/media/acme/uploads/x.jpg', { modifiers: {}, baseURL: BASE }).url)
      .toBe('https://assets.other.test/media_stream-image/media/acme/uploads/x.jpg/100/100/contain/entropy/transparent/0/80.avif')
  })

  it('encodes a Greek filename once', () => {
    expect(getImage('media/acme/uploads/%CE%BA%CE%BB%CE%B9%CF%80.png', { modifiers: {}, baseURL: BASE }).url)
      .toBe(`${BASE}/media/acme/uploads/%CE%BA%CE%BB%CE%B9%CF%80.png/100/100/contain/entropy/transparent/0/80.avif`)
  })

  it('refuses a relative source with no base URL configured', () => {
    expect(() => getImage('media/acme/uploads/x.jpg', { modifiers: {} }))
      .toThrow('Media Stream base URL is not configured')
  })
})
