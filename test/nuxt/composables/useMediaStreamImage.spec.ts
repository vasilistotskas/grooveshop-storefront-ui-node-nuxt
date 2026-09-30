/**
 * @nuxt/image's provider base URL is fixed at build time, so the store's
 * own `assetsDomain` has to be applied here, before the provider sees the
 * src. A store without one uses the platform Media Stream path (an infra
 * endpoint, so that fallback is intentional); an absolute src is never
 * re-prefixed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

const { img } = vi.hoisted(() => ({ img: vi.fn((src: string) => `img:${src}`) }))
mockNuxtImport('useImage', () => () => img)

const PLATFORM_PATH = 'https://assets.platform.test/media_stream-image'

describe('useMediaStreamImage', () => {
  let originalPath: unknown

  beforeEach(() => {
    const config = useRuntimeConfig().public
    originalPath = config.mediaStreamPath
    config.mediaStreamPath = PLATFORM_PATH
  })

  afterEach(() => {
    useRuntimeConfig().public.mediaStreamPath = originalPath as string
  })

  describe('useMediaStreamBaseUrl', () => {
    it('serves a store from its own assets domain, on the platform\'s path', () => {
      setTenant({ assetsDomain: 'assets.shop.test' })

      expect(useMediaStreamBaseUrl().value).toBe('https://assets.shop.test/media_stream-image')
    })

    it('falls back to the platform Media Stream URL when the store has no assets domain', () => {
      setTenant({ assetsDomain: '' })

      expect(useMediaStreamBaseUrl().value).toBe(PLATFORM_PATH)
    })
  })

  describe('useMediaStreamSrc', () => {
    beforeEach(() => {
      setTenant({ assetsDomain: 'assets.shop.test' })
    })

    it('prefixes a relative src with the store\'s base URL', () => {
      expect(useMediaStreamSrc('media/test/uploads/x.jpg'))
        .toBe('https://assets.shop.test/media_stream-image/media/test/uploads/x.jpg')
    })

    it.each([
      ['absolute', 'https://cdn.test/x.jpg'],
      ['empty', ''],
      ['missing', undefined],
    ])('passes an %s src through unchanged', (_case, src) => {
      expect(useMediaStreamSrc(src)).toBe(src)
    })
  })

  describe('the image helper', () => {
    beforeEach(() => {
      setTenant({ assetsDomain: 'assets.shop.test' })
    })

    it('absolutises a relative src for the mediaStream provider', () => {
      const $img = useMediaStreamImage()

      $img('media/test/x.jpg', { width: 200 }, { provider: 'mediaStream' })

      expect(img).toHaveBeenCalledWith(
        'https://assets.shop.test/media_stream-image/media/test/x.jpg',
        { width: 200 },
        { provider: 'mediaStream' },
      )
    })

    it.each([
      ['another provider', 'media/test/x.jpg', { provider: 'ipx' as const }],
      ['no provider', 'media/test/x.jpg', undefined],
      ['an absolute src', 'https://cdn.test/x.jpg', { provider: 'mediaStream' as const }],
    ])('forwards the src untouched for %s', (_case, src, options) => {
      useMediaStreamImage()(src, undefined, options)

      expect(img).toHaveBeenCalledWith(src, undefined, options)
    })
  })
})
