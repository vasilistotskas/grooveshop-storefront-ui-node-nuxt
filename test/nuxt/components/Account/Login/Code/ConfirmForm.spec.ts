import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import LoginCodeConfirmForm from '~/components/Account/Login/Code/ConfirmForm.vue'
import WebsideLoginCodeConfirmForm from '~/components/variants/webside/Account/Login/Code/ConfirmForm.vue'
import { trees } from '~~/test/helpers/trees'
import { setTenant } from '~~/test/helpers/tenant'
import { asProxiedError, makeBadResponse, makePendingFlowResponse } from '~~/test/fixtures/allauth'

/**
 * Entering the emailed one-time code. Mocked at
 * `useAllAuthAuthentication`; the pending-flow hand-off and error
 * toasts are the app's real utils, and the router is real. The two
 * trees share their `<script>`.
 *
 * A valid code on an account with a second factor does not finish the
 * sign-in: allauth answers 401 with `mfa_authenticate` pending, which is
 * the next step, not a wrong code.
 */
const { confirmLoginCode, resendLoginCode, navigateToMock, toastAdd } = vi.hoisted(() => ({
  confirmLoginCode: vi.fn((_body: { code: string }) => Promise.resolve({ status: 200 })),
  resendLoginCode: vi.fn(() => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ confirmLoginCode, resendLoginCode }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/** allauth's 401 after a valid code on a two-factor account. */
const MFA_PENDING = asProxiedError(makePendingFlowResponse('mfa_authenticate', { types: ['totp'] }))

/** `login_by_code` still pending: allauth wants the same step again. */
const SAME_STEP = asProxiedError(makePendingFlowResponse('login_by_code'))

const INCORRECT_CODE = asProxiedError(makeBadResponse({ code: 'incorrect_code', param: 'code', message: 'Incorrect code.' }))

/** The component's own `<i18n>` copy (el) — the strings this form owns. */
const COPY = {
  errorTitle: 'Μη έγκυρος κωδικός',
  // The default speaks to the shopper in the second person singular.
  signedIn: {
    webside: { loggedIn: 'Συνδεθήκατε επιτυχώς', welcomeBack: 'Καλώς ήρθατε πίσω!' },
    default: { loggedIn: 'Συνδέθηκες', welcomeBack: 'Καλώς ήρθες ξανά' },
  },
}

const CONFIRM_PAGE = () => useLocalePath()('account-login-code-confirm')
const TOTP_PAGE = () => useLocalePath()('account-2fa-authenticate-totp')

beforeEach(() => {
  confirmLoginCode.mockResolvedValue({ status: 200 })
})

async function typeCode(wrapper: VueWrapper, code: string) {
  await wrapper.findComponent({ name: 'UPinInput' }).setValue(code.split(''))
  await flushPromises()
}

const submitButton = (wrapper: VueWrapper) => wrapper.find('button[type="submit"]')

describe.each(trees(LoginCodeConfirmForm, WebsideLoginCodeConfirmForm))('$tree Account/Login/Code/ConfirmForm', ({ tree, C }) => {
  const mountForm = (route = CONFIRM_PAGE()) => mountSuspended(C, { route })

  it('signs in as soon as the sixth digit is typed, then goes home', async () => {
    const wrapper = await mountForm()

    await typeCode(wrapper, '482913')
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe(useLocalePath()('index')))

    expect(confirmLoginCode).toHaveBeenCalledTimes(1)
    expect(confirmLoginCode).toHaveBeenCalledWith({ code: '482913' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: COPY.signedIn[tree].loggedIn,
      description: COPY.signedIn[tree].welcomeBack,
      color: 'success',
    }))
    expect(wrapper.emitted('confirmLoginCode')).toHaveLength(1)
  })

  it('keeps the button disabled and asks nothing until all six digits are in', async () => {
    const wrapper = await mountForm()

    await typeCode(wrapper, '48291')

    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()
    expect(confirmLoginCode).not.toHaveBeenCalled()
  })

  it('hands a two-factor account to its challenge page instead of reporting a bad code', async () => {
    confirmLoginCode.mockRejectedValue(MFA_PENDING)
    const wrapper = await mountForm(`${CONFIRM_PAGE()}?next=/account/orders`)

    await typeCode(wrapper, '482913')

    expect(navigateToMock).toHaveBeenCalledWith({ path: TOTP_PAGE(), query: { next: '/account/orders' } })
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
    expect(toastAdd).not.toHaveBeenCalled()
    expect(useRouter().currentRoute.value.path).toBe(CONFIRM_PAGE())
  })

  it('counts it as the advance when the auth hook has already moved to the challenge', async () => {
    // ofetch awaits the global `auth:change` interceptor before it
    // rejects, so the app can be on the challenge page by the time the
    // form's catch runs.
    confirmLoginCode.mockImplementation(async () => {
      await useRouter().push(TOTP_PAGE())
      throw MFA_PENDING
    })
    const wrapper = await mountForm()

    await typeCode(wrapper, '482913')
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe(TOTP_PAGE()))
    await flushPromises()

    expect(wrapper.text()).not.toContain(COPY.errorTitle)
    expect(toastAdd).not.toHaveBeenCalled()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('reports a wrong code with its translated reason, and the alert can be dismissed', async () => {
    confirmLoginCode.mockRejectedValue(INCORRECT_CODE)
    const wrapper = await mountForm()

    await typeCode(wrapper, '000000')

    expect(wrapper.text()).toContain(COPY.errorTitle)
    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('validation.api.incorrect_code'), color: 'error' })
    expect(wrapper.emitted('confirmLoginCode')).toBeUndefined()
    expect(useRouter().currentRoute.value.path).toBe(CONFIRM_PAGE())

    const alert = wrapper.findComponent({ name: 'UAlert' })
    await alert.find('button').trigger('click')
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
  })

  it('reports a failure when allauth asks for this same step again', async () => {
    confirmLoginCode.mockRejectedValue(SAME_STEP)
    const wrapper = await mountForm()

    await typeCode(wrapper, '482913')

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(COPY.errorTitle)
  })

  // The frozen tree keeps its link back to the request step; the default
  // sends the code again in place.
  it.runIf(tree === 'webside')('links back to request a new code', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find(`a[href="${useLocalePath()('account-login-code')}"]`).exists()).toBe(true)
  })

  it.runIf(tree === 'default')('sends the code again in place instead of linking back', async () => {
    setTenant({ codeResendCooldownSeconds: undefined })
    const wrapper = await mountForm()

    expect(wrapper.find(`a[href="${useLocalePath()('account-login-code')}"]`).exists()).toBe(false)
    await wrapper.find('button:not([type="submit"])').trigger('click')
    await flushPromises()

    expect(resendLoginCode).toHaveBeenCalledTimes(1)
  })
})
