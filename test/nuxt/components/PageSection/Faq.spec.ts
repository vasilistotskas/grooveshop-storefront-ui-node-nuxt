import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Faq from '~/components/PageSection/Faq.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

const ITEMS = [
  { question: 'Πόσο κοστίζει η αποστολή;', answer: 'Δωρεάν από 50 €.' },
  { question: 'Μπορώ να επιστρέψω κάτι;', answer: 'Ναι, μέσα σε 30 ημέρες.' },
]

const mountFaq = (props: Record<string, unknown> = {}) =>
  mountSuspended(Faq, { route: false, props: { items: ITEMS, ...props } })

/**
 * The questions a store answers before it is asked, beside where to turn
 * when the answer is not there.
 */
describe('PageSection/Faq', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ chatWidget: false })
  })

  it('opens on the first answer, the rest closed', async () => {
    const wrapper = await mountFaq()

    const triggers = wrapper.findAll('button')
    expect(triggers.map(button => [button.text(), button.attributes('aria-expanded')])).toEqual([
      [ITEMS[0]!.question, 'true'],
      [ITEMS[1]!.question, 'false'],
    ])
  })

  it('points to the contact page when the answer is not here', async () => {
    const wrapper = await mountFaq()

    expect(wrapper.find('h2').text()).toBe('Συχνές ερωτήσεις')
    const help = wrapper.find('h2 + p')
    expect(help.text()).toBe('Δεν το βρίσκεις; Επικοινώνησε μαζί μας.')
    expect(help.find('a').attributes('href')).toBe('/contact')
  })

  it('mentions the shopping assistant only where the store runs it', async () => {
    setTenantFeatures({ chatWidget: true })

    const wrapper = await mountFaq()

    expect(wrapper.find('h2 + p').text()).toBe('Δεν το βρίσκεις; Επικοινώνησε μαζί μας ή ρώτα τον βοηθό αγορών.')
  })

  it('says the operator\'s own line instead, when there is one', async () => {
    const wrapper = await mountFaq({ heading: 'Ερωτήσεις', subheading: 'Γράψε μας στο chat.' })

    expect(wrapper.find('h2').text()).toBe('Ερωτήσεις')
    expect(wrapper.find('h2 + p').text()).toBe('Γράψε μας στο chat.')
    expect(wrapper.find('h2 + p a').exists()).toBe(false)
  })

  it('renders nothing without questions', async () => {
    const wrapper = await mountFaq({ items: [] })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
