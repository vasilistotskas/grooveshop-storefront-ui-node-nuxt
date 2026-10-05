import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeAnnouncementBar from '~/components/Chrome/AnnouncementBar.vue'

/**
 * The operator's strip above the header: rendered from the
 * `ANNOUNCEMENT_BAR` setting, ink unless the operator picked a colour,
 * and nothing at all when the setting is missing, off or malformed.
 */
const { setting } = vi.hoisted(() => ({ setting: { value: '' as string } }))

mockNuxtImport('useSettingValue', () => () => computed(() => setting.value))

const bar = (value: Record<string, unknown>) => JSON.stringify({
  enabled: true,
  id: 'v1',
  text: 'Δωρεάν αποστολή από 50 €',
  i18n: { en: { text: 'Free delivery over 50 €' } },
  ...value,
})

const mountBar = () => mountSuspended(ChromeAnnouncementBar, { route: false })

describe('Chrome/AnnouncementBar', () => {
  beforeEach(() => {
    setting.value = ''
  })

  it('shows the operator\'s text in ink by default', async () => {
    setting.value = bar({})

    const wrapper = await mountBar()
    const banner = wrapper.findComponent({ name: 'UBanner' })

    expect(banner.props('title')).toBe('Δωρεάν αποστολή από 50 €')
    expect(banner.props('color')).toBe('neutral')
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

    it('prints the code as a mono chip on the volt fill', async () => {
      setting.value = bar({ code: 'WELCOME10' })

      const chip = (await mountBar()).find('[data-slot="title"] .font-mono')

      expect(chip.text()).toBe('WELCOME10')
      // The fill pairing is the contract: volt text would fail contrast.
      expect(chip.classes()).toEqual(expect.arrayContaining(['bg-volt', 'text-on-volt']))
    })

    it('draws no chip without a code', async () => {
      setting.value = bar({})

      expect((await mountBar()).find('.font-mono').exists()).toBe(false)
    })
  })

  it.each([
    { name: 'missing', value: '' },
    { name: 'switched off', value: bar({ enabled: false }) },
    { name: 'malformed', value: '{"text": 1}' },
  ])('renders nothing when the setting is $name', async ({ value }) => {
    setting.value = value

    const wrapper = await mountBar()

    expect(wrapper.findComponent({ name: 'UBanner' }).exists()).toBe(false)
  })
})
