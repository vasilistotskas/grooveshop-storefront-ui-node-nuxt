import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SignupForm from '~/components/Account/Signup/Form.vue'
import WebsideSignupForm from '~/components/variants/webside/Account/Signup/Form.vue'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makeAllAuthConfig, makeBadResponse, makePendingFlowResponse } from '~~/test/fixtures/allauth'

/**
 * The email + password sign-up. Mocked at `useAllAuthAuthentication`;
 * the pending-flow hand-off and error toasts are the app's real utils,
 * the auth store is the app's own. The two trees share their `<script>`;
 * the frozen copy renders its own `Webside` password and provider
 * components.
 *
 * With mandatory email verification allauth creates the account and
 * answers 401 with `verify_email` pending — the next step, not a failure.
 */
const { signup, navigateToMock, toastAdd } = vi.hoisted(() => ({
  signup: vi.fn((_body: { email: string, password: string }) => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ signup }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const VERIFY_EMAIL_PENDING = asProxiedError(makePendingFlowResponse('verify_email'))

/** allauth's 400 for an address that already has an account (no translation: its message is shown). */
const EMAIL_TAKEN = asProxiedError(makeBadResponse({ code: 'email_taken', param: 'email', message: 'Υπάρχει ήδη χρήστης με αυτή τη διεύθυνση email.' }))

const TOO_COMMON = asProxiedError(makeBadResponse({ code: 'password_too_common', param: 'password', message: 'This password is too common.' }))

/** allauth's `/config` data with one social provider, as the auth store holds it. */
const CONFIG_WITH_GOOGLE = makeAllAuthConfig().data

/** The component's own `<i18n>` copy (el) — the strings this form owns. */
const COPY = {
  invalidEmail: 'Το email πρέπει να είναι έγκυρη διεύθυνση email',
  tooShort: 'Ο κωδικός πρόσβασης πρέπει να αποτελείται από τουλάχιστον 8 χαρακτήρες',
  mismatch: 'Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό πρόσβασης',
  socialTitle: 'Ή εγγράψου μέσω ενός τρίτου παρόχου',
}

const SIGNUP_PAGE = () => useLocalePath()('account-signup')

beforeEach(() => {
  signup.mockResolvedValue({ status: 200 })
  const auth = useAuthStore()
  auth.config = undefined
  auth.status.config = 'idle'
})

interface Entry {
  email?: string
  password?: string
  confirmation?: string
  consent?: boolean
}

async function fill(wrapper: VueWrapper, { email = 'new@example.com', password = 'Καλημέρα2024', confirmation = password, consent = true }: Entry = {}) {
  await wrapper.find('input[type="email"]').setValue(email)
  const [first, second] = wrapper.findAll('input[autocomplete="new-password"]')
  await first!.setValue(password)
  await second!.setValue(confirmation)
  if (consent) await wrapper.find('button[role="checkbox"]').trigger('click')
}

const submitButton = (wrapper: VueWrapper) => wrapper.find('button[type="submit"]')

/**
 * Submit the form. happy-dom does not turn a click on the submit button
 * into a form submission, so the event is fired on the form; the
 * button's own gate is asserted separately.
 */
async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(SignupForm, WebsideSignupForm))('$tree Account/Signup/Form', ({ C, own }) => {
  const mountForm = (route = SIGNUP_PAGE()) => mountSuspended(C, {
    route,
    global: { stubs: { [own('AccountProviderList')]: { template: '<div data-testid="providers" />' } } },
  })

  it('creates the account with the email and password typed, and says so', async () => {
    const wrapper = await mountForm()

    await fill(wrapper)
    await submit(wrapper)

    // The confirmation is checked here; allauth never receives it.
    expect(signup).toHaveBeenCalledWith({ email: 'new@example.com', password: 'Καλημέρα2024' })
    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('auth.signup.success'), color: 'success' })
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('keeps sign-up closed until the terms are accepted', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { consent: false })

    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    await wrapper.find('button[role="checkbox"]').trigger('click')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('moves to email verification when allauth asks for it, keeping `next`', async () => {
    signup.mockRejectedValue(VERIFY_EMAIL_PENDING)
    const wrapper = await mountForm(`${SIGNUP_PAGE()}?next=/checkout`)

    await fill(wrapper)
    await submit(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith({ path: useLocalePath()('account-verify-email'), query: { next: '/checkout' } })
    // The account exists: this is not a failed sign-up.
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('never carries an off-site `next` into email verification', async () => {
    signup.mockRejectedValue(VERIFY_EMAIL_PENDING)
    const wrapper = await mountForm(`${SIGNUP_PAGE()}?next=https://evil.example`)

    await fill(wrapper)
    await submit(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith({ path: useLocalePath()('account-verify-email'), query: undefined })
  })

  it.each([
    ['an address that already has an account', EMAIL_TAKEN, () => 'Υπάρχει ήδη χρήστης με αυτή τη διεύθυνση email.'],
    ['a password Django finds too common', TOO_COMMON, () => useNuxtApp().$i18n.t('validation.api.password_too_common')],
  ])('reports %s', async (_case, refusal, message) => {
    signup.mockRejectedValue(refusal)
    const wrapper = await mountForm()

    await fill(wrapper)
    await submit(wrapper)

    expect(toastAdd).toHaveBeenCalledWith({ title: message(), color: 'error' })
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it.each<[string, Entry, () => string]>([
    ['an invalid address', { email: 'not-an-email' }, () => COPY.invalidEmail],
    ['a password under 8 characters', { password: 'Ab1' }, () => COPY.tooShort],
    ['an all-digit password', { password: '12345678' }, () => useNuxtApp().$i18n.t('validation.password.entirely_numeric')],
    ['a confirmation that does not match', { password: 'Καλημέρα2024', confirmation: 'Καλημέρα2025' }, () => COPY.mismatch],
  ])('refuses %s without asking allauth', async (_case, entry, message) => {
    const wrapper = await mountForm()

    await fill(wrapper, entry)
    await submit(wrapper)

    expect(signup).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(message())
  })

  it('shows the button busy, and locked, until allauth answers', async () => {
    let settle!: (value: { status: number }) => void
    signup.mockReturnValue(new Promise((resolve) => {
      settle = resolve
    }))
    const wrapper = await mountForm()

    await fill(wrapper)
    await submit(wrapper)
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    settle({ status: 200 })
    await flushPromises()
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('unlocks the button again after a refusal', async () => {
    signup.mockRejectedValue(EMAIL_TAKEN)
    const wrapper = await mountForm()

    await fill(wrapper)
    await submit(wrapper)

    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('offers social sign-up once the allauth config lists a provider', async () => {
    const auth = useAuthStore()
    auth.config = CONFIG_WITH_GOOGLE
    auth.status.config = 'success'
    const wrapper = await mountForm()

    expect(wrapper.text()).toContain(COPY.socialTitle)
    expect(wrapper.find('[data-testid="providers"]').exists()).toBe(true)
  })

  it('holds the social block as placeholders while the allauth config is still loading', async () => {
    const auth = useAuthStore()
    auth.config = CONFIG_WITH_GOOGLE
    auth.status.config = 'pending'
    const wrapper = await mountForm()

    expect(wrapper.find('[data-testid="providers"]').exists()).toBe(false)
    expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(2)
  })

  it('offers no social sign-up without a provider', async () => {
    useAuthStore().status.config = 'success'
    const wrapper = await mountForm()

    expect(wrapper.text()).not.toContain(COPY.socialTitle)
    expect(wrapper.find('[data-testid="providers"]').exists()).toBe(false)
  })
})
