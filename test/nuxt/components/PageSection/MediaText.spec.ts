import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import MediaText from '~/components/PageSection/MediaText.vue'

describe('PageSection/MediaText', () => {
  it('draws its heading and names the picture with it', async () => {
    const wrapper = await mountSuspended(MediaText, {
      route: false,
      props: { heading: 'Η ιστορία μας', imageUrl: '/img/story.jpg' },
    })

    expect(wrapper.get('h2').text()).toBe('Η ιστορία μας')
    expect(wrapper.get('img').attributes('alt')).toBe('Η ιστορία μας')
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
