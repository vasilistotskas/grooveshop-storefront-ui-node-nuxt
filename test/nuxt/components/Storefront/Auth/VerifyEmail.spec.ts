import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import VerifyEmail from '~/components/Storefront/Auth/VerifyEmail.vue'
import WebsideVerifyEmail from '~/components/variants/webside/Storefront/Auth/VerifyEmail.vue'
import { asProxiedError } from '~~/test/fixtures/allauth'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * Verifying a new account's email with the emailed code
 * (`useVerifyEmail`, shared by both trees): the code form, sent by itself
 * on the sixth digit. The default also has the in-place resend and
 * "Wrong email? Change it", which points the pending verification at a
 * corrected address (allauth mails it a fresh code); the webside
 * page draws neither.
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

const { headSpy } = vi.hoisted(() => ({ headSpy: vi.fn() }))
mockNuxtImport('useHead', original => (input: Parameters<typeof original>[0]) => {
  headSpy(input)
  return original(input)
})

/** Each tree's own `<i18n>` copy (el). */
const COPY = {
  default: {
    confirmed: 'Το email σου επιβεβαιώθηκε.',
    invalidCode: 'Ο κωδικός δεν είναι σωστός ή έχει λήξει.',
    title: 'Επιβεβαίωσε το email σου',
  },
  webside: {
    confirmed: 'Το email σας επιβεβαιώθηκε επιτυχώς!',
    invalidCode: 'Ο κωδικός που εισαγάγατε δεν είναι έγκυρος ή έχει λήξει.',
    title: 'Επιβεβαίωση Email',
  },
  changed: (email: string) => `Σου στείλαμε νέο κωδικό στο ${email}.`,
  changeLimit: 'Δεν μπορείς να αλλάξεις ξανά τη διεύθυνση. Ξεκίνα από την αρχή.',
  resendNow: 'Στείλε τον ξανά',
}

beforeEach(() => {
  setTenant({ codeResendCooldownSeconds: undefined })
  emailVerify.mockResolvedValue({ status: 200 })
  addEmailAddress.mockResolvedValue({ status: 200, data: [] })
})

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

describe.each(trees(VerifyEmail, WebsideVerifyEmail))('$tree Storefront/Auth/VerifyEmail', ({ tree, C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/verify-email' })
  const typeCode = async (wrapper: VueWrapper, digits: string) => {
    await wrapper.findComponent({ name: 'UPinInput' }).setValue(digits.split(''))
    await flushPromises()
  }

  it('titles the document', async () => {
    await mountPage()

    expect(headSpy.mock.calls.map(([input]) => toValue(input.title))).toContain(COPY[tree].title)
  })

  it('confirms the email as soon as the sixth digit is typed', async () => {
    const wrapper = await mountPage()

    await typeCode(wrapper, '482913')

    expect(emailVerify).toHaveBeenCalledWith({ key: '482913' })
  })

  it('waits for all six digits', async () => {
    const wrapper = await mountPage()

    await typeCode(wrapper, '48291')

    expect(emailVerify).not.toHaveBeenCalled()
  })

  it('toasts the confirmation and goes to the account', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    const wrapper = await mountPage()

    await typeCode(wrapper, '482913')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('auth.email.verified'),
      description: COPY[tree].confirmed,
      color: 'success',
    }))
    expect(push).toHaveBeenCalledExactlyOnceWith(useLocalePath()('account'))
  })

  it('counts allauth\'s 401 (confirmed, but no pending session) as confirmed', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    emailVerify.mockResolvedValue({ status: 401 })
    const wrapper = await mountPage()

    await typeCode(wrapper, '482913')

    expect(push).toHaveBeenCalledExactlyOnceWith(useLocalePath()('account'))
  })

  it('says the code is not valid when allauth refuses it, and stays', async () => {
    const push = vi.spyOn(useRouter(), 'push').mockResolvedValue(undefined)
    emailVerify.mockRejectedValue(asProxiedError({ status: 400 as const, errors: [{ code: 'incorrect_code', message: 'Incorrect code.', param: 'key' }] }))
    const wrapper = await mountPage()

    await typeCode(wrapper, '482913')

    expect(wrapper.text()).toContain(COPY[tree].invalidCode)
    expect(push).not.toHaveBeenCalled()
  })

  describe.runIf(tree === 'default')('the in-place resend and the wrong-email form', () => {
    it('sends the code again in place, through the verification resend', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button').find(button => button.text() === COPY.resendNow)!.trigger('click')
      await flushPromises()

      expect(resendEmailVerificationCode).toHaveBeenCalledTimes(1)
    })

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
