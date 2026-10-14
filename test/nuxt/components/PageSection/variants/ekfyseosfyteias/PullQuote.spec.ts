import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PullQuote from '~/components/PageSection/variants/ekfyseosfyteias/PullQuote.vue'

/**
 * A quote is a figure: the blockquote, then who said it. The guillemets
 * are the band's, not the operator's, so the stored quote carries none.
 */
const PROPS = {
  quote: 'Το οφείλουμε στις κόρες και τις εγγονές μας.',
  text: 'Από το κείμενό μας για την 8η Μαρτίου.',
  attribution: 'Εκ φύσεως Φυτειάς, 2025',
}

describe('ekfyseosfyteias pull_quote', () => {
  it('is a figure of blockquote and figcaption, the quote between guillemets', async () => {
    const wrapper = await mountSuspended(PullQuote, { route: false, props: PROPS })

    expect(wrapper.find('figure > blockquote').text()).toBe(`«${PROPS.quote}»`)
    expect(wrapper.find('figure > figcaption').text()).toBe(PROPS.attribution)
  })

  it('puts the lead-in text above the quote', async () => {
    const wrapper = await mountSuspended(PullQuote, { route: false, props: PROPS })

    const text = wrapper.find('figure > p')
    expect(text.text()).toBe(PROPS.text)
    expect(text.element.compareDocumentPosition(wrapper.find('blockquote').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('hides the three-berry ornament from assistive technology', async () => {
    const wrapper = await mountSuspended(PullQuote, { route: false, props: PROPS })

    const ornament = wrapper.find('figure > [aria-hidden="true"]')
    expect(ornament.findAll('span')).toHaveLength(3)
    expect(ornament.text()).toBe('')
  })

  it('needs only the quote', async () => {
    const wrapper = await mountSuspended(PullQuote, { route: false, props: { quote: PROPS.quote } })

    expect(wrapper.find('figcaption').exists()).toBe(false)
    expect(wrapper.find('figure > p').exists()).toBe(false)
  })

  it('does not let the section title fall onto the band as a tooltip', async () => {
    const wrapper = await mountSuspended(PullQuote, { route: false, props: { ...PROPS, title: 'Quote' } })

    expect(wrapper.find('section').attributes('title')).toBeUndefined()
  })

  it('renders nothing without a quote', async () => {
    const wrapper = await mountSuspended(PullQuote, { route: false, props: { text: PROPS.text } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
