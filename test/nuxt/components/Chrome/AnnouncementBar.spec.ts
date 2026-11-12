import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeAnnouncementBar from '~/components/Chrome/AnnouncementBar.vue'
import WebsideAnnouncementBar from '~/components/variants/webside/Chrome/AnnouncementBar.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The operator's strip above the header, in both designs: rendered from the
 * `announcementBar` Django serves typed on `/settings/public`, ink unless
 * the operator picked a colour, and nothing at all when there is none or it
 * is switched off.
 */
const { setting, dispatchCutoff, freeShipping, freeShippingInfo } = vi.hoisted(() => ({
  setting: { value: null as AnnouncementBar | null },
  dispatchCutoff: { value: '' },
  freeShipping: { value: null as { minThreshold: number | null } | null },
  freeShippingInfo: vi.fn(),
}))

mockNuxtImport('useStoreSettings', () => () => ({
  announcementBar: computed(() => setting.value),
  values: computed(() => ({ dispatchCutoff: dispatchCutoff.value })),
}))
mockNuxtImport('useFreeShippingInfo', () => freeShippingInfo)

const bar = (value: Partial<AnnouncementBar>): AnnouncementBar => ({
  enabled: true,
  id: 'v1',
  text: 'Δωρεάν αποστολή από 50 €',
  i18n: { en: { text: 'Free delivery over 50 €' } },
  ...value,
})

describe.each(trees(ChromeAnnouncementBar, WebsideAnnouncementBar))('$tree Chrome/AnnouncementBar', ({ tree, C }) => {
  const mountBar = () => mountSuspended(C, { route: false })

  beforeEach(() => {
    setting.value = null
    dispatchCutoff.value = ''
    freeShipping.value = null
    freeShippingInfo.mockReset()
    freeShippingInfo.mockImplementation(() => ({ data: computed(() => freeShipping.value) }))
  })

  it('shows the operator\'s text in ink by default', async () => {
    setting.value = bar({})

    const wrapper = await mountBar()
    const banner = wrapper.findComponent({ name: 'UBanner' })

    expect(banner.props('title')).toBe('Δωρεάν αποστολή από 50 €')
    expect(banner.props('color')).toBe('neutral')
  })

  // The classes are the contract: the close button is a 44px target on a
  // phone (WCAG 2.5.5), its height reached through a pseudo-element so the
  // bar keeps its own; happy-dom lays nothing out.
  it('gives the close button a 44px target on a phone without growing the bar', async () => {
    setting.value = bar({})

    const wrapper = await mountBar()

    expect(wrapper.get('[data-slot="close"]').classes()).toEqual(expect.arrayContaining(['relative', 'min-w-11', 'sm:min-w-0', 'after:absolute', 'after:-inset-y-1.5']))
  })

  it('keeps a colour the operator picked', async () => {
    setting.value = bar({ color: 'secondary' })

    const wrapper = await mountBar()

    expect(wrapper.findComponent({ name: 'UBanner' }).props('color')).toBe('secondary')
  })

  describe('the short copy for a phone and the promo code', () => {
    const visible = (wrapper: Awaited<ReturnType<typeof mountBar>>) =>
      wrapper.findAll('[data-slot="title"] > span')

    it('sets the full sentence off from the short copy, which only a phone shows', async () => {
      setting.value = bar({ shortText: 'Δωρεάν αποστολή 50 €' })

      const spans = visible(await mountBar())

      expect(spans.map(span => span.text())).toEqual([
        'Δωρεάν αποστολή από 50 €',
        'Δωρεάν αποστολή 50 €',
      ])
      expect(spans[0]!.classes()).toContain('max-sm:hidden')
      expect(spans[1]!.classes()).toContain('sm:hidden')
    })

    it('shows the one sentence at every width when there is no short copy', async () => {
      setting.value = bar({})

      const spans = visible(await mountBar())

      expect(spans).toHaveLength(1)
      expect(spans[0]!.classes()).not.toContain('max-sm:hidden')
    })

    it('answers in the locale own short copy, never the default one', async () => {
      setting.value = bar({
        shortText: 'Δωρεάν αποστολή 50 €',
        i18n: { el: { text: 'Δωρεάν αποστολή από 50 €' } },
      })

      const spans = visible(await mountBar())

      expect(spans).toHaveLength(1)
    })

    it('prints the code as a mono chip on a fill', async () => {
      setting.value = bar({ code: 'WELCOME10' })

      const chip = (await mountBar()).find('[data-slot="title"] .font-mono')

      expect(chip.text()).toBe('WELCOME10')
      // The fill pairing is the contract: coloured text would fail contrast.
      expect(chip.classes()).toEqual(expect.arrayContaining(
        tree === 'webside' ? ['bg-default', 'text-highlighted'] : ['bg-volt', 'text-on-volt'],
      ))
    })

    it('keeps a long sentence on the one fixed-height line at every width', async () => {
      setting.value = bar({})

      // The class is the contract: the bar is one line tall, so text
      // that wraps would spill out of it on a phone.
      const title = (await mountBar()).get('[data-slot="title"]')

      expect(title.classes()).toEqual(expect.arrayContaining(['truncate', 'min-w-0']))
    })

    it('draws no chip without a code', async () => {
      setting.value = bar({})

      expect((await mountBar()).find('.font-mono').exists()).toBe(false)
    })
  })

  describe('live figures in the wording', () => {
    const titleOf = async () => (await mountBar()).findComponent({ name: 'UBanner' })

    it('prints the free-shipping threshold as money, the way the cart notice does', async () => {
      setting.value = bar({ text: 'Δωρεάν αποστολή από {freeShippingThreshold}' })
      freeShipping.value = { minThreshold: 39.9 }

      const banner = await titleOf()

      expect(banner.props('title')).toBe(`Δωρεάν αποστολή από ${useNuxtApp().$i18n.n(39.9, 'currency')}`)
      expect(banner.props('title')).not.toContain('{')
    })

    it('prints the dispatch cutoff as typed in the settings', async () => {
      setting.value = bar({ text: 'Παραγγελίες πριν τις {dispatchCutoff} φεύγουν σήμερα', shortText: 'Πριν τις {dispatchCutoff}' })
      dispatchCutoff.value = '15:00'

      const wrapper = await mountBar()

      expect(wrapper.text()).toContain('Παραγγελίες πριν τις 15:00 φεύγουν σήμερα')
      expect(wrapper.text()).toContain('Πριν τις 15:00')
    })

    it('reads the free-shipping threshold only for a bar that names it', async () => {
      setting.value = bar({ text: 'Παραγγελίες πριν τις {dispatchCutoff}' })
      dispatchCutoff.value = '15:00'
      await mountBar()
      setting.value = bar({})
      await mountBar()

      expect(freeShippingInfo).not.toHaveBeenCalled()
    })

    it('reads it once a language of the bar names it', async () => {
      setting.value = bar({ i18n: { en: { text: 'Free delivery over {freeShippingThreshold}' } } })
      freeShipping.value = { minThreshold: 50 }

      await mountBar()

      expect(freeShippingInfo).toHaveBeenCalledOnce()
    })

    it.each([
      { name: 'no threshold is configured', info: { minThreshold: null } },
      { name: 'the threshold is 0', info: { minThreshold: 0 } },
      { name: 'the threshold has not arrived', info: null },
    ])('is not shown when $name', async ({ info }) => {
      setting.value = bar({ text: 'Δωρεάν αποστολή από {freeShippingThreshold}' })
      freeShipping.value = info

      expect((await mountBar()).findComponent({ name: 'UBanner' }).exists()).toBe(false)
    })

    it.each(['', 'soon', '25:00'])('is not shown when the cutoff is "%s"', async (cutoff) => {
      setting.value = bar({ text: 'Πριν τις {dispatchCutoff}' })
      dispatchCutoff.value = cutoff

      expect((await mountBar()).findComponent({ name: 'UBanner' }).exists()).toBe(false)
    })

    it('is not shown when only the phone wording names a figure with no value', async () => {
      setting.value = bar({ shortText: 'Πριν τις {dispatchCutoff}' })

      expect((await mountBar()).findComponent({ name: 'UBanner' }).exists()).toBe(false)
    })

    it('leaves a word in braces the merchant typed as it is', async () => {
      setting.value = bar({ text: 'Κωδικός {WELCOME}' })

      expect((await titleOf()).props('title')).toBe('Κωδικός {WELCOME}')
    })
  })

  it.each([
    { name: 'missing', value: null },
    { name: 'switched off', value: bar({ enabled: false }) },
  ])('renders nothing when the setting is $name', async ({ value }) => {
    setting.value = value

    const wrapper = await mountBar()

    expect(wrapper.findComponent({ name: 'UBanner' }).exists()).toBe(false)
  })
})
