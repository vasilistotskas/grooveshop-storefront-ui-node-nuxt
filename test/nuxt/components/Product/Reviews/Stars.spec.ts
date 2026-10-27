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

  /** Each star's filled share, read from the amber layer's width. */
  async function fillsOf(rate: number) {
    const wrapper = await mountSuspended(Stars, { route: false, props: { rate } })
    return wrapper.findAll('[aria-hidden="true"] > span').map((star) => {
      const filled = star.find('.overflow-hidden')
      if (!filled.exists()) return 0
      return filled.classes('w-1/2') ? 0.5 : 1
    })
  }

  it.each([
    [7, [1, 1, 1, 0.5, 0]],
    [10, [1, 1, 1, 1, 1]],
    [2, [1, 0, 0, 0, 0]],
    [0, [0, 0, 0, 0, 0]],
  ])('draws the rate %d as its stars', async (rate, fills) => {
    expect(await fillsOf(rate)).toEqual(fills)
  })

  it.each([
    [8.6, [1, 1, 1, 1, 0.5]],
    [9.6, [1, 1, 1, 1, 1]],
    [8.4, [1, 1, 1, 1, 0]],
  ])('rounds the average %d to the nearest half star', async (rate, fills) => {
    expect(await fillsOf(rate)).toEqual(fills)
  })
})
