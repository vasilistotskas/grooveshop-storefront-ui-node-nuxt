import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ChromeMegaMenu from '~/components/Chrome/MegaMenu.vue'

/**
 * The Shop panel: each root category heads a column linking to it and
 * its children, and the shortcuts lead to listing views that exist —
 * the offers page only for a store that runs promotions.
 */
const categories = [
  {
    id: 1,
    slug: 'charging',
    label: 'Φόρτιση',
    to: '/products/category/1/charging',
    imagePath: '',
    productCount: 0,
    children: [
      { id: 2, slug: 'cables', label: 'Καλώδια', to: '/products/category/2/cables', imagePath: '', productCount: 0, children: [] },
    ],
  },
]

const mountMenu = (offersEnabled: boolean) =>
  mountSuspended(ChromeMegaMenu, { route: false, props: { categories, offersEnabled } })

const hrefs = (wrapper: Awaited<ReturnType<typeof mountMenu>>) =>
  wrapper.findAll('a').map(link => link.attributes('href'))

describe('Chrome/MegaMenu', () => {
  it('links each root category and its children', async () => {
    const wrapper = await mountMenu(false)

    expect(hrefs(wrapper)).toEqual(expect.arrayContaining([
      '/products/category/1/charging',
      '/products/category/2/cables',
    ]))
  })

  it('offers the newest and most viewed listings', async () => {
    const wrapper = await mountMenu(false)

    expect(hrefs(wrapper)).toEqual(expect.arrayContaining([
      '/products',
      '/products?sort=-createdAt',
      '/products?sort=-viewCount',
    ]))
  })

  it('links the offers only for a store that runs promotions', async () => {
    expect(hrefs(await mountMenu(false))).not.toContain('/offers')
    expect(hrefs(await mountMenu(true))).toContain('/offers')
  })
})
