import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ReauthenticateByCodeConfirm from '~/components/Storefront/Auth/ReauthenticateByCodeConfirm.vue'
import WebsideReauthenticateByCodeConfirm from '~/components/variants/webside/Storefront/Auth/ReauthenticateByCodeConfirm.vue'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'
import { inlineCopy } from '~~/test/helpers/inlineCopy'
import { makeUserDetails } from '~~/test/fixtures/user'
import { trees } from '~~/test/helpers/trees'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Taking the code allauth mailed (`useEmailCodeReauthentication`, shared by
 * both trees): the six digits go to allauth as the sixth lands, a refused
 * code is cleared and said, and a code nobody is waiting for (409) sends the
 * shopper back to ask for one. Where the shopper goes after a confirmed code
 * is the auth plugin's `auth:change` chain.
 */
const { confirmReauthenticationCode, resendReauthenticationCode, toastAdd, routerPush } = vi.hoisted(() => ({
  confirmReauthenticationCode: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  resendReauthenticationCode: vi.fn(() => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
  routerPush: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ confirmReauthenticationCode, resendReauthenticationCode }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref(makeUserDetails({ email: 'maria@example.com' })),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

beforeEach(() => {
  setTenant()
  useState('authEvent').value = AuthChangeEvent.REAUTHENTICATION_REQUIRED
  confirmReauthenticationCode.mockResolvedValue({ status: 200 })
  vi.spyOn(useRouter(), 'push').mockImplementation(routerPush)
})

const RESEND = inlineCopy('app/components/Auth/ResendCode.vue')

const conflict = () => asProxiedError({ status: 409 })

async function typeCode(wrapper: VueWrapper, digits: string) {
  const inputs = wrapper.findAll('input[inputmode], input[type="text"]').filter(input => input.attributes('type') !== 'hidden')
  for (const [index, digit] of [...digits].entries()) await inputs[index]!.setValue(digit)
  await flushPromises()
}

describe.each(trees(ReauthenticateByCodeConfirm, WebsideReauthenticateByCodeConfirm))('$tree Storefront/Auth/ReauthenticateByCodeConfirm', ({ tree, C }) => {
  const COPY = inlineCopy(tree === 'webside'
    ? 'app/components/variants/webside/Storefront/Auth/ReauthenticateByCodeConfirm.vue'
    : 'app/components/Storefront/Auth/ReauthenticateByCodeConfirm.vue')

  const mountPage = () => mountSuspended(C, { route: '/account/reauthenticate/code/confirm?next=/account/settings' })

  it('names the address the code went to, with most of it hidden', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('m***@example.com')
  })

  it('sends the six digits to allauth as the sixth lands and says it is confirmed', async () => {
    const wrapper = await mountPage()

    await typeCode(wrapper, '123456')

    expect(confirmReauthenticationCode).toHaveBeenCalledExactlyOnceWith({ code: '123456' })
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
  })

  it('says a refused code is not valid and clears it', async () => {
    confirmReauthenticationCode.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' })))
    const wrapper = await mountPage()

    await typeCode(wrapper, '000000')

    expect(wrapper.text()).toContain(COPY.error.title)
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    const digits = wrapper.findAll('input').map(input => (input.element as HTMLInputElement).value).join('')
    expect(digits).toBe('')
  })

  it('does not call the code wrong when the request itself failed', async () => {
    confirmReauthenticationCode.mockRejectedValue(Object.assign(new Error('Too Many Requests'), { statusCode: 429 }))
    const wrapper = await mountPage()

    await typeCode(wrapper, '123456')

    expect(wrapper.text()).not.toContain(COPY.error.title)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
  })

  it('sends the shopper back to ask for a code when none is waiting, keeping next', async () => {
    confirmReauthenticationCode.mockRejectedValue(conflict())
    const wrapper = await mountPage()

    await typeCode(wrapper, '123456')

    expect(routerPush).toHaveBeenCalledExactlyOnceWith(
      useLocalePath()({ name: 'account-reauthenticate-code', query: { next: '/account/settings' } }),
    )
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'warning' }))
  })

  it('asks allauth for a new code from the resend button', async () => {
    const wrapper = await mountPage()

    await wrapper.findAll('button').find(button => button.text() === RESEND.resend)!.trigger('click')
    await flushPromises()

    expect(resendReauthenticationCode).toHaveBeenCalledOnce()
  })
})
