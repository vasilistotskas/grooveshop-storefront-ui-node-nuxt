import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MenuPicture from '~/components/variants/webside/Page/MenuPicture.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * A category's picture in webside's header panels and phone menu, drawn by
 * what it is: an SVG is an icon (whole, inset, on the secondary fill), a
 * photograph fills its tile. Every store's pictures go through it, so the
 * rule is the picture's type, never a store's file names.
 */
const mountPicture = (src: string, size = 96) =>
  mountSuspended(MenuPicture, { route: false, props: { src, size }, attrs: { class: 'size-24' } })

describe('webside Page/MenuPicture', () => {
  beforeEach(() => {
    setTenant()
  })

  // Topic icons are white glyphs that are not square (robot 640x512):
  // `cover` cut their sides and the light tile hid them.
  it('draws an SVG whole, inset, on the secondary fill', async () => {
    const wrapper = await mountPicture('media/test/uploads/blog/robot-solid.svg')

    const tile = wrapper.get('span')
    expect(tile.classes()).toEqual(expect.arrayContaining(['size-24', 'bg-secondary', 'place-items-center']))
    const img = tile.get('img')
    // 60% of the 96px tile (`size-3/5`), contained on a transparent ground.
    expect(img.attributes('src')).toMatch(/robot-solid\.svg\/58\/58\/contain\/[^/]+\/transparent\//)
    expect(img.attributes('srcset')).toMatch(/\/116\/116\/contain\/.* 2x/)
    expect(img.classes()).toEqual(expect.arrayContaining(['size-3/5', 'object-contain']))
    expect(img.attributes('alt')).toBe('')
  })

  it('crops a photograph to fill its tile', async () => {
    const wrapper = await mountPicture('media/test/uploads/categories/cables.png', 44)

    expect(wrapper.find('span').exists()).toBe(false)
    const img = wrapper.get('img')
    expect(img.attributes('src')).toMatch(/cables\.png\/44\/44\/cover\//)
    expect(img.classes()).toEqual(expect.arrayContaining(['size-24', 'object-cover', 'bg-elevated']))
    expect(img.attributes('alt')).toBe('')
  })
})
