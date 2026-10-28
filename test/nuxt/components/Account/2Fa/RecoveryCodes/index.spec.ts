import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import RecoveryCodes from '~/components/Account/2Fa/RecoveryCodes/index.vue'
import WebsideRecoveryCodes from '~/components/variants/webside/Account/2Fa/RecoveryCodes/index.vue'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { trees } from '~~/test/helpers/trees'

/**
 * The shopper's unused recovery codes, with copy, download and print
 * (`useRecoveryCodes`, shared by both trees). The print window is written
 * with `textContent`, never as HTML, so a code can never inject markup
 * there. A shopper without two-factor goes back to the Security page. Both
 * trees warn when the codes run low. Mocked at `useAllAuthAccount`.
 */
const { getRecoveryCodes, navigateToMock, toastAdd, copy } = vi.hoisted(() => ({
  getRecoveryCodes: vi.fn(),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
  copy: vi.fn((_text: string) => Promise.resolve()),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ getRecoveryCodes }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useClipboard', () => () => ({ copy }))

const CODES = ['12345678', '23456789', '34567890']
const recovery = (unused: string[], total = 10) => ({
  status: 200,
  data: {
    type: 'recovery_codes',
    created_at: 1767225600, // 2026-01-01T00:00:00Z
    last_used_at: null,
    total_code_count: total,
    unused_code_count: unused.length,
    unused_codes: unused,
  },
})

beforeEach(() => {
  clearNuxtData('recoveryCodes')
  getRecoveryCodes.mockResolvedValue(recovery(CODES))
})

const COPY = {
  default: inlineCopy('app/components/Account/2Fa/RecoveryCodes/index.vue'),
  webside: inlineCopy('app/components/variants/webside/Account/2Fa/RecoveryCodes/index.vue'),
}

const button = (wrapper: VueWrapper, label: string) => wrapper.findAll('button').find(b => b.text() === label)!
/** The codes are the page's buttons that show a code, each copying its own. */
const codeButtons = (wrapper: VueWrapper) => wrapper.findAll('button').filter(b => /\d{8}|<img/.test(b.text()))

// Webside keeps an alert of its own (never share the codes), so the low-codes
// warning is found by its words.
const alerts = (wrapper: VueWrapper) => wrapper.findAllComponents({ name: 'UAlert' }).map(alert => alert.text()).join(' ')

describe.each(trees(RecoveryCodes, WebsideRecoveryCodes))('$tree Account/2Fa/RecoveryCodes', ({ tree, C }) => {
  const copyOf = COPY[tree]

  async function mountCodes() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  it('lists the unused codes in order', async () => {
    const wrapper = await mountCodes()

    expect(codeButtons(wrapper).map(code => code.text().slice(-8))).toEqual(CODES)
  })

  it('copies every code, one per line', async () => {
    const wrapper = await mountCodes()

    await button(wrapper, copyOf.actions.copy_all).trigger('click')
    await flushPromises()

    expect(copy).toHaveBeenCalledWith('12345678\n23456789\n34567890')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('copies the one code clicked', async () => {
    const wrapper = await mountCodes()

    await codeButtons(wrapper)[1]!.trigger('click')
    await flushPromises()

    expect(copy).toHaveBeenCalledWith('23456789')
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ description: '23456789' }))
  })

  it('downloads the codes as a text file', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:codes')
    vi.stubGlobal('URL', Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL: vi.fn() }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const wrapper = await mountCodes()

    await button(wrapper, copyOf.actions.download).trigger('click')

    expect(click).toHaveBeenCalledTimes(1)
    const text = await createObjectURL.mock.calls[0]![0].text()
    expect(text).toContain('12345678\n23456789\n34567890')
    expect(text).toContain(copyOf.print.title)
  })

  it('prints the codes as text, never as markup', async () => {
    getRecoveryCodes.mockResolvedValue(recovery(['<img src=x onerror=alert(1)>', ...CODES]))
    const printDocument = document.implementation.createHTMLDocument('print')
    const print = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ document: printDocument, print } as unknown as Window)
    const wrapper = await mountCodes()

    await button(wrapper, copyOf.actions.print).trigger('click')

    const printed = [...printDocument.querySelectorAll('.codes .code')].map(code => code.textContent)
    expect(printed).toEqual(['<img src=x onerror=alert(1)>', ...CODES])
    expect(printDocument.querySelector('.codes img')).toBeNull()
    expect(printDocument.querySelector('h1')!.textContent).toBe(copyOf.print.title)
    expect(print).toHaveBeenCalledTimes(1)
  })

  it.runIf(tree === 'default')('says how many of the set are left, and that none was used yet', async () => {
    const wrapper = await mountCodes()

    expect(wrapper.text()).toContain('3 από 10 αχρησιμοποίητοι')
    expect(wrapper.text()).toContain('Δεν έχει χρησιμοποιηθεί κανένας')
  })

  it('warns once three codes or fewer are left', async () => {
    const wrapper = await mountCodes()

    expect(alerts(wrapper)).toContain('Απομένουν μόνο 3 κωδικοί')
  })

  it('does not warn while plenty are left', async () => {
    getRecoveryCodes.mockResolvedValue(recovery([...CODES, '45678901']))

    const wrapper = await mountCodes()

    expect(alerts(wrapper)).not.toContain('Απομένουν μόνο')
  })

  it('links to generating a new set', async () => {
    const wrapper = await mountCodes()

    expect(wrapper.find(`a[href="${useLocalePath()('account-2fa-recovery-codes-generate')}"]`).exists()).toBe(true)
  })

  it('sends a shopper without two-factor set up back to where it is set up', async () => {
    getRecoveryCodes.mockRejectedValue(new Error('Not Found'))

    await mountCodes()

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('auth.mfa.required'), color: 'error' })
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-security'))
  })
})
