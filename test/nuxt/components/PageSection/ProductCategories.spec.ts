import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductCategories from '~/components/PageSection/ProductCategories.vue'

/** A category as the page route hands it over (the fields a tile draws). */
const category = (id: number, name: string): ProductCategory => ({
  id,
  slug: `c-${id}`,
  mainImagePath: `media/uploads/c-${id}.jpg`,
  recursiveProductCount: id * 2,
  translations: { el: { name } },
}) as unknown as ProductCategory

/** The `categories` data setting as the page route hands it over. */
const categories = (...items: ProductCategory[]) => ({
  status: items.length ? 'ok' : 'empty',
  items,
  total: items.length,
  descriptor: { mode: 'roots', limit: 8 },
}) as ResolvedQuery<ProductCategory, DataDescriptor<'category'>>

/** Stands in for a tile: renders the category's label and where it goes. */
const TileStub = defineComponent({
  props: { category: { type: Object, required: true } },
  setup: props => () => h('li', {
    'data-category': (props.category as { label: string }).label,
    'data-to': (props.category as { to: string }).to,
  }),
})

const mountBand = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductCategories, { route: false, props: { categories: categories(), ...props }, global: { stubs: { PageSectionCategoryTile: TileStub } } })

const tiles = (wrapper: Awaited<ReturnType<typeof mountBand>>) =>
  wrapper.findAll('[data-category]').map(li => li.attributes('data-category'))

/**
 * The way into the catalogue. The categories arrive read (the page route
 * resolved the rule: the main categories, or the children of one), so the
 * band fetches nothing and draws what it is handed.
 */
describe('PageSection/ProductCategories', () => {
  it('draws a tile for each category it was given, named in the page\'s language, in the order it was given', async () => {
    const wrapper = await mountBand({ categories: categories(category(1, 'Ήχος'), category(2, 'Θήκες')) })

    expect(tiles(wrapper)).toEqual(['Ήχος', 'Θήκες'])
  })

  it('sends each tile to its category\'s page', async () => {
    const wrapper = await mountBand({ categories: categories(category(7, 'Ήχος')) })

    expect(wrapper.get('[data-category]').attributes('data-to')).toBe('/products/category/7/c-7')
  })

  it('uses the operator\'s heading over the default', async () => {
    const wrapper = await mountBand({ categories: categories(category(1, 'Ήχος')), heading: 'Αγόρασε ανά είδος' })

    expect(wrapper.find('h2').text()).toBe('Αγόρασε ανά είδος')
  })

  it('renders nothing for a store with no categories', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
