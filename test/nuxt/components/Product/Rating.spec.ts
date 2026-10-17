import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Rating from '~/components/Product/Rating.vue'

describe('Product/Rating', () => {
  it('quotes the average out of five and the count, with no /10 anywhere', async () => {
    const wrapper = await mountSuspended(Rating, { route: false, props: { average: 8.6, count: 12 } })

    expect(wrapper.text()).toBe('4,3 · 12')
    expect(wrapper.html()).not.toContain('/10')
  })

  it('names the whole rating once, for a screen reader', async () => {
    const wrapper = await mountSuspended(Rating, { route: false, props: { average: 8.6, count: 12 } })

    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Βαθμολογία 4,3 στα 5, από 12 αξιολογήσεις')
    // Neither the stars nor the figures are read a second time.
    expect(wrapper.findAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2)
  })

  it('counts out the reviews in words beside a title, as the link to them', async () => {
    const wrapper = await mountSuspended(Rating, { route: false, props: { average: 8, count: 1, href: '#reviews', verbose: true } })

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('#reviews')
    expect(wrapper.text()).toBe('4,0 · 1 αξιολόγηση')
  })

  it.each([
    ['no reviews', { average: 0, count: 0 }],
    ['no figures at all', {}],
  ])('draws nothing for a product with %s, so its card keeps no empty row', async (_name, props) => {
    const wrapper = await mountSuspended(Rating, { route: false, props })

    expect(wrapper.text()).toBe('')
    expect(wrapper.find('[aria-label]').exists()).toBe(false)
  })
})
