import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProjectRegister from '~/components/PageSection/variants/delta_sigma/ProjectRegister.vue'

/**
 * The Δelta Σigma project register: 48 numbered rows filtered by
 * sector. Three properties matter and none of them is visual:
 *
 * - the ORDINAL is the row's place in the whole register, so filtering
 *   must not renumber what is left;
 * - the sector pill's colour comes from the sector's POSITION in
 *   `sectors`, so nothing in the data names a colour;
 * - a chip whose sector has no rows would be a control that empties
 *   the table, so it is not rendered at all.
 */
const SECTORS = [
  { key: 'viologikoi', label: 'Βιολογικοί' },
  { key: 'antliostasia', label: 'Αντλιοστάσια' },
  { key: 'energeia', label: 'Ενέργεια/ΑΠΕ' },
  { key: 'kykloforia', label: 'Κυκλοφορία' },
]

const ITEMS = [
  { sector: 'energeia', title: 'Αιολικό πάρκο', note: 'Μελέτη.', meta: 'ENVICON' },
  { sector: 'viologikoi', title: 'Βιολογικός Μυκόνου', meta: 'ΜΕΣΟΓΕΙΟΣ' },
  { sector: 'energeia', title: 'Μονάδα βιοαερίου', meta: 'BIOGAS' },
  { sector: 'antliostasia', title: 'Αντλιοστάσια Ζάμπια', meta: 'TEDRA' },
]

function mount(props: Record<string, unknown> = {}) {
  return mountSuspended(ProjectRegister, {
    props: { sectors: SECTORS, items: ITEMS, ...props },
  })
}

const ordinals = (wrapper: Awaited<ReturnType<typeof mount>>) =>
  wrapper.findAll('li .font-mono').map(el => el.text()).filter(t => /^\d\d$/.test(t))

describe('delta_sigma ProjectRegister', () => {
  it('numbers every row in source order and prints the count', async () => {
    const wrapper = await mount()

    expect(ordinals(wrapper)).toEqual(['01', '02', '03', '04'])
    expect(wrapper.text()).toContain('4 έργα')
  })

  it('keeps a row ordinal when a filter hides its neighbours', async () => {
    const wrapper = await mount()

    // "Ενέργεια/ΑΠΕ" holds rows 1 and 3 of the register.
    const chip = wrapper.findAll('button').find(b => b.text().includes('Ενέργεια'))!
    await chip.trigger('click')

    expect(ordinals(wrapper)).toEqual(['01', '03'])
    expect(wrapper.text()).toContain('2 έργα')
    expect(wrapper.text()).not.toContain('Βιολογικός Μυκόνου')
    expect(chip.attributes('aria-pressed')).toBe('true')
  })

  it('clears the filter when the pressed chip is pressed again', async () => {
    const wrapper = await mount()

    const chip = wrapper.findAll('button').find(b => b.text().includes('Ενέργεια'))!
    await chip.trigger('click')
    await chip.trigger('click')

    expect(ordinals(wrapper)).toHaveLength(ITEMS.length)
    expect(chip.attributes('aria-pressed')).toBe('false')
  })

  it('offers no chip for a sector with no rows', async () => {
    const wrapper = await mount()

    const labels = wrapper.findAll('button').map(b => b.text())
    expect(labels.some(l => l.includes('Βιολογικοί'))).toBe(true)
    // Declared in `sectors`, but nothing in `items` uses it — a chip
    // for it could only ever empty the table.
    expect(labels.some(l => l.includes('Κυκλοφορία'))).toBe(false)
  })

  it('colours a pill by the sector position, never by the data', async () => {
    const wrapper = await mount()

    const html = wrapper.html()
    // Slot 0 is the brand token; the rest are fixed categorical hues.
    expect(html).toContain('bg-primary/12')
    expect(html).toContain('bg-blue-400/12')
    expect(html).toContain('bg-emerald-400/12')
  })

  it('falls back to a neutral pill for a sector nothing declares', async () => {
    // Django refuses this shape on write; a store seeded before the
    // check must still render the row.
    const wrapper = await mount({
      items: [{ sector: 'nope', title: 'Άγνωστος τομέας' }],
      sectors: SECTORS,
    })

    expect(wrapper.text()).toContain('Άγνωστος τομέας')
    // No label to print, so no pill — but the row survives.
    expect(wrapper.html()).not.toContain('bg-primary/12')
  })

  it('renders nothing at all without rows', async () => {
    const wrapper = await mount({ items: [] })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
