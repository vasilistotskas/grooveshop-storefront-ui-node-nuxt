import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import LoginCodeForm from '~/components/Account/Login/Code/Form.vue'
import WebsideLoginCodeForm from '~/components/variants/webside/Account/Login/Code/Form.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * Asking allauth to email a one-time sign-in code. Mocked at
 * `useAllAuthAuthentication` (the allauth boundary); the pending-flow
 * hand-off and the error toasts are the app's real utils. The two trees
 * share their `<script>`.
 *
 * allauth accepts the request by replying 401 with `login_by_code`
 * pending — `$fetch` throws it, and the form must read it as success.
 */
const { requestLoginCode, navigateToMock, toastAdd } = vi.hoisted(() => ({
  requestLoginCode: vi.fn((_body: { email: string }) => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ requestLoginCode }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

/** allauth's reply to a code request it accepted, as the Nuxt proxy forwards it. */
const CODE_SENT = {
  statusCode: 401,
  data: {
    statusCode: 401,
    data: {
      status: 401,
      data: { flows: [{ id: 'login_by_code', is_pending: true }] },
      meta: { is_authenticated: false },
    },
  },
}

const UNKNOWN_EMAIL = {
  statusCode: 400,
  data: {
    statusCode: 400,
    data: {
      status: 400,
      errors: [{ code: 'unknown_email', param: 'email', message: 'Δεν βρέθηκε λογαριασμός με αυτό το email.' }],
    },
  },
}

const RATE_LIMITED = { statusCode: 429, data: { statusCode: 429, data: { status: 429 } } }

/** The component's own `<i18n>` copy (el) — the strings this form owns. */
const COPY = {
  successTitle: 'Το Email στάλθηκε',
  successDescription: 'Έλεγξε το email σου για τον κωδικό σύνδεσης.',
  errorTitle: 'Σφάλμα αποστολής',
}

const CODE_PAGE = () => useLocalePath()('account-login-code')
const CONFIRM_PAGE = () => useLocalePath()('account-login-code-confirm')

beforeEach(() => {
  requestLoginCode.mockResolvedValue({ status: 200 })
})

/** Type `email` (none: leave the field untouched) and submit. */
async function submitEmail(wrapper: VueWrapper, email: string | null = 'shopper@example.com') {
  if (email !== null) await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

const successToast = expect.objectContaining({
  title: COPY.successTitle,
  description: COPY.successDescription,
  color: 'success',
})

describe.each(trees(LoginCodeForm, WebsideLoginCodeForm))('$tree Account/Login/Code/Form', ({ C }) => {
  const mountForm = (route = CODE_PAGE()) => mountSuspended(C, { route })

  it('asks allauth to email a code to the address typed, then says so', async () => {
    const wrapper = await mountForm()

    await submitEmail(wrapper)

    expect(requestLoginCode).toHaveBeenCalledWith({ email: 'shopper@example.com' })
    expect(toastAdd).toHaveBeenCalledWith(successToast)
    expect(wrapper.emitted('requestLoginCode')).toHaveLength(1)
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
  })

  it('reads allauth\'s pending `login_by_code` as sent and moves to the confirm step, keeping `next`', async () => {
    requestLoginCode.mockRejectedValue(CODE_SENT)
    const wrapper = await mountForm(`${CODE_PAGE()}?next=/account/orders`)

    await submitEmail(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith({ path: CONFIRM_PAGE(), query: { next: '/account/orders' } })
    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith(successToast)
    expect(wrapper.emitted('requestLoginCode')).toHaveLength(1)
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
  })

  it('never carries an off-site `next` into the confirm step', async () => {
    requestLoginCode.mockRejectedValue(CODE_SENT)
    const wrapper = await mountForm(`${CODE_PAGE()}?next=//evil.example/steal`)

    await submitEmail(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith({ path: CONFIRM_PAGE(), query: undefined })
  })

  it('counts it as sent when the auth hook has already moved to the confirm step', async () => {
    // ofetch awaits the global `auth:change` interceptor before it
    // rejects, so by the time the form's catch runs the app may already
    // be on the confirm page. That is the advance, not a same-step retry.
    requestLoginCode.mockImplementation(async () => {
      await useRouter().push(CONFIRM_PAGE())
      throw CODE_SENT
    })
    const wrapper = await mountForm()

    await submitEmail(wrapper)
    // A real navigation outlasts a microtask flush.
    await vi.waitFor(() => expect(toastAdd).toHaveBeenCalled())

    expect(useRouter().currentRoute.value.path).toBe(CONFIRM_PAGE())
    expect(toastAdd).toHaveBeenCalledWith(successToast)
    expect(wrapper.emitted('requestLoginCode')).toHaveLength(1)
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('treats a pending flow that points back at its own page as a failure', async () => {
    // Mounted on the confirm page, `login_by_code` pending means "the
    // same step again" — the form must not claim the code was sent.
    requestLoginCode.mockRejectedValue(CODE_SENT)
    const wrapper = await mountForm(CONFIRM_PAGE())

    await submitEmail(wrapper)

    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.emitted('requestLoginCode')).toBeUndefined()
    expect(toastAdd).not.toHaveBeenCalledWith(successToast)
    expect(wrapper.text()).toContain(COPY.errorTitle)
  })

  it('shows the error and allauth\'s own message for an address it refuses', async () => {
    // `unknown_email` has no translation, so allauth's message is the one read.
    requestLoginCode.mockRejectedValue(UNKNOWN_EMAIL)
    const wrapper = await mountForm()

    await submitEmail(wrapper)

    expect(wrapper.text()).toContain(COPY.errorTitle)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Δεν βρέθηκε λογαριασμός με αυτό το email.', color: 'error' })
    expect(wrapper.emitted('requestLoginCode')).toBeUndefined()
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('warns about too many requests instead of a generic failure', async () => {
    requestLoginCode.mockRejectedValue(RATE_LIMITED)
    const wrapper = await mountForm()

    await submitEmail(wrapper)

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('error.rate_limited'), color: 'warning' })
    expect(toastAdd).toHaveBeenCalledTimes(1)
  })

  it('clears an earlier failure when the next request succeeds', async () => {
    requestLoginCode.mockRejectedValueOnce(UNKNOWN_EMAIL)
    const wrapper = await mountForm()

    await submitEmail(wrapper)
    expect(wrapper.text()).toContain(COPY.errorTitle)

    await submitEmail(wrapper)
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
  })

  it.each([
    ['no address', null, 'validation.required'],
    ['an invalid address', 'not-an-email', 'validation.email.valid'],
  ])('does not ask allauth with %s', async (_case, email, key) => {
    const wrapper = await mountForm()

    await submitEmail(wrapper, email)

    expect(requestLoginCode).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t(key))
  })

  it('shows the submit button busy until allauth answers', async () => {
    let settle!: (value: { status: number }) => void
    requestLoginCode.mockReturnValue(new Promise((resolve) => { settle = resolve }))
    const wrapper = await mountForm()
    const submit = () => wrapper.find('button[type="submit"]')

    await submitEmail(wrapper)
    expect(submit().attributes('disabled')).toBeDefined()

    settle({ status: 200 })
    await flushPromises()
    expect(submit().attributes('disabled')).toBeUndefined()
  })
})
