import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import ColorModeToggle from '~/components/Chrome/variants/ekfyseosfyteias/ColorModeToggle.vue'

/**
 * The dark-theme switch: one toggle button whose name never changes,
 * `aria-pressed` carrying the state, and a press storing an explicit
 * choice.
 */
const mode = vi.hoisted(() => ({ value: 'light', preference: 'system' }))

mockNuxtImport('useColorMode', () => () => mode)

const NAME = 'Σκούρο θέμα'

const mountToggle = async () => {
  const wrapper = await mountSuspended(ColorModeToggle, { route: false })
  await vi.waitFor(() => expect(wrapper.find('button').exists()).toBe(true))
  return wrapper
}

describe('Chrome/variants/ekfyseosfyteias/ColorModeToggle', () => {
  beforeEach(() => {
    Object.assign(mode, { value: 'light', preference: 'system' })
  })

  it('is a named toggle, not pressed in the light theme', async () => {
    const button = (await mountToggle()).find('button')

    expect(button.attributes('aria-label')).toBe(NAME)
    expect(button.attributes('aria-pressed')).toBe('false')
  })

  it('is pressed in the dark theme', async () => {
    mode.value = 'dark'

    const button = (await mountToggle()).find('button')

    expect(button.attributes('aria-pressed')).toBe('true')
  })

  it('stores an explicit dark choice when pressed in the light theme', async () => {
    await (await mountToggle()).find('button').trigger('click')

    expect(mode.preference).toBe('dark')
  })

  it('stores an explicit light choice when pressed in the dark theme', async () => {
    mode.value = 'dark'

    await (await mountToggle()).find('button').trigger('click')

    expect(mode.preference).toBe('light')
  })

  it('is an icon button: its name is for assistive technology only', async () => {
    const button = (await mountToggle()).find('button')

    expect(button.text()).toBe('')
    expect(button.attributes('aria-label')).toBe(NAME)
  })
})
