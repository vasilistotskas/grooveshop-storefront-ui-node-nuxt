import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import ActivateForm from '~/components/Account/2Fa/Totp/ActivateForm.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'

/**
 * Turning on TOTP: allauth hands back a secret and a QR code SVG (as a
 * 404 meta, before activation), the shopper confirms one code from their
 * app. The SVG is rendered with `v-html`, so it goes through DOMPurify.
 * Mocked at `useAllAuthAccount`.
 */
const { totpAuthenticatorStatus, activateTotp, navigateToMock, toastAdd, copy } = vi.hoisted(() => ({
  totpAuthenticatorStatus: vi.fn(),
  activateTotp: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
  copy: vi.fn((_text: string) => Promise.resolve()),
}))
mockNuxtImport('useAllAuthAccount', () => () => ({ totpAuthenticatorStatus, activateTotp }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useClipboard', () => () => ({ copy, isSupported: ref(true), copied: ref(false) }))

const SECRET = 'JBSWY3DPEHPK3PXP'
const setup = (totpSvg: string) => ({ status: 404, meta: { secret: SECRET, totp_svg: totpSvg } })

beforeEach(() => {
  clearNuxtData('totpAuthenticatorStatus')
  totpAuthenticatorStatus.mockResolvedValue(setup('<svg xmlns="http://www.w3.org/2000/svg"><rect width="10" height="10"/></svg>'))
})

async function mountForm() {
  const wrapper = await mountSuspended(ActivateForm, { route: false })
  await flushPromises()
  return wrapper
}

const WRONG_CODE = asProxiedError(makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' }))

const activateButton = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find(button => button.text() === 'Ενεργοποίηση')!

async function enterCode(wrapper: VueWrapper, digits: number[]) {
  await wrapper.findComponent({ name: 'UPinInput' }).setValue(digits)
  await activateButton(wrapper).trigger('click')
  await flushPromises()
}

describe('Account/2Fa/Totp/ActivateForm', () => {
  it('shows the QR code and the secret to set the app up with', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find('[role="img"] svg rect').exists()).toBe(true)
    expect(wrapper.text()).toContain('JBSW Y3DP EHPK 3PXP')
  })

  it('strips script and event handlers out of the QR code SVG', async () => {
    totpAuthenticatorStatus.mockResolvedValue(setup(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10" onload="steal()"/></svg>',
    ))

    const wrapper = await mountForm()
    const qr = wrapper.find('[role="img"]').html()

    expect(qr).toContain('<rect')
    expect(qr).not.toContain('script')
    expect(qr).not.toContain('onload')
  })

  it('copies the raw secret, without the grouping spaces, from the copy button', async () => {
    const wrapper = await mountForm()

    await wrapper.find('button[aria-label="Αντιγραφή κλειδιού"]').trigger('click')

    expect(copy).toHaveBeenCalledWith(SECRET)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Αντιγράφηκε στο πρόχειρο', color: 'success' })
  })

  it('activates TOTP with the code from the app, then returns to the settings', async () => {
    const wrapper = await mountForm()

    await enterCode(wrapper, [1, 2, 3, 4, 5, 6])

    expect(activateTotp).toHaveBeenCalledWith({ code: '123456' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success', description: 'Ο έλεγχος ταυτότητας δύο παραγόντων ενεργοποιήθηκε επιτυχώς' }))
    expect(wrapper.emitted('activateTotp')).toHaveLength(1)
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-security'))
  })

  it('lets the shopper retry a code containing a zero', async () => {
    // The pin input submits on its own when the sixth digit lands; the
    // button is the way to try again after a rejection. A number-mode
    // input holds 0 for the digit zero, which a "falsy means empty" test
    // read as a missing digit: for about half of all codes the button
    // stayed disabled and the shopper had to retype.
    activateTotp.mockRejectedValueOnce(WRONG_CODE)
    const wrapper = await mountForm()
    await wrapper.findComponent({ name: 'UPinInput' }).setValue([1, 0, 3, 4, 5, 0])
    await flushPromises()

    const retry = activateButton(wrapper)
    expect(retry.attributes('disabled')).toBeUndefined()
    await retry.trigger('click')
    await flushPromises()

    expect(activateTotp).toHaveBeenLastCalledWith({ code: '103450' })
    expect(activateTotp).toHaveBeenCalledTimes(2)
  })

  it('keeps Activate disabled until all six digits are in', async () => {
    const wrapper = await mountForm()
    expect(activateButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.findComponent({ name: 'UPinInput' }).setValue([1, 2, 3, 4, 5])
    await flushPromises()
    expect(activateButton(wrapper).attributes('disabled')).toBeDefined()
    expect(activateTotp).not.toHaveBeenCalled()

    await wrapper.findComponent({ name: 'UPinInput' }).setValue([1, 2, 3, 4, 5, 6])
    await flushPromises()
    expect(activateButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('offers Cancel as a link back to the security page', async () => {
    const wrapper = await mountForm()

    const cancel = wrapper.findAll('a').find(link => link.text() === 'Ακύρωση')!
    expect(cancel.attributes('href')).toBe(useLocalePath()('account-security'))
  })

  it('keeps the shopper on the form when allauth rejects the code', async () => {
    activateTotp.mockRejectedValue(WRONG_CODE)
    const wrapper = await mountForm()

    await enterCode(wrapper, [9, 8, 7, 6, 5, 4])

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('activateTotp')).toBeUndefined()
  })

  it('sends the shopper back to the settings when the setup cannot be loaded', async () => {
    totpAuthenticatorStatus.mockRejectedValue(new Error('Bad Gateway'))

    await mountForm()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-security'))
  })
})
