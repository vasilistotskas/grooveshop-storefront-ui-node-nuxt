import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import AuthenticateCode from '~/components/Account/2Fa/AuthenticateCode.vue'
import WebsideAuthenticateCode from '~/components/variants/webside/Account/2Fa/AuthenticateCode.vue'
import { trees } from '~~/test/helpers/trees'

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

const pendingMfa = (types: string[]) => ({
  status: 401,
  data: { flows: [{ id: 'mfa_authenticate', is_pending: true, types }] },
  meta: { is_authenticated: false },
})
const SIGNED_IN = { status: 200, data: { user: { id: 7 }, methods: [] }, meta: { is_authenticated: true } }
const WRONG_CODE = {
  data: {
    statusCode: 400,
    data: { status: 400, errors: [{ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' }] },
  },
}

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
    twoFaAuthenticate.mockRejectedValue({
      data: { statusCode: 401, data: { status: 401, data: { flows: [{ id: 'verify_email', is_pending: true }] }, meta: { is_authenticated: false } } },
    })
    const wrapper = await mountCode()

    await enterCode(wrapper, '123456')

    expect(navigateToMock).toHaveBeenCalledWith({ path: useLocalePath()('account-verify-email'), query: undefined })
    expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
  })

  it('sends a visitor with no second factor pending home', async () => {
    useState('auth-state').value = { status: 200, data: { user: { id: 7 }, methods: [] }, meta: { is_authenticated: true } }

    await mountCode()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
