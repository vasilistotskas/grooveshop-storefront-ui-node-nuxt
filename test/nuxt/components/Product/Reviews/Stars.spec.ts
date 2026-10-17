import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Stars from '~/components/Product/Reviews/Stars.vue'

describe('Product/Reviews/Stars', () => {
  it('reads as one image naming the rating out of five, never as five stars', async () => {
    const wrapper = await mountSuspended(Stars, { route: false, props: { rate: 7 } })

    const image = wrapper.get('[role="img"]')
    expect(image.attributes('aria-label')).toBe('Βαθμολογία 3,5 στα 5')
    expect(image.find('[aria-hidden="true"]').exists()).toBe(true)
  })

  it('halves the model\'s 1..10 scale and keeps the half star of an average', async () => {
    const wrapper = await mountSuspended(Stars, { route: false, props: { rate: 8.6 } })

    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Βαθμολογία 4,3 στα 5')
  })
})
