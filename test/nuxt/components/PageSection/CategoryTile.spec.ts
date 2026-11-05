import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CategoryTile from '~/components/PageSection/CategoryTile.vue'
import type { CategoryMenuEntry } from '~/composables/useCategoryMenu'

const category = (overrides: Partial<CategoryMenuEntry> = {}): CategoryMenuEntry => ({
  id: 1,
  slug: 'charging',
  label: 'Φόρτιση',
  to: '/products/category/1/charging',
  imagePath: 'https://assets.shop.test/media/acme/uploads/categories/charging.jpg',
  imageAlt: '',
  productCount: 28,
  children: [],
  ...overrides,
})

const mountTile = (entry: CategoryMenuEntry) =>
  mountSuspended(CategoryTile, { route: false, props: { category: entry } })

describe('PageSection/CategoryTile', () => {
  it('prints the category\'s product count beside its name', async () => {
    const wrapper = await mountTile(category())

    const line = wrapper.get('p').text().replace(/\s+/g, ' ')
    expect(line).toContain('Φόρτιση')
    expect(line).toContain('28')
    expect(line).toContain('προϊόντα')
  })

  it('describes the photograph with the alt text the store wrote', async () => {
    const wrapper = await mountTile(category({ imageAlt: 'Φορτιστές σε ξύλινο τραπέζι' }))

    expect(wrapper.get('img').attributes('alt')).toBe('Φορτιστές σε ξύλινο τραπέζι')
  })

  // The name is printed right under the photograph, so repeating it as the
  // alt text would have a screen reader say it twice.
  it('leaves the alt text empty when the store wrote none', async () => {
    const wrapper = await mountTile(category())

    expect(wrapper.get('img').attributes('alt')).toBe('')
  })
})
