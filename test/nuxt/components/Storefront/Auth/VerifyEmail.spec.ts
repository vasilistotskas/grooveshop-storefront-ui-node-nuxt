import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import VerifyEmail from '~/components/Storefront/Auth/VerifyEmail.vue'
import { asProxiedError } from '~~/test/fixtures/allauth'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Verifying a new account's email with the emailed code: the code form,
 * the in-place resend, and "Wrong email? Change it", which points the
 * pending verification at a corrected address (allauth mails it a fresh
 * code). The frozen webside page keeps its own copy and is not covered.
 */
const { emailVerify, resendEmailVerificationCode, addEmailAddress, toastAdd } = vi.hoisted(() => ({
  emailVerify: vi.fn((_body: { key: string }) => Promise.resolve({ status: 200 })),
  resendEmailVerificationCode: vi.fn(() => Promise.resolve({ status: 200 })),
  addEmailAddress: vi.fn((_body: { email: string }) => Promise.resolve({ status: 200, data: [] })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ emailVerify, resendEmailVerificationCode }))
mockNuxtImport('useAllAuthAccount', () => () => ({ addEmailAddress }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/** The component's own `<i18n>` copy (el). */
const COPY = {
  changed: (email: string) => `Σου στείλαμε νέο κωδικό στο ${email}.`,
  changeLimit: 'Δεν μπορείς να αλλάξεις ξανά τη διεύθυνση. Ξεκίνα από την αρχή.',
  resendNow: 'Στείλε τον ξανά',
}

beforeEach(() => {
  setTenant({ codeResendCooldownSeconds: undefined })
  emailVerify.mockResolvedValue({ status: 200 })
  addEmailAddress.mockResolvedValue({ status: 200, data: [] })
})

const mountPage = () => mountSuspended(VerifyEmail, { route: '/account/verify-email' })

const changeToggle = (wrapper: VueWrapper) =>
  wrapper.findAll('button').find(button => button.text() === 'Άλλαξέ το')!

async function openChangeForm(wrapper: VueWrapper) {
  await changeToggle(wrapper).trigger('click')
  await flushPromises()
}

async function submitNewEmail(wrapper: VueWrapper, email: string) {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('form:has(input[type="email"])').trigger('submit')
  await flushPromises()
}

describe('Storefront/Auth/VerifyEmail', () => {
  it('confirms the email as soon as the sixth digit is typed', async () => {
    const wrapper = await mountPage()

    await wrapper.findComponent({ name: 'UPinInput' }).setValue('482913'.split(''))
    await flushPromises()

    expect(emailVerify).toHaveBeenCalledWith({ key: '482913' })
  })

  it('sends the code again in place, through the verification resend', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text() === COPY.resendNow)!.trigger('click')
    await flushPromises()

    expect(resendEmailVerificationCode).toHaveBeenCalledTimes(1)
  })

  describe('wrong email', () => {
    it('keeps the correction form closed until asked', async () => {
      const wrapper = await mountPage()

      expect(wrapper.find('input[type="email"]').exists()).toBe(false)

      await openChangeForm(wrapper)

      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    })

    it('points the verification at the corrected address, clears the digits and closes the form', async () => {
      const wrapper = await mountPage()
      await wrapper.findComponent({ name: 'UPinInput' }).setValue(['1', '2'])
      await openChangeForm(wrapper)

      await submitNewEmail(wrapper, 'right@example.com')

      expect(addEmailAddress).toHaveBeenCalledWith({ email: 'right@example.com' })
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
        title: COPY.changed('right@example.com'),
        color: 'success',
      }))
      expect(wrapper.find('input[type="email"]').exists()).toBe(false)
      expect(wrapper.findComponent({ name: 'UPinInput' }).props('modelValue')).toEqual([])
    })

    it('starts the resend wait over, since the corrected address was just mailed a code', async () => {
      vi.useFakeTimers()
      try {
        setTenant({ codeResendCooldownSeconds: 30 })
        const wrapper = await mountPage()
        await vi.advanceTimersByTimeAsync(30_000)
        const resendButton = () => wrapper.findAll('button').find(button => button.text().includes('0:') || button.text() === COPY.resendNow)!
        expect(resendButton().text()).toBe(COPY.resendNow)
        await openChangeForm(wrapper)

        await submitNewEmail(wrapper, 'right@example.com')

        expect(resendButton().text()).toBe('Νέα αποστολή σε 0:30')
      }
      finally {
        vi.useRealTimers()
      }
    })

    it('refuses an address that is not an email before asking allauth', async () => {
      const wrapper = await mountPage()
      await openChangeForm(wrapper)

      await submitNewEmail(wrapper, 'not-an-email')

      expect(addEmailAddress).not.toHaveBeenCalled()
    })

    it('says so, and keeps the form, once the changes allowed are spent', async () => {
      addEmailAddress.mockRejectedValue(asProxiedError({ status: 409 as const }))
      const wrapper = await mountPage()
      await openChangeForm(wrapper)

      await submitNewEmail(wrapper, 'right@example.com')

      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.changeLimit, color: 'warning' }))
      expect(wrapper.find('input[type="email"]').exists()).toBe(true)
    })
  })
})
