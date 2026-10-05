import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Overview from '~/components/Product/Reviews/Overview.vue'

describe('Product/Reviews/Overview', () => {
  it('draws one bar per star with its share of the reviews', async () => {
    const wrapper = await mountSuspended(Overview, {
      route: false,
      props: { average: 9, count: 4, distribution: [{ rate: 10, count: 3 }, { rate: 2, count: 1 }] },
    })

    const rows = wrapper.findAll('li').map(li => li.text().replace(/\s+/g, ' '))
    expect(rows).toHaveLength(5)
    expect(rows[0]).toContain('5★')
    expect(rows[0]).toContain('75%')
    expect(rows[4]).toContain('1★')
    expect(rows[4]).toContain('25%')
  })

  it('invites the first review when there are none', async () => {
    const wrapper = await mountSuspended(Overview, {
      route: false,
      props: { average: 0, count: 0, distribution: [] },
    })

    expect(wrapper.findAll('li')).toHaveLength(0)
    expect(wrapper.text()).toContain('Δεν υπάρχουν ακόμα αξιολογήσεις')
  })
})
