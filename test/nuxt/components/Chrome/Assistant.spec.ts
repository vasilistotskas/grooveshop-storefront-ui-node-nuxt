import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import Assistant from '~/components/Chrome/Assistant.vue'

/**
 * The assistant's launcher and frame. The conversation is its own spec;
 * its module is replaced by a stub that can close itself, and the
 * overlay (which teleports to the body) is read from the document.
 */
const state = vi.hoisted(() => ({ enabled: true, mobile: false }))
mockNuxtImport('useSettingFlag', () => (key: string) => computed(() => key === 'CHAT_WIDGET_ENABLED' && state.enabled))
mockNuxtImport('useDevice', () => () => ({ isMobile: state.mobile }))

vi.mock('~/components/Chrome/AssistantPanel.vue', () => ({
  default: {
    emits: ['close'],
    template: '<div data-test="panel"><button data-test="panel-close" @click="$emit(\'close\')" /></div>',
  },
}))

const own = (wrapper: VueWrapper, key: string) =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

const launcher = (wrapper: VueWrapper) => wrapper.find('button[aria-expanded]')

const panel = () => document.body.querySelector('[data-test="panel"]')

describe('Chrome/Assistant', () => {
  beforeEach(() => {
    state.enabled = true
    state.mobile = false
    useShopChat().open.value = false
  })

  it('draws nothing while the merchant has the assistant switched off', async () => {
    state.enabled = false

    const wrapper = await mountSuspended(Assistant, { route: false })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(useShopChat().open.value).toBe(false)
  })

  it('opens the panel from the launcher and closes it from the panel', async () => {
    const wrapper = await mountSuspended(Assistant, { route: false })
    expect(launcher(wrapper).attributes('aria-label')).toBe(own(wrapper, 'open'))
    expect(launcher(wrapper).attributes('aria-expanded')).toBe('false')

    await launcher(wrapper).trigger('click')
    await vi.waitFor(() => expect(panel()).not.toBeNull())
    expect(launcher(wrapper).attributes('aria-expanded')).toBe('true')
    expect(launcher(wrapper).attributes('aria-label')).toBe(own(wrapper, 'close'))

    ;(document.body.querySelector('[data-test="panel-close"]') as HTMLElement).click()
    await vi.waitFor(() => expect(launcher(wrapper).attributes('aria-expanded')).toBe('false'))
  })

  it('opens when something else asks the shared chat state to open', async () => {
    const wrapper = await mountSuspended(Assistant, { route: false })

    useShopChat().open.value = true

    await vi.waitFor(() => expect(panel()).not.toBeNull())
    expect(launcher(wrapper).attributes('aria-expanded')).toBe('true')
  })

  it('opens a bottom drawer on a phone', async () => {
    state.mobile = true
    const wrapper = await mountSuspended(Assistant, { route: false })

    await launcher(wrapper).trigger('click')

    await vi.waitFor(() => expect(panel()).not.toBeNull())
    expect(document.body.querySelector('[role="dialog"]')?.getAttribute('data-vaul-drawer')).not.toBeNull()
  })
})
