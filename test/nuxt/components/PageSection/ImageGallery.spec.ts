import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { ResolvedImage } from '~~/shared/types/builderData'
import { makeResolvedImage } from '~~/test/fixtures/media'
import ImageGallery from '~/components/PageSection/ImageGallery.vue'
import EkfyGallery from '~/components/PageSection/variants/ekfyseosfyteias/ImageGallery.vue'

type Item = { image?: ResolvedImage, imageDecorative?: boolean, caption?: string }

describe.each([['default', ImageGallery], ['ekfyseosfyteias', EkfyGallery]])('%s image_gallery', (_design, Gallery) => {
  const mountGallery = (items: Item[]) => mountSuspended(Gallery, { route: false, props: { items } })

  it('draws each picture with the description of its image and its caption', async () => {
    const wrapper = await mountGallery([{ image: makeResolvedImage('https://assets.example.test/a.jpg', 'Μια ελιά'), caption: 'Το κτήμα' }])

    expect(wrapper.get('img').attributes('alt')).toBe('Μια ελιά')
    expect(wrapper.get('figcaption').text()).toBe('Το κτήμα')
  })

  it('draws a decorative picture with an empty description', async () => {
    const wrapper = await mountGallery([{ image: makeResolvedImage('https://assets.example.test/a.jpg', 'Μια ελιά'), imageDecorative: true }])

    expect(wrapper.get('img').attributes('alt')).toBe('')
  })

  it('leaves out a picture whose image is gone and keeps the rest', async () => {
    const wrapper = await mountGallery([
      { image: { status: 'missing' }, caption: 'Χαμένη' },
      { image: makeResolvedImage('https://assets.example.test/b.jpg', 'Μια ελιά') },
    ])

    expect(wrapper.findAll('img')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Χαμένη')
  })

  it('is absent when no picture can be drawn', async () => {
    const wrapper = await mountGallery([{ image: { status: 'failed' }, caption: 'Χαμένη' }])

    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.find('figure').exists()).toBe(false)
    expect(wrapper.text().trim()).toBe('')
  })
})
