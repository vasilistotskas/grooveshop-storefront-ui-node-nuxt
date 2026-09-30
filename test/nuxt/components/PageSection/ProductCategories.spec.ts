import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProductCategories from '~/components/PageSection/ProductCategories.vue'

interface Entry { id: number, label: string, slug: string, to: string, children: Entry[] }

const categories = ref<Entry[]>([])
mockNuxtImport('useCategoryMenu', () => () => ({ categories }))

const entry = (id: number, label: string, children: Entry[] = []): Entry =>
  ({ id, label, slug: `c-${id}`, to: `/products/category/${id}/c-${id}`, children })

/** Stands in for a tile: renders the category's label. */
const TileStub = defineComponent({
  props: { category: { type: Object, required: true } },
  setup: props => () => h('li', { 'data-category': (props.category as Entry).label }),
})

const mountBand = (props: Record<string, unknown> = {}) =>
  mountSuspended(ProductCategories, { route: false, props, global: { stubs: { PageSectionCategoryTile: TileStub } } })

const tiles = (wrapper: Awaited<ReturnType<typeof mountBand>>) =>
  wrapper.findAll('[data-category]').map(li => li.attributes('data-category'))

describe('PageSection/ProductCategories', () => {
  beforeEach(() => {
    categories.value = []
  })

  it('draws the roots when the catalogue has several', async () => {
    categories.value = [entry(1, 'Ήχος'), entry(2, 'Θήκες')]

    const wrapper = await mountBand()

    expect(tiles(wrapper)).toEqual(['Ήχος', 'Θήκες'])
  })

  it('draws the CHILDREN when everything hangs under one root', async () => {
    // A single root is not a choice: the band would offer one tile
    // whose only job is to open the tree.
    categories.value = [entry(1, 'Αξεσουάρ', [entry(2, 'Φορτιστές'), entry(3, 'Καλώδια')])]

    const wrapper = await mountBand()

    expect(tiles(wrapper)).toEqual(['Φορτιστές', 'Καλώδια'])
  })

  it('draws the chosen parent\'s children, capped at the limit', async () => {
    categories.value = [
      entry(1, 'Ήχος'),
      entry(2, 'Θήκες', [entry(3, 'Δερμάτινες'), entry(4, 'Σιλικόνης'), entry(5, 'Πορτοφόλι')]),
    ]

    const wrapper = await mountBand({ parentId: 2, limit: 2 })

    expect(tiles(wrapper)).toEqual(['Δερμάτινες', 'Σιλικόνης'])
  })

  it('renders nothing for a store with no categories', async () => {
    const wrapper = await mountBand()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
