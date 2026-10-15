import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, nextTick } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ChromeFundingBanner from '~/components/Chrome/FundingBanner.vue'

/**
 * The EU co-funding strip: rendered from the `FUNDING_BANNER` setting as
 * ONE link around the artwork and the optional label, and nothing at all
 * when the setting is missing, off or malformed.
 */
const { setting, observed } = vi.hoisted(() => ({
  setting: { value: '' as string },
  // Every in-page copy's IntersectionObserver callback, in mount order.
  observed: [] as Array<(entries: Array<{ isIntersecting: boolean }>) => void>,
}))

mockNuxtImport('useSettingValue', () => () => computed(() => setting.value))
mockNuxtImport('useIntersectionObserver', () => (_target: unknown, callback: (entries: Array<{ isIntersecting: boolean }>) => void) => {
  observed.push(callback)
  return { stop: () => {}, pause: () => {}, resume: () => {}, isSupported: true, isActive: true }
})

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
    observed.length = 0
    clearNuxtState('funding-banner-visibility')
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

  // The strip is the first thing on every page: an artwork box with no
  // height pushed the whole page down as the image arrived. The inline
  // style is the mechanism, so it is what is asserted.
  it('draws the artwork\'s box in its own proportions before it loads', async () => {
    setting.value = banner({ width: 1800, height: 197 })

    const wrapper = await mountBanner()
    observed[0]!([{ isIntersecting: false }])
    await nextTick()

    const styles = wrapper.findAll('img').map(img => img.attributes('style'))
    expect(styles).toHaveLength(2)
    for (const style of styles) expect(style).toContain('aspect-ratio: 1800 / 197')
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
    expect(framed.find('.rounded-2xl').exists()).toBe(true)
    expect(strip.find('.rounded-2xl').exists()).toBe(false)
    expect(framed.findAll('a')).toHaveLength(1)
  })

  // The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach.
  it('is a named complementary landmark in the page, so it is not content outside every region', async () => {
    setting.value = banner()

    const wrapper = await mountBanner()

    expect(wrapper.find('aside').attributes('aria-label')).toBe('Συγχρηματοδότηση από την Ευρωπαϊκή Ένωση')
  })

  it('stays a plain box inside the footer, where a second landmark would nest', async () => {
    setting.value = banner()

    const framed = await mountBanner({ framed: true })

    expect(framed.find('aside').exists()).toBe(false)
    expect(framed.find('.rounded-2xl').attributes('aria-label')).toBeUndefined()
  })

  describe('floating, while no in-page copy is on screen', () => {
    const floatingIn = (wrapper: { find: (selector: string) => { exists: () => boolean } }) =>
      wrapper.find('[data-funding-floating]').exists()

    it('does not show before the strip has been measured, so it cannot flash in over it', async () => {
      setting.value = banner()

      const strip = await mountBanner()

      expect(floatingIn(strip)).toBe(false)
    })

    it('stays hidden while the strip is on screen, and shows once it scrolls away', async () => {
      setting.value = banner()
      const strip = await mountBanner()

      observed[0]!([{ isIntersecting: true }])
      await nextTick()
      expect(floatingIn(strip)).toBe(false)

      observed[0]!([{ isIntersecting: false }])
      await nextTick()
      expect(floatingIn(strip)).toBe(true)
    })

    it('hides again while the footer\'s copy is on screen, so the logos are never shown twice', async () => {
      setting.value = banner()
      const strip = await mountBanner()
      const framed = await mountBanner({ framed: true })

      observed[0]!([{ isIntersecting: false }])
      observed[1]!([{ isIntersecting: true }])
      await nextTick()

      expect(floatingIn(strip)).toBe(false)
      expect(floatingIn(framed)).toBe(false)
    })

    it('links to the operation for a pointer, but is a duplicate assistive technology skips', async () => {
      setting.value = banner()
      const strip = await mountBanner()

      observed[0]!([{ isIntersecting: false }])
      await nextTick()

      const bar = strip.find('[data-funding-floating]')
      expect(bar.attributes('aria-hidden')).toBe('true')
      const link = bar.find('a')
      expect([link.attributes('href'), link.attributes('tabindex')]).toEqual(['/chrimatodotisi', '-1'])
    })
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
