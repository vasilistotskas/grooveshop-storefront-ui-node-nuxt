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
  // ODOT has nothing but a name — the card the artboard left as a
  // question: a card must not need copy to exist.
  it('makes every manufacturer a heading', async () => {
    const wrapper = await mountSuspended(VendorCards, { route: false, props: { items: ITEMS } })

    expect(wrapper.findAll('h2').map(h => h.text())).toEqual([
      'ABB',
      'ODOT Automation',
    ])
  })

  it('prints the part numbers as a list, one chip each', async () => {
    const wrapper = await mountSuspended(VendorCards, { route: false, props: { items: ITEMS } })

    // Only ABB carries chips; the name-only ODOT card draws none.
    const chips = wrapper.findAll('li li')
    expect(chips.map(c => c.text())).toEqual(['PM5072-2ETH', 'Modbus TCP'])
  })

  it('carries the note under the grid, not as a fifth card', async () => {
    const wrapper = await mountSuspended(VendorCards, {
      route: false,
      props: { items: ITEMS, note: 'Επιπλέον εργαζόμαστε σε Siemens και WAGO.' },
    })

    expect(wrapper.findAll('h2')).toHaveLength(2)
    const note = wrapper.findAll('p').find(p => p.text() === 'Επιπλέον εργαζόμαστε σε Siemens και WAGO.')
    expect(note?.element.closest('li')).toBeNull()
  })

  it('renders nothing without cards', async () => {
    const wrapper = await mountSuspended(VendorCards, { route: false, props: { items: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
