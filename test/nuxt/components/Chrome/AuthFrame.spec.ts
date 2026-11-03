import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import AuthFrame from '~/components/Chrome/AuthFrame.vue'
import WebsideAuthFrame from '~/components/variants/webside/Chrome/AuthFrame.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * What a design draws around the sign-in pages. The platform draws nothing
 * of its own; webside shows the `authPanel` Django serves typed on
 * `/settings/public` beside the page, and exactly what the store set: no
 * photo, no panel; no line, a photo alone; a line in the page's locale.
 */
const { setting } = vi.hoisted(() => ({ setting: { value: null as AuthPanel | null } }))

mockNuxtImport('useStoreSettings', () => () => ({ authPanel: computed(() => setting.value) }))

const PHOTO = 'media/webside/uploads/hero.jpg'
const PAGE = 'the sign-in page'

const mountFrame = (component: unknown, route = '/account/login') =>
  mountSuspended(component as never, { route, slots: { default: () => h('p', { 'data-page': '' }, PAGE) } })

beforeEach(() => {
  setting.value = null
  setTenant({ availableLocales: ['el', 'en'] })
})

describe('default Chrome/AuthFrame', () => {
  it('draws only the page', async () => {
    setting.value = { imageUrl: PHOTO, tagline: 'Μια φράση' }

    const wrapper = await mountFrame(AuthFrame)

    expect(wrapper.find('[data-page]').text()).toBe(PAGE)
    expect(wrapper.find('aside').exists()).toBe(false)
  })
})

describe('webside Chrome/AuthFrame', () => {
  it('shows the photo and the line beside the page', async () => {
    setting.value = { imageUrl: PHOTO, tagline: 'Μια φράση', i18n: {} }

    const wrapper = await mountFrame(WebsideAuthFrame)

    expect(wrapper.get('aside').findComponent({ name: 'ImgWithFallback' }).props('src')).toBe(PHOTO)
    expect(wrapper.get('aside').text()).toBe('Μια φράση')
    expect(wrapper.find('[data-page]').text()).toBe(PAGE)
  })

  it('keeps the photo decorative, so the page\'s own heading stays its one h1', async () => {
    setting.value = { imageUrl: PHOTO, tagline: 'Μια φράση', i18n: {} }

    const wrapper = await mountFrame(WebsideAuthFrame)

    expect(wrapper.get('aside').findComponent({ name: 'ImgWithFallback' }).attributes('alt')).toBe('')
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('says the line in the page\'s locale', async () => {
    setting.value = { imageUrl: PHOTO, tagline: 'Μια φράση', i18n: { en: { tagline: 'A line' } } }

    const wrapper = await mountFrame(WebsideAuthFrame, '/en/account/login')

    expect(wrapper.get('aside').text()).toBe('A line')
  })

  it('shows the photo alone when the store set no line, never an invented one', async () => {
    setting.value = { imageUrl: PHOTO, i18n: {} }

    const wrapper = await mountFrame(WebsideAuthFrame)

    expect(wrapper.get('aside').findComponent({ name: 'ImgWithFallback' }).exists()).toBe(true)
    expect(wrapper.get('aside').find('p').exists()).toBe(false)
  })

  it.each([
    { name: 'no setting', value: null },
    { name: 'a line but no photo', value: { tagline: 'Μόνο λόγια', i18n: {} } },
  ])('draws no panel with $name, and the page keeps the whole row', async ({ value }) => {
    setting.value = value

    const wrapper = await mountFrame(WebsideAuthFrame)

    expect(wrapper.find('aside').exists()).toBe(false)
    expect(wrapper.find('[data-page]').text()).toBe(PAGE)
  })
})
