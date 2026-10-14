import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeFundingBanner from '~/components/Chrome/FundingBanner.vue'

/**
 * The EU co-funding strip: rendered from the `FUNDING_BANNER` setting as
 * ONE link around the artwork and the optional label, and nothing at all
 * when the setting is missing, off or malformed.
 */
const { setting } = vi.hoisted(() => ({ setting: { value: '' as string } }))

mockNuxtImport('useSettingValue', () => () => computed(() => setting.value))

const ALT = 'Με τη συγχρηματοδότηση της Ευρωπαϊκής Ένωσης — ΕΣΠΑ 2021-2027'

const banner = (value: Record<string, unknown> = {}) => JSON.stringify({
  enabled: true,
  image: '/img/espa.png',
  alt: ALT,
  link: '/chrimatodotisi',
  ...value,
})

const mountBanner = (props: { framed?: boolean } = {}) =>
  mountSuspended(ChromeFundingBanner, { route: false, props })

describe('Chrome/FundingBanner', () => {
  beforeEach(() => {
    setting.value = ''
  })

  it('renders one link to the operation, around the artwork', async () => {
    setting.value = banner()

    const wrapper = await mountBanner()
    const links = wrapper.findAll('a')

    expect(links).toHaveLength(1)
    expect(links[0]!.attributes('href')).toBe('/chrimatodotisi')
    expect(links[0]!.find('img').attributes('alt')).toBe(ALT)
  })

  it('keeps the label inside the same link', async () => {
    setting.value = banner({ label: 'Δείτε την πράξη' })

    const wrapper = await mountBanner()

    expect(wrapper.findAll('a')).toHaveLength(1)
    expect(wrapper.find('a').text()).toBe('Δείτε την πράξη')
  })

  it('renders no link when the setting has none', async () => {
    setting.value = banner({ link: undefined })

    const wrapper = await mountBanner()

    expect(wrapper.find('a').exists()).toBe(false)
    expect(wrapper.find('img').attributes('alt')).toBe(ALT)
  })

  it('renders the label alone when there is no artwork', async () => {
    setting.value = banner({ image: undefined, label: 'Συγχρηματοδότηση ΕΣΠΑ' })

    const wrapper = await mountBanner()

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('a').text()).toBe('Συγχρηματοδότηση ΕΣΠΑ')
  })

  it('frames the same banner as a rounded box for a footer', async () => {
    setting.value = banner()

    const strip = await mountBanner()
    const framed = await mountBanner({ framed: true })

    // The box is the variant's contract, so the class is asserted.
    expect(framed.classes()).toContain('rounded-2xl')
    expect(strip.classes()).not.toContain('rounded-2xl')
    expect(framed.findAll('a')).toHaveLength(1)
  })

  describe('renders nothing', () => {
    it.each([
      ['no setting', ''],
      ['an empty object', '{}'],
      ['malformed JSON', '{"enabled":'],
      ['a disabled banner', JSON.stringify({ enabled: false, alt: ALT, image: '/img/espa.png' })],
      ['an enabled banner without alt', JSON.stringify({ enabled: true, image: '/img/espa.png' })],
      ['an image over http', banner({ image: 'http://example.com/espa.png' })],
      ['neither artwork nor label', JSON.stringify({ enabled: true, alt: ALT })],
    ])('for %s', async (_name, value) => {
      setting.value = value

      const wrapper = await mountBanner()

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.find('a').exists()).toBe(false)
      expect(wrapper.text()).toBe('')
    })
  })
})
