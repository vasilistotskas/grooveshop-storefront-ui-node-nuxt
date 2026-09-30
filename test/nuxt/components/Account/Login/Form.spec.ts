import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import LoginForm from '~/components/Account/Login/Form.vue'
import WebsideLoginForm from '~/components/variants/webside/Account/Login/Form.vue'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makeBadResponse, makePendingFlowResponse, makeSessionResponse } from '~~/test/fixtures/allauth'

/**
 * The email + password sign-in. Mocked at `useAllAuthAuthentication`
 * (the allauth boundary); the pending-flow and error handling around it
 * are the app's real utils. The two trees submit identically; only the
 * default exposes `performLogin` for the demo-account card.
 */
const { login, navigateToMock, toastAdd } = vi.hoisted(() => ({
  login: vi.fn(),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ login }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/** allauth's 401 for a correct password on a two-factor account, as the Nuxt proxy forwards it. */
const MFA_PENDING = asProxiedError(makePendingFlowResponse('mfa_authenticate', { types: ['totp'] }))

/** allauth's 400 for a wrong password. */
const MISMATCH = asProxiedError(makeBadResponse({ code: 'email_password_mismatch', param: 'password', message: 'The email address and/or password you specified are not correct.' }))

const SIGNED_IN = makeSessionResponse()

let refreshCart: MockInstance<() => Promise<void>>

beforeEach(() => {
  login.mockResolvedValue(SIGNED_IN)
  refreshCart = vi.spyOn(useCartStore(), 'refreshCart').mockResolvedValue()
  useAuthStore().session = undefined
})

async function fillAndSubmit(wrapper: VueWrapper, email = 'shopper@example.com', password = 'correct horse') {
  await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('input[autocomplete="current-password"]').setValue(password)
  await wrapper.find('form').trigger('submit')
  // Without a `next` the form first `router.replace`s one in, a real
  // navigation that outlasts a microtask flush.
  await vi.waitFor(() => expect(login).toHaveBeenCalled())
  await flushPromises()
}

describe.each(trees(LoginForm, WebsideLoginForm))('$tree Account/Login/Form', ({ C }) => {
  const mountForm = (route = '/') => mountSuspended(C, { route })

  it('signs in with the credentials typed, stores the session and refreshes the cart', async () => {
    const wrapper = await mountForm()

    await fillAndSubmit(wrapper)

    expect(login).toHaveBeenCalledWith({ email: 'shopper@example.com', password: 'correct horse' })
    expect(useAuthStore().session).toEqual(SIGNED_IN.data)
    expect(refreshCart).toHaveBeenCalledTimes(1)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('remembers the page as `next` before signing in when there is none', async () => {
    const wrapper = await mountForm('/')

    await fillAndSubmit(wrapper)

    expect(useRouter().currentRoute.value.query.next).toBe('/')
  })

  it('hands a two-factor account to its challenge page, keeping `next`', async () => {
    login.mockRejectedValue(MFA_PENDING)
    const wrapper = await mountForm('/?next=/account/orders')

    await fillAndSubmit(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith({
      path: useLocalePath()('account-2fa-authenticate-totp'),
      query: { next: '/account/orders' },
    })
    // A pending second factor is not a failed login.
    expect(toastAdd).not.toHaveBeenCalled()
    expect(refreshCart).toHaveBeenCalledTimes(1)
  })

  it('never carries an off-site `next` into the challenge', async () => {
    login.mockRejectedValue(MFA_PENDING)
    const wrapper = await mountForm('/?next=https://evil.example/steal')

    await fillAndSubmit(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith({
      path: useLocalePath()('account-2fa-authenticate-totp'),
      query: undefined,
    })
  })

  it('reports wrong credentials and stays put', async () => {
    login.mockRejectedValue(MISMATCH)
    const wrapper = await mountForm()

    await fillAndSubmit(wrapper, 'shopper@example.com', 'wrong')

    expect(toastAdd).toHaveBeenCalledWith({
      title: useNuxtApp().$i18n.t('validation.api.email_password_mismatch'),
      color: 'error',
    })
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(useAuthStore().session).toBeUndefined()
  })

  it('does not ask allauth without an email and a password', async () => {
    const wrapper = await mountForm()

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.required'))
  })

  it('shows the submit button busy until the sign-in settles', async () => {
    let settle!: (value: unknown) => void
    login.mockReturnValue(new Promise((resolve) => {
      settle = resolve
    }))
    const wrapper = await mountForm()
    const submit = () => wrapper.find('button[type="submit"]')

    await fillAndSubmit(wrapper)
    expect(submit().attributes('disabled')).toBeDefined()

    settle(SIGNED_IN)
    await flushPromises()
    expect(submit().attributes('disabled')).toBeUndefined()
  })
})

describe('default Account/Login/Form performLogin', () => {
  it('runs the same sign-in for credentials a caller already has', async () => {
    // The demo-account card drives the form this way, so the pending
    // two-factor flow and the cart refresh are not duplicated there.
    login.mockRejectedValue(MFA_PENDING)
    const wrapper = await mountSuspended(LoginForm, { route: '/' })

    await wrapper.vm.performLogin('demo@grooveshop.space', 'GrooveDemo-2026')

    expect(login).toHaveBeenCalledWith({ email: 'demo@grooveshop.space', password: 'GrooveDemo-2026' })
    expect(navigateToMock).toHaveBeenCalledWith(expect.objectContaining({ path: useLocalePath()('account-2fa-authenticate-totp') }))
  })
})
