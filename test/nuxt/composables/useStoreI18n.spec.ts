import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { computed, nextTick } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import AccountLoadError from '~/components/Account/LoadError.vue'
import FooterHoursBadge from '~/components/Footer/HoursBadge.vue'
import ProductPriorPrice from '~/components/Product/PriorPrice.vue'

/**
 * A component with its own `<i18n>` block shows the store's wording where
 * the store has edited it, the block's everywhere else.
 *
 * Real components, so what is asserted is the rendered text: the badge
 * (four texts, two with parameters) and the Omnibus prior-price label
 * (locked).
 */
mockNuxtImport('useBusinessHours', () => () => ({
  hasData: computed(() => true),
  isOpen: computed(() => true),
  todayHours: computed(() => ({ opens: '09:00', closes: '20:00' })),
}))

const BADGE = 'components/Footer/HoursBadge'
const PRIOR_PRICE = 'components/Product/PriorPrice'

const text = (wrapper: { text: () => string }) => wrapper.text().replace(/\s+/g, ' ')
const i18n = () => useNuxtApp().$i18n

beforeEach(() => {
  useTextOverrides().value = undefined
})

afterEach(() => {
  useTextOverrides().value = undefined
  i18n().locale.value = 'el'
})

describe('useStoreI18n', () => {
  it('renders the block\'s own texts for a store without overrides', async () => {
    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(text(wrapper)).toBe('Ανοιχτά τώρα · έως 20:00')
  })

  it('renders the store\'s text over the block\'s, and leaves the others as they are', async () => {
    useTextOverrides().value = { el: { [BADGE]: { open_now: 'Σας περιμένουμε!' } } }

    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    // Overridden: `open_now`. Untouched: the `until` text, with its parameter.
    expect(text(wrapper)).toBe('Σας περιμένουμε! · έως 20:00')
  })

  it('compiles the store\'s text with its parameters', async () => {
    useTextOverrides().value = { el: { [BADGE]: { until: 'ώσπου να κλείσουμε στις {time}' } } }

    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(text(wrapper)).toBe('Ανοιχτά τώρα · ώσπου να κλείσουμε στις 20:00')
  })

  it('reads only its own namespace', async () => {
    useTextOverrides().value = { el: { 'components/Footer/Other': { open_now: 'Αλλού' } } }

    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(text(wrapper)).toBe('Ανοιχτά τώρα · έως 20:00')
  })

  it('gives each component the texts of its own namespace', async () => {
    useTextOverrides().value = { el: {
      [BADGE]: { open_now: 'Σας περιμένουμε!' },
      'components/Account/LoadError': { retry: 'Ξανά' },
    } }

    const badge = await mountSuspended(FooterHoursBadge, { route: false })
    const error = await mountSuspended(AccountLoadError, { route: false, props: { message: 'x' } })

    expect(text(badge)).toBe('Σας περιμένουμε! · έως 20:00')
    expect(error.get('button').text()).toBe('Ξανά')
  })

  it('ignores a text a store may not change', async () => {
    useTextOverrides().value = { el: { [PRIOR_PRICE]: { label: 'Η πραγματική τιμή' } } }

    const wrapper = await mountSuspended(ProductPriorPrice, { route: false, props: { price: 10 } })

    expect(text(wrapper)).toContain('Χαμηλότερη τιμή 30 ημερών πριν την έκπτωση')
    expect(text(wrapper)).not.toContain('Η πραγματική τιμή')
  })

  it('ignores a key the component no longer has', async () => {
    useTextOverrides().value = { el: { [BADGE]: { removed_long_ago: 'x' } } }

    const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

    expect(text(wrapper)).toBe('Ανοιχτά τώρα · έως 20:00')
  })

  describe('when the locale changes', () => {
    it('shows the new language\'s texts once they have loaded', async () => {
      useTextOverrides().value = { el: { [BADGE]: { open_now: 'Σας περιμένουμε!' } } }
      const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

      i18n().locale.value = 'en'
      await nextTick()
      expect(text(wrapper)).toBe('Open now · until 20:00')

      useTextOverrides().value = { ...useTextOverrides().value, en: { [BADGE]: { open_now: 'Come in!' } } }
      await nextTick()
      expect(text(wrapper)).toBe('Come in! · until 20:00')

      // And back: the Greek text was merged once and is still there.
      i18n().locale.value = 'el'
      await nextTick()
      expect(text(wrapper)).toBe('Σας περιμένουμε! · έως 20:00')
    })

    it('shows the texts of a language that had loaded before the component did', async () => {
      useTextOverrides().value = { en: { [BADGE]: { open_now: 'Come in!' } } }
      i18n().locale.value = 'en'

      const wrapper = await mountSuspended(FooterHoursBadge, { route: false })

      expect(text(wrapper)).toBe('Come in! · until 20:00')
    })
  })
})
