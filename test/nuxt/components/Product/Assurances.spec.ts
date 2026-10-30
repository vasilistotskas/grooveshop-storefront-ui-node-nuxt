import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Assurances from '~/components/Product/Assurances.vue'
import WebsideAssurances from '~/components/variants/webside/Product/Assurances.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The rows `useProductAssurances` built, drawn: one line each, an optional
 * note under it, a link only where the row has a target. Nothing for no rows.
 */
const ROWS: ProductAssuranceRow[] = [
  { kind: 'delivery', icon: 'i-lucide-truck', text: 'Παράδοση σε 1–3 εργάσιμες ημέρες από την αποστολή', note: 'Δωρεάν μεταφορικά άνω των 40,00 €' },
  { kind: 'payment', icon: 'i-lucide-credit-card', text: 'Κάρτα ή αντικαταβολή' },
  { kind: 'returns', icon: 'i-lucide-undo-2', text: 'Επιστροφή εντός 14 ημερών', to: '/return-policy' },
]

describe.each(trees(Assurances, WebsideAssurances))('$tree Product/Assurances', ({ C }) => {
  const mountRows = (rows: ProductAssuranceRow[]) =>
    mountSuspended(C, { props: { rows, label: 'Παράδοση, πληρωμή και επιστροφές' }, route: false })

  it('draws a row for each assurance, with its note', async () => {
    const wrapper = await mountRows(ROWS)

    const items = wrapper.findAll('li')
    expect(items).toHaveLength(3)
    // Each line is its own block, so the note is not run into the text.
    expect(items[0]!.findAll('span > span').map(line => line.text())).toEqual([
      'Παράδοση σε 1–3 εργάσιμες ημέρες από την αποστολή',
      'Δωρεάν μεταφορικά άνω των 40,00 €',
    ])
    expect(items[1]!.text()).toBe('Κάρτα ή αντικαταβολή')
    expect(items[2]!.text()).toBe('Επιστροφή εντός 14 ημερών')
    expect(wrapper.find('ul').attributes('aria-label')).toBe('Παράδοση, πληρωμή και επιστροφές')
  })

  it('links only the row that has a target', async () => {
    const wrapper = await mountRows(ROWS)

    const links = wrapper.findAll('a')
    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe('/return-policy')
    expect(links[0]!.text()).toBe('Επιστροφή εντός 14 ημερών')
  })

  it('draws nothing for no rows', async () => {
    const wrapper = await mountRows([])

    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
