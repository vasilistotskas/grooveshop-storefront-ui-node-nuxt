import { describe, it, expect } from 'vitest'
import {
  buildMediaStreamImageUrl,
  extractMediaStreamPath,
  mediaStreamBaseUrl,
  SEARCH_IMAGE_VARIANT,
} from '~~/shared/utils/mediaStream'
import type { MediaStreamVariant } from '~~/shared/utils/mediaStream'

const BASE = 'https://assets.shop.test/media_stream-image'
const VARIANT: MediaStreamVariant = {
  width: 440,
  height: 247,
  fit: 'cover',
  position: 'attention',
  background: 'transparent',
  trimThreshold: 0,
  quality: 80,
  format: 'webp',
}

describe('mediaStreamBaseUrl', () => {
  it('serves a store from its own assets domain, on the service\'s path', () => {
    expect(mediaStreamBaseUrl('assets.shop.test', 'https://assets.platform.test/media_stream-image'))
      .toBe('https://assets.shop.test/media_stream-image')
  })

  it.each([['empty', ''], ['null', null], ['missing', undefined]])(
    'falls back to the configured platform URL when the assets domain is %s',
    (_case, domain) => {
      expect(mediaStreamBaseUrl(domain, 'https://assets.platform.test/media_stream-image'))
        .toBe('https://assets.platform.test/media_stream-image')
    },
  )

  it('is empty when nothing is configured', () => {
    expect(mediaStreamBaseUrl(undefined, undefined)).toBe('')
  })
})

describe('extractMediaStreamPath', () => {
  it('keeps only the path of a full URL', () => {
    expect(extractMediaStreamPath('http://localhost:3003/media_stream-image')).toBe('/media_stream-image')
  })

  it('defaults to the service\'s route', () => {
    expect(extractMediaStreamPath(undefined)).toBe('/media_stream-image')
  })
})

describe('buildMediaStreamImageUrl', () => {
  it('writes every segment the service\'s route requires', () => {
    expect(buildMediaStreamImageUrl(BASE, 'media/acme/uploads/products/x.jpg', VARIANT))
      .toBe(`${BASE}/media/acme/uploads/products/x.jpg/440/247/cover/attention/transparent/0/80.webp`)
  })

  it('encodes a Greek filename once, whether it arrives raw or already encoded', () => {
    const expected = `${BASE}/media/acme/uploads/products/%CE%BA%CE%BB%CE%B9%CF%80.png/440/247/cover/attention/transparent/0/80.webp`

    expect(buildMediaStreamImageUrl(BASE, 'media/acme/uploads/products/κλιπ.png', VARIANT)).toBe(expected)
    expect(buildMediaStreamImageUrl(BASE, 'media/acme/uploads/products/%CE%BA%CE%BB%CE%B9%CF%80.png', VARIANT)).toBe(expected)
  })

  it('keeps an absolute source\'s own origin and ignores the base', () => {
    expect(buildMediaStreamImageUrl(BASE, 'https://assets.other.test/media_stream-image/media/acme/uploads/x.jpg', VARIANT))
      .toBe('https://assets.other.test/media_stream-image/media/acme/uploads/x.jpg/440/247/cover/attention/transparent/0/80.webp')
  })

  it('builds a root-relative URL when the base has no origin', () => {
    expect(buildMediaStreamImageUrl('/media_stream-image', 'media/acme/uploads/x.jpg', VARIANT))
      .toBe('/media_stream-image/media/acme/uploads/x.jpg/440/247/cover/attention/transparent/0/80.webp')
  })

  it('writes string modifiers as given', () => {
    expect(buildMediaStreamImageUrl(BASE, 'media/acme/uploads/x.jpg', { ...VARIANT, width: '300', quality: '85' }))
      .toBe(`${BASE}/media/acme/uploads/x.jpg/300/247/cover/attention/transparent/0/85.webp`)
  })
})

describe('SEARCH_IMAGE_VARIANT', () => {
  // Byte-for-byte the agent gateway's FEED_IMAGE_URL_TEMPLATE suffix, so the
  // sitemap and the Google / Meta feeds name each product image by one URL.
  it('matches the catalogue feeds\' image variant', () => {
    expect(buildMediaStreamImageUrl(BASE, 'media/acme/uploads/x.jpg', SEARCH_IMAGE_VARIANT))
      .toBe(`${BASE}/media/acme/uploads/x.jpg/1000/1000/contain/center/FFFFFF/5/85.jpeg`)
  })
})
