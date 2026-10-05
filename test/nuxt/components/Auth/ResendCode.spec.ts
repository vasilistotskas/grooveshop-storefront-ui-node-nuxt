import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import AuthResendCode from '~/components/Auth/ResendCode.vue'
import { asProxiedError } from '~~/test/fixtures/allauth'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * "Send the code again" under an emailed-code form. The wait is the
 * cooldown the tenant publishes; a tenant that publishes none keeps the
 * action and loses only the timer. A 429 asks the shopper to wait, a 409
 * sends them back to the step that issues a code.
 */
const { navigateToMock, toastAdd } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/** The component's own `<i18n>` copy (el). */
const COPY = {
  sent: 'Σου στείλαμε νέο κωδικό.',
  wait: 'Περίμενε λίγο πριν ζητήσεις νέο κωδικό.',
  startOver: 'Δεν μπορούμε να στείλουμε άλλον κωδικό. Ξεκίνα από την αρχή.',
  resend: 'Στείλε τον ξανά',
  resendIn: (time: string) => `Νέα αποστολή σε ${time}`,
}

const send = vi.fn(() => Promise.resolve({ status: 200 }))

const mountResend = () => mountSuspended(AuthResendCode, {
  props: { send, startOver: 'account-login-code' },
})

const button = (wrapper: Awaited<ReturnType<typeof mountResend>>) => wrapper.find('button')

async function tick(seconds: number) {
  await vi.advanceTimersByTimeAsync(seconds * 1000)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers()
  send.mockResolvedValue({ status: 200 })
  setTenant({ codeResendCooldownSeconds: 30 })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Auth/ResendCode', () => {
  describe('with a published cooldown', () => {
    it('opens on the full wait, with the action off', async () => {
      const wrapper = await mountResend()

      expect(button(wrapper).text()).toBe(COPY.resendIn('0:30'))
      expect(button(wrapper).attributes('disabled')).toBeDefined()
    })

    it('counts down in whole seconds and unlocks the action at zero', async () => {
      const wrapper = await mountResend()

      await tick(12)
      expect(button(wrapper).text()).toBe(COPY.resendIn('0:18'))

      await tick(18)
      expect(button(wrapper).text()).toBe(COPY.resend)
      expect(button(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('uses the tenant\'s number, not a fixed one', async () => {
      setTenant({ codeResendCooldownSeconds: 75 })
      const wrapper = await mountResend()

      expect(button(wrapper).text()).toBe(COPY.resendIn('1:15'))
    })

    it('sends again, confirms it, and starts the wait over', async () => {
      const wrapper = await mountResend()
      await tick(30)

      await button(wrapper).trigger('click')
      await flushPromises()

      expect(send).toHaveBeenCalledTimes(1)
      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.sent, color: 'success' }))
      expect(wrapper.emitted('sent')).toHaveLength(1)
      expect(button(wrapper).text()).toBe(COPY.resendIn('0:30'))
    })

    it('restarts the wait when the page sent a code by other means', async () => {
      const wrapper = await mountResend()
      await tick(30)

      ;(wrapper.vm as unknown as { restart: () => void }).restart()
      await flushPromises()

      expect(button(wrapper).text()).toBe(COPY.resendIn('0:30'))
    })
  })

  describe('without a published cooldown', () => {
    beforeEach(() => {
      setTenant({ codeResendCooldownSeconds: undefined })
    })

    it('keeps the action on and shows no timer', async () => {
      const wrapper = await mountResend()

      expect(button(wrapper).text()).toBe(COPY.resend)
      expect(button(wrapper).attributes('disabled')).toBeUndefined()
    })

    it('still sends', async () => {
      const wrapper = await mountResend()

      await button(wrapper).trigger('click')
      await flushPromises()

      expect(send).toHaveBeenCalledTimes(1)
      expect(button(wrapper).text()).toBe(COPY.resend)
    })
  })

  it('asks the shopper to wait on a 429, and waits the cooldown again', async () => {
    send.mockRejectedValue({ statusCode: 429, data: { statusCode: 429 } })
    const wrapper = await mountResend()
    await tick(30)

    await button(wrapper).trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.wait, color: 'warning' }))
    expect(wrapper.emitted('sent')).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(button(wrapper).text()).toBe(COPY.resendIn('0:30'))
  })

  it('sends the shopper back to the start on a 409', async () => {
    send.mockRejectedValue(asProxiedError({ status: 409 as const }))
    const wrapper = await mountResend()
    await tick(30)

    await button(wrapper).trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.startOver, color: 'warning' }))
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-login-code'))
    expect(wrapper.emitted('sent')).toBeUndefined()
  })

  it('names the step to go back to', async () => {
    send.mockRejectedValue(asProxiedError({ status: 409 as const }))
    const wrapper = await mountSuspended(AuthResendCode, {
      props: { send, startOver: 'account-signup' },
    })
    await tick(30)

    await button(wrapper).trigger('click')
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-signup'))
  })
})
