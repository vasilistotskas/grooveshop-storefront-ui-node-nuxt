import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import VendorCards from '~/components/PageSection/variants/delta_sigma/VendorCards.vue'

/**
 * The manufacturer cards. The card is a NAME plus what makes the work
 * with it recognisable, so the two things worth asserting are that the
 * name is a heading and that the chips are a list rather than a
 * sentence — everything else is the artboard's chrome.
 */
const ITEMS = [
  {
    title: 'ABB',
    label: 'Αυτοματισμός & ελεγκτές',
    text: 'Ελεγκτές και ρυθμιστές στροφών.',
    tags: ['PM5072-2ETH', 'Modbus TCP'],
  },
  { title: 'ODOT Automation' },
]

describe('delta_sigma VendorCards', () => {
  it('makes every manufacturer a heading', async () => {
    const wrapper = await mountSuspended(VendorCards, { props: { items: ITEMS } })

    expect(wrapper.findAll('h2').map(h => h.text())).toEqual([
      'ABB',
      'ODOT Automation',
    ])
  })

  it('prints the part numbers as a list, one chip each', async () => {
    const wrapper = await mountSuspended(VendorCards, { props: { items: ITEMS } })

    const chips = wrapper.findAll('li li')
    expect(chips.map(c => c.text())).toEqual(['PM5072-2ETH', 'Modbus TCP'])
  })

  it('renders a card with nothing but a name', async () => {
    // The ODOT card is the one the artboard left as a question; a card
    // must not need copy to exist.
    const wrapper = await mountSuspended(VendorCards, {
      props: { items: [{ title: 'ODOT Automation' }] },
    })

    expect(wrapper.text()).toContain('ODOT Automation')
    expect(wrapper.findAll('li li')).toHaveLength(0)
  })

  it('carries the note under the grid, not as a fifth card', async () => {
    const wrapper = await mountSuspended(VendorCards, {
      props: { items: ITEMS, note: 'Επιπλέον εργαζόμαστε σε Siemens και WAGO.' },
    })

    expect(wrapper.findAll('h2')).toHaveLength(2)
    expect(wrapper.text()).toContain('Επιπλέον εργαζόμαστε σε Siemens και WAGO.')
  })

  it('renders nothing without cards', async () => {
    const wrapper = await mountSuspended(VendorCards, { props: { items: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
