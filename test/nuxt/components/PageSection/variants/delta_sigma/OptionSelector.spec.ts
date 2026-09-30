import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OptionSelector from '~/components/PageSection/variants/delta_sigma/OptionSelector.vue'

/**
 * One band, three shapes. `layout` picks which — and each is a
 * different component, so the thing worth asserting is that the
 * dispatch works, that all three behave as a tablist, and that the
 * panel shows the chosen option's own detail.
 */
const SYSTEMS = [
  { name: 'ABB', label: 'ΣΥΣΤΗΜΑ 01', model: 'PM5072-2ETH', rows: [{ label: 'Μνήμη', value: '8 MB' }] },
  { name: 'INVT', label: 'ΣΥΣΤΗΜΑ 02', model: 'TM750', rows: [{ label: 'Μνήμη', value: '20 MB' }] },
]

const PHASES = [
  { name: 'Μελέτη & σχεδιασμός', label: '01', rationale: 'Σχέδια και ροές.', bullets: ['Κατασκευαστικά σχέδια'] },
  { name: 'Προμήθεια', label: '02', rationale: 'Ραδιοσυνδέσεις.', bullets: ['IoT', 'BMS'] },
  { name: 'Εγκατάσταση', label: '03', bullets: ['Τεύχος δοκιμών'] },
]

const FIELDS = [
  { name: 'Συστήματα αυτοματισμού', rationale: 'PLC, DCS και SCADA.', bullets: ['PLC', 'SCADA'] },
  { name: 'Τηλεπικοινωνίες', rationale: 'Βιομηχανικά δίκτυα.', bullets: ['Τηλεμετρία'] },
]

describe('delta_sigma OptionSelector', () => {
  it('renders boxed cards by default, with each model number', async () => {
    const wrapper = await mountSuspended(OptionSelector, {
      route: false,
      props: { options: SYSTEMS, rowsLabel: 'Χαρακτηριστικά' },
    })

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('PM5072-2ETH')
    // The panel shows the FIRST option's rows and no other's.
    expect(wrapper.find('[role="tabpanel"]').text()).toContain('8 MB')
    expect(wrapper.find('[role="tabpanel"]').text()).not.toContain('20 MB')
  })

  it('renders a numbered strip when the options are a sequence', async () => {
    const wrapper = await mountSuspended(OptionSelector, {
      route: false,
      props: { layout: 'strip', bulletsLabel: 'Παραδοτέα', options: PHASES },
    })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(3)
    // The ordinal leads each tab: the phases are an order.
    expect(tabs[0]!.text().startsWith('01')).toBe(true)
    const panel = wrapper.find('[role="tabpanel"]')
    expect(panel.text()).toContain('Παραδοτέα')
    expect(panel.text()).toContain('Κατασκευαστικά σχέδια')

    await tabs[1]!.trigger('click')
    expect(wrapper.find('[role="tabpanel"]').text()).toContain('BMS')
  })

  it('renders a vertical rail when the options are the page subject', async () => {
    const wrapper = await mountSuspended(OptionSelector, {
      route: false,
      props: {
        layout: 'rail',
        options: FIELDS,
        prompt: { title: 'Ενδιαφέρεστε για κάτι άλλο;', ctaText: 'Επικοινωνία' },
      },
    })

    const list = wrapper.find('[role="tablist"]')
    expect(list.attributes('aria-orientation')).toBe('vertical')
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2)
    // The prompt card rides under the rail, not in it.
    expect(wrapper.text()).toContain('Ενδιαφέρεστε για κάτι άλλο;')
    expect(wrapper.find('[role="tabpanel"]').text()).toContain('SCADA')
  })

  it.each([
    ['cards', SYSTEMS, 'ArrowRight', '20 MB'],
    ['strip', PHASES, 'ArrowRight', 'IoT'],
    // A vertical rail answers Up/Down.
    ['rail', FIELDS, 'ArrowDown', 'Τηλεμετρία'],
  ] as const)('moves the %s selection with the arrow keys', async (layout, options, key, secondDetail) => {
    const wrapper = await mountSuspended(OptionSelector, { route: false, props: { layout, options } })
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')

    await tabs[0]!.trigger('keydown', { key })

    const after = wrapper.findAll('[role="tab"]')
    expect(after[1]!.attributes('aria-selected')).toBe('true')
    expect(after[0]!.attributes('tabindex')).toBe('-1')
    expect(wrapper.find('[role="tabpanel"]').text()).toContain(secondDetail)
  })

  it.each(['cards', 'strip', 'rail'] as const)('renders nothing without options in the %s layout', async (layout) => {
    const wrapper = await mountSuspended(OptionSelector, { route: false, props: { layout, options: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
