import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import AuthenticateCode from '~/components/Account/2Fa/AuthenticateCode.vue'
import WebsideAuthenticateCode from '~/components/variants/webside/Account/2Fa/AuthenticateCode.vue'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makeBadResponse, makePendingFlowResponse, makeSessionResponse } from '~~/test/fixtures/allauth'
import type { Flow } from '~~/shared/types/model/all-auth'

/**
 * The second-factor code step of sign-in (TOTP or a recovery code). It
 * only makes sense while allauth has `mfa_authenticate` pending, read
 * from the `auth-state` the auth plugin keeps. Mocked at
 * `useAllAuthAuthentication`. The two trees share their `<script>`.
 */
const { twoFaAuthenticate, navigateToMock, toastAdd } = vi.hoisted(() => ({
  twoFaAuthenticate: vi.fn(),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ twoFaAuthenticate }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const pendingMfa = (types: Flow['types']) => makePendingFlowResponse('mfa_authenticate', { types })
const SIGNED_IN = makeSessionResponse()
const WRONG_CODE = asProxiedError(makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' }))

beforeEach(() => {
  useState('auth-state').value = pendingMfa(['totp', 'recovery_codes'])
  useAuthStore().session = undefined
  twoFaAuthenticate.mockResolvedValue(SIGNED_IN)
})

async function enterCode(wrapper: VueWrapper, code: string) {
  await wrapper.findComponent({ name: 'UPinInput' }).setValue(code.split(''))
  await flushPromises()
}

describe.each(trees(AuthenticateCode, WebsideAuthenticateCode))('$tree Account/2Fa/AuthenticateCode', ({ C }) => {
  const mountCode = (authenticatorType = 'totp') =>
    mountSuspended(C, { props: { authenticatorType }, route: '/account/2fa/authenticate/totp' })

  it('signs in as soon as the sixth digit is entered', async () => {
    const wrapper = await mountCode()

    await enterCode(wrapper, '123456')

    expect(twoFaAuthenticate).toHaveBeenCalledWith({ code: '123456' })
    expect(useAuthStore().session).toEqual(SIGNED_IN.data)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('twoFaAuthenticate')).toHaveLength(1)
  })

  it('waits for all eight digits of a recovery code', async () => {
    const wrapper = await mountCode('recovery_codes')

    await enterCode(wrapper, '123456')
    expect(twoFaAuthenticate).not.toHaveBeenCalled()
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    await enterCode(wrapper, '12345678')
    expect(twoFaAuthenticate).toHaveBeenCalledWith({ code: '12345678' })
  })

  it('says the code was wrong and keeps the shopper on the step', async () => {
    twoFaAuthenticate.mockRejectedValue(WRONG_CODE)
    const wrapper = await mountCode()

    await enterCode(wrapper, '000000')

    expect(wrapper.findComponent({ name: 'UAlert' }).text()).toContain('Ο κωδικός που εισαγάγατε δεν είναι έγκυρος.')
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('twoFaAuthenticate')).toBeUndefined()
  })

  it('moves on to the next pending step allauth asks for', async () => {
    twoFaAuthenticate.mockRejectedValue(asProxiedError(makePendingFlowResponse('verify_email')))
    const wrapper = await mountCode()

    await enterCode(wrapper, '123456')

    expect(navigateToMock).toHaveBeenCalledWith({ path: useLocalePath()('account-verify-email'), query: undefined })
    expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
  })

  it('sends a visitor with no second factor pending home', async () => {
    useState('auth-state').value = SIGNED_IN

    await mountCode()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
