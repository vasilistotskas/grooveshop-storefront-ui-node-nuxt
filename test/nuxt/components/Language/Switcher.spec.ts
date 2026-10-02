import { describe, it, expect, beforeEach, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import LanguageSwitcher from '~/components/Language/Switcher.vue'
import { setTenant } from '~~/test/helpers/tenant'

const { setLanguage } = vi.hoisted(() => ({ setLanguage: vi.fn((_locale: string) => Promise.resolve(true)) }))
mockNuxtImport('useUserLanguage', () => () => ({ setLanguage }))

const mountSwitcher = () => mountSuspended(LanguageSwitcher, { route: false, attachTo: document.body })

/** Open the select and pick the option whose text is `label`. */
async function choose(wrapper: VueWrapper, label: string) {
  await wrapper.find('button').trigger('click')
  await flushPromises()
  const option = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')]
    .find(el => el.textContent?.includes(label))
  expect(option?.textContent).toContain(label)
  option!.click()
  await flushPromises()
}

/**
 * The header's language select: only the locales THIS store serves
 * (the i18n list is platform-wide), and a choice persists through
 * `setLanguage` — reverting when the server refuses it.
 */
describe('Language/Switcher', () => {
  beforeEach(() => {
    setTenant({ availableLocales: ['el', 'en'] })
  })

  it('offers only the store\'s locales, and nothing for a one-language store', async () => {
    setTenant({ availableLocales: ['el'] })

    const wrapper = await mountSwitcher()

    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it('persists the chosen language and says so', async () => {
    const wrapper = await mountSwitcher()

    await choose(wrapper, 'English')

    expect(setLanguage).toHaveBeenCalledWith('en')
    expect(wrapper.emitted('languageChanged')).toEqual([['en']])
  })

  it('goes back to the current language when the server refuses the change', async () => {
    setLanguage.mockResolvedValue(false)
    const wrapper = await mountSwitcher()

    await choose(wrapper, 'English')

    expect(setLanguage).toHaveBeenCalledWith('en')
    expect(wrapper.emitted('languageChanged')).toBeUndefined()
    expect(wrapper.find('button').text()).toBe('Ελληνικά')
  })
})
