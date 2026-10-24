import { describe, expect, it } from 'vitest'
import { shareImageMeta } from '~/utils/shareImage'

describe('app/utils/shareImage', () => {
  it('shares the store\'s logo, named by the store', () => {
    expect(shareImageMeta('https://shop.test/logo.png', 'Shop')).toEqual({ ogImage: 'https://shop.test/logo.png', ogImageAlt: 'Shop' })
  })

  it('removes both tags for a store without a logo, never prints them empty', () => {
    expect(shareImageMeta('', 'Shop')).toEqual({ ogImage: null, ogImageAlt: null })
  })
})
