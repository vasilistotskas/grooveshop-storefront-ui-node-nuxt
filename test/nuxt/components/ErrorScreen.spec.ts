import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import ErrorScreen from '~/components/ErrorScreen.vue'

/**
 * The error page body: the store's own chrome around the status code,
 * what happened, a search and the two ways out. `error.vue` is a shell
 * that renders outside every layout, so this body draws the header,
 * footer and tab bar itself — here as stand-ins that name their slot.
 */
const state = vi.hoisted(() => ({ mobileNav: true }))
const { clearError } = vi.hoisted(() => ({ clearError: vi.fn(() => Promise.resolve()) }))

mockNuxtImport('clearError', () => clearError)
mockNuxtImport('useSettingFlag', () => () => computed(() => state.mobileNav))
mockNuxtImport('resolveChrome', () => (key: string) => defineComponent({
  name: `Chrome-${key}`,
  setup: () => () => h('div', { 'data-chrome': key }),
}))

const error = (statusCode: number) => createError({ statusCode, statusMessage: 'x' })

const mountScreen = async (statusCode = 404) => {
  const wrapper = await mountSuspended(ErrorScreen, { route: false, props: { error: error(statusCode) } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  state.mobileNav = true
})

describe('ErrorScreen', () => {
  it('draws the store\'s header, then the page, then the footer and the tab bar', async () => {
    const wrapper = await mountScreen()

    const order = wrapper.findAll('[data-chrome], main').map(el => el.attributes('data-chrome') ?? 'main')
    expect(order).toEqual(['navbar', 'main', 'footer', 'mobile_nav'])
  })

  it('leaves the tab bar out when the store switched it off', async () => {
    state.mobileNav = false

    const wrapper = await mountScreen()

    expect(wrapper.find('[data-chrome="mobile_nav"]').exists()).toBe(false)
  })

  it('names a 404 as such: the code, what happened, and a search', async () => {
    const wrapper = await mountScreen(404)

    expect(wrapper.get('p[aria-label="404"]').text()).toBe('404')
    expect(wrapper.get('h1').text()).toBe('Δεν βρήκαμε αυτή τη σελίδα.')
    expect(wrapper.get('form[role="search"] input').attributes('aria-label')).toBe('Αναζήτηση στο κατάστημα')
  })

  it('gives the middle digit of a three-digit code the accent, and no other', async () => {
    const wrapper = await mountScreen(404)

    // The class is the contract here: the accent on the zero is the board's mark.
    expect(wrapper.findAll('p[aria-label="404"] span').map(glyph => glyph.classes('text-accent'))).toEqual([false, true, false])
  })

  it('says a server error is ours, and offers no search', async () => {
    const wrapper = await mountScreen(503)

    expect(wrapper.get('p[aria-label="503"]').text()).toBe('503')
    expect(wrapper.get('h1').text()).toBe('Κάτι πήγε στραβά από τη δική μας πλευρά.')
    expect(wrapper.find('form[role="search"]').exists()).toBe(false)
  })

  it.each([500, 599])('treats %i as a server error, and 499 as neither', async (code) => {
    const server = await mountScreen(code)
    expect(server.get('h1').text()).toBe('Κάτι πήγε στραβά από τη δική μας πλευρά.')

    const other = await mountScreen(499)
    expect(other.get('h1').text()).toBe('Παρουσιάστηκε σφάλμα.')
  })

  it('says only that an error occurred for any other status', async () => {
    const wrapper = await mountScreen(403)

    expect(wrapper.get('h1').text()).toBe('Παρουσιάστηκε σφάλμα.')
  })

  it('takes a search to the search page, clearing the error, with the term trimmed', async () => {
    const wrapper = await mountScreen()

    await wrapper.get('form[role="search"] input').setValue('  φορτιστής  ')
    await wrapper.get('form[role="search"]').trigger('submit')

    expect(clearError).toHaveBeenCalledWith({ redirect: '/search?query=%CF%86%CE%BF%CF%81%CF%84%CE%B9%CF%83%CF%84%CE%AE%CF%82' })
  })

  it('ignores an empty search', async () => {
    const wrapper = await mountScreen()

    await wrapper.get('form[role="search"] input').setValue('   ')
    await wrapper.get('form[role="search"]').trigger('submit')

    expect(clearError).not.toHaveBeenCalled()
  })

  it('leads to the shop and to the contact page, each clearing the error', async () => {
    const wrapper = await mountScreen()
    const button = (label: string) => wrapper.findAll('button').find(candidate => candidate.text() === label)!

    await button('Πήγαινε στο κατάστημα').trigger('click')
    await button('Επικοινωνία').trigger('click')

    expect(clearError.mock.calls).toEqual([[{ redirect: '/products' }], [{ redirect: '/contact' }]])
  })
})
