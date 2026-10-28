import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ChatWidget from '~/components/Chat/Widget.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The webside assistant's launcher and frame. Whether it is open is the
 * shared chat state (`useShopChat().open`), as in the default design, so
 * anything that opens the assistant opens this one. The conversation is
 * its own spec; its module is replaced by a stub.
 */
const state = vi.hoisted(() => ({ mobile: false }))
mockNuxtImport('useDevice', () => () => ({ isMobile: state.mobile }))

vi.mock('~/components/Chat/Panel.vue', () => ({
  default: {
    emits: ['close'],
    template: '<div data-test="panel"><button data-test="panel-close" @click="$emit(\'close\')" /></div>',
  },
}))

const own = (wrapper: VueWrapper, key: string) =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

const launcher = (wrapper: VueWrapper) => wrapper.find('button[aria-expanded]')

// A wide screen draws the panel in place; a phone's drawer teleports it to the body.
const panel = (wrapper: VueWrapper) =>
  wrapper.element.parentElement?.querySelector('[data-test="panel"]') ?? document.body.querySelector('[data-test="panel"]')

describe('Chat/Widget', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ chatWidget: true })
    state.mobile = false
    useShopChat().open.value = false
  })

  it('draws nothing while the store lacks the chatWidget feature', async () => {
    setTenantFeatures({ chatWidget: false })

    const wrapper = await mountSuspended(ChatWidget, { route: false })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('opens the panel from the launcher into the shared state, and closes it from the panel', async () => {
    const wrapper = await mountSuspended(ChatWidget, { route: false })
    expect(launcher(wrapper).attributes('aria-label')).toBe(own(wrapper, 'chat.open'))

    await launcher(wrapper).trigger('click')

    await vi.waitFor(() => expect(panel(wrapper)).not.toBeNull())
    expect(useShopChat().open.value).toBe(true)
    expect(launcher(wrapper).attributes('aria-label')).toBe(own(wrapper, 'chat.close'))

    ;(panel(wrapper)!.querySelector('[data-test="panel-close"]') as HTMLElement).click()
    await vi.waitFor(() => expect(launcher(wrapper).attributes('aria-expanded')).toBe('false'))
    expect(useShopChat().open.value).toBe(false)
  })

  it.each([false, true])('opens when something else asks the shared chat state to open (phone: %s)', async (mobile) => {
    state.mobile = mobile
    const wrapper = await mountSuspended(ChatWidget, { route: false })

    useShopChat().open.value = true

    await vi.waitFor(() => expect(panel(wrapper)).not.toBeNull())
    expect(launcher(wrapper).attributes('aria-expanded')).toBe('true')
  })
})
