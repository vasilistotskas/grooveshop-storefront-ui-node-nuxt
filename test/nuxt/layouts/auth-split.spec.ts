import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import AuthSplit from '~/layouts/auth-split.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The Volt sign-in frame's ink panel: the photo and the line of the
 * `authPanel` Django serves typed on `/settings/public`, the line in the
 * page's locale, and exactly that. A store that set no line shows none (the
 * panel never invents one from the store's description), and one that set no
 * photo keeps the plain ink panel.
 */
const { setting } = vi.hoisted(() => ({ setting: { value: null as AuthPanel | null } }))

mockNuxtImport('useStoreSettings', () => () => ({ authPanel: computed(() => setting.value) }))

const DESCRIPTION = 'Η περιγραφή του καταστήματος'

const panel = (value: Partial<AuthPanel> = {}): AuthPanel => ({
  imageUrl: 'media/demo/uploads/hero-audio.jpg',
  tagline: 'Ακουστικά που κάθονται σωστά.',
  i18n: { en: { tagline: 'Earbuds that actually fit.' } },
  ...value,
})

const mountLayout = (route = '/account/login') => mountSuspended(AuthSplit, { route })

const aside = (wrapper: Awaited<ReturnType<typeof mountLayout>>) => wrapper.get('aside')

beforeEach(() => {
  setting.value = null
  setTenant({ storeDescription: DESCRIPTION, availableLocales: ['el', 'en'] })
})

describe('layouts/auth-split', () => {
  it('labels the skip link in the page\'s language, not with its message key', async () => {
    const wrapper = await mountLayout()

    const skip = wrapper.find('a[href="#main-content"]')
    expect(skip.text()).toBe(useNuxtApp().$i18n.t('a11y.skip_to_content'))
    expect(skip.text()).not.toContain('a11y.')
  })

  describe('without an AUTH_PANEL setting', () => {
    it('keeps the plain ink panel and says nothing the store did not write', async () => {
      const wrapper = await mountLayout()

      expect(aside(wrapper).find('img').exists()).toBe(false)
      expect(aside(wrapper).find('p').exists()).toBe(false)
      expect(aside(wrapper).text()).not.toContain(DESCRIPTION)
    })
  })

  describe('with an AUTH_PANEL setting', () => {
    it('shows the photo through the media image component, and the default wording', async () => {
      setting.value = panel()

      const wrapper = await mountLayout()

      expect(aside(wrapper).findComponent({ name: 'ImgWithFallback' }).props('src')).toBe('media/demo/uploads/hero-audio.jpg')
      expect(aside(wrapper).text()).toContain('Ακουστικά που κάθονται σωστά.')
      expect(aside(wrapper).text()).not.toContain(DESCRIPTION)
    })

    it('shows the line in the page\'s locale', async () => {
      setting.value = panel()

      const wrapper = await mountLayout('/en/account/login')

      expect(aside(wrapper).text()).toContain('Earbuds that actually fit.')
    })

    it('shows the photo alone when the setting carries no line, never the store description', async () => {
      setting.value = { imageUrl: 'media/demo/uploads/hero-audio.jpg' }

      const wrapper = await mountLayout()

      expect(aside(wrapper).findComponent({ name: 'ImgWithFallback' }).exists()).toBe(true)
      expect(aside(wrapper).find('p').exists()).toBe(false)
      expect(aside(wrapper).text()).not.toContain(DESCRIPTION)
    })

    it('shows the line over the plain panel when the setting carries no photo', async () => {
      setting.value = { tagline: 'Μόνο λόγια' }

      const wrapper = await mountLayout()

      expect(aside(wrapper).findComponent({ name: 'ImgWithFallback' }).exists()).toBe(false)
      expect(aside(wrapper).text()).toContain('Μόνο λόγια')
    })
  })
})

describe('layouts/auth-split photo sizes', () => {
  it('asks the media service for real widths, never a 1px image stretched across the panel', async () => {
    setting.value = panel()

    const wrapper = await mountLayout()
    const img = wrapper.get('aside img')
    const urls = img.attributes('srcset')!.split(',').map(candidate => candidate.trim().split(' ')[0]!)
    const requested = urls.map((url) => {
      const [, width, height] = url.match(/hero-audio\.jpg\/(\d+)\/(\d+)\/cover\//)!
      return { width: Number(width), height: Number(height) }
    })

    expect(requested.length).toBeGreaterThan(0)
    for (const { width, height } of requested) {
      expect(width).toBeGreaterThanOrEqual(320)
      expect(height).toBeGreaterThanOrEqual(320)
      // the panel's 960 x 1080 frame
      expect(height / width).toBeCloseTo(1080 / 960, 1)
    }
    expect(img.attributes('loading')).toBe('lazy')
  })
})
