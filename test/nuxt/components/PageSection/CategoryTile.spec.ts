import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CategoryTile from '~/components/PageSection/CategoryTile.vue'

describe('PageSection/CategoryTile', () => {
  it('prints the category\'s product count beside its name', async () => {
    const wrapper = await mountSuspended(CategoryTile, {
      route: false,
      props: {
        category: { id: 1, slug: 'charging', label: 'Φόρτιση', to: '/products/category/1/charging', imagePath: '', productCount: 28, children: [] },
      },
    })

    const line = wrapper.get('p').text().replace(/\s+/g, ' ')
    expect(line).toContain('Φόρτιση')
    expect(line).toContain('28')
    expect(line).toContain('προϊόντα')
  })
})
