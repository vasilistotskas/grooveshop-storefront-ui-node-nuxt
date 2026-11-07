import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { makeResolvedImage } from '~~/test/fixtures/media'
import ImageGallery from '~/components/PageSection/variants/ekfyseosfyteias/ImageGallery.vue'

/**
 * Every tile keeps the operator's own alt text and is a figure in a
 * list; the caption appears only where one was written.
 */
const ITEMS = [
  { image: makeResolvedImage('https://assets.example.test/a.jpg', 'Πίτες στο τηγάνι'), caption: 'Στον πάγκο' },
  { image: makeResolvedImage('https://assets.example.test/b.jpg', 'Ταψιά με πίτα') },
]

describe('ekfyseosfyteias image_gallery', () => {
  it('lists every photograph with its own alt text', async () => {
    const wrapper = await mountSuspended(ImageGallery, { route: false, props: { title: 'Στιγμές', items: ITEMS } })

    expect(wrapper.findAll('ul > li img').map(img => img.attributes('alt'))).toEqual(['Πίτες στο τηγάνι', 'Ταψιά με πίτα'])
    expect(wrapper.find('h2').text()).toBe('Στιγμές')
  })

  it('captions only the photographs that have a caption', async () => {
    const wrapper = await mountSuspended(ImageGallery, { route: false, props: { items: ITEMS } })

    expect(wrapper.findAll('li').map(li => li.find('figcaption').exists() ? li.find('figcaption').text() : null))
      .toEqual(['Στον πάγκο', null])
  })

  it('has no heading when the section has no title', async () => {
    const wrapper = await mountSuspended(ImageGallery, { route: false, props: { items: ITEMS } })

    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('renders nothing without photographs', async () => {
    const wrapper = await mountSuspended(ImageGallery, { route: false, props: { title: 'Στιγμές', items: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
