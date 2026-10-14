import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PartnerStrip from '~/components/PageSection/variants/ekfyseosfyteias/PartnerStrip.vue'

/**
 * The ribbon is a list of names with a dot BETWEEN them. The dot is
 * decoration, so the contract worth pinning is the list's own shape: one
 * item per name, no separator after the last, and a link only where the
 * operator gave one.
 */
const ITEMS = [
  { name: 'Γλυκό πετιμέζι' },
  { name: 'Χυλοπίτες', href: '/products' },
  { name: 'Τσάτνεϊ σύκου' },
]

describe('ekfyseosfyteias partner_strip', () => {
  it('lists the names, with the label naming the band', async () => {
    const wrapper = await mountSuspended(PartnerStrip, {
      route: false,
      props: { label: 'Στον πάγκο μας', items: ITEMS },
    })

    expect(wrapper.findAll('li').map(li => li.text())).toEqual(ITEMS.map(item => item.name))
    expect(wrapper.find('section').attributes('aria-label')).toBe('Στον πάγκο μας')
    expect(wrapper.text()).toContain('Στον πάγκο μας')
  })

  it('puts a dot between names and none after the last', async () => {
    const wrapper = await mountSuspended(PartnerStrip, { route: false, props: { items: ITEMS } })

    const dots = wrapper.findAll('li').map(li => li.find('[aria-hidden="true"]').exists())
    expect(dots).toEqual([true, true, false])
  })

  it('links only the names that have an href', async () => {
    const wrapper = await mountSuspended(PartnerStrip, { route: false, props: { items: ITEMS } })

    expect(wrapper.findAll('a').map(a => [a.text(), a.attributes('href')])).toEqual([['Χυλοπίτες', '/products']])
  })

  it('does not let the section title fall onto the band as a tooltip', async () => {
    const wrapper = await mountSuspended(PartnerStrip, {
      route: false,
      props: { items: ITEMS, title: 'Ribbon' },
    })

    expect(wrapper.find('section').attributes('title')).toBeUndefined()
  })

  it('renders nothing without names', async () => {
    const wrapper = await mountSuspended(PartnerStrip, { route: false, props: { label: 'Στον πάγκο μας', items: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
