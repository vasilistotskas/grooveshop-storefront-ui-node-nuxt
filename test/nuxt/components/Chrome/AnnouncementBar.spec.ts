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
