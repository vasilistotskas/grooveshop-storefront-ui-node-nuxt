import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import RecoveryCodes from '~/components/Account/2Fa/RecoveryCodes/index.vue'

/**
 * The shopper's unused recovery codes, with copy, download and print.
 * The print window is written with `textContent`, never as HTML, so a
 * code can never inject markup there. Mocked at `useAllAuthAccount`.
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

async function mountCodes() {
  const wrapper = await mountSuspended(RecoveryCodes, { route: false })
  await flushPromises()
  return wrapper
}

const button = (wrapper: VueWrapper, label: string) => wrapper.findAll('button').find(b => b.text() === label)!
/** The codes are plain `<button>`s (click to copy), set in monospace unlike every UButton here. */
const codeButtons = (wrapper: VueWrapper) => wrapper.findAll('button.font-mono')

describe('Account/2Fa/RecoveryCodes', () => {
  it('lists the unused codes in order', async () => {
    const wrapper = await mountCodes()

    expect(codeButtons(wrapper).map(code => code.findAll('span span').map(part => part.text()))).toEqual([
      ['1', '12345678'],
      ['2', '23456789'],
      ['3', '34567890'],
    ])
  })

  it('copies every code, one per line', async () => {
    const wrapper = await mountCodes()

    await button(wrapper, 'Αντιγραφή Όλων').trigger('click')
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

    await button(wrapper, 'Λήψη').trigger('click')

    expect(click).toHaveBeenCalledTimes(1)
    const text = await createObjectURL.mock.calls[0]![0].text()
    expect(text).toContain('12345678\n23456789\n34567890')
  })

  it('prints the codes as text, never as markup', async () => {
    getRecoveryCodes.mockResolvedValue(recovery(['<img src=x onerror=alert(1)>', ...CODES]))
    const printDocument = document.implementation.createHTMLDocument('print')
    const print = vi.fn()
    vi.spyOn(window, 'open').mockReturnValue({ document: printDocument, print } as unknown as Window)
    const wrapper = await mountCodes()

    await button(wrapper, 'Εκτύπωση').trigger('click')

    const printed = [...printDocument.querySelectorAll('.codes .code')].map(code => code.textContent)
    expect(printed).toEqual(['<img src=x onerror=alert(1)>', ...CODES])
    expect(printDocument.querySelector('.codes img')).toBeNull()
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('says how many codes have been used', async () => {
    const wrapper = await mountCodes()

    expect(wrapper.text()).toContain('Έχουν χρησιμοποιηθεί 7 κωδικοί')
  })

  it('links to generating a new set', async () => {
    const wrapper = await mountCodes()

    expect(wrapper.find(`a[href="${useLocalePath()('account-2fa-recovery-codes-generate')}"]`).exists()).toBe(true)
  })

  it('sends a shopper without two-factor set up back to the settings', async () => {
    getRecoveryCodes.mockRejectedValue(new Error('Not Found'))

    await mountCodes()

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('auth.mfa.required'), color: 'error' })
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-settings'))
  })
})
