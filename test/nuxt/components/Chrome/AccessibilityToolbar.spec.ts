import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ChromeAccessibilityToolbar from '~/components/Chrome/AccessibilityToolbar.vue'

/**
 * The accessibility toolbar: one round button that opens a titled side
 * panel of display preferences. Each preference is a toggle button that
 * reports its state (`aria-pressed`), lands as a class on <html> and is
 * remembered in this browser.
 */
const STORAGE_KEY = 'a11y-preferences'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = {
  open: 'Εργαλεία προσβασιμότητας',
  larger: 'Μεγαλύτερο κείμενο',
  smaller: 'Μικρότερο κείμενο',
  contrast: 'Υψηλή αντίθεση',
  reset: 'Επαναφορά',
}

const html = () => document.documentElement

function clearPreferences() {
  localStorage.removeItem(STORAGE_KEY)
  for (const name of [...html().classList].filter(name => name.startsWith('a11y-'))) html().classList.remove(name)
  clearNuxtState('a11y-preferences')
}

async function openPanel() {
  const wrapper = await mountSuspended(ChromeAccessibilityToolbar, { route: false })
  await wrapper.find(`button[aria-label="${COPY.open}"]`).trigger('click')
  await flushPromises()
  const panel = document.body.querySelector<HTMLElement>('[role="dialog"]')!
  const button = (name: string) =>
    [...panel.querySelectorAll<HTMLButtonElement>('button')].find(candidate => candidate.textContent?.trim() === name || candidate.getAttribute('aria-label') === name)!
  return { wrapper, panel, button }
}

describe('Chrome/AccessibilityToolbar', () => {
  beforeEach(clearPreferences)
  afterEach(clearPreferences)

  it('is one button named for what it opens', async () => {
    const wrapper = await mountSuspended(ChromeAccessibilityToolbar, { route: false })

    const button = wrapper.find(`button[aria-label="${COPY.open}"]`)
    expect(button.exists()).toBe(true)
    expect(button.attributes('aria-expanded')).toBe('false')
  })

  it('opens a dialog named by its title, every preference off and nothing to reset', async () => {
    const { panel, button } = await openPanel()

    expect(panel.getAttribute('aria-labelledby')).toBeTruthy()
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent).toBe(COPY.open)
    const toggles = [...panel.querySelectorAll('button[aria-pressed]')]
    expect(toggles.map(toggle => toggle.getAttribute('aria-pressed'))).toEqual(Array.from({ length: 6 }, () => 'false'))
    expect(button(COPY.reset).disabled).toBe(true)
  })

  it('turns a preference on: pressed, a class on <html>, remembered here', async () => {
    const { button } = await openPanel()

    button(COPY.contrast).click()
    await flushPromises()

    expect(button(COPY.contrast).getAttribute('aria-pressed')).toBe('true')
    expect(html().classList.contains('a11y-contrast')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({ contrast: true })
  })

  it('steps the text size up to its largest and no further', async () => {
    const { panel, button } = await openPanel()

    button(COPY.larger).click()
    await flushPromises()
    button(COPY.larger).click()
    await flushPromises()

    expect(panel.querySelector('output')?.textContent).toBe('130%')
    expect(button(COPY.larger).disabled).toBe(true)
    expect(html().classList.contains('a11y-text-2')).toBe(true)
  })

  it('resets every preference at once', async () => {
    const { button } = await openPanel()
    button(COPY.contrast).click()
    button(COPY.larger).click()
    await flushPromises()

    button(COPY.reset).click()
    await flushPromises()

    expect([...html().classList].filter(name => name.startsWith('a11y-'))).toEqual([])
    expect(button(COPY.contrast).getAttribute('aria-pressed')).toBe('false')
  })

  it('shows the preferences this browser remembers', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ contrast: true }))

    const { button } = await openPanel()

    expect(button(COPY.contrast).getAttribute('aria-pressed')).toBe('true')
  })
})
