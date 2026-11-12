import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import StoreAssurances from '~/components/PageSection/StoreAssurances.vue'
import { inlineT } from '~~/test/helpers/inlineCopy'

/**
 * The shopping promises band draws the rows `useStoreAssurances` built (its
 * own spec covers which rows there are): one feature each, a name for the
 * list when the band has no heading, and nothing at all when no row is left.
 */
const rows = vi.hoisted(() => ({ value: [] as StoreAssuranceRow[] }))
mockNuxtImport('useStoreAssurances', () => () => Promise.resolve({ rows: computed(() => rows.value) }))

const ROWS: StoreAssuranceRow[] = [
  { kind: 'delivery', icon: 'i-lucide-truck', title: 'Παράδοση σε 1-3 εργάσιμες', note: 'Παραγγελίες έως 15:00 φεύγουν την ίδια εργάσιμη' },
  { kind: 'freeShipping', icon: 'i-lucide-package', title: 'Δωρεάν μεταφορικά από 39,90 €' },
  { kind: 'returns', icon: 'i-lucide-undo-2', title: 'Επιστροφή σε 14 ημέρες', to: '/return-policy' },
]

const t = inlineT('app/components/PageSection/StoreAssurances.vue')

const mountBand = (props: Record<string, unknown> = {}) =>
  mountSuspended(StoreAssurances, { route: false, props })

describe('PageSection/StoreAssurances', () => {
  beforeEach(() => {
    rows.value = ROWS
  })

  it('draws one promise per row, with its note and its link', async () => {
    const wrapper = await mountBand({ heading: 'Αγορές με σιγουριά' })

    const items = wrapper.findAll('ul > li')
    expect(items.map(item => item.text())).toEqual([
      'Παράδοση σε 1-3 εργάσιμεςΠαραγγελίες έως 15:00 φεύγουν την ίδια εργάσιμη',
      'Δωρεάν μεταφορικά από 39,90 €',
      'Επιστροφή σε 14 ημέρες',
    ])
    expect(items[2]!.get('a').attributes('href')).toBe('/return-policy')
    expect(items[0]!.find('a').exists()).toBe(false)
    expect(wrapper.get('h2').text()).toBe('Αγορές με σιγουριά')
  })

  it('names the list itself when the band has no heading, and leaves it to the heading otherwise', async () => {
    const unnamed = await mountBand()
    const named = await mountBand({ heading: 'Αγορές με σιγουριά' })

    expect(unnamed.find('h2').exists()).toBe(false)
    expect(unnamed.get('ul').attributes('aria-label')).toBe(t('label'))
    expect(named.get('ul').attributes('aria-label')).toBeUndefined()
  })

  it('draws nothing when the store has made no promise', async () => {
    rows.value = []

    const wrapper = await mountBand({ heading: 'Αγορές με σιγουριά' })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
