import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MediaText from '~/components/PageSection/MediaText.vue'
import { makeResolvedImage } from '~~/test/fixtures/media'

describe('PageSection/MediaText', () => {
  it('draws its heading and names the picture with it', async () => {
    const wrapper = await mountSuspended(MediaText, {
      route: false,
      props: { heading: 'Η ιστορία μας', image: makeResolvedImage('/img/story.jpg') },
    })

    expect(wrapper.get('h2').text()).toBe('Η ιστορία μας')
    expect(wrapper.get('img').attributes('alt')).toBe('Η ιστορία μας')
  })

  it('names the picture by its own description first', async () => {
    const wrapper = await mountSuspended(MediaText, {
      route: false,
      props: { heading: 'Η ιστορία μας', image: makeResolvedImage('/img/story.jpg', 'Η ομάδα') },
    })

    expect(wrapper.get('img').attributes('alt')).toBe('Η ομάδα')
  })

  it('gives a decorative picture an empty description', async () => {
    const wrapper = await mountSuspended(MediaText, {
      route: false,
      props: { heading: 'Η ιστορία μας', image: makeResolvedImage('/img/story.jpg', 'Η ομάδα'), imageDecorative: true },
    })

    expect(wrapper.get('img').attributes('alt')).toBe('')
  })

  it('draws the text alone when the picture is gone', async () => {
    const wrapper = await mountSuspended(MediaText, {
      route: false,
      props: { heading: 'Η ιστορία μας', image: { status: 'missing' } },
    })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('Η ιστορία μας')
  })

  it('draws no heading without one', async () => {
    const wrapper = await mountSuspended(MediaText, { route: false, props: { body: 'Κείμενο' } })

    expect(wrapper.text()).toContain('Κείμενο')
    expect(wrapper.find('h2').exists()).toBe(false)
  })

  it('is absent with nothing to show', async () => {
    const wrapper = await mountSuspended(MediaText, { route: false, props: {} })

    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})
