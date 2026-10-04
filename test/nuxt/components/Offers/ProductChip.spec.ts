import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OffersProductChip from '~/components/Offers/ProductChip.vue'
import type { PromotionProductRef } from '~~/shared/openapi/types.gen'

/**
 * A product an offer points at, as a thumbnail that opens it. The name
 * is always in the link — read aloud, or shown beside the tile.
 */
const PRODUCT: PromotionProductRef = { id: 4, name: 'Καλώδιο USB-C', slug: 'kalodio-usb-c', mainImagePath: '' }

const mountChip = (named = false) =>
  mountSuspended(OffersProductChip, { route: false, props: { product: PRODUCT, named } })

/** What a screen reader reads for the link: its text plus the alt of any image in it. */
const readAloud = (link: { text: () => string, findAll: (selector: string) => Array<{ attributes: (name: string) => string | undefined }> }) =>
  [link.text(), ...link.findAll('img').map(img => img.attributes('alt') ?? '')].join(' ')

describe('Offers/ProductChip', () => {
  it('opens the product and names itself on hover', async () => {
    const wrapper = await mountChip()

    expect(wrapper.get('a').attributes('href')).toBe('/products/4/kalodio-usb-c')
    expect(wrapper.get('a').attributes('title')).toBe('Καλώδιο USB-C')
  })

  it('keeps the name for a screen reader but off the page when it is only a tile', async () => {
    const wrapper = await mountChip()

    expect(wrapper.get('.sr-only').text()).toBe('Καλώδιο USB-C')
  })

  it('writes the name beside the tile when asked', async () => {
    const wrapper = await mountChip(true)

    expect(wrapper.find('.sr-only').exists()).toBe(false)
    expect(wrapper.get('a').text()).toBe('Καλώδιο USB-C')
  })

  it.each([false, true])('reads the product name once, whether named is %s', async (named) => {
    const wrapper = await mountChip(named)

    expect(readAloud(wrapper.get('a')).split('Καλώδιο USB-C')).toHaveLength(2)
  })
})
