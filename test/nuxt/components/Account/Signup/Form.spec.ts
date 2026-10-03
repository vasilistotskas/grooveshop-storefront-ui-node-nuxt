import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SignupForm from '~/components/Account/Signup/Form.vue'
import WebsideSignupForm from '~/components/variants/webside/Account/Signup/Form.vue'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makeAllAuthConfig, makeBadResponse, makePendingFlowResponse } from '~~/test/fixtures/allauth'
import { newsletterConsentText } from '~~/shared/i18n/newsletterConsent'

/**
 * The email + password sign-up. Mocked at `useAllAuthAuthentication`;
 * the pending-flow hand-off and error toasts are the app's real utils,
 * the auth store is the app's own.
 *
 * The two trees ask allauth the same things. The frozen copy takes the
 * password twice and holds the social block as placeholders while the
 * config loads; the default takes it once (the field reveals what was
 * typed), offers a passkey where allauth supports one, the newsletter
 * where the store can take it, and only the providers that can sign
 * anyone in.
 *
 * With mandatory email verification allauth creates the account and
 * answers 401 with `verify_email` pending — the next step, not a failure.
 */
const { signup, navigateToMock, toastAdd, newsletter } = vi.hoisted(() => ({
  signup: vi.fn((_body: { email: string, password: string }) => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
  newsletter: { available: false },
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ signup }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The newsletter availability (`useNewsletterAvailability`): the toggle
// at its default, the store's answer per test.
mockNuxtImport('useSettingFlag', () => (_key: string, options: { fallback: boolean }) =>
  computed(() => options.fallback))
mockNuxtImport('useApi', () => () => Promise.resolve({ data: ref({ available: newsletter.available }) }))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const NEWSLETTER_URL = '/api/subscriptions/newsletter'

const VERIFY_EMAIL_PENDING = asProxiedError(makePendingFlowResponse('verify_email'))

/** allauth's 400 for an address that already has an account (no translation: its message is shown). */
const EMAIL_TAKEN = asProxiedError(makeBadResponse({ code: 'email_taken', param: 'email', message: 'Υπάρχει ήδη χρήστης με αυτή τη διεύθυνση email.' }))

const TOO_COMMON = asProxiedError(makeBadResponse({ code: 'password_too_common', param: 'password', message: 'This password is too common.' }))

/** allauth's `/config` data with one social provider, as the auth store holds it. */
const CONFIG_WITH_GOOGLE = makeAllAuthConfig().data

/** A provider row the store has no credentials for: allauth still lists it. */
const CONFIG_WITH_UNUSABLE_GOOGLE = makeAllAuthConfig({
  socialaccount: { providers: [{ id: 'google', name: 'Google', flows: ['provider_redirect'], client_id: '' }] },
}).data

/** Each tree's own validation copy (el); the default words it with the app-wide messages. */
const COPY = {
  webside: {
    invalidEmail: () => 'Το email πρέπει να είναι έγκυρη διεύθυνση email',
    tooShort: () => 'Ο κωδικός πρόσβασης πρέπει να αποτελείται από τουλάχιστον 8 χαρακτήρες',
  },
  default: {
    invalidEmail: () => useNuxtApp().$i18n.t('validation.email.valid'),
    tooShort: () => useNuxtApp().$i18n.t('validation.min', { min: 8 }),
  },
}
const WEBSIDE_MISMATCH = 'Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό πρόσβασης'
const WEBSIDE_SOCIAL_TITLE = 'Ή εγγράψου μέσω ενός τρίτου παρόχου'
const PASSKEY_LABEL = 'Εγγραφή με passkey'

const SIGNUP_PAGE = () => useLocalePath()('account-signup')

beforeEach(() => {
  signup.mockResolvedValue({ status: 200 })
  newsletter.available = false
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

/** Fill the form; the confirmation box exists in the frozen copy only. */
async function fill(wrapper: VueWrapper, { email = 'new@example.com', password = 'Καλημέρα2024', confirmation = password, consent = true }: Entry = {}) {
  await wrapper.find('input[type="email"]').setValue(email)
  const [first, second] = wrapper.findAll('input[autocomplete="new-password"]')
  await first!.setValue(password)
  await second?.setValue(confirmation)
  if (consent) await termsBox(wrapper).trigger('click')
}

/** The terms box comes first in both trees; the default's newsletter box follows it. */
const termsBox = (wrapper: VueWrapper) => wrapper.findAll('button[role="checkbox"]')[0]!

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

describe.each(trees(SignupForm, WebsideSignupForm))('$tree Account/Signup/Form', ({ tree, C, own }) => {
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

    await termsBox(wrapper).trigger('click')
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
    ['an invalid address', { email: 'not-an-email' }, () => COPY[tree].invalidEmail()],
    ['a password under 8 characters', { password: 'Ab1' }, () => COPY[tree].tooShort()],
    ['an all-digit password', { password: '12345678' }, () => useNuxtApp().$i18n.t('validation.password.entirely_numeric')],
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

  it.runIf(tree === 'webside')('refuses a confirmation that does not match without asking allauth', async () => {
    const wrapper = await mountForm()

    await fill(wrapper, { password: 'Καλημέρα2024', confirmation: 'Καλημέρα2025' })
    await submit(wrapper)

    expect(signup).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(WEBSIDE_MISMATCH)
  })

  describe.runIf(tree === 'webside')('social sign-up', () => {
    it('offers it once the allauth config lists a provider', async () => {
      const auth = useAuthStore()
      auth.config = CONFIG_WITH_GOOGLE
      auth.status.config = 'success'
      const wrapper = await mountForm()

      expect(wrapper.text()).toContain(WEBSIDE_SOCIAL_TITLE)
      expect(wrapper.find('[data-testid="providers"]').exists()).toBe(true)
    })

    it('holds it as placeholders while the allauth config is still loading', async () => {
      const auth = useAuthStore()
      auth.config = CONFIG_WITH_GOOGLE
      auth.status.config = 'pending'
      const wrapper = await mountForm()

      expect(wrapper.find('[data-testid="providers"]').exists()).toBe(false)
      expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(2)
    })

    it('offers none without a provider', async () => {
      useAuthStore().status.config = 'success'
      const wrapper = await mountForm()

      expect(wrapper.text()).not.toContain(WEBSIDE_SOCIAL_TITLE)
      expect(wrapper.find('[data-testid="providers"]').exists()).toBe(false)
    })
  })

  describe.runIf(tree === 'default')('the other ways in', () => {
    const passkeyLink = (wrapper: VueWrapper) => wrapper.findAll('a').find(link => link.text() === PASSKEY_LABEL)

    it('offers a passkey where allauth supports one', async () => {
      const auth = useAuthStore()
      auth.config = CONFIG_WITH_GOOGLE
      auth.status.config = 'success'
      const wrapper = await mountForm()

      expect(passkeyLink(wrapper)?.attributes('href')).toBe(useLocalePath()('account-signup-passkey'))
    })

    it('offers no passkey where allauth does not support one', async () => {
      const auth = useAuthStore()
      auth.config = makeAllAuthConfig({ mfa: { supported_types: ['totp', 'recovery_codes'] } }).data
      auth.status.config = 'success'
      const wrapper = await mountForm()

      expect(passkeyLink(wrapper)).toBeUndefined()
    })

    it('holds the passkey row as a placeholder while the allauth config is still loading', async () => {
      useAuthStore().status.config = 'pending'
      const wrapper = await mountForm()

      expect(passkeyLink(wrapper)).toBeUndefined()
      expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(1)
    })

    it('offers the providers that can sign someone in', async () => {
      const auth = useAuthStore()
      auth.config = CONFIG_WITH_GOOGLE
      auth.status.config = 'success'
      const wrapper = await mountForm()

      expect(wrapper.find('[data-testid="providers"]').exists()).toBe(true)
    })

    it('draws no provider block for a provider the store has no credentials for', async () => {
      const auth = useAuthStore()
      auth.config = CONFIG_WITH_UNUSABLE_GOOGLE
      auth.status.config = 'success'
      const wrapper = await mountForm()

      expect(wrapper.find('[data-testid="providers"]').exists()).toBe(false)
    })
  })

  describe.runIf(tree === 'default')('the newsletter opt-in', () => {
    const newsletterBox = (wrapper: VueWrapper) => wrapper.findAll('button[role="checkbox"]')[1]

    it('is not offered where the store cannot take a subscription', async () => {
      const wrapper = await mountForm()

      expect(newsletterBox(wrapper)).toBeUndefined()
      expect(wrapper.text()).not.toContain(newsletterConsentText('el'))
    })

    it('asks with the consent sentence Django stores, unticked', async () => {
      newsletter.available = true
      const wrapper = await mountForm()

      expect(newsletterBox(wrapper)!.attributes('aria-checked')).toBe('false')
      expect(wrapper.text()).toContain(newsletterConsentText('el'))
    })

    it('subscribes the new address once the account exists', async () => {
      newsletter.available = true
      const wrapper = await mountForm()

      await fill(wrapper)
      await newsletterBox(wrapper)!.trigger('click')
      await submit(wrapper)

      expect(api.callsTo(NEWSLETTER_URL).map(call => call.options?.body))
        .toEqual([{ email: 'new@example.com', consent: true }])
    })

    it('subscribes too when the account waits on its email being confirmed', async () => {
      newsletter.available = true
      signup.mockRejectedValue(VERIFY_EMAIL_PENDING)
      const wrapper = await mountForm()

      await fill(wrapper)
      await newsletterBox(wrapper)!.trigger('click')
      await submit(wrapper)

      expect(api.callsTo(NEWSLETTER_URL)).toHaveLength(1)
      expect(navigateToMock).toHaveBeenCalledWith(expect.objectContaining({ path: useLocalePath()('account-verify-email') }))
    })

    it('subscribes no one who left it unticked', async () => {
      newsletter.available = true
      const wrapper = await mountForm()

      await fill(wrapper)
      await submit(wrapper)

      expect(signup).toHaveBeenCalled()
      expect(api.callsTo(NEWSLETTER_URL)).toHaveLength(0)
    })

    it('never asks for a subscription when the sign-up is refused', async () => {
      newsletter.available = true
      signup.mockRejectedValue(EMAIL_TAKEN)
      const wrapper = await mountForm()

      await fill(wrapper)
      await newsletterBox(wrapper)!.trigger('click')
      await submit(wrapper)

      expect(api.callsTo(NEWSLETTER_URL)).toHaveLength(0)
    })
  })
})
